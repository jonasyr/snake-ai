#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/compare.js
/**
 * Headless algorithm comparison CLI.
 * Runs multiple algorithms for the same number of games on identical seeds
 * and outputs a formatted table or JSON for side-by-side evaluation.
 *
 * Usage:
 *   npm run compare -- --algorithms hamiltonian-shortcuts,astar,bfs --games 100
 *   npm run compare -- --algorithms astar,dijkstra,greedy --games 50 --json
 */

import { simulateGames } from '../src/simulation/simulator.js';
import {
  ALGORITHMS,
  ALGORITHM_REGISTRY,
} from '../src/engine/pathfinding/algorithmRegistry.js';
import { DEFAULT_CONFIG } from '../src/utils/constants.js';

const ALL_ALGORITHMS = Object.values(ALGORITHMS).filter(
  a => ALGORITHM_REGISTRY[a]?.strategyClass != null
);

/**
 * Parse CLI argv into a key/value map.
 *
 * @param {string[]} argv - Raw process.argv slice.
 * @returns {Record<string, string|boolean>} Parsed flags.
 */
function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      i += 1;
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 2;
    } else {
      args[key] = true;
      i += 1;
    }
  }
  return args;
}

/**
 * Parse an integer from a string with a fallback.
 *
 * @param {string|number|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Print the help text and exit.
 */
function printHelp() {
  console.log(`
🐍 Snake AI — Algorithm Comparison

USAGE:
  npm run compare [-- options]

OPTIONS:
  --algorithms <list>   Comma-separated algorithm identifiers (default: all)
                        Available: ${ALL_ALGORITHMS.join(', ')}
  --games <n>           Games per algorithm (default: 100)
  --rows <n>            Grid rows (default: ${DEFAULT_CONFIG.rows})
  --cols <n>            Grid columns (default: ${DEFAULT_CONFIG.cols})
  --seed <n>            Base seed (default: ${DEFAULT_CONFIG.seed})
  --json                Emit machine-readable JSON
  --help                Show this help

EXAMPLES:
  npm run compare -- --algorithms hamiltonian-shortcuts,astar,bfs --games 100
  npm run compare -- --algorithms astar,dijkstra,greedy --games 50 --json
`);
}

/**
 * Format a floating-point number with fixed decimal places.
 *
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
function fmt(value, decimals = 1) {
  return value.toFixed(decimals);
}

/**
 * Entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  // Resolve algorithms
  let algorithms;
  if (typeof args.algorithms === 'string') {
    algorithms = args.algorithms.split(',').map(s => s.trim());
    const unknown = algorithms.filter(
      a => !ALGORITHM_REGISTRY[a]?.strategyClass
    );
    if (unknown.length > 0) {
      console.error(
        `❌ Unknown or unimplemented algorithms: ${unknown.join(', ')}`
      );
      console.error(`   Available: ${ALL_ALGORITHMS.join(', ')}`);
      process.exit(1);
    }
  } else {
    algorithms = ALL_ALGORITHMS;
  }

  const games = toInt(args.games, 100);
  const rows = toInt(args.rows, DEFAULT_CONFIG.rows);
  const cols = toInt(args.cols, DEFAULT_CONFIG.cols);
  const baseSeed = toInt(args.seed, DEFAULT_CONFIG.seed);
  const outputJson = args.json === true;

  if (!outputJson) {
    console.log('🐍 Snake AI — Algorithm Comparison');
    console.log(
      `   Grid: ${rows}×${cols} · Games: ${games} · Seed: ${baseSeed}`
    );
    console.log(`   Algorithms: ${algorithms.join(', ')}\n`);
  }

  const rows_results = [];

  for (const algorithm of algorithms) {
    const entry = ALGORITHM_REGISTRY[algorithm];

    if (!outputJson) {
      process.stdout.write(`   Running ${entry.name}...`);
    }

    const { summary } = await simulateGames({
      games,
      config: {
        rows,
        cols,
        seed: baseSeed,
        pathfindingAlgorithm: algorithm,
        ...entry.defaultConfig,
      },
      uniqueSeeds: true,
      includeRuns: false,
    });

    const totalCells = rows * cols;
    const result = {
      algorithm,
      name: entry.name,
      games: summary.gameCount,
      avgFill: totalCells > 0 ? summary.averages.length / totalCells : 0,
      avgMoves: summary.averages.moves,
      avgScore: summary.averages.score,
      avgDurationMs: summary.averages.durationMs,
    };

    rows_results.push(result);

    if (!outputJson) {
      const pct = (result.avgFill * 100).toFixed(1);
      process.stdout.write(` ${pct}% avg fill\n`);
    }
  }

  if (outputJson) {
    console.log(
      JSON.stringify(
        {
          config: { rows, cols, seed: baseSeed, games },
          results: rows_results,
        },
        null,
        2
      )
    );
    return;
  }

  // Sort by avg fill descending
  rows_results.sort((a, b) => b.avgFill - a.avgFill);

  console.log('\n📊 Results (sorted by avg board fill)\n');

  // Column widths
  const nameWidth = Math.max(
    ...rows_results.map(r => r.name.length),
    'Algorithm'.length
  );
  const header = [
    'Algorithm'.padEnd(nameWidth),
    'Avg Fill'.padStart(9),
    'Avg Moves'.padStart(10),
    'Avg Score'.padStart(10),
    'ms/game'.padStart(8),
  ].join('  ');

  const divider = '─'.repeat(header.length);

  console.log('   ' + header);
  console.log('   ' + divider);

  for (const r of rows_results) {
    const row = [
      r.name.padEnd(nameWidth),
      `${fmt(r.avgFill * 100, 1)}%`.padStart(9),
      fmt(r.avgMoves, 1).padStart(10),
      fmt(r.avgScore, 2).padStart(10),
      fmt(r.avgDurationMs, 1).padStart(8),
    ].join('  ');
    console.log('   ' + row);
  }

  console.log(
    '\n   ' + `${games} games per algorithm · seed base: ${baseSeed}`
  );
}

await main();
