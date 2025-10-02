// FILE: src/engine/gameEngine.js
/**
 * Main game engine with pure state transitions - FIXED VERSION
 */

import { createSnake, moveSnake, getHead, getTail, getLength, normalizeSnake } from './snake.js';
import { spawnFruit, isFruitAt } from './fruit.js';
import { generateHamiltonianCycle } from './hamiltonian.js';
import { checkCollision } from './collision.js';
import { ensurePathfindingStrategy } from './pathfinding/index.js';
import { GAME_STATUS, MOVE_RESULT } from './types.js';
import { DEFAULT_CONFIG } from '../utils/constants.js';
import { createObjectPool } from '../utils/collections.js';
import { isValidCellIndex, validateGameConfig } from '../utils/guards.js';

const plannerDataPool = createObjectPool(
  () => ({
    plannedPath: [],
    shortcutEdge: null,
    edgeCache: [0, 0],
  }),
  (planner) => {
    planner.plannedPath.length = 0;
    planner.shortcutEdge = null;
  },
  256
);

const gameStatePool = createObjectPool(
  () => ({
    config: null,
    snake: null,
    fruit: -1,
    cycle: null,
    cycleIndex: null,
    moves: 0,
    score: 0,
    status: GAME_STATUS.PAUSED,
    lastMoveWasShortcut: false,
    plannerData: null,
  }),
  (state) => {
    state.config = null;
    state.snake = null;
    state.fruit = -1;
    state.cycle = null;
    state.cycleIndex = null;
    state.moves = 0;
    state.score = 0;
    state.status = GAME_STATUS.PAUSED;
    state.lastMoveWasShortcut = false;
    state.plannerData = null;
  },
  256
);

function acquirePlannerData() {
  const planner = plannerDataPool.get();
  planner.plannedPath.length = 0;
  planner.shortcutEdge = null;
  return planner;
}

function clonePlannerData(source) {
  if (!source) {
    return null;
  }

  const clone = acquirePlannerData();
  if (source.plannedPath?.length) {
    for (let i = 0; i < source.plannedPath.length; i += 1) {
      clone.plannedPath.push(source.plannedPath[i]);
    }
  }

  if (Array.isArray(source.shortcutEdge)) {
    const edge = clone.edgeCache;
    edge[0] = source.shortcutEdge[0];
    edge[1] = source.shortcutEdge[1];
    clone.shortcutEdge = edge;
  }

  return clone;
}

function acquireGameState() {
  return gameStatePool.get();
}

function copyCoreState(target, source) {
  target.config = source.config;
  target.snake = source.snake;
  target.fruit = source.fruit;
  target.cycle = source.cycle;
  target.cycleIndex = source.cycleIndex;
  target.moves = source.moves;
  target.score = source.score;
  target.status = source.status;
  target.lastMoveWasShortcut = source.lastMoveWasShortcut;
}

function cloneState(source) {
  const clone = acquireGameState();
  copyCoreState(clone, source);
  clone.plannerData = clonePlannerData(source.plannerData);
  return clone;
}

/**
 * Compute the next cell along the Hamiltonian cycle.
 *
 * @param {Object} gameState - Game state containing cycle data.
 * @returns {number|null} Next cell index or null when unavailable.
 */
function getCycleFallbackMove(gameState) {
  if (!gameState?.cycle || !gameState?.cycleIndex) {
    return null;
  }

  const headCell = getHead(gameState.snake);
  if (!Number.isInteger(headCell)) {
    return null;
  }

  const headPos = gameState.cycleIndex.get(headCell);
  if (headPos === undefined) {
    return gameState.cycle?.[0] ?? null;
  }

  const nextPos = (headPos + 1) % gameState.cycle.length;
  return gameState.cycle?.[nextPos] ?? null;
}

export function releaseGameState(state) {
  if (!state) {
    return;
  }

  if (state.plannerData) {
    plannerDataPool.release(state.plannerData);
    state.plannerData = null;
  }

  gameStatePool.release(state);
}

/**
 * Initialize a new game state
 * @param {Object} config - Game configuration
 * @returns {Object} Initial game state
 */
