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
    return this.createPlanningResult(searchResult.path[1], {
      reason: 'Following A* path to fruit',
      plannedPath,
      metadata: {
        pathLength: plannedPath.length,
        expandedNodes: searchResult.expandedNodes,
        cost: searchResult.cost,
        allowDiagonals: this.allowDiagonals,
      },
    });
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
