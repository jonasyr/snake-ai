// FILE: src/utils/constants.js
/**
 * Game constants and configuration defaults - FIXED VERSION
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

  // Algorithm-specific configs (only used if algorithm is active)
  // Hamiltonian + Shortcuts
  shortcutsEnabled: true,
  safetyBuffer: 2,
  lateGameLock: 0,
  minShortcutWindow: 5,

  // A* (future)
  // allowDiagonals: false,

  // RL (future)
  // explorationRate: 0.1,
  // learningRate: 0.01,
};

/**
 * Get algorithm-specific config subset
 * @param {typeof DEFAULT_CONFIG} fullConfig - The full configuration object
 * @param {string} algorithm - Active algorithm identifier
 * @returns {Record<string, *>} Algorithm specific configuration values
 */
export function getAlgorithmConfig(fullConfig, algorithm) {
  const algorithmConfigs = {
    hamiltonian: {},
    'hamiltonian-shortcuts': {
      shortcutsEnabled: fullConfig.shortcutsEnabled,
      safetyBuffer: fullConfig.safetyBuffer,
      lateGameLock: fullConfig.lateGameLock,
      minShortcutWindow: fullConfig.minShortcutWindow,
    },
    astar: {
      allowDiagonals: fullConfig.allowDiagonals ?? false,
    },
    // Add more algorithms here
  };

  return algorithmConfigs[algorithm] || {};
}

// Keep uppercase versions for internal engine constants
export const ENGINE_CONSTANTS = {
  ROWS: 20,
  COLS: 20,
  TICK_MS: 100,
  CELL_SIZE: 24,
  SEED: 42,
  SHORTCUTS_ENABLED: true,
  SAFETY_BUFFER: 2,
  LATE_GAME_LOCK: 0,
  MIN_SHORTCUT_WINDOW: 5,
  SCORE_PER_FRUIT: 10,
  SHORTCUT_BONUS: 5,
  PATHFINDING_ALGORITHM: 'hamiltonian-shortcuts',
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
