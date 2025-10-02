// FILE: src/engine/pathfinding/strategies/HamiltonianStrategy.js
/**
 * Hamiltonian cycle based planning strategy with optional shortcuts.
 */

import { PathfindingStrategy } from '../PathfindingStrategy.js';
import { getHead, getLength } from '../../snake.js';
import { cyclicDistance } from '../../../utils/math.js';
import { isValidCellIndex } from '../../../utils/guards.js';

/**
 * Strategy that mirrors the legacy `planPath` behaviour while encapsulating
 * shortcut logic inside the strategy itself.
 */
export class HamiltonianStrategy extends PathfindingStrategy {
  constructor(config = {}) {
    super(config);
    this.name = 'hamiltonian';
    this.isExpensive = false;

    /** @type {number} */
    this.safetyBuffer = config.safetyBuffer ?? 2;

    /** @type {number} */
    this.lateGameLock = config.lateGameLock ?? 0;

    /** @type {number} */
    this.minShortcutWindow = config.minShortcutWindow ?? 5;
  }

  async initialize(initialState) {
    await super.initialize(initialState);
    this.cachedCycleLength = Number.isInteger(initialState?.cycle?.length)
      ? initialState.cycle.length
      : null;
  }

  /**
   * Resolve runtime configuration by combining defaults, instance config and
   * per-call overrides.
   *
   * @param {Object} [overrides={}] - Optional runtime overrides.
   * @returns {Object} Normalized configuration for shortcut evaluation.
   */
  resolveRuntimeConfig(overrides = {}) {
    const {
      safetyBuffer,
      lateGameLock,
      minShortcutWindow,
      shortcutsEnabled,
    } = overrides ?? {};

    return {
      safetyBuffer: safetyBuffer ?? this.config.safetyBuffer ?? this.safetyBuffer,
      lateGameLock: lateGameLock ?? this.config.lateGameLock ?? this.lateGameLock,
      minShortcutWindow:
        minShortcutWindow ?? this.config.minShortcutWindow ?? this.minShortcutWindow,
      shortcutsEnabled:
        shortcutsEnabled ?? this.config.shortcutsEnabled ?? true,
    };
  }

  /**
   * Find safe shortcut moves towards the target fruit.
   *
   * @param {Object} gameState - Current engine state.
   * @param {Object} runtimeConfig - Resolved configuration for this invocation.
   * @returns {Object|null} Shortcut metadata or null when none available.
   */
  findShortcut(gameState, runtimeConfig) {
    const { snake, fruit, cycle, cycleIndex } = gameState ?? {};
    const { safetyBuffer, lateGameLock, minShortcutWindow } = runtimeConfig;

    if (!snake || !Array.isArray(snake.body) || snake.body.length === 0 || !cycle || !cycleIndex) {
      return null;
    }

    if (typeof cycleIndex.get !== 'function') {
      return null;
    }

    const headCell = getHead(snake);
    const tailCell = snake.body[snake.body.length - 1];
    const headPos = cycleIndex.get(headCell);
    const tailPos = cycleIndex.get(tailCell);
    const fruitPos = cycleIndex.get(fruit);

    if (headPos === undefined || tailPos === undefined || fruitPos === undefined) {
      return null;
    }

    const cycleLength = cycle.length;
    const snakeLength = snake.body.length;
    const tailDistance = cyclicDistance(headPos, tailPos, cycleLength);

    const bufferToUse = snakeLength <= 3 ? 0 : safetyBuffer;
    const safeWindow = Math.max(0, tailDistance - bufferToUse);
    const freeCells = cycleLength - snakeLength;

    const minWindow = Math.max(1, Number.isFinite(minShortcutWindow) ? minShortcutWindow : 1);
    const shortcutsAllowed = safeWindow > minWindow && (freeCells > lateGameLock || snakeLength <= 5);

    if (!shortcutsAllowed) {
      return null;
    }

    const neighbors = this.getNeighbors(headCell, gameState);

    let bestShortcut = null;
    let bestDistance = cyclicDistance((headPos + 1) % cycleLength, fruitPos, cycleLength);
    let bestForwardJump = Infinity;

    for (let i = 0; i < neighbors.length; i += 1) {
      const neighbor = neighbors[i];
      const neighborPos = cycleIndex.get(neighbor);
      if (neighborPos === undefined) {
        continue;
      }

      const forwardJump = cyclicDistance(headPos, neighborPos, cycleLength);
      if (forwardJump <= 0 || forwardJump >= safeWindow) {
        continue;
      }

      const wouldEat = neighbor === fruit;
      const isOccupied = snake.occupied?.has?.(neighbor) ?? false;
      const tailCellCandidate = neighbor === tailCell;
      const cellFree = !isOccupied || (tailCellCandidate && !wouldEat);

      if (!cellFree) {
        continue;
      }

      const distanceToFruit = cyclicDistance(neighborPos, fruitPos, cycleLength);

      if (
        distanceToFruit < bestDistance ||
        (distanceToFruit === bestDistance && forwardJump < bestForwardJump)
      ) {
        bestShortcut = {
          cell: neighbor,
          cyclePosition: neighborPos,
          forwardJump,
          distanceToFruit,
          safeWindow,
        };
        bestDistance = distanceToFruit;
        bestForwardJump = forwardJump;

        if (distanceToFruit === 0) {
          break;
        }
      }
    }

    return bestShortcut;
  }

