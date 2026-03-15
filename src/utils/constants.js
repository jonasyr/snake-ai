// FILE: src/utils/constants.js
import { getAlgorithmDefaultConfig as getAlgorithmDefaultConfigInternal } from '../engine/pathfinding/algorithmRegistry.js';

/** @type {Set<string>} */
const BASE_CONFIG_KEYS = new Set([
  'rows',
  'cols',
  'cellSize',
  'tickMs',
  'seed',
  'scorePerFruit',
  'shortcutBonus',
  'pathfindingAlgorithm',
]);

/**
 * Base game configuration shared by all algorithms. Algorithm-specific
 * settings are provided separately via {@link getAlgorithmDefaultConfig}.
 */
export const DEFAULT_CONFIG = {
  // Grid configuration
  rows: 20,
  cols: 20,
  cellSize: 24,

  // Game timing
  tickMs: 100,

  // RNG
  seed: 42,

  // Scoring
  scorePerFruit: 10,
  shortcutBonus: 5,

  // Pathfinding
  pathfindingAlgorithm: 'hamiltonian-shortcuts',
};

/**
 * Retrieve default configuration overrides for a given algorithm.
 *
 * @param {string} algorithm - Algorithm identifier.
 * @returns {Record<string, *>} Shallow copy of the default overrides.
 */
export function getAlgorithmDefaultConfig(algorithm) {
  const defaults = getAlgorithmDefaultConfigInternal(algorithm);
  if (!defaults || typeof defaults !== 'object') {
    return {};
  }
  return { ...defaults };
}

/**
 * Merge the base game configuration with algorithm-specific defaults and
 * caller-provided overrides to create a runtime-ready configuration object.
 *
 * @param {Record<string, *>} [overrides={}] - Caller overrides.
 * @returns {Record<string, *>} Runtime configuration containing all required keys.
 */
export function createRuntimeConfig(overrides = {}) {
  const algorithm =
    (typeof overrides.pathfindingAlgorithm === 'string'
      ? overrides.pathfindingAlgorithm
      : DEFAULT_CONFIG.pathfindingAlgorithm);

  const algorithmDefaults = getAlgorithmDefaultConfigInternal(algorithm);
  const mergedDefaults =
    algorithmDefaults && typeof algorithmDefaults === 'object'
      ? { ...algorithmDefaults }
      : {};

  return {
    ...DEFAULT_CONFIG,
    pathfindingAlgorithm: algorithm,
    ...mergedDefaults,
    ...overrides,
  };
}

/**
 * Extract the subset of configuration fields that belong to the active
 * algorithm.
 *
 * @param {Record<string, *>} config - Runtime configuration object.
 * @param {string} algorithm - Active algorithm identifier.
 * @returns {Record<string, *>} Algorithm-specific configuration values.
 */
export function getAlgorithmConfig(config, algorithm) {
  const runtimeConfig = config ?? {};
  const algorithmDefaults = getAlgorithmDefaultConfigInternal(algorithm) || {};

  const values = {};

  for (const [key, value] of Object.entries(algorithmDefaults)) {
    if (value !== undefined) {
      values[key] = value;
    }
  }

  for (const [key, value] of Object.entries(runtimeConfig)) {
    if (value === undefined || BASE_CONFIG_KEYS.has(key)) {
      continue;
    }
    values[key] = value;
  }

  return values;
}

// Keep uppercase versions for internal engine constants
export const ENGINE_CONSTANTS = {
  ROWS: DEFAULT_CONFIG.rows,
  COLS: DEFAULT_CONFIG.cols,
  TICK_MS: DEFAULT_CONFIG.tickMs,
  CELL_SIZE: DEFAULT_CONFIG.cellSize,
  SEED: DEFAULT_CONFIG.seed,
  SCORE_PER_FRUIT: DEFAULT_CONFIG.scorePerFruit,
  SHORTCUT_BONUS: DEFAULT_CONFIG.shortcutBonus,
  PATHFINDING_ALGORITHM: DEFAULT_CONFIG.pathfindingAlgorithm,
};

export const DIRECTIONS = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
};

export const COLORS = {
  SNAKE_HEAD: '#10b981',
  SNAKE_BODY: '#059669',
  FRUIT: '#ef4444',
  CYCLE: '#1e40af30',
  SHORTCUT: '#06b6d4',
  SHORTCUT_EDGE: '#fbbf24',
  BACKGROUND: '#0f172a',
};

export const STORAGE_KEYS = {
  SETTINGS: 'snake_game_settings',
  HIGH_SCORE: 'snake_game_high_score',
  STATS: 'snake_game_stats',
};
