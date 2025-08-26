// FILE: src/engine/gameEngine.js
/**
 * Main game engine with pure state transitions
 */

import { createSnake, moveSnake, getHead, getTail } from './snake.js';
import { spawnFruit, isFruitAt } from './fruit.js';
import { generateHamiltonianCycle } from './hamiltonian.js';
import { checkCollision } from './collision.js';
import { planPath } from './shortcuts.js';
import { GAME_STATUS, MOVE_RESULT } from './types.js';
import { DEFAULT_CONFIG } from '../utils/constants.js';

/**
 * Initialize a new game state
 * @param {Object} config - Game configuration
 * @returns {Object} Initial game state
 */
export function initializeGame(config = DEFAULT_CONFIG) {
  const { rows, cols, seed, ...otherConfig } = { ...DEFAULT_CONFIG, ...config };

  // Generate Hamiltonian cycle
  const hamiltonianData = generateHamiltonianCycle(rows, cols);

  // Initialize snake at first position in cycle
  const startCell = hamiltonianData.cycle[0];
  const snake = createSnake(startCell);

  // Spawn initial fruit
  const fruit = spawnFruit(snake.occupied, hamiltonianData.cycle.length);

  return {
    config: { rows, cols, seed, ...otherConfig },
    snake,
    fruit,
    cycle: hamiltonianData.cycle,
    cycleIndex: hamiltonianData.cycleIndex,
    moves: 0,
    score: 0,
    status: GAME_STATUS.PAUSED,
    lastMoveWasShortcut: false,
    plannerData: {
      plannedPath: [],
      shortcutEdge: null,
    },
  };
}

/**
 * Execute one game tick
 * @param {Object} gameState - Current game state
 * @returns {Object} New game state and move result
 */
export function gameTick(gameState) {
  if (gameState.status !== GAME_STATUS.PLAYING) {
    return {
      state: gameState,
      result: { valid: false, reason: 'Game not running' },
    };
  }

  // Check if game is complete (no free cells)
  if (gameState.snake.body.length === gameState.cycle.length) {
    return {
      state: { ...gameState, status: GAME_STATUS.COMPLETE },
      result: { valid: true, reason: MOVE_RESULT.GAME_COMPLETE },
    };
  }

  // Plan next move
  const pathPlan = planPath(gameState, gameState.config);
  const nextCell = pathPlan.nextMove;

  // Check collision
  const collision = checkCollision(nextCell, gameState);
  if (collision.collision) {
    return {
      state: { ...gameState, status: GAME_STATUS.GAME_OVER },
      result: { valid: false, reason: collision.reason, collision: collision.type },
    };
  }

  // Determine if eating fruit
  const willEat = isFruitAt(gameState.fruit, nextCell);

  // Move snake
  const newSnake = moveSnake(gameState.snake, nextCell, willEat);

  // Update game state
  let newState = {
    ...gameState,
    snake: newSnake,
    moves: gameState.moves + 1,
    lastMoveWasShortcut: pathPlan.isShortcut,
    plannerData: {
      plannedPath: calculatePlannedPath(
        newSnake,
        gameState.fruit,
        gameState.cycle,
        gameState.cycleIndex
      ),
      shortcutEdge: pathPlan.isShortcut ? [getHead(gameState.snake), nextCell] : null,
    },
  };

  // Handle fruit consumption
  if (willEat) {
    const newFruit = spawnFruit(newSnake.occupied, gameState.cycle.length);
    const config = gameState.config || DEFAULT_CONFIG;
    newState = {
      ...newState,
      fruit: newFruit,
      score:
        gameState.score +
        (config.scorePerfruit || 10) +
        (pathPlan.isShortcut ? (config.shortcutBonus || 5) : 0),
    };

    // Check if game complete after eating
    if (newFruit === -1) {
      newState.status = GAME_STATUS.COMPLETE;
    }
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
 * Calculate planned path from head to fruit
 * @param {Object} snake - Snake state
 * @param {number} fruit - Fruit position
 * @param {number[]} cycle - Hamiltonian cycle
 * @param {Map} cycleIndex - Cycle position lookup
 * @returns {number[]} Planned path array
 */
function calculatePlannedPath(snake, fruit, cycle, cycleIndex) {
  const headCell = getHead(snake);
  const headPos = cycleIndex.get(headCell);
  const fruitPos = cycleIndex.get(fruit);

  const path = [];
  let currentPos = headPos;

  while (currentPos !== fruitPos && path.length < cycle.length) {
    currentPos = (currentPos + 1) % cycle.length;
    path.push(cycle[currentPos]);
  }

  return path;
}

/**
 * Change game status
 * @param {Object} gameState - Current game state
 * @param {string} status - New status
 * @returns {Object} Updated game state
 */
export function setGameStatus(gameState, status) {
  return {
    ...gameState,
    status,
  };
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
  const head = getHead(snake);
  const tail = getTail(snake);
  const headPos = gameState.cycleIndex.get(head);
  const tailPos = gameState.cycleIndex.get(tail);
  const fruitPos = gameState.cycleIndex.get(fruit);

  return {
    moves,
    length: snake.body.length,
    score,
    free: cycle.length - snake.body.length,
    distHeadApple: (fruitPos - headPos + cycle.length) % cycle.length,
    distHeadTail: (tailPos - headPos + cycle.length) % cycle.length,
    shortcut: gameState.lastMoveWasShortcut,
    efficiency: moves > 0 ? Math.round((score / moves) * 100) : 0,
    status: gameState.status,
  };
}