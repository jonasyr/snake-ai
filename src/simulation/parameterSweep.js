// FILE: src/simulation/parameterSweep.js
/**
 * Parameter exploration utilities for large-scale shortcut configuration sweeps.
 * The helpers in this module orchestrate batches of simulations while
 * automatically iterating through relevant Snake AI configuration values.
 */

import fs from 'node:fs';
import path from 'node:path';

import { simulateGames } from './simulator.js';
import { DEFAULT_CONFIG } from '../utils/constants.js';

const DEFAULT_PROGRESS_INTERVAL_MS = 2000;
const EPSILON = 1e-9;

/**
 * Default parameter ranges for exploring shortcut behaviour. The defaults keep
 * the grid size fixed while sweeping through shortcut-related controls.
 */
export const DEFAULT_SHORTCUT_PARAMETER_RANGES = Object.freeze({
  shortcutsEnabled: [true],
  safetyBuffer: { start: 1, end: 6, step: 1 },
  lateGameLock: { start: 0, end: 10, step: 2 },
  minShortcutWindow: { start: 1, end: 6, step: 1 },
  rows: [DEFAULT_CONFIG.rows],
  cols: [DEFAULT_CONFIG.cols],
});

/**
 * Safely coerce a value so it matches the type of the fallback.
 *
 * @param {unknown} value - Input value to normalize.
 * @param {unknown} fallback - Fallback value with the desired type.
 * @returns {unknown} Normalized value.
 */
function coerceToFallbackType(value, fallback) {
  if (fallback === undefined || fallback === null) {
    return value;
  }

  const fallbackType = typeof fallback;

  if (fallbackType === 'number') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  if (fallbackType === 'boolean') {
    if (typeof value === 'string') {
      const lowered = value.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(lowered)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(lowered)) {
        return false;
      }
    }
    return Boolean(value);
  }

  return value;
}

/**
 * Convert a range descriptor into a flat list of values.
 *
 * Supported descriptor shapes:
 * - `undefined`/`null` → `[fallback]`
 * - Array → shallow copy of the array
 * - Object with `values` array → shallow copy of `values`
 * - Object with `start`, `end`, optional `step` → numeric range
 * - Primitive → single-value array containing the primitive
 *
 * @param {unknown} descriptor - Range descriptor provided by the caller.
 * @param {unknown} fallback - Base value used when the descriptor is empty.
 * @returns {unknown[]} Array of parameter values.
 */
function normalizeRangeDescriptor(descriptor, fallback) {
  if (descriptor === undefined || descriptor === null) {
    return [fallback];
  }

  if (Array.isArray(descriptor)) {
    return descriptor.slice();
  }

  if (typeof descriptor === 'function') {
    return normalizeRangeDescriptor(descriptor(fallback), fallback);
  }

  if (typeof descriptor === 'object') {
    const record = descriptor;

    if (Array.isArray(record.values)) {
      return record.values.slice();
    }

    const startValue =
      'start' in record ? Number(record.start) : fallback;
    const endValue = 'end' in record ? Number(record.end) : startValue;
    const rawStep = 'step' in record ? Number(record.step) : 1;
    const stepValue = Number.isNaN(rawStep) || rawStep === 0 ? 1 : Math.abs(rawStep);

    if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
      return [fallback];
    }

    const values = [];

    if (startValue <= endValue) {
      for (let value = startValue; value <= endValue + EPSILON; value += stepValue) {
        values.push(value);
      }
    } else {
      for (let value = startValue; value >= endValue - EPSILON; value -= stepValue) {
        values.push(value);
      }
    }

    return values;
  }

  return [descriptor];
}

/**
 * Build the Cartesian product of the provided parameter ranges.
 *
 * @param {Record<string, unknown>} baseConfig - Base configuration.
 * @param {Record<string, unknown>} parameterRanges - Range descriptors keyed by config property.
 * @returns {Array<Record<string, unknown>>} Array of configuration overrides.
 */
