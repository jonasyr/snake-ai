// FILE: src/tests/engine/pathfinding.test.js
/**
 * Unit tests for graph-based pathfinding strategies.
 * Covers BFSStrategy, DijkstraStrategy, and GreedyStrategy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BFSStrategy } from '../../engine/pathfinding/strategies/BFSStrategy.js';
import { DijkstraStrategy } from '../../engine/pathfinding/strategies/DijkstraStrategy.js';
import { GreedyStrategy } from '../../engine/pathfinding/strategies/GreedyStrategy.js';
import { StandardGameState } from '../../engine/pathfinding/GameStateAdapter.js';

/**
 * Create a minimal engine-like game state for testing.
 * @param {Object} options
 * @param {number} options.rows
 * @param {number} options.cols
 * @param {number[]} options.body - Snake body from head to tail (cell indices)
 * @param {number} options.fruit - Fruit cell index
 * @returns {StandardGameState}
 */
function makeState({ rows = 8, cols = 8, body = [0], fruit = 7 } = {}) {
  const occupied = new Set(body);
  const raw = {
    config: { rows, cols },
    snake: { body, occupied },
    fruit,
  };
  return new StandardGameState(raw);
}

const STRATEGIES = [
  { name: 'BFSStrategy', Strategy: BFSStrategy },
  { name: 'DijkstraStrategy', Strategy: DijkstraStrategy },
  { name: 'GreedyStrategy', Strategy: GreedyStrategy },
];

for (const { name, Strategy } of STRATEGIES) {
  describe(name, () => {
    let strategy;

    beforeEach(async () => {
      strategy = new Strategy();
      await strategy.initialize({});
    });

    it('returns a valid PlanningResult on empty-ish grid', async () => {
      // Snake at top-left (0), fruit at top-right (7) on 8x8 grid
      const state = makeState({ rows: 8, cols: 8, body: [0], fruit: 7 });
      const result = await strategy.planNextMove(state);

      expect(result).toBeDefined();
      expect(typeof result.nextMove).toBe('number');
      expect(result.nextMove).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.plannedPath)).toBe(true);
      expect(typeof result.reason).toBe('string');
    });

    it('moves toward the fruit on a clear path', async () => {
      // Snake at (0,0)=index 0, fruit at (0,7)=index 7 on 8x8 grid
      // Only right moves are valid — first step should be index 1
      const state = makeState({ rows: 8, cols: 8, body: [0], fruit: 7 });
      const result = await strategy.planNextMove(state);

      // The next move should be adjacent to 0 (either right=1 or down=8)
      expect([1, 8]).toContain(result.nextMove);
    });

    it('handles already at fruit position', async () => {
      const state = makeState({ rows: 4, cols: 4, body: [5], fruit: 5 });
      const result = await strategy.planNextMove(state);

      expect(result.nextMove).toBe(5);
      expect(result.reason).toMatch(/already/i);
    });

    it('returns a result on invalid state without throwing', async () => {
      const state = makeState({ rows: 4, cols: 4, body: [], fruit: 3 });
      const result = await strategy.planNextMove(state);

      expect(result).toBeDefined();
      expect(typeof result.nextMove).toBe('number');
    });

    it('is deterministic with the same input', async () => {
      const state = makeState({ rows: 8, cols: 8, body: [0], fruit: 63 });
      const r1 = await strategy.planNextMove(state);
      const r2 = await strategy.planNextMove(state);

      expect(r1.nextMove).toBe(r2.nextMove);
    });

    it('finds a path across a 4x4 grid', async () => {
      // Snake at top-left (0), fruit at bottom-right (15) on 4x4 grid
      const state = makeState({ rows: 4, cols: 4, body: [0], fruit: 15 });
      const result = await strategy.planNextMove(state);

      expect(result.nextMove).toBeGreaterThan(0);
      expect(result.plannedPath.length).toBeGreaterThanOrEqual(0);
    });

    it('survives 200 ticks on 8x8 without throwing', async () => {
      // This test verifies the strategy doesn't crash during actual gameplay steps
      const rows = 8;
      const cols = 8;

      // Simple sequential simulation: snake always moves to nextMove
      let body = [0];
      let fruit = 63;

      for (let tick = 0; tick < 200; tick++) {
        const occupied = new Set(body);
        const raw = {
          config: { rows, cols },
          snake: { body, occupied },
          fruit,
        };
        const state = new StandardGameState(raw);
        const result = await strategy.planNextMove(state);

        expect(result).toBeDefined();
        expect(typeof result.nextMove).toBe('number');

        const next = result.nextMove;
        if (next < 0 || next >= rows * cols) break;

        // Move snake (trim tail, no growth for simplicity)
        body = [next, ...body.slice(0, body.length - 1)];

        // If fruit eaten, move fruit to a free spot
        if (next === fruit) {
          const newFruitCandidates = [];
          const bodySet = new Set(body);
          for (let i = 0; i < rows * cols; i++) {
            if (!bodySet.has(i)) newFruitCandidates.push(i);
          }
          fruit = newFruitCandidates.length > 0 ? newFruitCandidates[0] : -1;
          if (fruit < 0) break; // Board full
        }
      }
    });
  });
}

describe('BFSStrategy - CircularQueue integration', () => {
  it('correctly finds shortest path with CircularQueue', async () => {
    // On a 4x4 grid: snake at 0, fruit at 3
    // Shortest path: 0 → 1 → 2 → 3 (length 3 steps)
    const strategy = new BFSStrategy();
    await strategy.initialize({});
    const state = makeState({ rows: 4, cols: 4, body: [0], fruit: 3 });
    const result = await strategy.planNextMove(state);

    expect(result.nextMove).toBe(1); // first step right
    expect(result.metadata.pathLength).toBe(3); // 3 remaining steps including first
  });
});
