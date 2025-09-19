// FILE: src/engine/pathfinding/GameStateAdapter.js
/**
 * Helpers for transforming engine game state objects into normalized
 * representations that are convenient for a variety of pathfinding algorithms.
 */

import { indexToPosition, positionToIndex } from '../../utils/math.js';
import { isValidPosition } from '../../utils/guards.js';

const DIRECTION_VECTORS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

function normalizeConfig(config) {
  if (!config) {
    return { rows: 0, cols: 0 };
  }

  const rows = Number.isFinite(config.rows) ? Math.max(0, Math.trunc(config.rows)) : 0;
  const cols = Number.isFinite(config.cols) ? Math.max(0, Math.trunc(config.cols)) : 0;

  return {
    ...config,
    rows,
    cols,
  };
}

function getNeighbors(cellIndex, rows, cols) {
  const [row, col] = indexToPosition(cellIndex, cols);
  const neighbors = [];

  for (const [dr, dc] of Object.values(DIRECTION_VECTORS)) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (isValidPosition(nextRow, nextCol, rows, cols)) {
      neighbors.push(positionToIndex(nextRow, nextCol, cols));
    }
  }

  return neighbors;
}

function computeSnakeDirection(body, cols) {
  if (!Array.isArray(body) || body.length < 2) {
    return [0, 0];
  }

  const head = body[0];
  const neck = body[1];
  const [headRow, headCol] = indexToPosition(head, cols);
  const [neckRow, neckCol] = indexToPosition(neck, cols);
  return [headRow - neckRow, headCol - neckCol];
}

function computeWallDistances(headIndex, config) {
  const { rows, cols } = config;
  if (!Number.isInteger(headIndex) || rows <= 0 || cols <= 0) {
    return [0, 0, 0, 0];
  }

  const [row, col] = indexToPosition(headIndex, cols);
  return [
    row, // distance to top wall
    rows - 1 - row, // bottom
    col, // left
    cols - 1 - col, // right
  ];
}

function computeBodyProximity(headIndex, body, config) {
  if (!Array.isArray(body) || body.length < 2) {
    return 0;
  }

  const { cols } = config;
  const [headRow, headCol] = indexToPosition(headIndex, cols);
  let best = Number.POSITIVE_INFINITY;

  for (let i = 1; i < body.length; i += 1) {
    const [row, col] = indexToPosition(body[i], cols);
    const manhattan = Math.abs(headRow - row) + Math.abs(headCol - col);
    if (manhattan < best) {
      best = manhattan;
    }
  }

  return Number.isFinite(best) ? best : 0;
}

function createGridTensor(state, config) {
  const { rows, cols } = config;
  if (rows <= 0 || cols <= 0) {
    return [];
  }

  const headLayer = Array.from({ length: rows }, () => Array(cols).fill(0));
  const bodyLayer = Array.from({ length: rows }, () => Array(cols).fill(0));
  const fruitLayer = Array.from({ length: rows }, () => Array(cols).fill(0));

  const snake = state?.snake;
  if (snake?.body?.length) {
    snake.body.forEach((cell, index) => {
      const [row, col] = indexToPosition(cell, cols);
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return;
      }
      if (index === 0) {
        headLayer[row][col] = 1;
      } else {
        bodyLayer[row][col] = 1;
      }
    });
  }

  const fruit = state?.fruit;
  if (Number.isInteger(fruit) && fruit >= 0) {
    const [row, col] = indexToPosition(fruit, cols);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      fruitLayer[row][col] = 1;
    }
  }

  return [headLayer, bodyLayer, fruitLayer];
}

function createGraph(state, config) {
  const { rows, cols } = config;
  const totalCells = rows * cols;
  const nodes = new Map();
  const edges = new Map();

  const occupied = state?.snake?.occupied ?? new Set();

  for (let cell = 0; cell < totalCells; cell += 1) {
    const [row, col] = indexToPosition(cell, cols);
    const isOccupied = occupied.has(cell);

    nodes.set(cell, {
      id: cell,
      position: [row, col],
      occupied: isOccupied,
      isFruit: cell === state?.fruit,
      cost: isOccupied ? Number.POSITIVE_INFINITY : 1,
    });

    const neighbors = getNeighbors(cell, rows, cols);
    const available = neighbors.filter(neighbor => !occupied.has(neighbor));
    edges.set(cell, available);
  }

  return { nodes, edges };
}

