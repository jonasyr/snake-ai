// FILE: src/engine/shortcuts.js
/**
 * Safe shortcut planning and validation - FIXED VERSION
 */

import { cyclicDistance } from '../utils/math.js';

/**
 * Find safe shortcut moves towards target - matches old version logic
 * @param {Object} gameState - Current game state
 * @param {Object} config - Game configuration
 * @returns {Object|null} Best shortcut move or null
 */
export function findShortcut(gameState, config) {
  const { snake, fruit, cycle, cycleIndex } = gameState;
  const { safetyBuffer = 2, lateGameLock = 4 } = config;

  if (!snake.body || snake.body.length === 0) return null;

  const headCell = snake.body[0];
  const tailCell = snake.body[snake.body.length - 1];
  const headCyclePos = cycleIndex.get(headCell);
  const tailCyclePos = cycleIndex.get(tailCell);
  const fruitCyclePos = cycleIndex.get(fruit);

  if (headCyclePos === undefined || tailCyclePos === undefined || fruitCyclePos === undefined) {
    return null;
  }

  // Calculate safe window based on current snake configuration
  const cycleLength = cycle.length;
  const snakeLength = snake.body.length;
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

  // Get safe neighboring cells - use same logic as old version
  const neighbors = getSafeNeighborsFixed(headCell, gameState);

  let bestShortcut = null;
  let bestDistance = cyclicDistance((headCyclePos + 1) % cycleLength, fruitCyclePos, cycleLength);
  let bestForwardJump = Infinity;

  for (const neighbor of neighbors) {
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
    }
  }

  return bestShortcut;
}

/**
 * Get safe neighbors - fixed version that matches old logic
 */
function getSafeNeighborsFixed(cellIndex, gameState) {
  const { rows, cols } = gameState.config || { rows: 20, cols: 20 };
  const neighbors = [];

  // Convert cell index to row, col
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;

  // Check all 4 directions
  const directions = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    // Check bounds
    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      const neighborCell = newRow * cols + newCol;
      neighbors.push(neighborCell);
    }
  }

  return neighbors;
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
  const tailCell = gameState.snake.body[gameState.snake.body.length - 1];
  const tailPos = cycleIndex.get(tailCell);
  const newTailDistance = cyclicDistance(toPos, tailPos, cycle.length);

  if (newTailDistance < gameState.snake.body.length + safetyBuffer) {
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
  // ✅ Only try shortcuts if enabled in config
  const shortcutsEnabled = config?.shortcutsEnabled !== false;
  
  if (shortcutsEnabled) {
    const shortcut = findShortcut(gameState, config);

    if (shortcut) {
      // Double-check the shortcut is actually safe
      const validation = validateShortcut(gameState.snake.body[0], shortcut.cell, gameState, config);

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
  const headCell = gameState.snake.body[0];
  const headPos = gameState.cycleIndex.get(headCell);
  
  if (headPos === undefined) {
    // Fallback - this shouldn't happen
    console.warn('Head not found in cycle, using fallback');
    return {
      nextMove: gameState.cycle[0],
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