function generateParameterGrid(baseConfig, parameterRanges) {
  const entries = Object.entries(parameterRanges)
    .map(([key, descriptor]) => {
      const fallback = baseConfig?.[key];
      const values = normalizeRangeDescriptor(descriptor, fallback)
        .map((value) => coerceToFallbackType(value, fallback))
        .filter((value) => value !== undefined);

      return { key, values };
    })
    .filter((entry) => entry.values.length > 0);

  if (entries.length === 0) {
    return [{}];
  }

  const overrides = [];

  function recurse(index, current) {
    if (index >= entries.length) {
      overrides.push({ ...current });
      return;
    }

    const { key, values } = entries[index];

    for (let i = 0; i < values.length; i += 1) {
      current[key] = values[i];
      recurse(index + 1, current);
    }
  }

  recurse(0, {});
  return overrides;
}

/**
 * Convert a floating-point completion ratio into a formatted percentage string.
 *
 * @param {number} ratio - Completion ratio between 0 and 1.
 * @returns {string} Formatted percentage.
 */
function formatCompletion(ratio) {
  if (!Number.isFinite(ratio)) {
    return '0.00%';
  }
  return `${(Math.max(0, Math.min(1, ratio)) * 100).toFixed(2)}%`;
}

/**
 * Convert milliseconds into a seconds string with two decimal places.
 *
 * @param {number} ms - Duration in milliseconds.
 * @returns {string} Formatted seconds string.
 */
function formatSeconds(ms) {
  if (!Number.isFinite(ms)) {
    return '0.00s';
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Resolve output file paths for the requested formats. When multiple formats
 * are requested the base filename is reused with different extensions.
 *
 * @param {string} basePath - Requested output path from the caller.
 * @param {string[]} formats - List of formats such as ['json', 'csv'].
 * @returns {Record<string, string>} Mapping from format to full path.
 */
function resolveOutputPaths(basePath, formats) {
  const parsed = path.parse(basePath);
  const directory = parsed.dir || '.';
  const hasExtension = Boolean(parsed.ext);
  const baseName = hasExtension ? parsed.name : parsed.base || 'results';
  const extension = parsed.ext?.toLowerCase();

  const resolved = {};

  formats.forEach((format) => {
    const normalizedFormat = format.toLowerCase();

    if (formats.length === 1) {
      if (normalizedFormat === 'json' && extension === '.json') {
        resolved[normalizedFormat] = path.join(directory, parsed.base);
        return;
      }
      if (normalizedFormat === 'csv' && extension === '.csv') {
        resolved[normalizedFormat] = path.join(directory, parsed.base);
        return;
      }
    }

    resolved[normalizedFormat] = path.join(directory, `${baseName}.${normalizedFormat}`);
  });

  return resolved;
}

/**
 * Convert sweep results into CSV text.
 *
 * @param {Array<Object>} results - Array of sweep results.
 * @returns {string} CSV string.
 */
function toCsv(results) {
  const headers = [
    'index',
    'rows',
    'cols',
    'shortcutsEnabled',
    'safetyBuffer',
    'lateGameLock',
    'minShortcutWindow',
    'completionRate',
    'completionRatePercent',
    'averageMoves',
    'minMoves',
    'maxMoves',
    'averageScore',
    'averageDurationMs',
    'totalGames',
    'completions',
    'failures',
    'otherOutcomes',
    'success',
  ];

  const lines = [headers.join(',')];

  for (let i = 0; i < results.length; i += 1) {
    const entry = results[i];
    const row = [
      entry.index,
      entry.config.rows,
      entry.config.cols,
      entry.config.shortcutsEnabled,
      entry.config.safetyBuffer,
      entry.config.lateGameLock,
      entry.config.minShortcutWindow,
      entry.completionRate,
      (entry.completionRate * 100).toFixed(2),
      entry.averageMoves,
      entry.minMoves ?? '',
      entry.maxMoves ?? '',
      entry.averageScore,
      entry.averageDurationMs,
      entry.totalGames,
      entry.completions,
      entry.failures,
      entry.other,
      entry.success ? 1 : 0,
    ]
      .map((value) => {
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replaceAll('"', '""')}"`;
          }
          return value;
        }
        return value;
      })
      .join(',');

    lines.push(row);
  }

  return lines.join('\n');
}

