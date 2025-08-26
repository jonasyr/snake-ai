// FILE: src/engine/hamiltonian.js
/**
 * Hamiltonian cycle generation and navigation
 */

import { createGrid } from './grid.js';
import { cyclicDistance } from '../utils/math.js';

/**
 * Generate a simple Hamiltonian cycle using row-major traversal
 * @param {number} rows - Grid rows
 * @param {number} cols - Grid columns
 * @returns {Object} Cycle data structure
 */
export function generateHamiltonianCycle(rows, cols) {
  const grid = createGrid(rows, cols);
  const cycle = [];

  // Simple row-major order with alternating direction
  for (let row = 0; row < rows; row++) {
    if (row % 2 === 0) {
      // Left to right
      for (let col = 0; col < cols; col++) {
        cycle.push(grid.getIndex(row, col));
      }
    } else {
      // Right to left
      for (let col = cols - 1; col >= 0; col--) {
        cycle.push(grid.getIndex(row, col));
      }
    }
  }

  // Create lookup map for O(1) position queries
  const cycleIndex = new Map();
  for (let i = 0; i < cycle.length; i++) {
    cycleIndex.set(cycle[i], i);
  }

  return {
    cycle,
    cycleIndex,
    length: cycle.length,

    /**
     * Get next cell in cycle
     * @param {number} cellIndex - Current cell
     * @returns {number} Next cell in cycle
     */
    getNext: cellIndex => {
      const pos = cycleIndex.get(cellIndex);
      if (pos === undefined) throw new Error(`Cell ${cellIndex} not in cycle`);
      return cycle[(pos + 1) % cycle.length];
    },

    /**
     * Get previous cell in cycle
     * @param {number} cellIndex - Current cell
     * @returns {number} Previous cell in cycle
     */
    getPrev: cellIndex => {
      const pos = cycleIndex.get(cellIndex);
      if (pos === undefined) throw new Error(`Cell ${cellIndex} not in cycle`);
      return cycle[(pos - 1 + cycle.length) % cycle.length];
    },

    /**
     * Get distance between two cells along cycle
     * @param {number} from - Starting cell
     * @param {number} to - Ending cell
     * @returns {number} Distance along cycle
     */
    getDistance: (from, to) => {
      const fromPos = cycleIndex.get(from);
      const toPos = cycleIndex.get(to);
      if (fromPos === undefined || toPos === undefined) {
        throw new Error('Cells not in cycle');
      }
      return cyclicDistance(fromPos, toPos, cycle.length);
    },

    /**
     * Get path from one cell to another along cycle
     * @param {number} from - Starting cell
     * @param {number} to - Ending cell
     * @returns {number[]} Path along cycle
     */
    getPath: (from, to) => {
      const distance = this.getDistance(from, to);
      const path = [];
      let current = from;

      for (let i = 0; i < distance; i++) {
        current = this.getNext(current);
        path.push(current);
      }

      return path;
    },
  };
}

/**
 * Validate that a cycle visits every cell exactly once
 * @param {number[]} cycle - Cycle array
 * @param {number} totalCells - Expected total cells
 * @returns {boolean} Whether cycle is valid
 */
export function validateCycle(cycle, totalCells) {
  if (cycle.length !== totalCells) return false;

  const seen = new Set(cycle);
  return seen.size === totalCells && cycle.every(cell => cell >= 0 && cell < totalCells);
}
