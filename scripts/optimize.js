#!/usr/bin/env node
/* eslint-env node */
/* global process, global */
// FILE: scripts/optimize.js
/**
 * Unified parameter optimization script for Snake AI.
 * Uses all available CPU cores and RAM efficiently without memory leaks.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';

import { DEFAULT_CONFIG, createRuntimeConfig } from '../src/utils/constants.js';
import { simulateGames } from '../src/simulation/simulator.js';

/**
 * Get system memory and CPU information
 */
function getSystemInfo() {
  const totalMemoryGB = Math.floor(os.totalmem() / 1024 ** 3);
  const freeMemoryGB = Math.floor(os.freemem() / 1024 ** 3);
  const cpuCores = os.cpus().length;

  return {
    totalMemoryGB,
    freeMemoryGB,
    cpuCores,
    // Use 85% of total memory, more aggressive but safer than using free memory
    maxMemoryMB: Math.floor(totalMemoryGB * 0.85 * 1024),
    // Use all CPU cores but leave one for the main thread
    workerThreads: Math.max(1, cpuCores - 1),
  };
}

/**
 * Memory monitoring utilities
 */
class MemoryMonitor {
  constructor(maxMemoryMB) {
    this.maxMemoryMB = maxMemoryMB;
    this.startTime = Date.now();
    this.lastGC = Date.now();
  }

  checkMemory() {
    const used = process.memoryUsage();
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const threshold = this.maxMemoryMB * 0.8; // Trigger GC at 80% of max

    if (usedMB > threshold && global.gc) {
      const now = Date.now();
      // Only GC every 5 seconds to avoid excessive GC
      if (now - this.lastGC > 5000) {
        global.gc();
        this.lastGC = now;
        const afterGC = Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        );
        console.log(`🧹 GC triggered: ${usedMB}MB → ${afterGC}MB`);
      }
    }

