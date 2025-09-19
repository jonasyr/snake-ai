// FILE: src/simulation/simulator.js
/**
 * Simulation utilities for running many AI Snake games without the UI layer.
 */

import { initializeGame, setGameStatus, gameTick, getGameStats } from '../engine/gameEngine.js';
import { GAME_STATUS } from '../engine/types.js';
import { DEFAULT_CONFIG } from '../utils/constants.js';
import { seed as setSeed } from '../engine/rng.js';
import { moveSnake, getHead } from '../engine/snake.js';
import { isFruitAt } from '../engine/fruit.js';
import { checkCollision } from '../engine/collision.js';
import { findShortcut, validateShortcut } from '../engine/shortcuts.js';

const getTimestamp = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function normalizeConfig(config = {}) {
  return { ...DEFAULT_CONFIG, ...config };
}

function prepareConfig(baseConfig, index, uniqueSeeds) {
  if (!uniqueSeeds) {
    return { ...baseConfig };
  }

  const baseSeed = baseConfig.seed ?? DEFAULT_CONFIG.seed;
  return { ...baseConfig, seed: baseSeed + index };
}

function normalizeBoolean(value, defaultValue) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true' || lowered === '1' || lowered === 'yes') {
      return true;
    }
    if (lowered === 'false' || lowered === '0' || lowered === 'no') {
      return false;
    }
  }
  return defaultValue;
}

/**
 * Fast synchronous game simulation for batch processing.
 * Bypasses async pathfinding for maximum performance.
 * @param {Object} configOverrides - Optional game configuration overrides.
 * @param {Object} options - Simulation options.
 * @param {number} [options.maxTicks=Infinity] - Maximum number of ticks to run.
 * @returns {Object} Result of the game simulation.
 */
export function runGameFast(configOverrides = {}, options = {}) {
  const { maxTicks = Infinity } = options;
  const config = normalizeConfig(configOverrides);
  const rngSeed = config.seed ?? DEFAULT_CONFIG.seed;

  setSeed(rngSeed);

  let state = initializeGame(config);
  state = setGameStatus(state, GAME_STATUS.PLAYING);

  const start = getTimestamp();
  let tickCount = 0;

  while (state.status === GAME_STATUS.PLAYING && tickCount < maxTicks) {
    // Fast synchronous tick without async pathfinding
    const result = gameTickFast(state);
    state = result.state;
    tickCount += 1;

    if (state.status === GAME_STATUS.GAME_OVER || state.status === GAME_STATUS.COMPLETE) {
      break;
    }
  }

  const durationMs = getTimestamp() - start;
  const stats = getGameStats(state);

  return {
    seed: rngSeed,
    config,
    status: state.status,
    durationMs,
    ticks: tickCount,
    moves: stats.moves,
    score: stats.score,
    stats,
  };
}

/**
 * Fast synchronous game tick using direct Hamiltonian cycle logic.
 * @param {Object} gameState - Current game state.
 * @returns {Object} Tick result with new state.
 */
