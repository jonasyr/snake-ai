// FILE: src/ui/hooks/useComparison.js
/**
 * Hook that orchestrates sequential algorithm comparison runs and aggregates
 * results for display in the ComparisonDashboard.
 */

import { useCallback, useRef, useState } from 'react';
import { runGame } from '../../simulation/simulator.js';
import { ALGORITHM_REGISTRY } from '../../engine/pathfinding/algorithmRegistry.js';
import { DEFAULT_CONFIG } from '../../utils/constants.js';

/**
 * @typedef {Object} ComparisonResult
 * @property {string} algorithm - Algorithm identifier.
 * @property {string} name - Human-readable algorithm name.
 * @property {number} games - Total games run.
 * @property {number} avgFill - Average board fill fraction (0–1) at game end.
 * @property {number} avgMoves - Average moves per game.
 * @property {number} avgScore - Average score per game.
 * @property {number} avgDurationMs - Average wall-clock time per game (ms).
 */

/**
 * @typedef {Object} ComparisonProgress
 * @property {number} algorithmIndex - Zero-based index of the algorithm being run.
 * @property {number} algorithmCount - Total number of algorithms in the comparison.
 * @property {string} currentAlgorithm - Identifier of the algorithm being run.
 * @property {string} currentName - Human-readable name of the algorithm being run.
 * @property {number} gameIndex - Zero-based index of the current game within the algorithm run.
 * @property {number} gameCount - Total games per algorithm.
 */

/**
 * Hook for running multi-algorithm comparisons sequentially with live progress.
 *
 * Each algorithm is run for the specified number of games using identical seeds
 * so results are directly comparable. The key metric is average board fill
 * (snake length / total cells at game end), which is meaningful for all
 * algorithm types — unlike a binary "completed the board" flag.
 *
 * @returns {{
 *   results: ComparisonResult[],
 *   isRunning: boolean,
 *   progress: ComparisonProgress | null,
 *   startComparison: Function,
 *   cancelComparison: Function,
 * }} Comparison state and control API.
 */
export function useComparison() {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const cancelledRef = useRef(false);

  /**
   * Start a comparison run across multiple algorithms.
   *
   * @param {Object} params - Comparison parameters.
   * @param {string[]} params.algorithms - Algorithm identifiers to compare.
   * @param {number} params.games - Number of games to run per algorithm.
   * @param {number} [params.rows] - Grid row count.
   * @param {number} [params.cols] - Grid column count.
   * @param {number} [params.seed] - Base seed (offset per game for uniqueness).
   */
  const startComparison = useCallback(
    async ({ algorithms, games, rows, cols, seed }) => {
      cancelledRef.current = false;
      setIsRunning(true);
      setResults([]);
      setProgress(null);

      const accumulated = [];
      const baseSeed = seed ?? DEFAULT_CONFIG.seed;
      const gridRows = rows ?? DEFAULT_CONFIG.rows;
      const gridCols = cols ?? DEFAULT_CONFIG.cols;
      const totalCells = gridRows * gridCols;

      for (let i = 0; i < algorithms.length; i += 1) {
        if (cancelledRef.current) break;

        const algorithm = algorithms[i];
        const entry = ALGORITHM_REGISTRY[algorithm];
        if (!entry?.strategyClass) continue;

        const totals = { moves: 0, score: 0, durationMs: 0, length: 0 };

        for (let g = 0; g < games; g += 1) {
          if (cancelledRef.current) break;

          setProgress({
            algorithmIndex: i,
            algorithmCount: algorithms.length,
            currentAlgorithm: algorithm,
            currentName: entry.name,
            gameIndex: g,
            gameCount: games,
          });

          const result = await runGame({
            rows: gridRows,
            cols: gridCols,
            seed: baseSeed + g,
            pathfindingAlgorithm: algorithm,
            ...entry.defaultConfig,
          });

          totals.moves += result.moves ?? 0;
          totals.score += result.score ?? 0;
          totals.durationMs += result.durationMs ?? 0;
          totals.length += result.stats?.length ?? 0;

          // Yield to the browser so progress updates render between games.
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (cancelledRef.current) break;

        accumulated.push({
          algorithm,
          name: entry.name,
          games,
          avgFill: games > 0 ? totals.length / games / totalCells : 0,
          avgMoves: games > 0 ? totals.moves / games : 0,
          avgScore: games > 0 ? totals.score / games : 0,
          avgDurationMs: games > 0 ? totals.durationMs / games : 0,
        });

        setResults([...accumulated]);
      }

      setIsRunning(false);
      setProgress(null);
    },
    []
  );

  const cancelComparison = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { results, isRunning, progress, startComparison, cancelComparison };
}
