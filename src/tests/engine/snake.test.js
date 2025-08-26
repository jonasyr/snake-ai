// FILE: src/tests/engine/snake.test.js
/**
 * Unit tests for snake module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSnake,
  moveSnake,
  wouldCollide,
  getHead,
  getTail,
  occupiesCell,
  validateSnake,
} from '../../engine/snake.js';

describe('Snake Engine', () => {
  let snake;

  beforeEach(() => {
    snake = createSnake(0);
  });

  describe('createSnake', () => {
    it('should create snake with single head cell', () => {
      expect(snake.body).toEqual([0]);
      expect(snake.occupied.has(0)).toBe(true);
      expect(snake.occupied.size).toBe(1);
    });
  });

  describe('moveSnake', () => {
    it('should move snake without growing', () => {
      const newSnake = moveSnake(snake, 1, false);

      expect(newSnake.body).toEqual([1]);
      expect(newSnake.occupied.has(1)).toBe(true);
      expect(newSnake.occupied.has(0)).toBe(false);
      expect(newSnake.occupied.size).toBe(1);
    });

    it('should move snake with growing', () => {
      const newSnake = moveSnake(snake, 1, true);

      expect(newSnake.body).toEqual([1, 0]);
      expect(newSnake.occupied.has(1)).toBe(true);
      expect(newSnake.occupied.has(0)).toBe(true);
      expect(newSnake.occupied.size).toBe(2);
    });

    it('should handle multi-segment snake', () => {
      // Create longer snake
      let longSnake = moveSnake(snake, 1, true);
      longSnake = moveSnake(longSnake, 2, true);

      expect(longSnake.body).toEqual([2, 1, 0]);

      // Move without growing
      const moved = moveSnake(longSnake, 3, false);
      expect(moved.body).toEqual([3, 2, 1]);
      expect(moved.occupied.has(0)).toBe(false);
    });
  });

  describe('wouldCollide', () => {
    it('should detect collision with body', () => {
      // Create snake: [1, 0]
      const newSnake = moveSnake(snake, 1, true);

      expect(wouldCollide(newSnake, 0, false)).toBe(false); // Moving into tail when not eating should be allowed
      expect(wouldCollide(newSnake, 1, false)).toBe(true);  // Moving into head should cause collision
      expect(wouldCollide(newSnake, 2, false)).toBe(false); // Moving to empty cell should be safe
    });

    it('should allow moving into tail when not eating', () => {
      const newSnake = moveSnake(snake, 1, true);

      expect(wouldCollide(newSnake, 0, false)).toBe(false);
    });

    it('should detect collision with tail when eating', () => {
      const newSnake = moveSnake(snake, 1, true);

      expect(wouldCollide(newSnake, 0, true)).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should get head correctly', () => {
      expect(getHead(snake)).toBe(0);

      const moved = moveSnake(snake, 5);
      expect(getHead(moved)).toBe(5);
    });

    it('should get tail correctly', () => {
      expect(getTail(snake)).toBe(0);

      const grown = moveSnake(snake, 1, true);
      expect(getTail(grown)).toBe(0);
    });

    it('should check cell occupation', () => {
      expect(occupiesCell(snake, 0)).toBe(true);
      expect(occupiesCell(snake, 1)).toBe(false);
    });
  });

  describe('validateSnake', () => {
    it('should validate correct snake', () => {
      expect(validateSnake(snake, 100)).toBe(true);
    });

    it('should reject invalid snake structures', () => {
      expect(validateSnake(null, 100)).toBe(false);
      expect(validateSnake({}, 100)).toBe(false);
      expect(validateSnake({ body: [0], occupied: new Set() }, 100)).toBe(false);
    });

    it('should reject duplicate positions', () => {
      const invalid = { body: [0, 0], occupied: new Set([0]) };
      expect(validateSnake(invalid, 100)).toBe(false);
    });
  });
});
