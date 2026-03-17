// FILE: src/ui/hooks/useComparison.js
/**
 * Hook that orchestrates algorithm comparison runs in a dedicated Web Worker,
 * keeping the main thread free and making cancel instant.
 */

import { useCallback, useRef, useState } from 'react';
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
 * @property {number} gameIndex - Zero-based index of the current game (0-based completed count).
 * @property {number} gameCount - Total games per algorithm.
 */

/**
 * Hook for running multi-algorithm comparisons in a Web Worker.
 *
 * All simulation work runs off the main thread so the UI stays responsive
 * throughout. Cancellation is instant — it terminates the worker immediately.
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
  const workerRef = useRef(null);

  const cancelComparison = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsRunning(false);
    setProgress(null);
  }, []);

  /**
   * Start a comparison run across multiple algorithms in a background worker.
   *
   * @param {Object} params - Comparison parameters.
   * @param {string[]} params.algorithms - Algorithm identifiers to compare.
   * @param {number} params.games - Number of games to run per algorithm.
   * @param {number} [params.rows] - Grid row count.
   * @param {number} [params.cols] - Grid column count.
   * @param {number} [params.seed] - Base seed (offset per game for uniqueness).
   */
  const startComparison = useCallback(
    ({ algorithms, games, rows, cols, seed }) => {
      // Terminate any in-progress run before starting a new one.
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      setIsRunning(true);
      setResults([]);
      setProgress(null);

      const worker = new Worker(
        new URL('../../simulation/ComparisonWorker.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = event => {
        const { type, ...data } = event.data;

        switch (type) {
          case 'progress':
            setProgress({
              algorithmIndex: data.algorithmIndex,
              algorithmCount: data.algorithmCount,
              currentAlgorithm: data.algorithm,
              currentName: data.name,
              gameIndex: data.completed,
              gameCount: data.total,
            });
            break;
          case 'result':
            setResults(prev => [...prev, data.result]);
            break;
          case 'done':
            setIsRunning(false);
            setProgress(null);
            workerRef.current = null;
            break;
          case 'error':
            console.error('Comparison worker error:', data.message);
            setIsRunning(false);
            setProgress(null);
            workerRef.current = null;
            break;
          default:
            break;
        }
      };

      worker.onerror = error => {
        console.error('Comparison worker crashed:', error);
        setIsRunning(false);
        setProgress(null);
        workerRef.current = null;
      };

      worker.postMessage({
        algorithms,
        games,
        rows: rows ?? DEFAULT_CONFIG.rows,
        cols: cols ?? DEFAULT_CONFIG.cols,
        seed: seed ?? DEFAULT_CONFIG.seed,
      });
    },
    []
  );

  return { results, isRunning, progress, startComparison, cancelComparison };
}
