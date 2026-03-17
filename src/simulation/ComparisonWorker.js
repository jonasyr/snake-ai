// FILE: src/simulation/ComparisonWorker.js
/**
 * Web Worker that runs algorithm comparisons off the main thread.
 *
 * Accepts a single message with comparison parameters, runs each algorithm
 * sequentially through the headless simulator, and posts typed messages back
 * for progress updates and per-algorithm results.
 *
 * Message protocol (worker → main thread):
 *   { type: 'progress', algorithmIndex, algorithmCount, algorithm, name, completed, total }
 *   { type: 'result',   result: ComparisonResult }
 *   { type: 'done' }
 *   { type: 'error',    message }
 *
 * Scalability notes:
 *   - Worker pool size is forced to 0 so pathfinding runs synchronously on this
 *     thread. This prevents nested worker creation which would freeze at ~8 games.
 *   - Progress messages are throttled to at most one per PROGRESS_INTERVAL_MS to
 *     avoid flooding the main thread when running thousands of games.
 */

// Must be called before any import that eagerly creates the singleton manager.
// setDefaultWorkerPoolSize(0) ensures pathfinding runs synchronously (no nested workers).
import { setDefaultWorkerPoolSize } from '../engine/pathfinding/index.js';
setDefaultWorkerPoolSize(0);

import { simulateGames } from './simulator.js';
import { ALGORITHM_REGISTRY } from '../engine/pathfinding/algorithmRegistry.js';

/** Minimum ms between progress messages sent to the main thread. */
const PROGRESS_INTERVAL_MS = 100;

self.onmessage = async event => {
  const { algorithms, games, rows, cols, seed } = event.data;
  const totalCells = rows * cols;

  try {
    for (let i = 0; i < algorithms.length; i += 1) {
      const algorithm = algorithms[i];
      const entry = ALGORITHM_REGISTRY[algorithm];
      if (!entry?.strategyClass) continue;

      let lastProgressTime = 0;

      const { summary } = await simulateGames({
        games,
        config: {
          rows,
          cols,
          seed,
          pathfindingAlgorithm: algorithm,
          ...entry.defaultConfig,
        },
        uniqueSeeds: true,
        includeRuns: false,
        onProgress: ({ completed, total }) => {
          const now = Date.now();
          // Always send the final progress update; throttle intermediate ones.
          if (
            completed === total ||
            now - lastProgressTime >= PROGRESS_INTERVAL_MS
          ) {
            lastProgressTime = now;
            self.postMessage({
              type: 'progress',
              algorithmIndex: i,
              algorithmCount: algorithms.length,
              algorithm,
              name: entry.name,
              completed,
              total,
            });
          }
        },
      });

      self.postMessage({
        type: 'result',
        result: {
          algorithm,
          name: entry.name,
          games: summary.gameCount,
          avgFill: totalCells > 0 ? summary.averages.length / totalCells : 0,
          avgMoves: summary.averages.moves,
          avgScore: summary.averages.score,
          avgDurationMs: summary.averages.durationMs,
        },
      });
    }

    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error?.message ?? 'Unknown error',
    });
  }
};