  /**
   * Validate that a shortcut move is safe for the snake to take.
   *
   * @param {number} fromCell - Current head cell.
   * @param {number} toCell - Target shortcut cell.
   * @param {Object} gameState - Engine game state.
   * @param {Object} runtimeConfig - Resolved runtime configuration.
   * @returns {Object} Validation metadata describing shortcut safety.
   */
  validateShortcut(fromCell, toCell, gameState, runtimeConfig) {
    const { cycle, cycleIndex, snake } = gameState ?? {};
    const { safetyBuffer } = runtimeConfig;

    if (!cycle || !cycleIndex || typeof cycleIndex.get !== 'function') {
      return {
        valid: false,
        reason: 'Invalid cycle data',
      };
    }

    const fromPos = cycleIndex.get(fromCell);
    const toPos = cycleIndex.get(toCell);

    if (fromPos === undefined || toPos === undefined) {
      return {
        valid: false,
        reason: 'Cells not in cycle',
      };
    }

    const jump = cyclicDistance(fromPos, toPos, cycle.length);
    if (jump <= 1) {
      return {
        valid: false,
        reason: 'Not a shortcut (jump <= 1)',
      };
    }

    const tailCell = snake?.body?.[snake.body.length - 1];
    const tailPos = tailCell === undefined ? undefined : cycleIndex.get(tailCell);
    const newTailDistance = tailPos === undefined
      ? 0
      : cyclicDistance(toPos, tailPos, cycle.length);

    if (newTailDistance < (snake?.body?.length ?? 0) + safetyBuffer) {
      return {
        valid: false,
        reason: 'Would get too close to tail',
      };
    }

    return {
      valid: true,
      reason: 'Shortcut is safe',
      jump,
      newTailDistance,
    };
  }

  /**
   * Get all neighbouring cells for a given board index.
   *
   * @param {number} cellIndex - Index of the cell to inspect.
   * @param {Object} gameState - Engine state containing grid configuration.
   * @returns {number[]} List of neighbour indices.
   */
  getNeighbors(cellIndex, gameState) {
    const rows = Number.isInteger(gameState?.config?.rows) ? gameState.config.rows : 0;
    const cols = Number.isInteger(gameState?.config?.cols) ? gameState.config.cols : 0;

    if (!Number.isInteger(cellIndex) || cellIndex < 0 || rows <= 0 || cols <= 0) {
      return [];
    }

    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const neighbors = [];

    if (row > 0) neighbors.push(cellIndex - cols);
    if (row < rows - 1) neighbors.push(cellIndex + cols);
    if (col > 0) neighbors.push(cellIndex - 1);
    if (col < cols - 1) neighbors.push(cellIndex + 1);

    return neighbors;
  }