/**
 * Persist sweep results to the filesystem in the desired formats.
 *
 * @param {Array<Object>} results - Sweep results.
 * @param {Object} metadata - Metadata returned from the sweep.
 * @param {Object} options - File writing options.
 * @param {string} options.outputFile - Base output path.
 * @param {string|string[]} [options.outputFormat='json'] - Desired output format(s).
 * @param {Console} [options.logger=console] - Logger for status messages.
 */
function writeResults(results, metadata, options) {
  const { outputFile, outputFormat = 'json', logger = console } = options;

  if (!outputFile) {
    return;
  }

  const formats = Array.isArray(outputFormat) ? outputFormat : [outputFormat];
  const normalizedFormats = formats.map((format) => format.toLowerCase());
  const paths = resolveOutputPaths(outputFile, normalizedFormats);

  const payload = {
    metadata,
    results,
  };

  if (normalizedFormats.includes('json')) {
    const jsonPath = paths.json;
    if (jsonPath) {
      const directory = path.dirname(jsonPath);
      if (directory && directory !== '.') {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      logger?.log?.(`📄 Wrote JSON results to ${jsonPath}`);
    }
  }

  if (normalizedFormats.includes('csv')) {
    const csvPath = paths.csv;
    if (csvPath) {
      const directory = path.dirname(csvPath);
      if (directory && directory !== '.') {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(csvPath, `${toCsv(results)}\n`, 'utf8');
      logger?.log?.(`📄 Wrote CSV results to ${csvPath}`);
    }
  }
}

/**
 * Run a sweep over shortcut-related configuration parameters, execute batches
 * of games for each configuration, and aggregate the resulting performance
 * metrics.
 *
 * @param {Object} [options] - Sweep configuration options.
 * @param {number} [options.gamesPerConfig=1000] - Number of games per configuration.
 * @param {Object} [options.baseConfig=DEFAULT_CONFIG] - Base game configuration.
 * @param {Object} [options.parameterRanges=DEFAULT_SHORTCUT_PARAMETER_RANGES] - Ranges to explore.
 * @param {boolean} [options.uniqueSeeds=true] - Whether each run should offset seeds.
 * @param {string|string[]} [options.outputFormat] - Result export format(s).
 * @param {string} [options.outputFile] - Destination path for exported data.
 * @param {Console} [options.logger=console] - Logger used for progress messages.
 * @param {number} [options.progressIntervalMs=2000] - Minimum interval between progress logs.
 * @returns {{results: Array<Object>, bestResults: Array<Object>, metadata: Object}} Sweep results.
 */
export async function runShortcutParameterSweep(options = {}) {
  const {
    gamesPerConfig = 1000,
    baseConfig = DEFAULT_CONFIG,
    parameterRanges = DEFAULT_SHORTCUT_PARAMETER_RANGES,
    uniqueSeeds = true,
    outputFormat,
    outputFile,
    logger = console,
    progressIntervalMs = DEFAULT_PROGRESS_INTERVAL_MS,
  } = options;

  const normalizedRanges = { ...DEFAULT_SHORTCUT_PARAMETER_RANGES, ...parameterRanges };
  const baseConfigSafe = { ...DEFAULT_CONFIG, ...baseConfig };
  const overrides = generateParameterGrid(baseConfigSafe, normalizedRanges);

  const totalConfigurations = overrides.length;
  const gamesPerBatch = Math.max(0, Math.floor(gamesPerConfig));
  const plannedGames = totalConfigurations * gamesPerBatch;

  const sweepResults = [];
  const startTime = Date.now();
  let overallCompleted = 0;
  let lastProgressLog = 0;
  let bestAverageMoves = Number.POSITIVE_INFINITY;
  let bestResults = [];

  logger?.log?.(
    `Starting shortcut parameter sweep across ${totalConfigurations} configurations (${gamesPerBatch} games each).`
  );

  for (let index = 0; index < overrides.length; index += 1) {
    const override = overrides[index];
    const config = { ...baseConfigSafe, ...override };
    const configStart = Date.now();

    const { summary } = await simulateGames({
      games: gamesPerBatch,
      config,
      uniqueSeeds,
      includeRuns: false,
      onProgress: (progress) => {
        const totalCompleted = overallCompleted + progress.completed;
        if (!logger?.log) {
          return;
        }

        const now = Date.now();
        const shouldLog =
          now - lastProgressLog >= progressIntervalMs || totalCompleted === plannedGames;

        if (shouldLog && plannedGames > 0) {
          const percent = ((totalCompleted / plannedGames) * 100).toFixed(1);
          logger.log(`Progress: ${totalCompleted}/${plannedGames} games (${percent}%)`);
          lastProgressLog = now;
        }
      },
    });

    overallCompleted += summary.gameCount;

    const completionRate = summary.statuses.completionRate;
    const averageMoves = summary.averages.moves;
    const minMoves = summary.distributions?.moves?.min ?? null;
    const maxMoves = summary.distributions?.moves?.max ?? null;
    const success = completionRate === 1 && summary.statuses.complete === summary.gameCount;

    const resultEntry = {
      index: index + 1,
      config,
      parameters: { ...override },
      completionRate,
      averageMoves,
      minMoves,
      maxMoves,
      averageScore: summary.averages.score,
      averageDurationMs: summary.averages.durationMs,
      totalGames: summary.gameCount,
      completions: summary.statuses.complete,
      failures: summary.statuses.gameOver,
      other: summary.statuses.other,
      elapsedMs: Date.now() - configStart,
      success,
    };

    sweepResults.push(resultEntry);

    if (success) {
      if (averageMoves < bestAverageMoves - Number.EPSILON) {
        bestAverageMoves = averageMoves;
        bestResults = [resultEntry];
      } else if (Math.abs(averageMoves - bestAverageMoves) <= Number.EPSILON) {
        bestResults.push(resultEntry);
      }
    }

    if (logger?.log) {
      const progressLabel = `${index + 1}/${totalConfigurations}`;
      const completionLabel = formatCompletion(completionRate);
      const movesLabel = Number.isFinite(averageMoves) ? averageMoves.toFixed(2) : 'n/a';
      logger.log(
        `[${progressLabel}] Config ${JSON.stringify(override)} → completion ${completionLabel}, avg moves ${movesLabel}, elapsed ${formatSeconds(
          resultEntry.elapsedMs
        )}`
      );

      if (bestResults.length > 0) {
        const best = bestResults[0];
        logger.log(
          `    Current best (100% completion) → avg moves ${best.averageMoves.toFixed(2)} with parameters ${JSON.stringify(
            best.parameters
          )}`
        );
      }
    }
  }

  const elapsedMs = Date.now() - startTime;

  if (bestResults.length === 0 && sweepResults.length > 0) {
    const highestCompletion = sweepResults.reduce(
      (max, result) => Math.max(max, result.completionRate),
      0
    );
    bestResults = sweepResults.filter(
      (result) => Math.abs(result.completionRate - highestCompletion) <= Number.EPSILON
    );
  }

  const metadata = {
    totalConfigurations,
    gamesPerConfig: gamesPerBatch,
    totalGamesSimulated: overallCompleted,
    parameterRanges: normalizedRanges,
    baseConfig: baseConfigSafe,
    elapsedMs,
    completedAt: new Date().toISOString(),
  };

  if (logger?.log) {
    logger.log(
      `Sweep complete in ${formatSeconds(elapsedMs)}. Simulated ${overallCompleted} games across ${totalConfigurations} configurations.`
    );

    if (bestResults.length > 0) {
      const bestSummary = bestResults
        .map(
          (result) =>
            `- avg moves ${result.averageMoves.toFixed(2)} (${formatCompletion(
              result.completionRate
            )}) with parameters ${JSON.stringify(result.parameters)}`
        )
        .join('\n');
      logger.log('Top-performing configurations:\n' + bestSummary);
    } else {
      logger.log('No successful configurations identified.');
    }
  }

  writeResults(sweepResults, metadata, { outputFile, outputFormat, logger });

  return {
    results: sweepResults,
    bestResults,
    metadata,
  };
}

