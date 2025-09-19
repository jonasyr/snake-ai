// FILE: src/engine/hamiltonian.js
/**
 * Hamiltonian cycle generation and navigation - FIXED VERSION
 */

import { createGrid } from './grid.js';
import { cyclicDistance, indexToPosition } from '../utils/math.js';

function assertValidGridDimensions(rows, cols) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new Error('Grid dimensions must be integers.');
  }

  if (rows <= 0 || cols <= 0) {
    throw new Error('Grid dimensions must be positive.');
  }

  if (rows * cols < 4) {
    throw new Error('Grid must contain at least four cells.');
  }

  if (rows % 2 !== 0 && cols % 2 !== 0) {
    throw new Error('Hamiltonian cycle requires at least one even dimension.');
  }
}

function buildCycleForEvenRows(rows, cols, grid) {
  const sequence = [];

  // Top row from left to right
  for (let col = 0; col < cols; col++) {
    sequence.push(grid.getIndex(0, col));
  }

  let currentCol = cols - 1;

  for (let row = 1; row < rows; row++) {
    sequence.push(grid.getIndex(row, currentCol));

    if (row === rows - 1) {
      for (let col = currentCol - 1; col >= 0; col--) {
        sequence.push(grid.getIndex(row, col));
      }
    } else if (row % 2 === 1) {
      for (let col = currentCol - 1; col >= 1; col--) {
        sequence.push(grid.getIndex(row, col));
      }
      currentCol = 1;
    } else {
      for (let col = currentCol + 1; col < cols; col++) {
        sequence.push(grid.getIndex(row, col));
      }
      currentCol = cols - 1;
    }
  }

  for (let row = rows - 2; row >= 1; row--) {
    sequence.push(grid.getIndex(row, 0));
  }

  return sequence;
}

function buildCycleForEvenCols(rows, cols, grid) {
  const sequence = [];

  for (let row = 0; row < rows; row++) {
    sequence.push(grid.getIndex(row, 0));
  }

  let currentRow = rows - 1;

  for (let col = 1; col < cols; col++) {
    sequence.push(grid.getIndex(currentRow, col));

    if (col === cols - 1) {
      for (let row = currentRow - 1; row >= 0; row--) {
        sequence.push(grid.getIndex(row, col));
      }
    } else if (col % 2 === 1) {
      for (let row = currentRow - 1; row >= 1; row--) {
        sequence.push(grid.getIndex(row, col));
      }
      currentRow = 1;
    } else {
      for (let row = currentRow + 1; row < rows; row++) {
        sequence.push(grid.getIndex(row, col));
      }
      currentRow = rows - 1;
    }
  }

  for (let col = cols - 2; col >= 1; col--) {
    sequence.push(grid.getIndex(0, col));
  }

  return sequence;
}

function createCycle(rows, cols, grid) {
  if (rows % 2 === 0) {
    return buildCycleForEvenRows(rows, cols, grid);
  }

  if (cols % 2 === 0) {
    return buildCycleForEvenCols(rows, cols, grid);
  }

  throw new Error('Hamiltonian cycle requires an even number of rows or columns');
}

/**
 * Generate a Hamiltonian cycle that visits every cell exactly once and
 * returns to the starting point using only orthogonal moves.
 */
export function generateHamiltonianCycle(rows, cols) {
  assertValidGridDimensions(rows, cols);
  const grid = createGrid(rows, cols);
  const cycle = createCycle(rows, cols, grid);

  if (cycle.length !== rows * cols) {
    throw new Error('Generated Hamiltonian cycle has incorrect length');
  }

  const cycleIndex = new Map();
  for (let i = 0; i < cycle.length; i++) {
    cycleIndex.set(cycle[i], i);
  }

  const getNext = (cellIndex) => {
    const pos = cycleIndex.get(cellIndex);
    if (pos === undefined) {
      throw new Error(`Cell ${cellIndex} not found in Hamiltonian cycle`);
    }
    return cycle[(pos + 1) % cycle.length];
  };

  const getPrev = (cellIndex) => {
    const pos = cycleIndex.get(cellIndex);
    if (pos === undefined) {
      throw new Error(`Cell ${cellIndex} not found in Hamiltonian cycle`);
    }
    return cycle[(pos - 1 + cycle.length) % cycle.length];
  };

  const getDistance = (from, to) => {
    const fromPos = cycleIndex.get(from);
    const toPos = cycleIndex.get(to);

    if (fromPos === undefined || toPos === undefined) {
      throw new Error('Cells must belong to the Hamiltonian cycle');
    }

    return cyclicDistance(fromPos, toPos, cycle.length);
  };

  const getPath = (from, to) => {
    const steps = getDistance(from, to);
    const path = [];
    let current = from;

    for (let i = 0; i < steps; i++) {
      current = getNext(current);
      path.push(current);
    }

    return path;
  };

  return {
    cycle,
    cycleIndex,
    length: cycle.length,
    getNext,
    getPrev,
    getDistance,
    getPath,
  };
}

/**
 * Validate that a cycle visits every cell exactly once
 * @param {number[]} cycle - Cycle array
 * @param {number} totalCells - Expected total cells
 * @returns {boolean} Whether cycle is valid
 */
export function validateCycle(cycle, rows, cols) {
  if (cycle.length !== rows * cols) return false;

  const seen = new Set(cycle);
  if (seen.size !== rows * cols) return false;

  const isValidIndex = cell => cell >= 0 && cell < rows * cols;
  if (!cycle.every(isValidIndex)) return false;

  const isAdjacent = (a, b) => {
    const [rowA, colA] = indexToPosition(a, cols);
    const [rowB, colB] = indexToPosition(b, cols);
    const rowDelta = Math.abs(rowA - rowB);
    const colDelta = Math.abs(colA - colB);
    return (rowDelta === 1 && colDelta === 0) || (rowDelta === 0 && colDelta === 1);
  };

  for (let i = 0; i < cycle.length; i++) {
    const current = cycle[i];
    const next = cycle[(i + 1) % cycle.length];
    if (!isAdjacent(current, next)) {
      return false;
    }
  }

  return true;
}