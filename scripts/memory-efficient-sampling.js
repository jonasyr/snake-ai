#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/memory-efficient-sampling.js
/**
 * Memory-efficient parameter sampling for large explorations.
 * Processes configurations in small batches to avoid memory issues.
 */

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_CONFIG } from '../src/utils/constants.js';
import { simulateGames } from '../src/simulation/simulator.js';

/**
 * Generate Latin Hypercube samples
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
        const value = start + uniformValue * (end - start);
        sample[key] = Math.round(value / step) * step;
      } else {
        sample[key] = range;
      }
    }
    
    samples.push(sample);
  }
  
  return samples;
}

/**
 * Process configurations in small batches to avoid memory issues
 */
async function processBatches(configs, games, outputFile, batchSize = 10) {
  const results = [];
  const totalBatches = Math.ceil(configs.length / batchSize);
  
  console.log(`📦 Processing ${configs.length} configurations in ${totalBatches} batches of ${batchSize}`);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, configs.length);
    const batch = configs.slice(startIndex, endIndex);
    
    console.log(`\n🔄 Batch ${batchIndex + 1}/${totalBatches}: Configs ${startIndex + 1}-${endIndex}`);
    
    // Process each config in the batch
    for (let i = 0; i < batch.length; i += 1) {
      const config = { ...DEFAULT_CONFIG, ...batch[i] };
      const configIndex = startIndex + i;
      
      try {
        const startTime = Date.now();
        const { summary } = await simulateGames({
          games,
          config,
          fastMode: true, // Use fast mode for efficiency
          includeRuns: false
        });
        
        const result = {
          index: configIndex + 1,
          config: batch[i],
          completionRate: summary.statuses.completionRate,
          averageMoves: summary.averages.moves,
          averageScore: summary.averages.score,
          minMoves: summary.distributions.moves.min,
          maxMoves: summary.distributions.moves.max,
          totalGames: summary.gameCount,
          durationMs: Date.now() - startTime
        };
        
        results.push(result);
        
        // Progress update
        const completed = configIndex + 1;
        const percent = ((completed / configs.length) * 100).toFixed(1);
        console.log(`  [${completed}/${configs.length}] (${percent}%) - ${result.averageMoves.toFixed(0)} moves (${(result.completionRate * 100).toFixed(1)}%)`);
        
        // Save incremental results every 50 configs
        if (completed % 50 === 0 || completed === configs.length) {
          const tempFile = outputFile.replace('.json', '_temp.json');
          fs.writeFileSync(tempFile, JSON.stringify(results, null, 2));
        }
        
      } catch (error) {
        console.error(`❌ Error processing config ${configIndex + 1}:`, error.message);
        
        // Add error result to maintain indexing
        results.push({
          index: configIndex + 1,
          config: batch[i],
          error: error.message,
          completionRate: 0,
          averageMoves: Infinity,
          averageScore: 0
        });
      }
      
      // Force garbage collection every 10 configs
      if ((configIndex + 1) % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    // Force garbage collection between batches
    if (global.gc) {
      global.gc();
    }
  }
  
  return results;
}

/**
 * Memory-efficient adaptive sampling
 */
