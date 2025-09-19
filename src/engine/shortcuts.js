// FILE: src/engine/shortcuts.js
/**
 * Safe shortcut planning and validation - FIXED VERSION
 */

import { cyclicDistance } from '../utils/math.js';
import { getHead, getTail, getLength } from './snake.js';

const EMPTY_ARRAY = Object.freeze([]);
const neighborCache = new WeakMap();

function getNeighborTable(gameState) {
  const config = gameState?.config;
  if (!config) {
    return null;
  }

  let table = neighborCache.get(config);
  if (table) {
    return table;
  }

  const rows = Number.isInteger(config.rows) ? config.rows : 0;
  const cols = Number.isInteger(config.cols) ? config.cols : 0;
  const total = rows * cols;

  table = new Array(total);

  for (let cell = 0; cell < total; cell += 1) {
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    const neighbors = [];

    if (row > 0) neighbors.push(cell - cols);
    if (row < rows - 1) neighbors.push(cell + cols);
    if (col > 0) neighbors.push(cell - 1);
    if (col < cols - 1) neighbors.push(cell + 1);

    table[cell] = neighbors;
  }

  neighborCache.set(config, table);
  return table;
}

function getNeighborCells(cellIndex, gameState) {
  const table = getNeighborTable(gameState);
  if (!table || cellIndex < 0 || cellIndex >= table.length) {
    return EMPTY_ARRAY;
  }
  return table[cellIndex] ?? EMPTY_ARRAY;
}

/**
 * Find safe shortcut moves towards target - matches old version logic
 * @param {Object} gameState - Current game state
 * @param {Object} config - Game configuration
 * @returns {Object|null} Best shortcut move or null
 */
export function findShortcut(gameState, config) {
  const { snake, fruit, cycle, cycleIndex } = gameState;
  const { safetyBuffer = 2, lateGameLock = 4 } = config;

  if (!snake || getLength(snake) === 0 || !cycle || !cycleIndex) {
    return null;
  }

  // Check if cycleIndex is a Map
  if (typeof cycleIndex.get !== 'function') {
    console.warn('cycleIndex is not a Map:', typeof cycleIndex);
    return null;
  }

  const headCell = getHead(snake);
  const tailCell = getTail(snake);
  const headCyclePos = cycleIndex.get(headCell);
  const tailCyclePos = cycleIndex.get(tailCell);
  const fruitCyclePos = cycleIndex.get(fruit);

  if (headCyclePos === undefined || tailCyclePos === undefined || fruitCyclePos === undefined) {
    return null;
  }

  // Calculate safe window based on current snake configuration
  const cycleLength = cycle.length;
  const snakeLength = getLength(snake);
  const tailDistance = cyclicDistance(headCyclePos, tailCyclePos, cycleLength);

  // ✅ Match the old version's window calculation exactly
  const bufferToUse = snakeLength <= 3 ? 0 : safetyBuffer;
  const safeWindow = Math.max(0, tailDistance - bufferToUse);
  const freeCells = cycleLength - snakeLength;

  // ✅ Match old version's shortcut allowance logic
  const shortcutsAllowed = safeWindow > 1 && (freeCells > lateGameLock || snakeLength <= 5);

  if (!shortcutsAllowed) {
    return null;
  }

  const neighbors = getNeighborCells(headCell, gameState);

  let bestShortcut = null;
  let bestDistance = cyclicDistance((headCyclePos + 1) % cycleLength, fruitCyclePos, cycleLength);
  let bestForwardJump = Infinity;

  for (let i = 0; i < neighbors.length; i += 1) {
    const neighbor = neighbors[i];
    const neighborCyclePos = cycleIndex.get(neighbor);
    if (neighborCyclePos === undefined) continue;

    const forwardJump = cyclicDistance(headCyclePos, neighborCyclePos, cycleLength);

    // ✅ Match old version's window check exactly
    if (forwardJump <= 0 || forwardJump >= safeWindow) continue;

    // ✅ Check if we can move to this cell safely
    const wouldEat = neighbor === fruit;
    const isOccupied = snake.occupied.has(neighbor);
    const isSteppingIntoTail = neighbor === tailCell;
    const cellFreeOrTailMove = !isOccupied || (isSteppingIntoTail && !wouldEat);

    if (!cellFreeOrTailMove) continue;

    // Calculate distance to fruit from this position
    const distanceToFruit = cyclicDistance(neighborCyclePos, fruitCyclePos, cycleLength);

    // ✅ Prefer moves closer to fruit, tiebreak by smaller jumps (match old version)
    if (
      distanceToFruit < bestDistance ||
      (distanceToFruit === bestDistance && forwardJump < bestForwardJump)
    ) {
      bestShortcut = {
        cell: neighbor,
        cyclePosition: neighborCyclePos,
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
 * Validate that a shortcut move is safe
 * @param {number} fromCell - Current position
 * @param {number} toCell - Target position
 * @param {Object} gameState - Current game state
 * @param {Object} config - Game configuration
 * @returns {Object} Validation result
 */
export function validateShortcut(fromCell, toCell, gameState, config) {
  const { cycle, cycleIndex } = gameState;
  const { safetyBuffer = 2 } = config;

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

  // Verify we can still reach our tail after this move
  const tailCell = getTail(gameState.snake);
  const tailPos = cycleIndex.get(tailCell);
  const newTailDistance = tailPos === undefined
    ? 0
    : cyclicDistance(toPos, tailPos, cycle.length);

  if (newTailDistance < getLength(gameState.snake) + safetyBuffer) {
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
 * Plan path from current position to fruit using shortcuts when safe
 * @param {Object} gameState - Current game state
 * @param {Object} config - Game configuration
 * @returns {Object} Path planning result
 */
export function planPath(gameState, config) {
  if (!gameState?.snake || getLength(gameState.snake) === 0) {
    console.warn('Invalid game state for path planning');
    return {
      nextMove: 0,
      isShortcut: false,
      reason: 'Invalid state',
      shortcutInfo: null,
    };
  }

  // ✅ Only try shortcuts if enabled in config
  const shortcutsEnabled = config?.shortcutsEnabled !== false;
  
  const headCell = getHead(gameState.snake);

  if (shortcutsEnabled) {
    const shortcut = findShortcut(gameState, config);

    if (shortcut) {
      // Double-check the shortcut is actually safe
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

  // Follow Hamiltonian cycle
  if (!gameState.cycleIndex || typeof gameState.cycleIndex.get !== 'function') {
    console.warn('Invalid cycleIndex in game state');
    return {
      nextMove: (headCell + 1) % (gameState.cycle?.length || 400),
      isShortcut: false,
      reason: 'Fallback move - invalid cycle index',
      shortcutInfo: null,
    };
  }
  
  const headPos = gameState.cycleIndex.get(headCell);
  
  if (headPos === undefined) {
    // Fallback - this shouldn't happen
    console.warn('Head not found in cycle, using fallback');
    return {
      nextMove: gameState.cycle?.[0] || 0,
      isShortcut: false,
      reason: 'Fallback move',
      shortcutInfo: null,
    };
  }
  
  const nextPos = (headPos + 1) % gameState.cycle.length;
  const nextCell = gameState.cycle[nextPos];

  return {
    nextMove: nextCell,
    isShortcut: false,
    reason: 'Following Hamiltonian cycle',
    shortcutInfo: null,
  };
}
