// FILE: src/tests/simulation/simulator.test.js
import { describe, expect, it } from 'vitest';
import { runGame, simulateGames } from '../../simulation/simulator.js';
import { GAME_STATUS } from '../../engine/types.js';

const TERMINAL_STATUSES = new Set([
  GAME_STATUS.COMPLETE,
  GAME_STATUS.GAME_OVER,
  GAME_STATUS.PAUSED,
  GAME_STATUS.PLAYING,
]);

describe('simulation utilities', () => {
  it('runs a single game to completion or failure', async () => {
    const result = await runGame({ rows: 8, cols: 8, seed: 2025 });

    expect(result).toMatchObject({
      seed: expect.any(Number),
      status: expect.any(String),
      durationMs: expect.any(Number),
      moves: expect.any(Number),
      score: expect.any(Number),
      stats: expect.any(Object),
    });

    expect(TERMINAL_STATUSES.has(result.status)).toBe(true);
    expect(result.stats.moves).toBeGreaterThan(0);
  });

  it('aggregates multiple games with deterministic runs when seeds are reused', async () => {
    const { summary, runs } = await simulateGames({
      games: 4,
      config: { rows: 6, cols: 6, seed: 99 },
      uniqueSeeds: false,
      includeRuns: true,
    });

    expect(summary.gameCount).toBe(4);
    expect(summary.grid).toEqual({ rows: 6, cols: 6 });
    expect(runs).toHaveLength(4);

    const uniqueScores = new Set(runs.map((run) => run.score));
    expect(uniqueScores.size).toBe(1);

    const { complete, gameOver, other } = summary.statuses;
    expect(complete + gameOver + other).toBe(4);
    expect(summary.statuses.completionRate).toBeGreaterThanOrEqual(0);
    expect(summary.statuses.completionRate).toBeLessThanOrEqual(1);
  });
});
