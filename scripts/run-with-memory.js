#!/usr/bin/env node
/* eslint-env node */
/* global process */
// FILE: scripts/run-with-memory.js
/**
 * Wrapper script to run parameter exploration with increased memory allocation
 */

import { spawn } from 'node:child_process';
import process from 'node:process';

function runWithMemory(script, args, memoryMB = 4096) {
  const nodeArgs = [
    `--max-old-space-size=${memoryMB}`,
    '--expose-gc', // Enable manual garbage collection
    script,
    ...args
  ];
  
  console.log(`🚀 Starting with ${memoryMB}MB memory allocation...`);
  console.log(`📄 Command: node ${nodeArgs.join(' ')}`);
  
  const child = spawn('node', nodeArgs, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

function printHelp() {
  console.log(`
🚀 High-Memory Parameter Exploration Runner

USAGE:
  npm run memory -- <script> [script-args] [--memory <MB>]

EXAMPLES:
  # Run adaptive sampling with 8GB memory
  npm run memory -- sample --method adaptive --games 1000 --memory 8192

  # Run comprehensive exploration with 6GB memory  
  npm run memory -- explore --strategy FINE_SHORTCUT_TUNING --memory 6144

  # Run memory-efficient sampling (default 4GB)
  npm run memory -- efficient --games 1000
`);
}

// Parse arguments
const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

// Find memory argument
let memoryMB = 4096; // Default 4GB
const memoryIndex = argv.findIndex(arg => arg === '--memory');
if (memoryIndex >= 0 && memoryIndex + 1 < argv.length) {
  memoryMB = parseInt(argv[memoryIndex + 1], 10) || 4096;
  // Remove memory args from script args
  argv.splice(memoryIndex, 2);
}

// Determine script to run
const scriptName = argv[0];
const scriptArgs = argv.slice(1);

const scriptMap = {
  'sample': 'scripts/smart-sampling.js',
  'explore': 'scripts/comprehensive-sweep.js', 
  'efficient': 'scripts/memory-efficient-sampling.js',
  'analyze': 'scripts/analyze-results.js',
  'sweep': 'scripts/shortcut-sweep.js'
};

const scriptPath = scriptMap[scriptName];
if (!scriptPath) {
  console.error(`❌ Unknown script: ${scriptName}`);
  console.error(`Available scripts: ${Object.keys(scriptMap).join(', ')}`);
  process.exit(1);
}

runWithMemory(scriptPath, scriptArgs, memoryMB);