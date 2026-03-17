// FILE: src/ui/components/ComparisonDashboard.jsx
/**
 * Dashboard component for comparing multiple pathfinding algorithms side-by-side.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Play, Square, BarChart2 } from 'lucide-react';
import {
  ALGORITHMS,
  ALGORITHM_REGISTRY,
} from '../../engine/pathfinding/algorithmRegistry.js';
import { useComparison } from '../hooks/useComparison.js';

/** Algorithms available for comparison (excludes unimplemented RL). */
const COMPARABLE_ALGORITHMS = [
  ALGORITHMS.HAMILTONIAN,
  ALGORITHMS.HAMILTONIAN_SHORTCUTS,
  ALGORITHMS.ASTAR,
  ALGORITHMS.DIJKSTRA,
  ALGORITHMS.BFS,
  ALGORITHMS.GREEDY,
];

const GAMES_OPTIONS = [10, 25, 50, 100, 200];

const DEFAULT_SELECTED = [
  ALGORITHMS.HAMILTONIAN_SHORTCUTS,
  ALGORITHMS.ASTAR,
  ALGORITHMS.BFS,
  ALGORITHMS.DIJKSTRA,
];

/**
 * Render an average board-fill fraction as a coloured percentage.
 *
 * @param {number} fill - Value between 0 and 1.
 * @returns {JSX.Element} Styled percentage span.
 */
function FillBadge({ fill }) {
  const pct = Math.round(fill * 100);
  const color =
    pct >= 80
      ? 'text-emerald-400'
      : pct >= 40
        ? 'text-yellow-400'
        : 'text-red-400';
  return <span className={`font-semibold ${color}`}>{pct}%</span>;
}

FillBadge.propTypes = { fill: PropTypes.number.isRequired };

/**
 * Single-row progress indicator shown while a comparison is running.
 *
 * @param {Object} props
 * @param {import('../hooks/useComparison.js').ComparisonProgress} props.progress
 */
function ProgressBar({ progress }) {
  const { algorithmIndex, algorithmCount, currentName, gameIndex, gameCount } =
    progress;

  const overallPct = Math.round(
    ((algorithmIndex * gameCount + gameIndex) / (algorithmCount * gameCount)) *
      100
  );

  return (
    <div className='space-y-2'>
      <div className='flex justify-between text-xs text-gray-400'>
        <span>
          Algorithm {algorithmIndex + 1}/{algorithmCount} — {currentName}
        </span>
        <span>
          Game {gameIndex + 1}/{gameCount}
        </span>
      </div>
      <div className='w-full bg-white/10 rounded-full h-2'>
        <div
          className='bg-blue-500 h-2 rounded-full transition-all duration-100'
          style={{ width: `${overallPct}%` }}
        />
      </div>
      <p className='text-xs text-gray-500 text-right'>{overallPct}% complete</p>
    </div>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.shape({
    algorithmIndex: PropTypes.number.isRequired,
    algorithmCount: PropTypes.number.isRequired,
    currentName: PropTypes.string.isRequired,
    gameIndex: PropTypes.number.isRequired,
    gameCount: PropTypes.number.isRequired,
  }).isRequired,
};

/**
 * Results table rendered once at least one algorithm has finished.
 *
 * @param {Object} props
 * @param {import('../hooks/useComparison.js').ComparisonResult[]} props.results
 */
function ResultsTable({ results }) {
  const sorted = [...results].sort((a, b) => b.avgFill - a.avgFill);

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-white/10 text-gray-400 text-left'>
            <th className='pb-2 pr-4'>Algorithm</th>
            <th className='pb-2 pr-4 text-right'>Avg Fill</th>
            <th className='pb-2 pr-4 text-right'>Avg Moves</th>
            <th className='pb-2 pr-4 text-right'>Avg Score</th>
            <th className='pb-2 text-right'>ms/game</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-white/5'>
          {sorted.map(row => (
            <tr key={row.algorithm} className='hover:bg-white/5'>
              <td className='py-2 pr-4 text-gray-200'>{row.name}</td>
              <td className='py-2 pr-4 text-right'>
                <FillBadge fill={row.avgFill} />
              </td>
              <td className='py-2 pr-4 text-right text-gray-300'>
                {row.avgMoves.toFixed(0)}
              </td>
              <td className='py-2 pr-4 text-right text-gray-300'>
                {row.avgScore.toFixed(1)}
              </td>
              <td className='py-2 text-right text-gray-400'>
                {row.avgDurationMs.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className='text-xs text-gray-500 mt-2'>
        {results[0]?.games} games per algorithm · avg % of board filled at game
        end · sorted by fill
      </p>
    </div>
  );
}

ResultsTable.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      algorithm: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      games: PropTypes.number.isRequired,
      avgFill: PropTypes.number.isRequired,
      avgMoves: PropTypes.number.isRequired,
      avgScore: PropTypes.number.isRequired,
      avgDurationMs: PropTypes.number.isRequired,
    })
  ).isRequired,
};