function gameTickFast(gameState) {
  if (gameState.status !== GAME_STATUS.PLAYING) {
    return {
      state: gameState,
      result: { valid: false, reason: 'Game not running' },
    };
  }

  const totalCells = gameState.cycle?.length || 0;
  if (totalCells <= 0) {
    return {
      state: { ...gameState, status: GAME_STATUS.GAME_OVER },
      result: { valid: false, reason: 'Invalid grid' },
    };
  }

  // Check if game is complete
  const snakeLength = gameState.snake?.body?.length || 0;
  if (snakeLength >= totalCells - 1) {
    return {
      state: { ...gameState, status: GAME_STATUS.COMPLETE },
      result: { valid: true, reason: 'Game complete' },
    };
  }

  const headCell = getHead(gameState.snake);
  if (headCell < 0 || headCell >= totalCells) {
    return {
      state: { ...gameState, status: GAME_STATUS.GAME_OVER },
      result: { valid: false, reason: 'Invalid head position' },
    };
  }

  // Determine next move - prioritize shortcuts if enabled
  let nextCell = -1;
  let shortcutTaken = false;

  if (gameState.config?.shortcutsEnabled && gameState.fruit != null) {
    const shortcut = findShortcut(gameState, gameState.config);

    if (shortcut?.cell >= 0) {
      // Validate the shortcut before taking it (this was missing!)
      const validation = validateShortcut(headCell, shortcut.cell, gameState, gameState.config);
      if (validation.valid) {
        nextCell = shortcut.cell;
        shortcutTaken = true;
      }
    }
  }

  // Fall back to Hamiltonian cycle if no shortcut
  if (nextCell < 0) {
    // Handle both Map and array/object types for cycleIndex
    let currentCyclePos;
    if (gameState.cycleIndex && typeof gameState.cycleIndex.get === 'function') {
      // It's a Map
      currentCyclePos = gameState.cycleIndex.get(headCell);
    } else if (gameState.cycleIndex) {
      // It's an array or object
      currentCyclePos = gameState.cycleIndex[headCell];
    }
    
    if (typeof currentCyclePos === 'number' && gameState.cycle) {
      const nextCyclePos = (currentCyclePos + 1) % totalCells;
      nextCell = gameState.cycle[nextCyclePos] ?? -1;
    }
  }

  if (nextCell < 0 || nextCell >= totalCells) {
    return {
      state: { ...gameState, status: GAME_STATUS.GAME_OVER },
      result: { valid: false, reason: 'Invalid move' },
    };
  }

  // Check collision
  const collisionResult = checkCollision(nextCell, gameState);
  if (collisionResult.collision) {
    return {
      state: { ...gameState, status: GAME_STATUS.GAME_OVER },
      result: { valid: false, reason: collisionResult.reason || 'Collision' },
    };
  }

  // Check if eating fruit
  const eatsFruit = isFruitAt(nextCell, gameState.fruit);
  const newSnake = moveSnake(gameState.snake, nextCell, eatsFruit);

  let newFruit = gameState.fruit;
  let newScore = gameState.score;

  if (eatsFruit) {
    newScore += 1;
    // Spawn new fruit (simple version for fast simulation)
    const occupiedSet = new Set(newSnake.body);
    const freeCells = [];
    for (let i = 0; i < totalCells; i += 1) {
      if (!occupiedSet.has(i)) {
        freeCells.push(i);
      }
    }
    
    if (freeCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * freeCells.length);
      newFruit = freeCells[randomIndex];
    } else {
      newFruit = null; // No free cells, game should end
    }
  }

  const newState = {
    ...gameState,
    snake: newSnake,
    fruit: newFruit,
    score: newScore,
    moves: gameState.moves + 1,
    status: newFruit === null && snakeLength >= totalCells - 1 
      ? GAME_STATUS.COMPLETE 
      : GAME_STATUS.PLAYING,
  };

  return {
    state: newState,
    result: { 
      valid: true, 
      shortcutTaken,
      reason: 'Move successful' 
    },
  };
}

/**
 * Run a single game simulation until it reaches a terminal state.
 * @param {Object} configOverrides - Optional game configuration overrides.
 * @param {Object} options - Simulation options.
 * @param {number} [options.maxTicks=Infinity] - Maximum number of ticks to run.
 * @returns {Object} Result of the game simulation.
 */
export async function runGame(configOverrides = {}, options = {}) {
  const { maxTicks = Infinity } = options;
  const config = normalizeConfig(configOverrides);
  const rngSeed = config.seed ?? DEFAULT_CONFIG.seed;

  setSeed(rngSeed);

  let state = initializeGame(config);
  state = setGameStatus(state, GAME_STATUS.PLAYING);

  const start = getTimestamp();
  let tickCount = 0;

  while (state.status === GAME_STATUS.PLAYING && tickCount < maxTicks) {
    const result = await gameTick(state);
    state = result.state;
    tickCount += 1;

    if (state.status === GAME_STATUS.GAME_OVER || state.status === GAME_STATUS.COMPLETE) {
      break;
    }
  }

  const durationMs = getTimestamp() - start;
  const stats = getGameStats(state);

  return {
    seed: rngSeed,
    config,
    status: state.status,
    durationMs,
    ticks: tickCount,
    moves: stats.moves,
    score: stats.score,
    stats,
  };
}

