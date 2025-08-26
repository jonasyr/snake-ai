// FILE: src/engine/collision.js
/**
 * Collision detection and validation systems
 */

import { getNeighbors } from '../utils/math.js';

/**
 * Check if cell is within grid bounds
 * @param {number} cellIndex - Cell index to check
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether cell is in bounds
 */
export function isInBounds(cellIndex, totalCells) {
  return cellIndex >= 0 && cellIndex < totalCells;
}

/**
 * Check for collision with walls (out of bounds)
 * @param {number} cellIndex - Cell index to check
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether collision would occur
 */
export function wouldHitWall(cellIndex, totalCells) {
  return !isInBounds(cellIndex, totalCells);
}

/**
 * Check for collision with snake body
 * @param {number} cellIndex - Cell index to check
 * @param {Set<number>} occupied - Set of occupied cells
 * @param {number} tailCell - Current tail cell (may be vacated)
 * @param {boolean} willGrow - Whether snake will grow this move
 * @returns {boolean} Whether collision would occur
 */
export function wouldHitSelf(cellIndex, occupied, tailCell, willGrow = false) {
  if (!occupied.has(cellIndex)) {
    return false; // Cell is free
  }

  // If growing, tail doesn't move, so collision with any body part is fatal
  if (willGrow) {
    return true;
  }

  // If not growing, collision with tail is safe (tail will move)
  return cellIndex !== tailCell;
}

/**
 * Comprehensive collision check
 * @param {number} cellIndex - Cell to check
 * @param {Object} gameState - Current game state
 * @returns {Object} Collision result
 */
export function checkCollision(cellIndex, gameState) {
  const { snake, fruit } = gameState;
  const totalCells = gameState.cycle.length;
  const willEat = cellIndex === fruit;

  // Check bounds
  if (wouldHitWall(cellIndex, totalCells)) {
    return {
      collision: true,
      type: 'wall',
      reason: 'Move would go out of bounds',
    };
  }

  // Check self collision
  const tailCell = snake.body[snake.body.length - 1];
  if (wouldHitSelf(cellIndex, snake.occupied, tailCell, willEat)) {
    return {
      collision: true,
      type: 'self',
      reason: 'Move would hit snake body',
    };
  }

  return {
    collision: false,
    type: null,
    reason: 'Move is safe',
  };
}

/**
 * Get safe neighbor cells for given position
 * @param {number} cellIndex - Current position
 * @param {Object} gameState - Current game state
 * @returns {number[]} Array of safe neighbor cells
 */
export function getSafeNeighbors(cellIndex, gameState) {
  const { rows, cols } = gameState.config || { rows: 20, cols: 20 };
  const neighbors = getNeighbors(cellIndex, rows, cols);

  return neighbors.filter(neighbor => {
    const collision = checkCollision(neighbor, gameState);
    return !collision.collision;
  });
}
