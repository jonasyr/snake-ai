#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/comprehensive-sweep.js
/**
 * Comprehensive parameter exploration script for finding optimal configurations.
 * This script explores a much larger parameter space with multiple strategies.
 */

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_CONFIG } from '../src/utils/constants.js';
import { runShortcutParameterSweep } from '../src/simulation/parameterSweep.js';

/**
 * Comprehensive parameter exploration strategies
 */
const EXPLORATION_STRATEGIES = {
  // Strategy 1: Fine-grained shortcut optimization
  FINE_SHORTCUT_TUNING: {
    shortcutsEnabled: [true],
    safetyBuffer: { start: 1, end: 8, step: 1 },        // 8 values
    lateGameLock: { start: 0, end: 12, step: 1 },       // 13 values  
    minShortcutWindow: { start: 1, end: 10, step: 1 },  // 10 values
    rows: [20],
    cols: [20],
    // Total: 8 × 13 × 10 = 1,040 configurations
  },

  // Strategy 2: Grid size impact analysis
  GRID_SIZE_ANALYSIS: {
    shortcutsEnabled: [true],
    safetyBuffer: [2, 3, 4], // Best performers from strategy 1
    lateGameLock: [0, 2, 4, 6],
    minShortcutWindow: [3, 4, 5, 6],
    rows: [10, 12, 14, 16, 18, 20, 22, 24],
    cols: [10, 12, 14, 16, 18, 20, 22, 24],
    // Total: 3 × 4 × 4 × 8 × 8 = 3,072 configurations
  },

  // Strategy 3: Shortcuts vs no shortcuts comparison
  SHORTCUTS_COMPARISON: {
    shortcutsEnabled: [true, false],
    safetyBuffer: [1, 2, 3, 4, 5, 6],
    lateGameLock: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    minShortcutWindow: [1, 2, 3, 4, 5, 6, 7, 8],
    rows: [16, 20, 24],
    cols: [16, 20, 24],
    // Total: 2 × 6 × 9 × 8 × 3 × 3 = 7,776 configurations
  },

  // Strategy 4: High-resolution parameter mapping
  HIGH_RESOLUTION: {
    shortcutsEnabled: [true],
    safetyBuffer: { start: 1, end: 10, step: 0.5 },     // 19 values
    lateGameLock: { start: 0, end: 15, step: 0.5 },     // 31 values
    minShortcutWindow: { start: 1, end: 12, step: 0.5 }, // 23 values
    rows: [20],
    cols: [20],
    // Total: 19 × 31 × 23 = 13,547 configurations
  },

  // Strategy 5: Random sampling for exploration
  RANDOM_SAMPLING: {
    shortcutsEnabled: [true],
    safetyBuffer: { start: 0.5, end: 12, step: 0.1 },
    lateGameLock: { start: 0, end: 20, step: 0.1 },
    minShortcutWindow: { start: 0.5, end: 15, step: 0.1 },
    rows: [16, 18, 20, 22, 24],
    cols: [16, 18, 20, 22, 24],
    // Can be sampled randomly from this space
  }
};

/**
 * Parse CLI arguments
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
 * Generate timestamp for output files
 */
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Run a comprehensive parameter exploration
 */
async function runComprehensiveExploration(strategy, options = {}) {
  const {
    games = 1000,
    outputDir = 'results',
    prefix = 'comprehensive-sweep',
    format = 'both'
  } = options;

  const timestamp = getTimestamp();
  const outputFile = path.join(outputDir, `${prefix}-${timestamp}.json`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🚀 Starting comprehensive parameter exploration`);
  console.log(`📊 Strategy: ${strategy}`);
  console.log(`🎯 Games per configuration: ${games}`);
  console.log(`📁 Output: ${outputFile}`);

  const parameterRanges = EXPLORATION_STRATEGIES[strategy];
  if (!parameterRanges) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }

  try {
    await runShortcutParameterSweep({
      gamesPerConfig: games,
      baseConfig: DEFAULT_CONFIG,
      parameterRanges,
      uniqueSeeds: true,
      outputFile,
      outputFormat: format,
      progressIntervalMs: 5000, // Progress every 5 seconds
    });

    console.log(`✅ Exploration complete! Results saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Exploration failed:`, error);
    process.exit(1);
  }
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
🐍 Comprehensive Snake AI Parameter Exploration

USAGE:
  npm run explore -- --strategy STRATEGY_NAME [options]

STRATEGIES:
  FINE_SHORTCUT_TUNING    - Fine-grained shortcut parameter optimization (1,040 configs)
  GRID_SIZE_ANALYSIS      - Impact of different grid sizes (3,072 configs)  
  SHORTCUTS_COMPARISON    - Compare shortcuts enabled vs disabled (7,776 configs)
  HIGH_RESOLUTION         - High-resolution parameter mapping (13,547 configs)
  RANDOM_SAMPLING         - Random sampling from large parameter space

OPTIONS:
  --games <n>            Number of games per configuration (default: 1000)
  --outputDir <path>     Output directory (default: results)
  --prefix <name>        Output file prefix (default: comprehensive-sweep)
  --format <type>        Output format: json, csv, both (default: both)

EXAMPLES:
  # Quick exploration with fewer games
  npm run explore -- --strategy FINE_SHORTCUT_TUNING --games 100

  # High-resolution exploration (will take a long time!)
  npm run explore -- --strategy HIGH_RESOLUTION --games 2000

  # Grid size analysis
  npm run explore -- --strategy GRID_SIZE_ANALYSIS --games 500

  # Compare shortcuts vs no shortcuts
  npm run explore -- --strategy SHORTCUTS_COMPARISON --games 1000

ESTIMATED TIMES (with 1000 games per config):
  FINE_SHORTCUT_TUNING:   ~2-3 hours
  GRID_SIZE_ANALYSIS:     ~6-8 hours  
  SHORTCUTS_COMPARISON:   ~15-20 hours
  HIGH_RESOLUTION:        ~30-40 hours

Tip: Start with FINE_SHORTCUT_TUNING to find good parameters, then use those
     in the other strategies for more focused exploration.
`);
}

/**
 * Main execution
 */
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help || args.h || !args.strategy) {
    printHelp();
    return;
  }

  const games = args.games ? parseInt(args.games, 10) : 1000;
  const strategy = args.strategy;
  const outputDir = args.outputDir || 'results';
  const prefix = args.prefix || 'comprehensive-sweep';
  const format = args.format || 'both';

  if (!Number.isInteger(games) || games < 1) {
    console.error('❌ Invalid games count. Must be a positive integer.');
    process.exit(1);
  }

  await runComprehensiveExploration(strategy, {
    games,
    outputDir,
    prefix,
    format
  });
}

main().catch(console.error);