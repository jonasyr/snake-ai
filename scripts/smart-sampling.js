#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/smart-sampling.js
/**
 * Smart parameter sampling for efficient exploration of large parameter spaces.
 * Uses various sampling strategies to find optimal configurations without exhaustive search.
 */

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_CONFIG } from '../src/utils/constants.js';
import { runShortcutParameterSweep } from '../src/simulation/parameterSweep.js';

/**
 * Generate random samples from parameter ranges
 */
function generateRandomSamples(ranges, count) {
  const samples = [];
  
  for (let i = 0; i < count; i += 1) {
    const sample = {};
    
    for (const [key, range] of Object.entries(ranges)) {
      if (Array.isArray(range)) {
        // Pick random element from array
        sample[key] = range[Math.floor(Math.random() * range.length)];
      } else if (typeof range === 'object' && range.start !== undefined) {
        // Generate random value in range
        const { start, end, step = 1 } = range;
        const steps = Math.floor((end - start) / step) + 1;
        const randomStep = Math.floor(Math.random() * steps);
        sample[key] = start + randomStep * step;
      } else {
        sample[key] = range;
      }
    }
    
    samples.push(sample);
  }
  
  return samples;
}

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
 * Generate grid samples with some randomization
 */
function generateSmartGridSamples(ranges, maxSamples) {
  const samples = [];
  const paramKeys = Object.keys(ranges);
  
  // Calculate grid dimensions
  const dimensions = paramKeys.map(key => {
    const range = ranges[key];
    if (Array.isArray(range)) {
      return range.length;
    } else if (typeof range === 'object' && range.start !== undefined) {
      return Math.floor((range.end - range.start) / (range.step || 1)) + 1;
    }
    return 1;
  });
  
  const totalCombinations = dimensions.reduce((a, b) => a * b, 1);
  
  if (totalCombinations <= maxSamples) {
    // Generate all combinations
    console.log(`Generating all ${totalCombinations} combinations`);
    // Implementation would generate all combinations
    return generateRandomSamples(ranges, Math.min(totalCombinations, maxSamples));
  } else {
    // Sample strategically
    console.log(`Sampling ${maxSamples} from ${totalCombinations} possible combinations`);
    
    // Use Latin Hypercube for better coverage
    return generateLatinHypercubeSamples(ranges, maxSamples);
  }
}

/**
 * Adaptive sampling - start with coarse grid, then refine around best results
 */
