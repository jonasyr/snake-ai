// FILE: src/tests/engine/gameEngine.test.js
/**
 * Integration tests for game engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeGame, gameTick, setGameStatus, getGameStats } from '../../engine/gameEngine.js';
import { seed } from '../../engine/rng.js';
import { GAME_STATUS } from '../../engine/types.js';

describe('Game Engine Integration', () => {
  let gameState;

  beforeEach(() => {
    seed(12345); // Deterministic tests
    gameState = initializeGame({ rows: 10, cols: 10, seed: 12345 });
  });

  describe('initializeGame', () => {
    it('should create valid initial state', () => {
      expect(gameState.snake.body).toHaveLength(1);
      expect(gameState.cycle).toHaveLength(100);
      expect(gameState.fruit).toBeGreaterThanOrEqual(0);
      expect(gameState.fruit).toBeLessThan(100);
      expect(gameState.moves).toBe(0);
      expect(gameState.score).toBe(0);
      expect(gameState.status).toBe(GAME_STATUS.PAUSED);
    });

    it('should not spawn fruit on snake', () => {
      expect(gameState.snake.occupied.has(gameState.fruit)).toBe(false);
    });
  });

  describe('gameTick', () => {
    it('should not tick when paused', () => {
      const result = gameTick(gameState);

      expect(result.result.valid).toBe(false);
      expect(result.result.reason).toContain('not running');
    });

    it('should advance game when playing', () => {
      const playingState = setGameStatus(gameState, GAME_STATUS.PLAYING);
      const result = gameTick(playingState);

      expect(result.result.valid).toBe(true);
      expect(result.state.moves).toBe(1);
      expect(result.state.snake.body).toHaveLength(1);
    });

    it('should grow snake when eating fruit', () => {
      // Position fruit next to snake head
      const nextCell = gameState.cycle[1];

      const modifiedState = {
        ...gameState,
        fruit: nextCell,
        status: GAME_STATUS.PLAYING,
      };

      const result = gameTick(modifiedState);

      expect(result.state.snake.body).toHaveLength(2);
      expect(result.state.score).toBeGreaterThan(0);
    });
  });

  describe('getGameStats', () => {
    it('should calculate correct statistics', () => {
      const stats = getGameStats(gameState);

      expect(stats.moves).toBe(0);
      expect(stats.length).toBe(1);
      expect(stats.score).toBe(0);
      expect(stats.free).toBe(99);
      expect(typeof stats.distHeadApple).toBe('number');
      expect(typeof stats.distHeadTail).toBe('number');
    });
  });

  describe('game completion', () => {
    it('should detect game completion when grid full', () => {
      // Create a nearly full grid
      const almostFullState = {
        ...gameState,
        snake: {
          body: Array.from({ length: 100 }, (_, i) => i),
          occupied: new Set(Array.from({ length: 100 }, (_, i) => i)),
        },
        status: GAME_STATUS.PLAYING,
      };

      const result = gameTick(almostFullState);
      expect(result.state.status).toBe(GAME_STATUS.COMPLETE);
    });
  });
});
