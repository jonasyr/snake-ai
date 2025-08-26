// FILE: src/engine/fruit.js
/**
 * Fruit spawning and management logic
 */

import { randomInt } from './rng.js';

/**
 * Find all free cells not occupied by snake
 * @param {Set<number>} occupied - Set of occupied cell indices
 * @param {number} totalCells - Total cells in grid
 * @returns {number[]} Array of free cell indices
 */
export function getFreeCells(occupied, totalCells) {
  const free = [];
  for (let i = 0; i < totalCells; i++) {
    if (!occupied.has(i)) {
      free.push(i);
    }
  }
  return free;
}

/**
 * Spawn a new fruit at random free location
 * @param {Set<number>} occupied - Set of occupied cell indices
 * @param {number} totalCells - Total cells in grid
 * @returns {number} New fruit cell index, or -1 if no free cells
 */
export function spawnFruit(occupied, totalCells) {
  const freeCells = getFreeCells(occupied, totalCells);

  if (freeCells.length === 0) {
    return -1; // Game complete - no free cells
  }

  const randomIndex = randomInt(0, freeCells.length);
  return freeCells[randomIndex];
}

/**
 * Check if fruit is at given position
 * @param {number} fruitCell - Current fruit cell index
 * @param {number} cell - Cell to check
 * @returns {boolean} Whether fruit is at cell
 */
export function isFruitAt(fruitCell, cell) {
  return fruitCell === cell;
}

/**
 * Validate fruit position
 * @param {number} fruitCell - Fruit cell index
 * @param {Set<number>} occupied - Occupied cells
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether fruit position is valid
 */
export function validateFruit(fruitCell, occupied, totalCells) {
  return fruitCell >= 0 && fruitCell < totalCells && !occupied.has(fruitCell);
}