/**
 * Algorithm comparison dashboard. Lets users select algorithms, configure a
 * game count, run a headless benchmark, and view aggregated results.
 *
 * @param {Object} props
 * @param {Object} props.settings - Current game settings (provides grid dims and seed).
 */
const ComparisonDashboard = ({ settings }) => {
  const [selected, setSelected] = useState(new Set(DEFAULT_SELECTED));
  const [games, setGames] = useState(50);

  const { results, isRunning, progress, startComparison, cancelComparison } =
    useComparison();

  const toggleAlgorithm = algorithm => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(algorithm)) {
        next.delete(algorithm);
      } else {
        next.add(algorithm);
      }
      return next;
    });
  };

  const handleRun = () => {
    const algorithms = COMPARABLE_ALGORITHMS.filter(a => selected.has(a));
    if (algorithms.length === 0) return;
    startComparison({
      algorithms,
      games,
      rows: settings.rows,
      cols: settings.cols,
      seed: settings.seed,
    });
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <BarChart2 className='w-5 h-5 text-blue-400' />
        <h2 className='text-xl font-semibold'>Algorithm Comparison</h2>
      </div>

      <div className='grid lg:grid-cols-[1fr,auto] gap-6'>
        {/* Config panel */}
        <div className='bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5'>
          {/* Algorithm selector */}
          <div>
            <h3 className='text-sm font-medium text-gray-300 mb-3'>
              Algorithms
            </h3>
            <div className='grid grid-cols-2 gap-2'>
              {COMPARABLE_ALGORITHMS.map(alg => {
                const entry = ALGORITHM_REGISTRY[alg];
                return (
                  <label
                    key={alg}
                    className='flex items-center gap-2 cursor-pointer group'
                  >
                    <input
                      type='checkbox'
                      checked={selected.has(alg)}
                      onChange={() => toggleAlgorithm(alg)}
                      disabled={isRunning}
                      className='w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded'
                    />
                    <span className='text-sm text-gray-300 group-hover:text-white transition-colors'>
                      {entry.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Games count */}
          <div>
            <label
              htmlFor='comparison-games'
              className='block text-sm font-medium text-gray-300 mb-2'
            >
              Games per algorithm
            </label>
            <select
              id='comparison-games'
              value={games}
              onChange={e => setGames(Number(e.target.value))}
              disabled={isRunning}
              className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer'
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem',
              }}
            >
              {GAMES_OPTIONS.map(n => (
                <option key={n} value={n} className='bg-gray-800'>
                  {n} games
                </option>
              ))}
            </select>
            <p className='text-xs text-gray-500 mt-1'>
              Grid: {settings.rows}×{settings.cols} · Seed: {settings.seed}
            </p>
          </div>

          {/* Run / Cancel */}
          <div className='flex gap-3'>
            {isRunning ? (
              <button
                onClick={cancelComparison}
                className='flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors'
              >
                <Square className='w-4 h-4' />
                Cancel
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={selected.size === 0}
                className='flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
              >
                <Play className='w-4 h-4' />
                Run Comparison
              </button>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className='bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-sm text-gray-400 space-y-2 max-w-xs'>
          <p className='font-medium text-gray-300'>How it works</p>
          <p>
            Each selected algorithm runs the specified number of headless games
            with matching seeds, so results are directly comparable.
          </p>
          <p>
            Grid size and seed are taken from your current game settings.
            Results update live as each algorithm finishes.
          </p>
        </div>
      </div>

      {/* Progress */}
      {isRunning && progress && (
        <div className='bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5'>
          <ProgressBar progress={progress} />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className='bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5'>
          <h3 className='text-sm font-medium text-gray-300 mb-4'>Results</h3>
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
};

ComparisonDashboard.propTypes = {
  settings: PropTypes.shape({
    rows: PropTypes.number.isRequired,
    cols: PropTypes.number.isRequired,
    seed: PropTypes.number.isRequired,
  }).isRequired,
};

export default React.memo(ComparisonDashboard);
