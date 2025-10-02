#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/analyze-results.js
/**
 * Analysis tool for parameter sweep results.
 * Helps identify optimal configurations and parameter relationships.
 */

import fs from 'node:fs';

/**
 * Load and parse results from JSON file
 */
function loadResults(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const results = JSON.parse(data);

    // Handle different result formats
    if (Array.isArray(results)) {
      return results;
    } else if (results.results && Array.isArray(results.results)) {
      return results.results;
    } else if (
      results.configurations &&
      Array.isArray(results.configurations)
    ) {
      return results.configurations;
    }

    console.error('❌ Unrecognized results format');
    return [];
  } catch (error) {
    console.error(`❌ Error loading results: ${error.message}`);
    return [];
  }
}

/**
 * Analyze and rank configurations
 */
function analyzeConfigurations(results) {
  console.log(`📊 Analyzing ${results.length} configurations...`);

  // Filter for successful configurations
  const successful = results.filter(r => r.completionRate >= 0.95); // At least 95% completion

  console.log(
    `✅ ${successful.length} configurations with ≥95% completion rate`
  );

  if (successful.length === 0) {
    console.log('❌ No configurations met the success criteria');
    return { successful: [], analysis: {} };
  }

  // Sort by performance (lower moves = better)
  successful.sort((a, b) => a.averageMoves - b.averageMoves);

  // Performance analysis
  const moves = successful.map(r => r.averageMoves);
  const analysis = {
    best: Math.min(...moves),
    worst: Math.max(...moves),
    mean: moves.reduce((a, b) => a + b, 0) / moves.length,
    median: moves[Math.floor(moves.length / 2)],
    improvement: (
      ((Math.max(...moves) - Math.min(...moves)) / Math.max(...moves)) *
      100
    ).toFixed(1),
  };

  console.log(`\n📈 Performance Analysis:`);
  console.log(`  Best:        ${analysis.best.toFixed(0)} moves`);
  console.log(`  Worst:       ${analysis.worst.toFixed(0)} moves`);
  console.log(`  Mean:        ${analysis.mean.toFixed(0)} moves`);
  console.log(`  Median:      ${analysis.median.toFixed(0)} moves`);
  console.log(`  Improvement: ${analysis.improvement}% (best vs worst)`);

  return { successful, analysis };
}

/**
 * Find parameter correlations and optimal ranges
 */
