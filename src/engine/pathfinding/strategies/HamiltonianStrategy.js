// FILE: src/engine/pathfinding/strategies/HamiltonianStrategy.js
/**
 * Hamiltonian cycle based planning strategy with optional shortcuts.
 */

import { PathfindingStrategy } from '../PathfindingStrategy.js';
import { findShortcut, validateShortcut } from '../../shortcuts.js';
import { getHead } from '../../snake.js';
import { DEFAULT_CONFIG } from '../../../utils/constants.js';
import { isValidCellIndex } from '../../../utils/guards.js';

function resolveConfig(baseConfig, overrides, options) {
  return {
    ...DEFAULT_CONFIG,
    ...baseConfig,
    ...overrides,
    ...options,
  };
}

/**
 * Strategy that mirrors the legacy `planPath` behaviour.
 */
export class HamiltonianStrategy extends PathfindingStrategy {
  constructor(config = {}) {
    super(config);
    this.name = 'hamiltonian';
    this.isExpensive = false;
  }

  async initialize(initialState) {
    await super.initialize(initialState);
    this.cachedCycleLength = Number.isInteger(initialState?.cycle?.length)
      ? initialState.cycle.length
      : null;
  }

  /**
   * Follow the Hamiltonian cycle when shortcuts are not available.
   *
   * @param {Object} gameState - Engine state.
   * @returns {Object} Planning result.
   */
  followCycle(gameState) {
    const cycle = gameState.cycle;
    const cycleIndex = gameState.cycleIndex;

    if (!cycle || !cycleIndex || typeof cycleIndex.get !== 'function') {
      const totalCells = this.cachedCycleLength ?? (gameState.config?.rows ?? 0) * (gameState.config?.cols ?? 0);
      const fallbackMove = isValidCellIndex(gameState.fruit, totalCells) ? gameState.fruit : 0;
      return {
        nextMove: fallbackMove,
        isShortcut: false,
        reason: 'Fallback move - invalid cycle data',
        shortcutInfo: null,
      };
    }

    const headCell = getHead(gameState.snake);
    const headPos = cycleIndex.get(headCell);

    if (headPos === undefined) {
      return {
        nextMove: cycle[0] ?? 0,
        isShortcut: false,
        reason: 'Fallback move - head not on cycle',
        shortcutInfo: null,
      };
    }

    const nextPos = (headPos + 1) % cycle.length;
    const nextCell = cycle[nextPos];

    return {
      nextMove: nextCell,
      isShortcut: false,
      reason: 'Following Hamiltonian cycle',
      shortcutInfo: null,
    };
  }

  /**
   * @inheritdoc
   */
  async planNextMove(standardState, options = {}) {
    const gameState = standardState.original;
    const config = resolveConfig(gameState?.config, this.config, options);

    if (!gameState?.snake || gameState.snake.body?.length === 0) {
      return {
        nextMove: 0,
        isShortcut: false,
        reason: 'Invalid state',
        shortcutInfo: null,
      };
    }

    const shortcutsEnabled = config.shortcutsEnabled !== false;
    const headCell = getHead(gameState.snake);

    if (shortcutsEnabled) {
      const shortcut = findShortcut(gameState, config);
      if (shortcut) {
        const validation = validateShortcut(headCell, shortcut.cell, gameState, config);
        if (validation.valid) {
          return {
            nextMove: shortcut.cell,
            isShortcut: true,
            reason: 'Taking safe shortcut',
            shortcutInfo: shortcut,
          };
        }
      }
    }

    return this.followCycle(gameState);
  }
}
