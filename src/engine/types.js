// FILE: src/engine/types.js
/**
 * Type definitions for the Snake Game Engine
 * Using JSDoc for TypeScript-like documentation
 */

/**
 * @typedef {Object} Position
 * @property {number} row - Grid row (0-based)
 * @property {number} col - Grid column (0-based)
 */

/**
 * @typedef {Object} GameConfig
 * @property {number} rows - Number of grid rows
 * @property {number} cols - Number of grid columns
 * @property {number} tickMs - Milliseconds per game tick
 * @property {number} seed - RNG seed for deterministic gameplay
 * @property {boolean} shortcutsEnabled - Allow AI to take shortcuts
 * @property {number} safetyBuffer - Minimum distance from tail for shortcuts
 */

/**
 * @typedef {Object} SnakeState
 * @property {number[]} body - Array of cell indices (head at index 0)
 * @property {Set<number>} occupied - Set of occupied cell indices for O(1) lookup
 */

/**
 * @typedef {Object} GameState
 * @property {SnakeState} snake - Current snake state
 * @property {number} fruit - Current fruit cell index
 * @property {number[]} cycle - Hamiltonian cycle order
 * @property {Map<number, number>} cycleIndex - Cell to cycle position mapping
 * @property {number} moves - Total moves made
 * @property {number} score - Current game score
 * @property {'playing' | 'paused' | 'gameOver' | 'complete'} status - Game status
 * @property {boolean} lastMoveWasShortcut - Whether last move used shortcut
 */

/**
 * @typedef {Object} MoveResult
 * @property {GameState} state - New game state
 * @property {boolean} valid - Whether move was valid
 * @property {string} reason - Description of move result
 * @property {number[]} plannedPath - Upcoming planned moves
 */

export const GAME_STATUS = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  COMPLETE: 'complete',
};

export const MOVE_RESULT = {
  VALID: 'valid',
  COLLISION: 'collision',
  OUT_OF_BOUNDS: 'outOfBounds',
  ATE_FRUIT: 'ateFruit',
  GAME_COMPLETE: 'gameComplete',
};
