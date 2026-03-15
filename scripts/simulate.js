#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/simulate.js
import { simulateGames } from '../src/simulation/simulator.js';
import { DEFAULT_CONFIG, getAlgorithmDefaultConfig } from '../src/utils/constants.js';

/**
 * Convert an argv array into a dictionary of CLI flags. Flags may be specified
 * in `--key value` or `--flag` form.
 *
 * @param {string[]} argv - Raw arguments from the command line.
 * @returns {Record<string, string|boolean>} Parsed flag/value map.
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

/**
 * Parse a value into an integer, falling back when parsing fails.
 *
 * @param {string|number|undefined} value - Input value to parse.
 * @param {number} fallback - Default value when parsing fails.
 * @returns {number} Parsed integer or the fallback.
 */
function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse a value into a number, falling back when parsing fails.
 *
 * @param {string|number|undefined} value - Input value to parse.
 * @param {number} fallback - Default value when parsing fails.
 * @returns {number} Parsed number or the fallback.
 */
function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Normalize assorted truthy/falsy CLI values ("true", "1", "yes", etc.) into a
 * boolean.
 *
 * @param {string|boolean|undefined} value - Value to normalize.
 * @param {boolean} fallback - Default boolean when the input cannot be parsed.
 * @returns {boolean} Normalized boolean.
 */
function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lowered)) return true;
    if (['false', '0', 'no', 'n'].includes(lowered)) return false;
  }
  return Boolean(value);
}

/**
 * Format a duration in milliseconds for friendly console output.
 *
 * @param {number} value - Duration in milliseconds.
 * @returns {string} Formatted string with ms suffix.
 */
function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

/**
 * Entry point that parses CLI arguments, runs simulations, and reports results
 * either as formatted text or JSON.
 */
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const algorithmArg = typeof args.algorithm === 'string'
    ? args.algorithm
    : (typeof args.pathfindingAlgorithm === 'string' ? args.pathfindingAlgorithm : undefined);
  const algorithm = algorithmArg || DEFAULT_CONFIG.pathfindingAlgorithm;
  const algorithmDefaults = getAlgorithmDefaultConfig(algorithm);

  const gameCount = toInteger(args.games ?? args.count, 1);
  const rows = toInteger(args.rows, DEFAULT_CONFIG.rows);
  const cols = toInteger(args.cols, DEFAULT_CONFIG.cols);
  const tickMs = args.tickMs !== undefined ? toNumber(args.tickMs, DEFAULT_CONFIG.tickMs) : undefined;
  const shortcutsEnabled =
    args.shortcutsEnabled !== undefined
      ? toBoolean(
        args.shortcutsEnabled,
        algorithmDefaults.shortcutsEnabled ?? true,
      )
      : undefined;
  const uniqueSeeds = toBoolean(args.uniqueSeeds, true);
  const includeRuns = toBoolean(args.details ?? args.includeRuns, false);
  const outputJson = toBoolean(args.json, false);

  const config = {
    rows,
    cols,
    pathfindingAlgorithm: algorithm,
  };

  if (tickMs !== undefined) {
    config.tickMs = tickMs;
  }
  if (shortcutsEnabled !== undefined) {
    config.shortcutsEnabled = shortcutsEnabled;
  }
  if (args.seed !== undefined) {
    config.seed = toInteger(args.seed, DEFAULT_CONFIG.seed);
  }
  if (args.safetyBuffer !== undefined) {
    const fallback = algorithmDefaults.safetyBuffer;
    const parsed = toInteger(args.safetyBuffer, fallback);
    if (parsed !== undefined) {
      config.safetyBuffer = parsed;
    }
  }
  if (args.lateGameLock !== undefined) {
    const fallback = algorithmDefaults.lateGameLock;
    const parsed = toInteger(args.lateGameLock, fallback);
    if (parsed !== undefined) {
      config.lateGameLock = parsed;
    }
  }
  if (args.minShortcutWindow !== undefined) {
    const fallback = algorithmDefaults.minShortcutWindow;
    const parsed = toInteger(args.minShortcutWindow, fallback);
    if (parsed !== undefined) {
      config.minShortcutWindow = parsed;
    }
  }
  if (args.allowDiagonals !== undefined) {
    const fallback = algorithmDefaults.allowDiagonals ?? false;
    config.allowDiagonals = toBoolean(args.allowDiagonals, fallback);
  }

  const { summary, runs } = await simulateGames({
    games: gameCount,
    config,
    uniqueSeeds,
    includeRuns: includeRuns || outputJson,
  });

  if (outputJson) {
    const payload = {
      summary,
      runs: includeRuns || outputJson ? runs : undefined,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('🐍 Snake AI batch simulation');
  console.log(`- Games: ${summary.gameCount}`);
  console.log(`- Grid: ${summary.grid.rows} x ${summary.grid.cols}`);
  console.log(`- Completion rate: ${(summary.statuses.completionRate * 100).toFixed(2)}%`);
  console.log(`- Average moves: ${summary.averages.moves.toFixed(2)}`);
  console.log(`- Average score: ${summary.averages.score.toFixed(2)}`);
  console.log(`- Average duration: ${formatMs(summary.averages.durationMs)}`);

  if (summary.statuses.complete > 0) {
    console.log(`- Fastest completion: ${formatMs(summary.durations.fastestCompletionMs)}`);
    console.log(`- Slowest completion: ${formatMs(summary.durations.slowestCompletionMs)}`);
  }

  if (includeRuns && runs) {
    const displayCount = Math.min(runs.length, toInteger(args.sample ?? 10, 10));
    console.log(`\nSample of ${displayCount} runs:`);
    const table = runs.slice(0, displayCount).map((run, index) => ({
      game: index + 1,
      seed: run.seed,
      status: run.status,
      moves: run.moves,
      score: run.score,
      duration: `${run.durationMs.toFixed(2)} ms`,
    }));
    console.table(table);
  }
}

await main();