async function memoryEfficientAdaptive(options = {}) {
  const {
    games = 500,
    outputDir = 'results',
    initialSamples = 30,
    refinementSamples = 20,
    refinementRounds = 2,
    batchSize = 5
  } = options;

  // Smaller parameter space to start
  const parameterSpace = {
    shortcutsEnabled: [true],
    safetyBuffer: { start: 1, end: 6, step: 0.5 },
    lateGameLock: { start: 0, end: 8, step: 1 },
    minShortcutWindow: { start: 2, end: 8, step: 1 },
    rows: [20],
    cols: [20]
  };

  console.log(`🧠 Memory-efficient adaptive sampling`);
  console.log(`🎯 Initial samples: ${initialSamples} (batch size: ${batchSize})`);
  console.log(`🔍 Refinement: ${refinementSamples} samples × ${refinementRounds} rounds`);
  console.log(`🎮 Games per config: ${games}`);

  let allResults = [];
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Initial sampling
  let samples = generateLatinHypercubeSamples(parameterSpace, initialSamples);
  
  for (let round = 0; round <= refinementRounds; round += 1) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const roundFile = path.join(outputDir, `adaptive-round-${round}-${timestamp}.json`);
    
    console.log(`\n🚀 Round ${round + 1}/${refinementRounds + 1}: ${samples.length} configurations`);
    
    // Process in small batches
    const results = await processBatches(samples, games, roundFile, batchSize);
    
    // Save round results
    fs.writeFileSync(roundFile, JSON.stringify({
      round: round + 1,
      samples: samples.length,
      results
    }, null, 2));
    
    allResults = [...allResults, ...results];
    
    if (round < refinementRounds) {
      // Find top performers
      const successful = results.filter(r => r.completionRate >= 0.9);
      
      if (successful.length === 0) {
        console.log(`⚠️  No successful configs in round ${round + 1}, stopping early`);
        break;
      }
      
      successful.sort((a, b) => a.averageMoves - b.averageMoves);
      const topCount = Math.min(5, Math.floor(successful.length * 0.3));
      const topPerformers = successful.slice(0, topCount);
      
      console.log(`\n🏆 Top ${topPerformers.length} performers:`);
      for (const p of topPerformers.slice(0, 3)) {
        console.log(`  - ${p.averageMoves.toFixed(0)} moves (${(p.completionRate * 100).toFixed(1)}%)`);
      }
      
      // Create refined ranges (simplified)
      const refinedRanges = { ...parameterSpace };
      
      // Focus on successful ranges
      for (const param of ['safetyBuffer', 'lateGameLock', 'minShortcutWindow']) {
        const values = topPerformers.map(p => p.config[param]).filter(v => v !== undefined);
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          const buffer = Math.max(range * 0.3, 0.5);
          
          refinedRanges[param] = {
            start: Math.max(parameterSpace[param].start, min - buffer),
            end: Math.min(parameterSpace[param].end, max + buffer),
            step: parameterSpace[param].step
          };
        }
      }
      
      samples = generateLatinHypercubeSamples(refinedRanges, refinementSamples);
    }
    
    // Cleanup
    results.length = 0;
    if (global.gc) {
      global.gc();
    }
  }
  
  // Final results
  const finalFile = path.join(outputDir, `adaptive-final-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  
  const summary = {
    totalConfigurations: allResults.length,
    totalRounds: refinementRounds + 1,
    timestamp: new Date().toISOString(),
    results: allResults
  };
  
  fs.writeFileSync(finalFile, JSON.stringify(summary, null, 2));
  
  console.log(`\n✅ Adaptive sampling complete!`);
  console.log(`📊 Total configurations: ${allResults.length}`);
  console.log(`📁 Results: ${finalFile}`);
  
  return allResults;
}

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
 * Print help
 */
function printHelp() {
  console.log(`
🧠 Memory-Efficient Parameter Sampling

USAGE:
  npm run efficient -- [options]

OPTIONS:
  --games <n>             Games per configuration (default: 500)
  --initialSamples <n>    Initial samples (default: 30)
  --refinementSamples <n> Refinement samples (default: 20)  
  --refinementRounds <n>  Refinement rounds (default: 2)
  --batchSize <n>         Batch size for processing (default: 5)
  --outputDir <path>      Output directory (default: results)

EXAMPLES:
  # Quick exploration
  npm run efficient -- --games 300 --initialSamples 20

  # More thorough but still memory-efficient
  npm run efficient -- --games 1000 --initialSamples 50 --refinementRounds 3
`);
}

/**
 * Main execution
 */
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help || args.h) {
    printHelp();
    return;
  }

  const options = {
    games: parseInt(args.games, 10) || 500,
    initialSamples: parseInt(args.initialSamples, 10) || 30,
    refinementSamples: parseInt(args.refinementSamples, 10) || 20,
    refinementRounds: parseInt(args.refinementRounds, 10) || 2,
    batchSize: parseInt(args.batchSize, 10) || 5,
    outputDir: args.outputDir || 'results'
  };

  try {
    await memoryEfficientAdaptive(options);
  } catch (error) {
    console.error(`❌ Sampling failed:`, error);
    process.exit(1);
  }
}

main().catch(console.error);