/**
 * Run multiple games (optionally with unique seeds) and aggregate statistics.
 * @param {Object} params - Simulation parameters.
 * @param {number} [params.games=1] - Number of games to run.
 * @param {Object} [params.config] - Game configuration overrides applied to every run.
 * @param {boolean|string} [params.uniqueSeeds=true] - Whether to offset the seed for each run.
 * @param {boolean} [params.includeRuns=false] - Include per-game results in the response.
 * @param {Object} [params.runOptions] - Options passed to each runGame call.
 * @param {boolean} [params.fastMode=false] - Use fast synchronous simulation for better performance.
 * @param {Function} [params.onProgress] - Progress callback invoked after each game.
 * @returns {{summary: Object, runs: Object[] | undefined}} Aggregated stats and optional run data.
 */
export async function simulateGames(params = {}) {
  const {
    games = 1,
    config: configOverrides = {},
    uniqueSeeds = true,
    includeRuns = false,
    runOptions = {},
    fastMode = true,
    onProgress,
  } = params;

  const totalGames = Math.max(0, Math.floor(games));
  const baseConfig = normalizeConfig(configOverrides);
  const useUniqueSeeds = normalizeBoolean(uniqueSeeds, true);

  const results = [];

  const totals = {
    moves: 0,
    score: 0,
    length: 0,
    efficiency: 0,
    free: 0,
    durationMs: 0,
  };

  const statuses = {
    complete: 0,
    gameOver: 0,
    other: 0,
  };

  let minMoves = Number.POSITIVE_INFINITY;
  let maxMoves = 0;
  let minDuration = Number.POSITIVE_INFINITY;
  let maxDuration = 0;
  let fastestCompletion = Number.POSITIVE_INFINITY;
  let slowestCompletion = 0;

  for (let i = 0; i < totalGames; i += 1) {
    const configForGame = prepareConfig(baseConfig, i, useUniqueSeeds);
    
    // Use fast mode for better performance in batch simulations
    const result = fastMode 
      ? runGameFast(configForGame, runOptions)
      : await runGame(configForGame, runOptions);

    totals.moves += result.stats.moves;
    totals.score += result.stats.score;
    totals.length += result.stats.length;
    totals.efficiency += result.stats.efficiency;
    totals.free += result.stats.free;
    totals.durationMs += result.durationMs;

    if (Number.isFinite(result.stats.moves)) {
      minMoves = Math.min(minMoves, result.stats.moves);
      maxMoves = Math.max(maxMoves, result.stats.moves);
    }

    minDuration = Math.min(minDuration, result.durationMs);
    maxDuration = Math.max(maxDuration, result.durationMs);

    if (result.status === GAME_STATUS.COMPLETE) {
      statuses.complete += 1;
      fastestCompletion = Math.min(fastestCompletion, result.durationMs);
      slowestCompletion = Math.max(slowestCompletion, result.durationMs);
    } else if (result.status === GAME_STATUS.GAME_OVER) {
      statuses.gameOver += 1;
    } else {
      statuses.other += 1;
    }

    if (includeRuns) {
      results.push({ ...result });
    }

    if (typeof onProgress === 'function') {
      onProgress({ completed: i + 1, total: totalGames, lastResult: result });
    }
  }

  const divisor = totalGames || 1;

  const summary = {
    gameCount: totalGames,
    config: baseConfig,
    grid: { rows: baseConfig.rows, cols: baseConfig.cols },
    statuses: {
      complete: statuses.complete,
      gameOver: statuses.gameOver,
      other: statuses.other,
      completionRate: totalGames > 0 ? statuses.complete / totalGames : 0,
    },
    averages: {
      moves: totals.moves / divisor,
      score: totals.score / divisor,
      length: totals.length / divisor,
      free: totals.free / divisor,
      efficiency: totals.efficiency / divisor,
      durationMs: totals.durationMs / divisor,
    },
    distributions: {
      moves: {
        min: Number.isFinite(minMoves) ? minMoves : null,
        max: totalGames > 0 ? maxMoves : null,
        mean: totals.moves / divisor,
      },
    },
    totals: {
      moves: totals.moves,
      score: totals.score,
      durationMs: totals.durationMs,
    },
    durations: {
      minMs: Number.isFinite(minDuration) ? minDuration : null,
      maxMs: totalGames > 0 ? maxDuration : null,
      fastestCompletionMs: statuses.complete > 0 ? fastestCompletion : null,
      slowestCompletionMs: statuses.complete > 0 ? slowestCompletion : null,
    },
  };

  return {
    summary,
    runs: includeRuns ? results : undefined,
  };
}