export function initializeGame(config = DEFAULT_CONFIG) {
  const { rows, cols, seed: rawSeed, ...otherConfig } = { ...DEFAULT_CONFIG, ...config };

  const validation = validateGameConfig({ rows, cols, seed: rawSeed });

  if (!validation.valid) {
    const details = validation.errors.length ? ` Details: ${validation.errors.join('; ')}` : '';
    throw new Error(`Invalid game configuration provided.${details}`);
  }

  const seed = Number.isSafeInteger(Math.trunc(rawSeed))
    ? Math.trunc(rawSeed)
    : DEFAULT_CONFIG.seed;

  // Generate Hamiltonian cycle
  const hamiltonianData = generateHamiltonianCycle(rows, cols);

  if (!hamiltonianData.cycle || hamiltonianData.cycle.length === 0) {
    throw new Error('Failed to generate Hamiltonian cycle');
  }

  const startCell = hamiltonianData.cycle[0];
  const snake = createSnake(startCell, hamiltonianData.cycle.length);
  const fruit = spawnFruit(snake.occupied, hamiltonianData.cycle.length);

  const initialState = acquireGameState();
  initialState.config = { rows, cols, seed, ...otherConfig };
  initialState.snake = snake;
  initialState.fruit = fruit;
  initialState.cycle = hamiltonianData.cycle;
  initialState.cycleIndex = hamiltonianData.cycleIndex;
  initialState.moves = 0;
  initialState.score = 0;
  initialState.status = GAME_STATUS.PAUSED;
  initialState.lastMoveWasShortcut = false;
  initialState.plannerData = acquirePlannerData();

  return initialState;
}

/**
 * Execute one game tick
 * @param {Object} gameState - Current game state
 * @returns {Object} New game state and move result
 */
export async function gameTick(gameState) {
  if (gameState.status !== GAME_STATUS.PLAYING) {
    return {
      state: gameState,
      result: { valid: false, reason: 'Game not running' },
    };
  }

  const totalCells = Number.isInteger(gameState.cycle?.length)
    ? gameState.cycle.length
    : (Number.isInteger(gameState.config?.rows) && Number.isInteger(gameState.config?.cols)
        ? gameState.config.rows * gameState.config.cols
        : 0);

  if (!Number.isInteger(totalCells) || totalCells <= 0) {
    console.error('Invalid grid configuration detected during game tick.', {
      totalCells,
      config: gameState.config,
    });
    return {
      state: gameState,
      result: { valid: false, reason: 'Invalid grid configuration' },
    };
  }

  const normalizedSnake = normalizeSnake(gameState.snake, totalCells);
  const workingState = normalizedSnake === gameState.snake
    ? gameState
    : { ...gameState, snake: normalizedSnake };

  // Check if game is complete (no free cells)
  if (getLength(workingState.snake) === workingState.cycle.length) {
    const terminalState = cloneState(workingState);
    terminalState.status = GAME_STATUS.COMPLETE;
    return {
      state: terminalState,
      result: { valid: true, reason: MOVE_RESULT.GAME_COMPLETE },
    };
  }

  // Plan next move
  let pathPlan;
  try {
    const manager = await ensurePathfindingStrategy(workingState, {
      algorithm: workingState.config?.pathfindingAlgorithm,
      config: {
        shortcutsEnabled: workingState.config?.shortcutsEnabled,
        safetyBuffer: workingState.config?.safetyBuffer,
        lateGameLock: workingState.config?.lateGameLock,
        minShortcutWindow: workingState.config?.minShortcutWindow,
      },
      forceInitialize: workingState.moves === 0,
    });

    pathPlan = await manager.planMove(workingState, {
      shortcutsEnabled: workingState.config?.shortcutsEnabled,
    });
  } catch (error) {
    console.error('Pathfinding error encountered during game tick.', {
      error,
      moves: workingState.moves,
      status: workingState.status,
    });
    pathPlan = null;
  }

  let nextCell = pathPlan?.nextMove;

  if (!isValidCellIndex(nextCell, totalCells)) {
    const fallbackCell = getCycleFallbackMove(workingState);

    if (!isValidCellIndex(fallbackCell, totalCells)) {
      console.error('Planner generated invalid target cell.', {
        nextCell,
        totalCells,
        pathPlan,
      });
      return {
        state: workingState,
        result: { valid: false, reason: 'Planner generated invalid target cell' },
      };
    }

    nextCell = fallbackCell;
    pathPlan = {
      nextMove: fallbackCell,
      isShortcut: false,
      reason: 'Fallback move - planner invalid output',
      plannedPath: [],
      metadata: {
        shortcutInfo: null,
        cycleAvailable: Boolean(workingState?.cycle?.length),
      },
    };
  }

  // Check collision
  const collision = checkCollision(nextCell, workingState);
  if (collision.collision) {
    const failedState = cloneState(workingState);
    failedState.status = GAME_STATUS.GAME_OVER;
    return {
      state: failedState,
      result: { valid: false, reason: collision.reason, collision: collision.type },
    };
  }

  // Determine if eating fruit
  const willEat = isFruitAt(workingState.fruit, nextCell);

  // Move snake
  const newSnake = moveSnake(workingState.snake, nextCell, willEat);

  const nextFruit = willEat
    ? spawnFruit(newSnake.occupied, workingState.cycle.length)
    : workingState.fruit;

  const plannerData = acquirePlannerData();

  if (Array.isArray(pathPlan?.plannedPath)) {
    for (let i = 0; i < pathPlan.plannedPath.length; i += 1) {
      plannerData.plannedPath.push(pathPlan.plannedPath[i]);
    }
  }

  if (pathPlan.isShortcut) {
    const edge = plannerData.edgeCache;
    edge[0] = getHead(workingState.snake);
    edge[1] = nextCell;
    plannerData.shortcutEdge = edge;
  }

  // Update game state
  const newState = acquireGameState();
  copyCoreState(newState, workingState);
  newState.snake = newSnake;
  newState.fruit = nextFruit;
  newState.moves = workingState.moves + 1;
  newState.lastMoveWasShortcut = pathPlan.isShortcut;
  newState.plannerData = plannerData;

  const config = workingState.config || DEFAULT_CONFIG;
  const fruitValue = config.scorePerFruit ?? DEFAULT_CONFIG.scorePerFruit;
  const shortcutBonus = config.shortcutBonus ?? DEFAULT_CONFIG.shortcutBonus;

  let nextScore = workingState.score;
  if (willEat) {
    nextScore += fruitValue + (pathPlan.isShortcut ? shortcutBonus : 0);
  }
  newState.score = nextScore;

  if (willEat && nextFruit === -1) {
    newState.status = GAME_STATUS.COMPLETE;
  }

  const resultReason = willEat ? MOVE_RESULT.ATE_FRUIT : MOVE_RESULT.VALID;

  return {
    state: newState,
    result: {
      valid: true,
      reason: resultReason,
      shortcut: pathPlan.isShortcut,
      pathInfo: pathPlan,
    },
  };
}