  /**
   * Follow the Hamiltonian cycle when shortcuts are not available.
   *
   * @param {Object} gameState - Engine state.
   * @returns {import('../PathfindingStrategy.js').PlanningResult} Planning result describing the next move.
   */
  followCycle(gameState) {
    const cycle = gameState?.cycle;
    const cycleIndex = gameState?.cycleIndex;

    if (!cycle || !cycleIndex || typeof cycleIndex.get !== 'function') {
      const totalCells = this.cachedCycleLength
        ?? (gameState?.config?.rows ?? 0) * (gameState?.config?.cols ?? 0);
      const fallbackMove = isValidCellIndex(gameState?.fruit, totalCells) ? gameState.fruit : 0;
      return this.createPlanningResult(fallbackMove, {
        reason: 'Fallback move - invalid cycle data',
        plannedPath: this.calculatePlannedPath(gameState, { nextMove: fallbackMove }),
        metadata: {
          shortcutInfo: null,
          cycleAvailable: false,
        },
      });
    }

    const headCell = getHead(gameState.snake);
    const headPos = cycleIndex.get(headCell);

    if (headPos === undefined) {
      const nextMove = cycle[0] ?? 0;
      return this.createPlanningResult(nextMove, {
        reason: 'Fallback move - head not on cycle',
        plannedPath: this.calculatePlannedPath(gameState, { nextMove }),
        metadata: {
          shortcutInfo: null,
          cycleAvailable: true,
        },
      });
    }

    const nextPos = (headPos + 1) % cycle.length;
    const nextMove = cycle[nextPos];
    return this.createPlanningResult(nextMove, {
      reason: 'Following Hamiltonian cycle',
      plannedPath: this.calculatePlannedPath(gameState, { nextMove }),
      metadata: {
        shortcutInfo: null,
        cycleAvailable: true,
      },
    });
  }

  /**
   * Calculate the planned path along the Hamiltonian cycle.
   *
   * @param {Object} gameState - Engine game state used for planning.
   * @param {Object} planResult - Result from {@link planNextMove}.
   * @returns {number[]} Planned path from the upcoming head position to the fruit.
   */
  calculatePlannedPath(gameState, planResult) {
    const { snake, fruit, cycle, cycleIndex } = gameState ?? {};

    if (!Array.isArray(cycle) || !cycleIndex || typeof cycleIndex.get !== 'function') {
      return [];
    }

    if (!snake || getLength(snake) === 0 || !Number.isInteger(fruit) || fruit < 0) {
      return [];
    }

    const startCell = Number.isInteger(planResult?.nextMove)
      ? planResult.nextMove
      : getHead(snake);

    const headPos = cycleIndex.get(startCell);
    const fruitPos = cycleIndex.get(fruit);

    if (headPos === undefined || fruitPos === undefined) {
      return [];
    }

    const path = [];
    const maxSteps = Math.min(cycle.length, 20);
    let currentPos = headPos;

    while (currentPos !== fruitPos && path.length < maxSteps) {
      currentPos = (currentPos + 1) % cycle.length;
      path.push(cycle[currentPos]);
    }

    return path;
  }

  /**
   * @inheritdoc
   */
  async planNextMove(standardState, options = {}) {
    const gameState = standardState?.original;

    if (!gameState?.snake || gameState.snake.body?.length === 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid state',
        metadata: {
          shortcutInfo: null,
          cycleAvailable: Boolean(gameState?.cycle?.length),
        },
      });
    }

    const runtimeConfig = this.resolveRuntimeConfig(options);
    const headCell = getHead(gameState.snake);

    if (runtimeConfig.shortcutsEnabled) {
      const shortcut = this.findShortcut(gameState, runtimeConfig);
      if (shortcut) {
        const validation = this.validateShortcut(headCell, shortcut.cell, gameState, runtimeConfig);
        if (validation.valid) {
          return this.createPlanningResult(shortcut.cell, {
            isShortcut: true,
            reason: 'Taking safe shortcut',
            plannedPath: this.calculatePlannedPath(gameState, { nextMove: shortcut.cell }),
            metadata: {
              shortcutInfo: shortcut,
              safeWindow: shortcut.safeWindow,
            },
          });
        }
      }
    }

    return this.followCycle(gameState);
  }
}
