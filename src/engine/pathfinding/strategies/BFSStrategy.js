// FILE: src/engine/pathfinding/strategies/BFSStrategy.js
import { GraphPathfindingStrategy } from '../PathfindingStrategy.js';
import { getHead } from '../../snake.js';

/**
 * Pathfinding strategy that explores the board level-by-level using BFS.
 */
export class BFSStrategy extends GraphPathfindingStrategy {
  /**
   * Create a new BFS strategy instance.
   *
   * @param {Object} [config={}] - Optional strategy configuration.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'bfs';
  }

  /**
   * Plan the next move using breadth-first search.
   *
   * @param {import('../GameStateAdapter.js').StandardGameState} standardState - Normalized state wrapper.
   * @param {Object} [options={}] - Optional hints for the planner (unused).
   * @returns {Promise<import('../PathfindingStrategy.js').PlanningResult>} Planned move and metadata payload.
   */
  async planNextMove(standardState, options = {}) { // eslint-disable-line no-unused-vars
    const gameState = standardState?.original ?? null;
    const snake = gameState?.snake ?? null;
    const fruit = Number.isInteger(gameState?.fruit) ? gameState.fruit : -1;

    if (!snake?.body?.length || fruit < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid state',
        metadata: {
          pathLength: 0,
          expandedNodes: 0,
        },
      });
    }

    const start = getHead(snake);
    if (!Number.isInteger(start) || start < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid snake head position',
        metadata: {
          pathLength: 0,
          expandedNodes: 0,
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
        },
      });
    }

    const searchResult = this.bfs(start, fruit, standardState);

    if (!searchResult || !Array.isArray(searchResult.path) || searchResult.path.length < 2) {
      const neighbors = this.getNeighbors(start, standardState);
      if (neighbors.length > 0) {
        const fallback = neighbors.reduce((best, candidate) => {
          if (best === null) {
            return candidate;
          }

          const bestScore = this.heuristic(best, fruit, standardState);
          const candidateScore = this.heuristic(candidate, fruit, standardState);
          return candidateScore < bestScore ? candidate : best;
        }, null);

        const plannedPath = fallback != null ? [fallback] : [];
        return this.createPlanningResult(fallback ?? start, {
          reason: 'No path to fruit - survival move',
          plannedPath,
          metadata: {
            pathLength: plannedPath.length,
            expandedNodes: searchResult?.expandedNodes ?? 0,
          },
        });
      }

      return this.createPlanningResult(start, {
        reason: 'No valid moves',
        plannedPath: [],
        metadata: {
          pathLength: 0,
          expandedNodes: searchResult?.expandedNodes ?? 0,
        },
      });
    }

    const plannedPath = searchResult.path.slice(1);
    return this.createPlanningResult(searchResult.path[1], {
      reason: 'Following BFS path to fruit',
      plannedPath,
      metadata: {
        pathLength: plannedPath.length,
        expandedNodes: searchResult.expandedNodes,
      },
    });
  }

  /**
   * Execute breadth-first search to locate the fruit.
   *
   * @param {number} start - Starting cell index.
   * @param {number} goal - Goal cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {{ path: number[]|null, expandedNodes: number }} Search results describing the path and explored nodes.
   */
  bfs(start, goal, state) {
    const queue = [start];
    const visited = new Set([start]);
    const cameFrom = new Map();
    let expandedNodes = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      expandedNodes += 1;

      if (current === goal) {
        return {
          path: this.reconstructPath(cameFrom, current),
          expandedNodes,
        };
      }

      const neighbors = this.getNeighbors(current, state);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          cameFrom.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    return {
      path: null,
      expandedNodes,
    };
  }
}