/**
 * Change game status
 * @param {Object} gameState - Current game state
 * @param {string} status - New status
 * @returns {Object} Updated game state
 */
export function setGameStatus(gameState, status) {
  const updated = cloneState(gameState);
  updated.status = status;
  return updated;
}

/**
 * Reset game to initial state
 * @param {Object} config - Game configuration
 * @returns {Object} Fresh game state
 */
export function resetGame(config) {
  return initializeGame(config);
}

/**
 * Get game statistics
 * @param {Object} gameState - Current game state
 * @returns {Object} Game statistics
 */
export function getGameStats(gameState) {
  const { snake, moves, score, cycle, fruit } = gameState;

  if (!snake || !cycle || !gameState.cycleIndex) {
    return {
      moves: 0,
      length: 0,
      score: 0,
      free: 0,
      distHeadApple: 0,
      distHeadTail: 0,
      shortcut: false,
      efficiency: 0,
      status: gameState.status || 'unknown',
    };
  }

  const head = getHead(snake);
  const tail = getTail(snake);
  const headPos = gameState.cycleIndex.get(head);
  const tailPos = gameState.cycleIndex.get(tail);
  const fruitPos = gameState.cycleIndex.get(fruit);
  const snakeLength = getLength(snake);

  return {
    moves: moves || 0,
    length: snakeLength,
    score: score || 0,
    free: cycle.length - snakeLength,
    distHeadApple: (headPos !== undefined && fruitPos !== undefined)
      ? (fruitPos - headPos + cycle.length) % cycle.length
      : 0,
    distHeadTail: (headPos !== undefined && tailPos !== undefined)
      ? (tailPos - headPos + cycle.length) % cycle.length
      : 0,
    shortcut: gameState.lastMoveWasShortcut || false,
    efficiency: moves > 0 ? Math.round((score / moves) * 100) : 0,
    status: gameState.status,
  };
}