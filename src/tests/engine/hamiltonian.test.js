// FILE: src/tests/engine/hamiltonian.test.js
/**
 * Unit tests for Hamiltonian cycle generation
 */

import { describe, it, expect } from 'vitest';
import { generateHamiltonianCycle, validateCycle } from '../../engine/hamiltonian.js';

describe('Hamiltonian Cycle', () => {
  describe('generateHamiltonianCycle', () => {
    it('should generate valid cycle for small grid', () => {
      const hamiltonian = generateHamiltonianCycle(3, 3);

      expect(hamiltonian.cycle).toHaveLength(9);
      expect(hamiltonian.cycleIndex.size).toBe(9);
      expect(validateCycle(hamiltonian.cycle, 9)).toBe(true);
    });

    it('should generate valid cycle for standard grid', () => {
      const hamiltonian = generateHamiltonianCycle(20, 20);

      expect(hamiltonian.cycle).toHaveLength(400);
      expect(hamiltonian.cycleIndex.size).toBe(400);
      expect(validateCycle(hamiltonian.cycle, 400)).toBe(true);
    });

    it('should have correct next/prev relationships', () => {
      const hamiltonian = generateHamiltonianCycle(4, 4);

      // Test a few positions
      const first = hamiltonian.cycle[0];
      const second = hamiltonian.cycle[1];
      const last = hamiltonian.cycle[15];

      expect(hamiltonian.getNext(first)).toBe(second);
      expect(hamiltonian.getNext(last)).toBe(first);
      expect(hamiltonian.getPrev(second)).toBe(first);
    });

    it('should calculate distances correctly', () => {
      const hamiltonian = generateHamiltonianCycle(4, 4);
      const first = hamiltonian.cycle[0];
      const middle = hamiltonian.cycle[8];

      expect(hamiltonian.getDistance(first, middle)).toBe(8);
      expect(hamiltonian.getDistance(middle, first)).toBe(8);
    });
  });

  describe('validateCycle', () => {
    it('should accept valid cycles', () => {
      expect(validateCycle([0, 1, 2, 3], 4)).toBe(true);
      expect(validateCycle([3, 0, 2, 1], 4)).toBe(true);
    });

    it('should reject invalid cycles', () => {
      expect(validateCycle([0, 1, 2], 4)).toBe(false); // Wrong length
      expect(validateCycle([0, 1, 1, 3], 4)).toBe(false); // Duplicates
      expect(validateCycle([0, 1, 2, 4], 4)).toBe(false); // Out of bounds
      expect(validateCycle([-1, 0, 1, 2], 4)).toBe(false); // Negative
    });
  });
});
