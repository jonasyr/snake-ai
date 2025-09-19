// FILE: src/utils/math.js
/**
 * Mathematical utilities for the game engine
 */

/**
 * Converts row/col coordinates to cell index
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} cols - Total columns
 * @returns {number} Cell index
 */
export function positionToIndex(row, col, cols) {
  return row * cols + col;
}

/**
 * Converts cell index to row/col coordinates
 * @param {number} index - Cell index
 * @param {number} cols - Total columns
 * @returns {[number, number]} [row, col] coordinates
 */
export function indexToPosition(index, cols) {
  return [Math.floor(index / cols), index % cols];
}

/**
 * Calculates distance along Hamiltonian cycle
 * @param {number} from - Starting cycle position
 * @param {number} to - Ending cycle position
 * @param {number} cycleLength - Total cycle length
 * @returns {number} Distance along cycle
 */
export function cyclicDistance(from, to, cycleLength) {
  return (to - from + cycleLength) % cycleLength;
}

/**
 * Finds neighbors of a cell within grid bounds
 * @param {number} cellIndex - Cell index
 * @param {number} rows - Grid rows
 * @param {number} cols - Grid columns
 * @returns {number[]} Array of neighbor cell indices
 */
export function getNeighbors(cellIndex, rows, cols) {
  const [row, col] = indexToPosition(cellIndex, cols);
  const neighbors = [];

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1], // up, down, left, right
  ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      neighbors.push(positionToIndex(newRow, newCol, cols));
    }
  }

  return neighbors;
}

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
