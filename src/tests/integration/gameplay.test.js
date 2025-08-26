// FILE: src/tests/integration/gameplay.test.js
/**
 * End-to-end gameplay tests
 */

import { describe, it, expect } from 'vitest';
import { initializeGame, gameTick, setGameStatus } from '../../engine/gameEngine.js';
import { seed } from '../../engine/rng.js';
import { GAME_STATUS } from '../../engine/types.js';

describe('Gameplay Integration', () => {
  it('should run 1000 ticks without errors on small grid', () => {
    seed(42);
    let state = initializeGame({ rows: 8, cols: 8, seed: 42 });
    state = setGameStatus(state, GAME_STATUS.PLAYING);

    let tickCount = 0;
    const maxTicks = 1000;

    while (tickCount < maxTicks && state.status === GAME_STATUS.PLAYING) {
      const result = gameTick(state);

      expect(result.result.valid).toBe(true);
      expect(result.state.snake.body.length).toBeGreaterThan(0);

      state = result.state;
      tickCount++;
    }

    // Should either complete the game or reach tick limit
    expect(tickCount).toBeGreaterThan(0);
    expect([GAME_STATUS.COMPLETE, GAME_STATUS.GAME_OVER, GAME_STATUS.PLAYING]).toContain(
      state.status
    );
  });

  it('should maintain game invariants throughout play', () => {
    seed(123);
    let state = initializeGame({ rows: 6, cols: 6, seed: 123 });
    state = setGameStatus(state, GAME_STATUS.PLAYING);

    for (let i = 0; i < 50; i++) {
      const result = gameTick(state);
      if (!result.result.valid) break;

      state = result.state;

      // Invariant checks
      expect(state.snake.body.length).toBeLessThanOrEqual(36);
      expect(state.snake.body.length).toEqual(state.snake.occupied.size);
      expect(state.fruit).toBeGreaterThanOrEqual(-1);
      expect(state.fruit).toBeLessThan(36);
      expect(state.moves).toBe(i + 1);

      // Snake should not overlap with itself
      const uniqueCells = new Set(state.snake.body);
      expect(uniqueCells.size).toBe(state.snake.body.length);

      // Fruit should not be on snake (unless -1 for complete game)
      if (state.fruit >= 0) {
        expect(state.snake.occupied.has(state.fruit)).toBe(false);
      }
    }
  });
});
