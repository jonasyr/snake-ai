// FILE: src/engine/hamiltonian.js
/**
 * Hamiltonian cycle generation and navigation - FIXED VERSION
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

  console.log('Generated Hamiltonian cycle:', {
    length: cycle.length,
    expectedLength: rows * cols,
    firstFew: cycle.slice(0, 10),
    cycleIndexSize: cycleIndex.size,
    isMap: cycleIndex instanceof Map,
    hasGetMethod: typeof cycleIndex.get === 'function'
  });

  // Verify the Map is working
  const testCell = cycle[0];
  const testPos = cycleIndex.get(testCell);
  console.log('Map test - cell:', testCell, 'position:', testPos);

  // Helper functions
  const getNext = (cellIndex) => {
    const pos = cycleIndex.get(cellIndex);
    if (pos === undefined) {
      console.error(`Cell ${cellIndex} not in cycle. Available cells:`, Array.from(cycleIndex.keys()).slice(0, 10));
      throw new Error(`Cell ${cellIndex} not in cycle`);
    }
    return cycle[(pos + 1) % cycle.length];
  };

  const getPrev = (cellIndex) => {
    const pos = cycleIndex.get(cellIndex);
    if (pos === undefined) {
      console.error(`Cell ${cellIndex} not in cycle`);
      throw new Error(`Cell ${cellIndex} not in cycle`);
    }
    return cycle[(pos - 1 + cycle.length) % cycle.length];
  };

  const getDistance = (from, to) => {
    const fromPos = cycleIndex.get(from);
    const toPos = cycleIndex.get(to);
    if (fromPos === undefined || toPos === undefined) {
      console.error('Cells not in cycle:', { from, to, fromPos, toPos });
      throw new Error('Cells not in cycle');
    }
    return cyclicDistance(fromPos, toPos, cycle.length);
  };

  const getPath = (from, to) => {
    const distance = getDistance(from, to);
    const path = [];
    let current = from;

    for (let i = 0; i < distance; i++) {
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
export function validateCycle(cycle, totalCells) {
  if (cycle.length !== totalCells) return false;

  const seen = new Set(cycle);
  return seen.size === totalCells && cycle.every(cell => cell >= 0 && cell < totalCells);
}