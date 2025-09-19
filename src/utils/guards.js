// FILE: src/utils/guards.js
/**
 * Type guards and validation utilities
 */

/**
 * Validates if a position is within grid bounds
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} rows - Total rows
 * @param {number} cols - Total columns
 * @returns {boolean} Whether position is valid
 */
export function isValidPosition(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/**
 * Validates game configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether configuration is valid
 */
export function isValidGameConfig(config) {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const { rows, cols, seed } = config;

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    return false;
  }

  if (rows <= 0 || cols <= 0) {
    return false;
  }

  if (rows * cols < 4) {
    return false;
  }

  if (rows % 2 !== 0 && cols % 2 !== 0) {
    return false;
  }

  if (seed !== undefined && !Number.isSafeInteger(Math.trunc(seed))) {
    return false;
  }

  return true;
}

/**
 * Validates cell index for given grid dimensions
 * @param {number} cellIndex - Cell index to validate
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether cell index is valid
 */
export function isValidCellIndex(cellIndex, totalCells) {
  return Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < totalCells;
}

/**
 * Validates snake body array
 * @param {number[]} body - Snake body array
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether snake body is valid
 */
export function isValidSnakeBody(body, totalCells) {
  if (!Array.isArray(body) || body.length === 0) return false;

  const seen = new Set();
  for (const cell of body) {
    if (!isValidCellIndex(cell, totalCells) || seen.has(cell)) {
      return false;
    }
    seen.add(cell);
  }
  return true;
}
