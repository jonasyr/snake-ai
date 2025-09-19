#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/shortcut-sweep.js

import process from 'node:process';

import { DEFAULT_CONFIG } from '../src/utils/constants.js';
import {
  DEFAULT_SHORTCUT_PARAMETER_RANGES,
  runShortcutParameterSweep,
} from '../src/simulation/parameterSweep.js';

/**
 * Parse CLI arguments in `--key value` or `--flag` form into an object.
 *
 * @param {string[]} argv - Raw arguments (excluding node + script path).
 * @returns {Record<string, string|boolean>} Parsed arguments.
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
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
 * Split a comma-separated value list into trimmed entries.
 *
 * @param {string} value - Raw comma-separated string.
 * @returns {string[]} Array of trimmed values.
 */
function splitList(value) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Parse a numeric argument supporting comma-separated lists or `start:end:step`
 * ranges. Returns either an array of numbers or a range descriptor object.
 *
 * @param {string} value - Raw argument value.
 * @returns {number[]|{start:number, end:number, step?:number}|undefined} Parsed range.
 */
function parseNumericRange(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  if (value.includes(':')) {
    const [startStr, endStr, stepStr] = value.split(':');
    const start = Number(startStr);
    const end = Number(endStr ?? startStr);
    const step = stepStr !== undefined ? Number(stepStr) : undefined;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return undefined;
    }
    const descriptor = { start, end };
    if (Number.isFinite(step) && step !== 0) {
      descriptor.step = step;
    }
    return descriptor;
  }

  if (value.includes(',')) {
    return splitList(value)
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? [parsed] : undefined;
}

/**
 * Parse a boolean argument supporting comma-separated lists.
 *
 * @param {string|boolean} value - Raw argument value.
 * @returns {boolean[]|undefined} Parsed values.
 */
function parseBooleanList(value) {
  const toBoolean = (input) => {
    if (typeof input === 'boolean') {
      return input;
    }
    const lowered = String(input).toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lowered)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(lowered)) {
      return false;
    }
    return Boolean(input);
  };

  if (typeof value === 'boolean') {
    return [value];
  }

  if (typeof value === 'string' && value.includes(',')) {
    return splitList(value).map((entry) => toBoolean(entry));
  }

  if (typeof value === 'string') {
    return [toBoolean(value)];
  }

  return undefined;
}

/**
 * Normalize a truthy/falsy CLI value into a boolean with fallback.
 *
 * @param {string|boolean|undefined} value - Input value.
 * @param {boolean} fallback - Default value.
 * @returns {boolean} Boolean result.
 */
function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const lowered = value.toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(lowered)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(lowered)) {
    return false;
  }
  return fallback;
}

/**
 * Print CLI usage information.
 */
function printHelp() {
  console.log(`Snake AI shortcut parameter sweep\n\n` +
    `Options:\n` +
    `  --games <n>                Number of games per configuration (default 1000)\n` +
    `  --uniqueSeeds <bool>       Offset RNG seed for each game (default true)\n` +
    `  --seed <n>                 Base seed for simulations\n` +
    `  --shortcutsEnabled <list>  Values for shortcutsEnabled (e.g. true,false)\n` +
    `  --safetyBuffer <range>     Safety buffer values (e.g. 1,2,3 or 0:6:1)\n` +
    `  --lateGameLock <range>     Late game lock thresholds\n` +
    `  --minShortcutWindow <range> Minimum window sizes for shortcuts\n` +
    `  --rows <range>             Grid row counts\n` +
    `  --cols <range>             Grid column counts\n` +
    `  --output <path>            Output file path for results\n` +
    `  --format <json|csv|both>   Output format (default json)\n` +
    `  --progressInterval <ms>    Minimum ms between progress updates\n` +
    `  --help                     Show this help message\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help || args.h) {
    printHelp();
    return;
  }

  const games = args.games ?? args.count;
  const gamesPerConfig = Number.isFinite(Number(games)) ? Number.parseInt(games, 10) : 1000;
  const uniqueSeeds = toBoolean(args.uniqueSeeds, true);
  const baseConfig = { ...DEFAULT_CONFIG };

  if (args.seed !== undefined) {
    const parsedSeed = Number.parseInt(args.seed, 10);
    if (Number.isSafeInteger(parsedSeed)) {
      baseConfig.seed = parsedSeed;
    }
  }

  const parameterRanges = { ...DEFAULT_SHORTCUT_PARAMETER_RANGES };

  if (args.shortcutsEnabled !== undefined) {
    const parsed = parseBooleanList(args.shortcutsEnabled);
    if (parsed) {
      parameterRanges.shortcutsEnabled = parsed;
    }
  }

  const numericKeys = [
    ['safetyBuffer', 'safetyBuffer'],
    ['lateGameLock', 'lateGameLock'],
    ['minShortcutWindow', 'minShortcutWindow'],
    ['rows', 'rows'],
    ['cols', 'cols'],
  ];

  for (let i = 0; i < numericKeys.length; i += 1) {
    const [argKey, rangeKey] = numericKeys[i];
    if (args[argKey] !== undefined) {
      const parsedRange = parseNumericRange(String(args[argKey]));
      if (parsedRange !== undefined) {
        parameterRanges[rangeKey] = parsedRange;
      }
    }
  }

  const formatArg = args.format ?? args.outputFormat;
  let outputFormat;
  if (typeof formatArg === 'string') {
    if (formatArg.toLowerCase() === 'both') {
      outputFormat = ['json', 'csv'];
    } else {
      const formats = splitList(formatArg).map((entry) => entry.toLowerCase());
      outputFormat = formats.length === 1 ? formats[0] : formats;
    }
  }

  const progressInterval = args.progressInterval !== undefined
    ? Number.parseInt(args.progressInterval, 10)
    : undefined;

  await runShortcutParameterSweep({
    gamesPerConfig: gamesPerConfig > 0 ? gamesPerConfig : 1000,
    baseConfig,
    parameterRanges,
    uniqueSeeds,
    outputFile: args.output ?? args.out,
    outputFormat,
    progressIntervalMs: Number.isFinite(progressInterval) && progressInterval > 0
      ? progressInterval
      : undefined,
    logger: console,
  });
}

main();