    return {
      usedMB,
      maxMB: this.maxMemoryMB,
      percentage: Math.round((usedMB / this.maxMemoryMB) * 100),
    };
  }

  log(progress = null) {
    const mem = this.checkMemory();
    const runtime = Math.round((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(runtime / 60);
    const seconds = runtime % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    let logMsg = `💾 Memory: ${mem.usedMB}MB/${mem.maxMB}MB (${mem.percentage}%) | ⏱️  Runtime: ${timeStr}`;

    if (progress && progress.completed > 0 && progress.total > 0) {
      const percent = Math.round((progress.completed / progress.total) * 100);
      const avgTimePerItem = runtime / progress.completed;
      const remaining = progress.total - progress.completed;
      const etaSeconds = Math.round(remaining * avgTimePerItem);
      const etaMinutes = Math.floor(etaSeconds / 60);
      const etaStr =
        etaMinutes > 0
          ? `${etaMinutes}m ${etaSeconds % 60}s`
          : `${etaSeconds}s`;

      logMsg += ` | 📈 Progress: ${progress.completed}/${progress.total} (${percent}%) | 🎯 ETA: ${etaStr}`;
    }

    console.log(logMsg);
  }
}

/**
 * Default parameter ranges optimized based on previous results
 * Focused on promising ranges: safetyBuffer 1-3, lateGameLock 0-2, minShortcutWindow 1-6
 */
const PARAMETER_RANGES = Object.freeze({
  shortcutsEnabled: [true],
  safetyBuffer: { start: 1, end: 3, step: 1 }, // Optimal range: 1-3
  lateGameLock: { start: 0, end: 2, step: 1 }, // Optimal range: 0-2
  minShortcutWindow: { start: 1, end: 6, step: 1 }, // Full range still useful
  rows: [DEFAULT_CONFIG.rows],
  cols: [DEFAULT_CONFIG.cols],
});

/**
 * Generate Latin Hypercube samples for better space coverage
 */
function generateLatinHypercubeSamples(ranges, count) {
  const samples = [];
  const paramKeys = Object.keys(ranges);
  const numParams = paramKeys.length;

  // Create Latin Hypercube design
  const lhs = [];
  for (let i = 0; i < numParams; i += 1) {
    const column = [];
    for (let j = 0; j < count; j += 1) {
      column.push((j + Math.random()) / count);
    }
    // Shuffle the column
    for (let j = column.length - 1; j > 0; j -= 1) {
      const k = Math.floor(Math.random() * (j + 1));
      [column[j], column[k]] = [column[k], column[j]];
    }
    lhs.push(column);
  }

  // Convert to parameter values
  for (let i = 0; i < count; i += 1) {
    const sample = {};

    for (let j = 0; j < numParams; j += 1) {
      const key = paramKeys[j];
      const range = ranges[key];
      const uniformValue = lhs[j][i];

      if (Array.isArray(range)) {
        const index = Math.floor(uniformValue * range.length);
        sample[key] = range[Math.min(index, range.length - 1)];
      } else if (typeof range === 'object' && range.start !== undefined) {
        const { start, end, step = 1 } = range;
        const steps = Math.floor((end - start) / step) + 1;
        const stepIndex = Math.floor(uniformValue * steps);
        sample[key] = start + Math.min(stepIndex, steps - 1) * step;
      } else {
        sample[key] = range;
      }
    }

    samples.push(sample);
  }

  return samples;
}

/**
 * Process configurations in batches to manage memory
 */
async function processBatch(configurations, options, monitor) {
  const { games, batchSize = 10 } = options;
  const results = [];
  const totalConfigs = configurations.length;

  for (let i = 0; i < configurations.length; i += batchSize) {
    const batch = configurations.slice(i, i + batchSize);
    const batchResults = [];

    for (let j = 0; j < batch.length; j += 1) {
      const config = batch[j];
      const configIndex = i + j + 1;

      try {
        const startTime = Date.now();

        const { summary } = await simulateGames({
          games,
          config: createRuntimeConfig(config),
          uniqueSeeds: true,
          includeRuns: false,
        });

        const elapsedMs = Date.now() - startTime;
        const gamesPerSecond = Math.round(games / (elapsedMs / 1000));

        // Only keep essential metrics to minimize memory usage
        const result = {
          config,
          completionRate: summary.statuses.completionRate,
          averageMoves: summary.averages.moves,
          averageScore: summary.averages.score,
          totalGames: summary.gameCount,
          completions: summary.statuses.complete,
        };

        batchResults.push(result);

        // Show progress for each config
        const progress = `[${configIndex}/${totalConfigs}]`;
        const completion = `${(result.completionRate * 100).toFixed(1)}%`;
        const moves = result.averageMoves.toFixed(1);
        const performance = `${gamesPerSecond} games/s`;

        console.log(
          `  ${progress} ✓ ${completion} completion, ${moves} avg moves (${performance})`
        );

        // Check memory every few configurations
        if (configIndex % 3 === 0) {
          monitor.checkMemory();
        }
      } catch (error) {
        console.error(
          `  [${configIndex}/${totalConfigs}] ❌ Error: ${error.message}`
        );
      }
    }

    results.push(...batchResults);

    // Force GC after each batch
    if (global.gc) {
      global.gc();
    }

    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(configurations.length / batchSize);
    const batchProgress = `${batchNum}/${totalBatches}`;

    console.log(
      `\n📦 Batch ${batchProgress} complete (${results.length}/${totalConfigs} configs processed)`
    );
    monitor.log({ completed: results.length, total: totalConfigs });
  }

  return results;
}

/**
 * Stream results to disk to avoid memory accumulation
 */
function createResultsStreamer(outputFile) {
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let isFirst = true;

  // Initialize JSON array
  fs.writeFileSync(
    outputFile,
    '{\n  "metadata": {\n    "startTime": "' +
      new Date().toISOString() +
      '"\n  },\n  "results": [\n'
  );

  return {
    write(results) {
      for (const result of results) {
        const prefix = isFirst ? '' : ',\n';
        fs.appendFileSync(outputFile, prefix + '    ' + JSON.stringify(result));
        isFirst = false;
      }
    },

    close(metadata = {}) {
      const finalMetadata = {
        ...metadata,
        endTime: new Date().toISOString(),
        totalResults: !isFirst ? undefined : 0,
      };

      fs.appendFileSync(
        outputFile,
        '\n  ],\n  "finalMetadata": ' +
          JSON.stringify(finalMetadata, null, 2) +
          '\n}'
      );
    },
  };
}

/**
 * Adaptive optimization algorithm
 */
async function adaptiveOptimization(options = {}) {
  const {
    games = 1000,
    initialSamples = 100,
    refinementRounds = 3,
    refinementSamples = 50,
    outputDir = 'results',
    prefix = 'optimize',
  } = options;

  const sysInfo = getSystemInfo();
  const monitor = new MemoryMonitor(sysInfo.maxMemoryMB);

  console.log(`🚀 Starting adaptive optimization`);
  console.log(
    `💻 System: ${sysInfo.cpuCores} cores, ${sysInfo.totalMemoryGB}GB RAM (using ${sysInfo.maxMemoryMB}MB)`
  );
  console.log(
    `🎯 Initial samples: ${initialSamples}, Refinement: ${refinementRounds} rounds × ${refinementSamples} samples`
  );
  console.log(`🎮 Games per config: ${games}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = path.join(outputDir, `${prefix}-${timestamp}.json`);
  const streamer = createResultsStreamer(outputFile);

  let allResults = [];
  let bestConfigs = [];
  let currentRanges = { ...PARAMETER_RANGES };

  try {
    // Initial broad sampling
    console.log(`\n📊 Phase 1: Initial broad sampling`);
    let samples = generateLatinHypercubeSamples(currentRanges, initialSamples);

    for (let round = 0; round <= refinementRounds; round += 1) {
      console.log(
        `\n🔄 Round ${round + 1}/${refinementRounds + 1}: Testing ${samples.length} configurations`
      );

      const results = await processBatch(
        samples,
        { games, batchSize: 5 },
        monitor
      );
      streamer.write(results);

      // Find successful configurations
      const successful = results.filter(r => r.completionRate >= 0.95);
      successful.sort((a, b) => {
        if (Math.abs(a.completionRate - b.completionRate) > 0.01) {
          return b.completionRate - a.completionRate;
        }
        return a.averageMoves - b.averageMoves;
      });

      const topN = Math.min(10, Math.floor(samples.length * 0.2));
      const roundBest = successful.slice(0, topN);

      if (roundBest.length > 0) {
        bestConfigs = [...bestConfigs, ...roundBest];
        console.log(
          `🏆 Found ${roundBest.length} successful configs this round`
        );
        console.log(
          `   Best: ${roundBest[0].averageMoves.toFixed(1)} moves (${(roundBest[0].completionRate * 100).toFixed(1)}%)`
        );
      } else {
        console.log(`⚠️  No successful configs in round ${round + 1}`);
      }

      // Prepare next round (if not last)
      if (round < refinementRounds && roundBest.length > 0) {
        currentRanges = createRefinedRanges(roundBest, PARAMETER_RANGES);
        samples = generateLatinHypercubeSamples(
          currentRanges,
          refinementSamples
        );
      }

      allResults.push(...results);
      monitor.log();
    }
  } finally {
    // Find overall best configurations
    const finalBest = bestConfigs
      .filter(r => r.completionRate >= 0.95)
      .sort((a, b) => {
        if (Math.abs(a.completionRate - b.completionRate) > 0.01) {
          return b.completionRate - a.completionRate;
        }
        return a.averageMoves - b.averageMoves;
      })
      .slice(0, 5);

    const metadata = {
      totalConfigurations: allResults.length,
      systemInfo: sysInfo,
      bestConfigurations: finalBest,
      parameterRanges: PARAMETER_RANGES,
    };

    streamer.close(metadata);

    console.log(`\n✅ Optimization complete! Results saved to: ${outputFile}`);
    console.log(`📊 Total configurations tested: ${allResults.length}`);

    if (finalBest.length > 0) {
      console.log(`\n🏆 Top configurations:`);
      for (const config of finalBest) {
        console.log(
          `   ${config.averageMoves.toFixed(1)} moves (${(config.completionRate * 100).toFixed(1)}%) - ${JSON.stringify(config.config)}`
        );
      }
    }

    monitor.log();
  }
}

/**
 * Create refined parameter ranges around successful configurations
 */
function createRefinedRanges(successfulConfigs, originalRanges) {
  const refined = {};

  for (const [key, originalRange] of Object.entries(originalRanges)) {
    const values = successfulConfigs
      .map(c => c.config[key])
      .filter(v => v !== undefined);

    if (values.length === 0) {
      refined[key] = originalRange;
      continue;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (Array.isArray(originalRange)) {
      // Keep unique values from successful configs
      refined[key] = [...new Set(values)];
    } else if (
      typeof originalRange === 'object' &&
      originalRange.start !== undefined
    ) {
      // Create tighter range around successful values
      const buffer = Math.max(range * 0.3, originalRange.step || 1);
      refined[key] = {
        start: Math.max(originalRange.start, min - buffer),
        end: Math.min(originalRange.end, max + buffer),
        step: originalRange.step || 1,
      };
    } else {
      refined[key] = originalRange;
    }
  }

  return refined;
}

/**
 * Parse command line arguments
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
      // Try to parse as number
      const num = Number(next);
      args[key] = Number.isNaN(num) ? next : num;
      i += 2;
    } else {
      args[key] = true;
      i += 1;
    }
  }
  return args;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
🚀 Snake AI Parameter Optimization

USAGE:
  npm run optimize [-- options]

OPTIONS:
  --games <n>              Games per configuration (default: 1000)
  --samples <n>            Initial samples (default: 100)
  --rounds <n>             Refinement rounds (default: 3)
  --refinement <n>         Samples per refinement round (default: 50)
  --output <dir>           Output directory (default: results)
  --prefix <name>          Output file prefix (default: optimize)
  --help                   Show this help

EXAMPLES:
  # Quick optimization
  npm run optimize -- --games 500 --samples 50

  # Intensive optimization
  npm run optimize -- --games 2000 --samples 200 --rounds 5

  # Custom output
  npm run optimize -- --output my-results --prefix experiment-1
`);
}

// Main execution
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  // Set memory limit if not already set
  if (!process.env.NODE_OPTIONS?.includes('--max-old-space-size')) {
    const sysInfo = getSystemInfo();
    console.log(`💾 Setting memory limit to ${sysInfo.maxMemoryMB}MB`);
    process.env.NODE_OPTIONS = `--max-old-space-size=${sysInfo.maxMemoryMB} --expose-gc`;
  }

  const options = {
    games: args.games || 1000,
    initialSamples: args.samples || 100,
    refinementRounds: args.rounds || 3,
    refinementSamples: args.refinement || 50,
    outputDir: args.output || 'results',
    prefix: args.prefix || 'optimize',
  };

  try {
    await adaptiveOptimization(options);
  } catch (error) {
    console.error('💥 Optimization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