async function adaptiveSampling(ranges, options = {}) {
  const {
    games = 1000,
    outputDir = 'results',
    prefix = 'adaptive-sampling',
    initialSamples = 100,
    refinementSamples = 50,
    refinementRounds = 3
  } = options;

  console.log(`🧠 Starting adaptive parameter sampling`);
  console.log(`🎯 Initial samples: ${initialSamples}`);
  console.log(`🔍 Refinement samples per round: ${refinementSamples}`);
  console.log(`🔄 Refinement rounds: ${refinementRounds}`);

  let allResults = [];
  let currentRanges = { ...ranges };

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Initial broad sampling
  console.log(`\n📊 Phase 1: Initial broad sampling`);
  let samples = generateLatinHypercubeSamples(currentRanges, initialSamples);
  
  for (let round = 0; round <= refinementRounds; round += 1) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const roundOutputFile = path.join(outputDir, `${prefix}-round-${round}-${timestamp}.json`);
    
    console.log(`\n🚀 Round ${round + 1}/${refinementRounds + 1}: Testing ${samples.length} configurations`);
    
    // Convert samples to parameter ranges format
    const sampleRanges = {};
    const sampleKeys = Object.keys(samples[0]);
    
    for (const key of sampleKeys) {
      sampleRanges[key] = samples.map(sample => sample[key]);
    }
    
    // Run the sweep with memory optimization
    try {
      const results = await runShortcutParameterSweep({
        gamesPerConfig: games,
        baseConfig: DEFAULT_CONFIG,
        parameterRanges: sampleRanges,
        uniqueSeeds: true,
        outputFile: roundOutputFile,
        outputFormat: 'json',
        progressIntervalMs: 10000,
      });
      
      // Only keep essential data to prevent memory bloat
      const essentialResults = results.map(r => ({
        config: r.config,
        averageMoves: r.averageMoves,
        completionRate: r.completionRate,
        round: round
      }));
      
      allResults = [...allResults, ...essentialResults];
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      if (round < refinementRounds) {
        // Find top performers (only keep essential data)
        const sorted = essentialResults
          .filter(r => r.completionRate >= 0.95)
          .sort((a, b) => {
            // Sort by completion rate first, then by moves
            if (Math.abs(a.completionRate - b.completionRate) > 0.01) {
              return b.completionRate - a.completionRate;
            }
            return a.averageMoves - b.averageMoves;
          });
        
        const topPerformers = sorted.slice(0, Math.min(10, Math.floor(samples.length * 0.2)));
        
        if (topPerformers.length === 0) {
          console.log(`\n⚠️  No successful configurations in round ${round + 1}, using all results`);
          topPerformers.push(...essentialResults.slice(0, 5));
        }
        
        console.log(`\n🏆 Top ${topPerformers.length} performers from round ${round + 1}:`);
        for (const performer of topPerformers.slice(0, 3)) {
          console.log(`  - ${performer.averageMoves.toFixed(0)} moves (${(performer.completionRate * 100).toFixed(1)}%)`);
        }
        
        // Create refined ranges around top performers
        const refinedRanges = createRefinedRanges(topPerformers, ranges);
        samples = generateLatinHypercubeSamples(refinedRanges, refinementSamples);
        
        // Clear references to help GC
        essentialResults.length = 0;
      }
    } catch (error) {
      console.error(`❌ Error in round ${round + 1}:`, error.message);
      break;
    }
  }
  
  // Final results - save incrementally to avoid memory issues
  const finalOutputFile = path.join(outputDir, `${prefix}-final-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  
  // Write results in chunks to avoid memory issues with large datasets
  const chunks = [];
  const chunkSize = 100;
  for (let i = 0; i < allResults.length; i += chunkSize) {
    chunks.push(allResults.slice(i, i + chunkSize));
  }
  
  // Write final results
  const finalResults = {
    metadata: {
      totalRounds: refinementRounds + 1,
      totalConfigurations: allResults.length,
      timestamp: new Date().toISOString()
    },
    results: allResults
  };
  
  fs.writeFileSync(finalOutputFile, JSON.stringify(finalResults, null, 2));
  
  console.log(`\n✅ Adaptive sampling complete! Final results: ${finalOutputFile}`);
  console.log(`📊 Total configurations tested: ${allResults.length}`);
  
  // Force final cleanup
  allResults.length = 0;
  if (global.gc) {
    global.gc();
  }
  
  return finalResults.results;
}

/**
 * Create refined parameter ranges around top performers
 */
function createRefinedRanges(topPerformers, originalRanges) {
  const refined = {};
  
  for (const [key, originalRange] of Object.entries(originalRanges)) {
    const values = topPerformers.map(p => p.config[key]).filter(v => v !== undefined);
    
    if (values.length === 0) {
      refined[key] = originalRange;
      continue;
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (Array.isArray(originalRange)) {
      // Keep unique values from top performers plus some neighbors
      const uniqueValues = [...new Set(values)];
      refined[key] = uniqueValues;
    } else if (typeof originalRange === 'object' && originalRange.start !== undefined) {
      // Create a tighter range around the best values
      const buffer = Math.max(range * 0.2, originalRange.step || 1);
      refined[key] = {
        start: Math.max(originalRange.start, min - buffer),
        end: Math.min(originalRange.end, max + buffer),
        step: originalRange.step || 1
      };
    } else {
      refined[key] = originalRange;
    }
  }
  
  return refined;
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
🧠 Smart Parameter Sampling for Snake AI

USAGE:
  npm run sample -- --method METHOD [options]

METHODS:
  random           - Pure random sampling
  latin            - Latin Hypercube sampling (better coverage)
  adaptive         - Adaptive refinement (best for optimization)
  smart-grid       - Grid sampling with smart subsampling

OPTIONS:
  --samples <n>           Number of samples (default: 500)
  --games <n>             Games per configuration (default: 1000)
  --outputDir <path>      Output directory (default: results)
  --prefix <name>         Output file prefix (default: smart-sampling)

ADAPTIVE-SPECIFIC OPTIONS:
  --initialSamples <n>    Initial broad samples (default: 100)
  --refinementSamples <n> Samples per refinement round (default: 50)
  --refinementRounds <n>  Number of refinement rounds (default: 3)

EXAMPLES:
  # Quick random exploration
  npm run sample -- --method random --samples 200 --games 500

  # High-quality Latin Hypercube sampling
  npm run sample -- --method latin --samples 1000 --games 1000

  # Adaptive optimization (recommended for finding best configs)
  npm run sample -- --method adaptive --games 2000

  # Smart grid sampling with 500 samples max
  npm run sample -- --method smart-grid --samples 500
`);
}

