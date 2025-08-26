// FILE: src/engine/shortcuts.js
/**
 * Safe shortcut planning and validation
 */

import { getSafeNeighbors } from './collision.js';
import { cyclicDistance } from '../utils/math.js';

/**
 * Find safe shortcut moves towards target
 * @param {Object} gameState - Current game state
 * @param {Object} config - Game configuration
 * @returns {Object|null} Best shortcut move or null
 */
export function findShortcut(gameState, config) {
  const { snake, fruit, cycle, cycleIndex } = gameState;
  const { safetyBuffer = 2, lateGameLock = 4 } = config;

  const headCell = snake.body[0];
  const tailCell = snake.body[snake.body.length - 1];
  const headCyclePos = cycleIndex.get(headCell);
  const tailCyclePos = cycleIndex.get(tailCell);
  const fruitCyclePos = cycleIndex.get(fruit);

  // Calculate safe window based on current snake configuration
  const cycleLength = cycle.length;
  const snakeLength = snake.body.length;
  const tailDistance = cyclicDistance(headCyclePos, tailCyclePos, cycleLength);
  const safeWindow = Math.max(
    0,
    tailDistance - Math.max(safetyBuffer, snakeLength <= 3 ? 0 : safetyBuffer)
  );
  const freeCells = cycleLength - snakeLength;

  // Disable shortcuts in late game to prevent deadlocks
  const shortcutsAllowed = safeWindow > 1 && (freeCells > lateGameLock || snakeLength <= 5);

  if (!shortcutsAllowed) {
    return null;
  }

  // Get safe neighboring cells
  const neighbors = getSafeNeighbors(headCell, gameState);

  let bestShortcut = null;
  let bestDistance = Infinity;
  let bestForwardJump = Infinity;

  for (const neighbor of neighbors) {
    if (!cycleIndex.has(neighbor)) continue;

    const neighborCyclePos = cycleIndex.get(neighbor);
    const forwardJump = cyclicDistance(headCyclePos, neighborCyclePos, cycleLength);

    // Only consider moves within safe window
    if (forwardJump <= 0 || forwardJump >= safeWindow) continue;

    // Calculate distance to fruit from this position
    const distanceToFruit = cyclicDistance(neighborCyclePos, fruitCyclePos, cycleLength);

    // Prefer moves that are closer to fruit, with tiebreaking by smaller jumps
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
  const shortcut = findShortcut(gameState, config);

  if (shortcut) {
    // Validate the shortcut is actually safe
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

  // Follow Hamiltonian cycle
  const headCell = gameState.snake.body[0];
  const headPos = gameState.cycleIndex.get(headCell);
  const nextPos = (headPos + 1) % gameState.cycle.length;
  const nextCell = gameState.cycle[nextPos];

  return {
    nextMove: nextCell,
    isShortcut: false,
    reason: 'Following Hamiltonian cycle',
    shortcutInfo: null,
  };
}
