// FILE: src/engine/grid.js
/**
 * Grid utilities and operations
 */

import { positionToIndex, indexToPosition } from '../utils/math.js';
import { isValidPosition } from '../utils/guards.js';

/**
 * Creates a grid coordinate system
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {Object} Grid utility functions
 */
export function createGrid(rows, cols) {
  const totalCells = rows * cols;

  return {
    rows,
    cols,
    totalCells,

    /**
     * Convert position to cell index
     * @param {number} row - Row coordinate
     * @param {number} col - Column coordinate
     * @returns {number} Cell index
     */
    getIndex: (row, col) => positionToIndex(row, col, cols),

    /**
     * Convert cell index to position
     * @param {number} index - Cell index
     * @returns {[number, number]} [row, col] coordinates
     */
    getPosition: index => indexToPosition(index, cols),

    /**
     * Check if position is within bounds
     * @param {number} row - Row coordinate
     * @param {number} col - Column coordinate
     * @returns {boolean} Whether position is valid
     */
    inBounds: (row, col) => isValidPosition(row, col, rows, cols),

    /**
     * Get all cell indices in row-major order
     * @returns {number[]} Array of all cell indices
     */
    getAllCells: () => Array.from({ length: totalCells }, (_, i) => i),

    /**
     * Get Manhattan distance between two cells
     * @param {number} cell1 - First cell index
     * @param {number} cell2 - Second cell index
     * @returns {number} Manhattan distance
     */
    manhattanDistance: (cell1, cell2) => {
      const [r1, c1] = indexToPosition(cell1, cols);
      const [r2, c2] = indexToPosition(cell2, cols);
      return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    },

    /**
     * Get neighboring cells within bounds
     * @param {number} cellIndex - Center cell index
     * @returns {number[]} Array of neighbor indices
     */
    getNeighbors: cellIndex => {
      const [row, col] = indexToPosition(cellIndex, cols);
      const neighbors = [];

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol, rows, cols)) {
          neighbors.push(positionToIndex(newRow, newCol, cols));
        }
      }

      return neighbors;
    },
  };
}
