#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/simulate.js
import { simulateGames } from '../src/simulation/simulator.js';
import { DEFAULT_CONFIG } from '../src/utils/constants.js';

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

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

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

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const gameCount = toInteger(args.games ?? args.count, 1);
  const rows = toInteger(args.rows, DEFAULT_CONFIG.rows);
  const cols = toInteger(args.cols, DEFAULT_CONFIG.cols);
  const tickMs = args.tickMs !== undefined ? toNumber(args.tickMs, DEFAULT_CONFIG.tickMs) : undefined;
  const shortcutsEnabled =
    args.shortcutsEnabled !== undefined
      ? toBoolean(args.shortcutsEnabled, DEFAULT_CONFIG.shortcutsEnabled)
      : undefined;
  const uniqueSeeds = toBoolean(args.uniqueSeeds, true);
  const includeRuns = toBoolean(args.details ?? args.includeRuns, false);
  const outputJson = toBoolean(args.json, false);

  const config = {
    rows,
    cols,
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
    config.safetyBuffer = toInteger(args.safetyBuffer, DEFAULT_CONFIG.safetyBuffer);
  }
  if (args.lateGameLock !== undefined) {
    config.lateGameLock = toInteger(args.lateGameLock, DEFAULT_CONFIG.lateGameLock);
  }
  if (args.minShortcutWindow !== undefined) {
    config.minShortcutWindow = toInteger(args.minShortcutWindow, DEFAULT_CONFIG.minShortcutWindow);
  }

  const { summary, runs } = simulateGames({
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

main();