function findParameterInsights(results) {
  const parameters = ['safetyBuffer', 'lateGameLock', 'minShortcutWindow'];
  const insights = {};

  console.log(`\n🔍 Parameter Insights:`);

  for (const param of parameters) {
    const values = results
      .map(r => r.config[param])
      .filter(v => v !== undefined);

    if (values.length === 0) continue;

    // Group by parameter value and calculate average performance
    const groups = {};
    for (const result of results) {
      const value = result.config[param];
      if (value !== undefined) {
        if (!groups[value]) {
          groups[value] = { moves: [], count: 0 };
        }
        groups[value].moves.push(result.averageMoves);
        groups[value].count += 1;
      }
    }

    // Calculate averages and find best
    const paramAnalysis = Object.entries(groups)
      .map(([value, data]) => ({
        value: parseFloat(value),
        avgMoves: data.moves.reduce((a, b) => a + b, 0) / data.moves.length,
        count: data.count,
      }))
      .sort((a, b) => a.avgMoves - b.avgMoves);

    insights[param] = paramAnalysis;

    console.log(`\n  ${param}:`);
    const top3 = paramAnalysis.slice(0, 3);
    for (const item of top3) {
      console.log(
        `    ${item.value}: ${item.avgMoves.toFixed(0)} moves (${item.count} configs)`
      );
    }
  }

  return insights;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(successful, insights) {
  console.log(`\n💡 Optimization Recommendations:`);

  // Top 5 configurations
  const top5 = successful.slice(0, 5);
  console.log(`\n🏆 Top 5 Configurations:`);
  for (let i = 0; i < top5.length; i += 1) {
    const config = top5[i];
    console.log(
      `  ${i + 1}. ${config.averageMoves.toFixed(0)} moves - Safety: ${config.config.safetyBuffer}, Lock: ${config.config.lateGameLock}, Window: ${config.config.minShortcutWindow}`
    );
  }

  // Parameter recommendations
  console.log(`\n🎯 Optimal Parameter Ranges:`);
  for (const [param, analysis] of Object.entries(insights)) {
    const top3Values = analysis.slice(0, 3).map(a => a.value);
    const range = {
      min: Math.min(...top3Values),
      max: Math.max(...top3Values),
      best: analysis[0].value,
    };

    console.log(`  ${param}: ${range.best} (range: ${range.min}-${range.max})`);
  }

  // Configuration templates
  console.log(`\n📋 Recommended Configuration Templates:`);

  const bestConfig = successful[0].config;
  console.log(`\n  🥇 Optimal Performance:`);
  console.log(`     safetyBuffer: ${bestConfig.safetyBuffer}`);
  console.log(`     lateGameLock: ${bestConfig.lateGameLock}`);
  console.log(`     minShortcutWindow: ${bestConfig.minShortcutWindow}`);
  console.log(`     Expected moves: ~${successful[0].averageMoves.toFixed(0)}`);

  // Conservative option (if different from best)
  const conservativeIndex = successful.findIndex(
    s => s.config.safetyBuffer > bestConfig.safetyBuffer
  );
  if (conservativeIndex > 0) {
    const conservative = successful[conservativeIndex];
    console.log(`\n  🛡️ Conservative Option:`);
    console.log(`     safetyBuffer: ${conservative.config.safetyBuffer}`);
    console.log(`     lateGameLock: ${conservative.config.lateGameLock}`);
    console.log(
      `     minShortcutWindow: ${conservative.config.minShortcutWindow}`
    );
    console.log(
      `     Expected moves: ~${conservative.averageMoves.toFixed(0)}`
    );
  }

  // Aggressive option
  const aggressiveIndex = successful.findIndex(
    s => s.config.safetyBuffer < bestConfig.safetyBuffer
  );
  if (aggressiveIndex > 0) {
    const aggressive = successful[aggressiveIndex];
    console.log(`\n  ⚡ Aggressive Option:`);
    console.log(`     safetyBuffer: ${aggressive.config.safetyBuffer}`);
    console.log(`     lateGameLock: ${aggressive.config.lateGameLock}`);
    console.log(
      `     minShortcutWindow: ${aggressive.config.minShortcutWindow}`
    );
    console.log(`     Expected moves: ~${aggressive.averageMoves.toFixed(0)}`);
  }
}

/**
 * Export results for further analysis
 */
function exportAnalysis(successful, insights, outputPath) {
  const analysis = {
    timestamp: new Date().toISOString(),
    summary: {
      totalConfigurations: successful.length,
      bestPerformance: successful[0]?.averageMoves,
      worstPerformance: successful[successful.length - 1]?.averageMoves,
    },
    topConfigurations: successful.slice(0, 20),
    parameterInsights: insights,
    recommendations: {
      optimal: successful[0]?.config,
      topPerformers: successful.slice(0, 5).map(s => s.config),
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Analysis exported to: ${outputPath}`);
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
📊 Parameter Sweep Results Analyzer

USAGE:
  npm run analyze -- --file RESULTS_FILE [options]

OPTIONS:
  --file <path>        Path to results JSON file (required)
  --output <path>      Export analysis to file (optional)
  --minSuccess <rate>  Minimum completion rate (default: 0.95)

EXAMPLES:
  # Analyze results from a sweep
  npm run analyze -- --file results/sweep-2024-01-15.json

  # Export analysis to file
  npm run analyze -- --file results/sweep.json --output analysis.json

  # Use different success threshold
  npm run analyze -- --file results/sweep.json --minSuccess 0.90
`);
}

/**
 * Main execution
 */
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help || args.h || !args.file) {
    printHelp();
    return;
  }

  const inputFile = args.file;
  const outputFile = args.output;
  const minSuccess = parseFloat(args.minSuccess) || 0.95;

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`🔍 Analyzing results from: ${inputFile}`);
  console.log(`📊 Minimum success rate: ${(minSuccess * 100).toFixed(0)}%`);

  // Load and analyze results
  const results = loadResults(inputFile);
  if (results.length === 0) {
    process.exit(1);
  }

  // Filter by success rate
  const filtered = results.filter(r => r.completionRate >= minSuccess);

  if (filtered.length === 0) {
    console.error(
      `❌ No configurations meet the ${(minSuccess * 100).toFixed(0)}% success criteria`
    );
    process.exit(1);
  }

  const { successful } = analyzeConfigurations(filtered);
  const insights = findParameterInsights(successful);
  generateRecommendations(successful, insights);

  // Export if requested
  if (outputFile) {
    exportAnalysis(successful, insights, outputFile);
  }

  console.log(`\n✅ Analysis complete!`);
}

main().catch(console.error);