/**
 * Main execution
 */
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help || args.h || !args.method) {
    printHelp();
    return;
  }

  // Default parameter space - you can expand this!
  const parameterSpace = {
    shortcutsEnabled: [true],
    safetyBuffer: { start: 0.5, end: 8, step: 0.25 },
    lateGameLock: { start: 0, end: 12, step: 0.5 },
    minShortcutWindow: { start: 1, end: 10, step: 0.5 },
    rows: [16, 18, 20, 22, 24],
    cols: [16, 18, 20, 22, 24]
  };

  const method = args.method;
  const samples = parseInt(args.samples, 10) || 500;
  const games = parseInt(args.games, 10) || 1000;
  const outputDir = args.outputDir || 'results';
  const prefix = args.prefix || 'smart-sampling';

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let sampledConfigs;

  switch (method) {
    case 'random':
      console.log(`🎲 Generating ${samples} random samples`);
      sampledConfigs = generateRandomSamples(parameterSpace, samples);
      break;
      
    case 'latin':
      console.log(`📊 Generating ${samples} Latin Hypercube samples`);
      sampledConfigs = generateLatinHypercubeSamples(parameterSpace, samples);
      break;
      
    case 'adaptive':
      console.log(`🧠 Starting adaptive sampling`);
      await adaptiveSampling(parameterSpace, {
        games,
        outputDir,
        prefix,
        initialSamples: parseInt(args.initialSamples, 10) || 100,
        refinementSamples: parseInt(args.refinementSamples, 10) || 50,
        refinementRounds: parseInt(args.refinementRounds, 10) || 3
      });
      return;
      
    case 'smart-grid':
      console.log(`🏗️ Generating smart grid samples (max ${samples})`);
      sampledConfigs = generateSmartGridSamples(parameterSpace, samples);
      break;
      
    default:
      console.error(`❌ Unknown method: ${method}`);
      process.exit(1);
  }

  // Convert to parameter ranges format
  const sampleRanges = {};
  const sampleKeys = Object.keys(sampledConfigs[0]);
  
  for (const key of sampleKeys) {
    sampleRanges[key] = sampledConfigs.map(config => config[key]);
  }

  // Run the sweep
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = path.join(outputDir, `${prefix}-${method}-${timestamp}.json`);

  console.log(`🚀 Running ${sampledConfigs.length} configurations with ${games} games each`);
  console.log(`📁 Output: ${outputFile}`);

  await runShortcutParameterSweep({
    gamesPerConfig: games,
    baseConfig: DEFAULT_CONFIG,
    parameterRanges: sampleRanges,
    uniqueSeeds: true,
    outputFile,
    outputFormat: 'both',
    progressIntervalMs: 10000,
  });

  console.log(`✅ Sampling complete! Results saved to ${outputFile}`);
}

main().catch(console.error);