/**
 * Normalized snapshot of the game state used by strategies.
 */
export class StandardGameState {
  /**
   * @param {Object} gameState - Engine game state instance.
   */
  constructor(gameState) {
    /** @type {Object} */
    this.original = gameState;

    /** @type {Object} */
    this.config = normalizeConfig(gameState?.config);

    /** @type {Object} */
    this.grid = this.createGridRepresentation(gameState);

    /** @type {Object} */
    this.graph = createGraph(gameState, this.config);

    /** @type {Object} */
    this.features = this.extractMLFeatures(gameState);
  }

  /**
   * Create a grid representation that marks each cell with occupancy info.
   *
   * @param {Object} state - Engine game state.
   * @returns {{ grid: number[][], rows: number, cols: number }} Grid data.
   */
  createGridRepresentation(state) {
    const { rows, cols } = this.config;
    if (rows <= 0 || cols <= 0) {
      return { grid: [], rows: 0, cols: 0 };
    }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    const snake = state?.snake;

    if (snake?.body?.length) {
      snake.body.forEach((cell, index) => {
        const [row, col] = indexToPosition(cell, cols);
        if (!Number.isInteger(row) || !Number.isInteger(col)) {
          return;
        }

        if (index === 0) {
          grid[row][col] = 2;
        } else {
          grid[row][col] = 1;
        }
      });
    }

    const fruit = state?.fruit;
    if (Number.isInteger(fruit) && fruit >= 0) {
      const [fruitRow, fruitCol] = indexToPosition(fruit, cols);
      if (Number.isInteger(fruitRow) && Number.isInteger(fruitCol)) {
        grid[fruitRow][fruitCol] = 3;
      }
    }

    return { grid, rows, cols };
  }

  /**
   * Extract machine learning friendly features for RL-based strategies.
   *
   * @param {Object} state - Engine game state.
   * @returns {Object} Feature bundle suitable for ML pipelines.
   */
  extractMLFeatures(state) {
    const { rows, cols } = this.config;
    const snake = state?.snake ?? { body: [] };
    const head = Array.isArray(snake.body) && snake.body.length ? snake.body[0] : -1;
    const fruit = Number.isInteger(state?.fruit) ? state.fruit : -1;

    let headRow = 0;
    let headCol = 0;
    let fruitRow = 0;
    let fruitCol = 0;

    if (head >= 0) {
      [headRow, headCol] = indexToPosition(head, cols);
    }
    if (fruit >= 0) {
      [fruitRow, fruitCol] = indexToPosition(fruit, cols);
    }

    const normalized = {
      headPosition: rows > 0 && cols > 0 ? [headRow / rows, headCol / cols] : [0, 0],
      fruitPosition: rows > 0 && cols > 0 ? [fruitRow / rows, fruitCol / cols] : [0, 0],
    };

    const manhattan = Math.abs(headRow - fruitRow) + Math.abs(headCol - fruitCol);

    return {
      ...normalized,
      manhattanDistance: Number.isFinite(manhattan) ? manhattan : 0,
      snakeLength: Array.isArray(snake.body) ? snake.body.length : 0,
      snakeDirection: computeSnakeDirection(snake.body ?? [], cols),
      wallDistances: computeWallDistances(head, this.config),
      bodyProximity: computeBodyProximity(head, snake.body ?? [], this.config),
      gridTensor: createGridTensor(state, this.config),
    };
  }

  /**
   * Serialize the normalized state for worker communication.
   *
   * @returns {Object} Plain JSON representation.
   */
  serialize() {
    const { rows, cols } = this.config;

    return {
      config: { ...this.config },
      grid: {
        rows,
        cols,
        cells: this.grid.grid.flat(),
      },
      snake: {
        body: [...(this.original?.snake?.body ?? [])],
      },
      fruit: this.original?.fruit ?? -1,
    };
  }
}
