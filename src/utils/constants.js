// FILE: src/utils/constants.js
/**
 * Game constants and configuration defaults - FIXED VERSION
 */

export const DEFAULT_CONFIG = {
  rows: 20,
  cols: 20,
  tickMs: 100,
  seed: 42,
  shortcutsEnabled: true,
  safetyBuffer: 2,
  lateGameLock: 0,
  minShortcutWindow: 5,
  scorePerFruit: 10,
  shortcutBonus: 5,
  cellSize: 24,
  pathfindingAlgorithm: 'hamiltonian',
};

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
  PATHFINDING_ALGORITHM: 'hamiltonian',
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