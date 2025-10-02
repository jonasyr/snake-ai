// FILE: src/engine/pathfinding/strategies/AStarStrategy.js
import { GraphPathfindingStrategy } from '../PathfindingStrategy.js';
import { getHead } from '../../snake.js';

/**
 * Pathfinding strategy that uses the A* search algorithm to reach the fruit.
 */
export class AStarStrategy extends GraphPathfindingStrategy {
  /**
   * @param {Object} [config={}] - Strategy configuration.
   * @param {boolean} [config.allowDiagonals=false] - Allow diagonal moves when true.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'astar';
    this.allowDiagonals = Boolean(config.allowDiagonals);
    this.config.allowDiagonals = this.allowDiagonals;
  }

  /**
   * Plan the next move by running the A* search algorithm.
   *
   * @param {import('../GameStateAdapter.js').StandardGameState} standardState - Normalized state wrapper.
   * @param {Object} [options={}] - Optional strategy hints (currently unused).
   * @returns {Promise<import('../PathfindingStrategy.js').PlanningResult>} Planned move and metadata.
   */
  async planNextMove(standardState, options = {}) { // eslint-disable-line no-unused-vars
    const gameState = standardState?.original ?? null;
    const snake = gameState?.snake ?? null;
    const fruit = Number.isInteger(gameState?.fruit) ? gameState.fruit : -1;

    if (!snake?.body?.length || fruit < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid state',
        metadata: {
          allowDiagonals: this.allowDiagonals,
          expandedNodes: 0,
          cost: 0,
        },
      });
    }

    const start = getHead(snake);
    if (!Number.isInteger(start) || start < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid snake head position',
        metadata: {
          allowDiagonals: this.allowDiagonals,
          expandedNodes: 0,
          cost: 0,
        },
      });
    }

    if (start === fruit) {
      return this.createPlanningResult(start, {
        reason: 'Already at fruit position',
        plannedPath: [],
        metadata: {
          pathLength: 0,
          expandedNodes: 0,
          cost: 0,
          allowDiagonals: this.allowDiagonals,
        },
      });
    }

    const searchResult = this.astar(start, fruit, standardState);

    if (!searchResult || searchResult.path.length < 2) {
      const neighbors = this.getNeighbors(start, standardState);
      if (neighbors.length > 0) {
        const survivalMove = neighbors.reduce((best, candidate) => {
          if (best === null) {
            return candidate;
          }

          const bestScore = this.heuristic(best, fruit, standardState);
          const candidateScore = this.heuristic(candidate, fruit, standardState);
          return candidateScore < bestScore ? candidate : best;
        }, null);

        const plannedPath = survivalMove != null ? [survivalMove] : [];
        return this.createPlanningResult(survivalMove ?? start, {
          reason: 'No path to fruit - survival move',
          plannedPath,
          metadata: {
            pathLength: plannedPath.length,
            expandedNodes: searchResult?.expandedNodes ?? 0,
            cost: plannedPath.length,
            allowDiagonals: this.allowDiagonals,
          },
        });
      }

      return this.createPlanningResult(start, {
        reason: 'No valid moves',
        plannedPath: [],
        metadata: {
          pathLength: 0,
          expandedNodes: searchResult?.expandedNodes ?? 0,
          cost: 0,
          allowDiagonals: this.allowDiagonals,
        },
      });
    }

    const plannedPath = searchResult.path.slice(1);
    const safetyCheck = this.validatePathSafety(plannedPath, standardState);

    if (!safetyCheck.isSafe) {
      const survivalPlan = this.findSurvivalMove(start, fruit, standardState);
      if (survivalPlan) {
        return survivalPlan;
      }
    }

    return this.createPlanningResult(searchResult.path[1], {
      reason: 'Following A* path to fruit',
      plannedPath,
      metadata: {
        pathLength: plannedPath.length,
        expandedNodes: searchResult.expandedNodes,
        cost: searchResult.cost,
        allowDiagonals: this.allowDiagonals,
        safetyValidated: safetyCheck.isSafe,
        tailReachable: safetyCheck.tailReachable,
      },
    });
  }

  /**
   * Validate the planned path by ensuring the snake can still reach its tail.
   *
   * @param {number[]} plannedPath - Planned path excluding the current head position.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {{ isSafe: boolean, tailReachable: boolean }} Result of the safety validation.
   */
  validatePathSafety(plannedPath, state) {
    const gameState = state?.original ?? null;
    const snakeBody = Array.isArray(gameState?.snake?.body) ? [...gameState.snake.body] : null;

    if (!snakeBody || snakeBody.length === 0 || plannedPath.length === 0) {
      return { isSafe: false, tailReachable: false };
    }

    const nextMove = plannedPath[0];
    const willGrow = nextMove === gameState?.fruit;
    const simulated = this.simulateMove(snakeBody, nextMove, willGrow);

    if (!simulated) {
      return { isSafe: false, tailReachable: false };
    }

    const tailReachable = this.isTailReachable(simulated.head, simulated.tail, state, simulated.blockedCells);
    return {
      isSafe: tailReachable,
      tailReachable,
    };
  }

  /**
   * Simulate the snake after moving into the specified cell.
   *
   * @param {number[]} body - Current snake body from head to tail.
   * @param {number} nextCell - Cell index to move into.
   * @param {boolean} willGrow - Whether the move consumes the fruit.
   * @returns {{ head: number, tail: number, body: number[], blockedCells: Set<number> }|null} Simulated state snapshot.
   */
  simulateMove(body, nextCell, willGrow) {
    if (!Array.isArray(body) || body.length === 0) {
      return null;
    }

    const retainLength = body.length - (willGrow ? 0 : 1);
    if (retainLength < 0) {
      return null;
    }

    const futureBody = [nextCell];
    for (let i = 0; i < retainLength; i += 1) {
      futureBody.push(body[i]);
    }

    const futureTail = futureBody[futureBody.length - 1];
    const blockedCells = new Set(futureBody.slice(1));
    blockedCells.delete(futureTail);

    return {
      head: nextCell,
      tail: futureTail,
      body: futureBody,
      blockedCells,
    };
  }

  /**
   * Determine if the snake can reach its tail from the provided starting cell.
   *
   * @param {number} start - Cell index to start the search from.
   * @param {number} tail - Target tail cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @param {Set<number>} blockedCells - Cells currently occupied by the body (excluding tail).
   * @returns {boolean} True when the tail can be reached.
   */
  isTailReachable(start, tail, state, blockedCells) {
    const { rows, cols } = state.config ?? {};
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
      return false;
    }

    if (start === tail) {
      return true;
    }

    const visited = new Set([start]);
    const queue = [start];
    const neighborOffsets = this.getMovementOffsets();

    while (queue.length > 0) {
      const current = queue.shift();
      const currentRow = Math.floor(current / cols);
      const currentCol = current % cols;

      for (const [dr, dc] of neighborOffsets) {
        const nextRow = currentRow + dr;
        const nextCol = currentCol + dc;
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
          continue;
        }

        const neighbor = nextRow * cols + nextCol;
        if (neighbor !== tail && blockedCells.has(neighbor)) {
          continue;
        }

        if (neighbor === tail) {
          return true;
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * Retrieve movement offsets based on the configured adjacency rules.
   *
   * @returns {Array<[number, number]>} Collection of row/column offsets.
   */
  getMovementOffsets() {
    if (this.allowDiagonals) {
      return [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
    }

    return [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
  }

  /**
   * Evaluate alternative moves that maximize survival when the primary path is unsafe.
   *
   * @param {number} start - Current head position.
   * @param {number} fruit - Fruit position.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {import('../PathfindingStrategy.js').PlanningResult|null} Planned survival move or null when unavailable.
   */
  findSurvivalMove(start, fruit, state) {
    const neighbors = this.getNeighbors(start, state);
    if (neighbors.length === 0) {
      return null;
    }

    const snakeBody = Array.isArray(state?.original?.snake?.body)
      ? [...state.original.snake.body]
      : null;

    if (!snakeBody) {
      return null;
    }

    let bestMove = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestMetadata = null;

    for (const neighbor of neighbors) {
      const willGrow = neighbor === fruit;
      const simulated = this.simulateMove(snakeBody, neighbor, willGrow);
      if (!simulated) {
        continue;
      }

      const tailReachable = this.isTailReachable(
        simulated.head,
        simulated.tail,
        state,
        simulated.blockedCells,
      );

      if (!tailReachable) {
        continue;
      }

      const reachableCells = this.countReachableCells(
        simulated.head,
        state,
        simulated.blockedCells,
        simulated.tail,
      );

      const fruitScore = -this.heuristic(neighbor, fruit, state);
      const score = reachableCells + (fruitScore * 0.5);

      if (score > bestScore) {
        bestScore = score;
        bestMove = neighbor;
        bestMetadata = {
          reachableCells,
          tailReachable,
          fruitScore,
        };
      }
    }

    if (bestMove == null) {
      return null;
    }

    return this.createPlanningResult(bestMove, {
      reason: 'Survival move (A* path unsafe)',
      plannedPath: [bestMove],
      metadata: {
        survivalMode: true,
        allowDiagonals: this.allowDiagonals,
        ...bestMetadata,
      },
    });
  }

  /**
   * Count the number of cells reachable from a starting position.
   *
   * @param {number} start - Starting cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @param {Set<number>} blockedCells - Cells that cannot be traversed.
   * @param {number} tail - Tail cell index which can be traversed.
   * @returns {number} Number of reachable cells.
   */
  countReachableCells(start, state, blockedCells, tail) {
    const { rows, cols } = state.config ?? {};
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
      return 0;
    }

    const visited = new Set([start]);
    const queue = [start];
    const neighborOffsets = this.getMovementOffsets();

    while (queue.length > 0) {
      const current = queue.shift();
      const currentRow = Math.floor(current / cols);
      const currentCol = current % cols;

      for (const [dr, dc] of neighborOffsets) {
        const nextRow = currentRow + dr;
        const nextCol = currentCol + dc;
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
          continue;
        }

        const neighbor = nextRow * cols + nextCol;
        if (neighbor !== tail && blockedCells.has(neighbor)) {
          continue;
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return visited.size;
  }

  /**
   * Execute the A* search algorithm.
   *
   * @param {number} start - Starting cell index.
   * @param {number} goal - Goal cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {{ path: number[], expandedNodes: number, cost: number }|null} Search result metadata or null when no path is found.
   */
  astar(start, goal, state) {
    const openSet = new Set([start]);
    const cameFrom = new Map();
    const gScore = new Map([[start, 0]]);
    const fScore = new Map([[start, this.heuristic(start, goal, state)]]);
    const expanded = new Set();

    while (openSet.size > 0) {
      let current = null;
      let lowestF = Infinity;
      for (const node of openSet) {
        const score = fScore.get(node) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          current = node;
        }
      }

      if (current === null) {
        break;
      }

      if (current === goal) {
        const path = this.reconstructPath(cameFrom, current);
        return {
          path,
          expandedNodes: expanded.size,
          cost: gScore.get(current) ?? path.length - 1,
        };
      }

      openSet.delete(current);
      expanded.add(current);

      const neighbors = this.getNeighbors(current, state);
      for (const neighbor of neighbors) {
        const tentativeGScore = (gScore.get(current) ?? Infinity) + 1;

        if (tentativeGScore < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, goal, state));

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
          }
        }
      }
    }

    return null;
  }

  /**
   * Compute neighbor cells, optionally adding diagonal moves.
   *
   * @param {number} cellIndex - Current cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {number[]} Array of neighbor indices safe to traverse.
   */
  getNeighbors(cellIndex, state) {
    const neighbors = new Set(super.getNeighbors(cellIndex, state));

    if (!this.allowDiagonals) {
      return [...neighbors];
    }

    const { rows, cols } = state.config;
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const diagonalOffsets = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dr, dc] of diagonalOffsets) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
        continue;
      }

      const neighborCell = newRow * cols + newCol;
      if (!state.original.snake.occupied.has(neighborCell)) {
        neighbors.add(neighborCell);
      }
    }

    return [...neighbors];
  }

  /**
   * Heuristic that adapts to diagonal movement allowances.
   *
   * @param {number} from - Current cell index.
   * @param {number} to - Destination cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {number} Estimated cost between the two cells.
   */
  heuristic(from, to, state) {
    if (!this.allowDiagonals) {
      return super.heuristic(from, to, state);
    }

    const { cols } = state.config;
    const fromRow = Math.floor(from / cols);
    const fromCol = from % cols;
    const toRow = Math.floor(to / cols);
    const toCol = to % cols;

    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);

    return Math.max(rowDiff, colDiff);
  }
}
