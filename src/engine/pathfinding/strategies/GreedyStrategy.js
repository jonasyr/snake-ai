// FILE: src/engine/pathfinding/strategies/GreedyStrategy.js
import { GraphPathfindingStrategy } from '../PathfindingStrategy.js';
import { getHead } from '../../snake.js';

/**
 * Pathfinding strategy using Greedy Best-First Search.
 * Always expands the node closest to the goal by heuristic — no g-score.
 * Fast but prone to self-trapping on longer snakes.
 */
export class GreedyStrategy extends GraphPathfindingStrategy {
  /**
   * @param {Object} [config={}] - Strategy configuration.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'greedy';
  }

  /**
   * Plan the next move using Greedy Best-First Search.
   *
   * @param {import('../GameStateAdapter.js').StandardGameState} standardState - Normalized state wrapper.
   * @param {Object} [options={}] - Optional hints (unused).
   * @returns {Promise<import('../PathfindingStrategy.js').PlanningResult>} Planned move and metadata.
   */
  async planNextMove(standardState, _options = {}) {
    const gameState = standardState?.original ?? null;
    const snake = gameState?.snake ?? null;
    const fruit = Number.isInteger(gameState?.fruit) ? gameState.fruit : -1;

    if (!snake?.body?.length || fruit < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid state',
        metadata: { pathLength: 0, expandedNodes: 0 },
      });
    }

    const start = getHead(snake);
    if (!Number.isInteger(start) || start < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid snake head position',
        metadata: { pathLength: 0, expandedNodes: 0 },
      });
    }

    if (start === fruit) {
      return this.createPlanningResult(start, {
        reason: 'Already at fruit position',
        plannedPath: [],
        metadata: { pathLength: 0, expandedNodes: 0 },
      });
    }

    const searchResult = this.greedy(start, fruit, standardState);

    if (!searchResult || searchResult.path.length < 2) {
      const neighbors = this.getNeighbors(start, standardState);
      if (neighbors.length > 0) {
        const fallback = neighbors.reduce((best, candidate) => {
          if (best === null) return candidate;
          return this.heuristic(candidate, fruit, standardState) <
            this.heuristic(best, fruit, standardState)
            ? candidate
            : best;
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
      reason: 'Following Greedy path to fruit',
      plannedPath,
      metadata: {
        pathLength: plannedPath.length,
        expandedNodes: searchResult.expandedNodes,
      },
    });
  }

  /**
   * Execute Greedy Best-First Search (f(n) = h(n) only).
   *
   * @param {number} start - Starting cell index.
   * @param {number} goal - Goal cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {{ path: number[], expandedNodes: number }|null} Search result or null if no path found.
   */
  greedy(start, goal, state) {
    // Priority queue entries: [heuristic, node]
    const openList = [[this.heuristic(start, goal, state), start]];
    const cameFrom = new Map();
    const visited = new Set([start]);
    let expandedNodes = 0;

    while (openList.length > 0) {
      // Extract minimum heuristic entry
      let minIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i][0] < openList[minIdx][0]) {
          minIdx = i;
        }
      }
      const [, current] = openList[minIdx];
      openList.splice(minIdx, 1);
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
          openList.push([this.heuristic(neighbor, goal, state), neighbor]);
        }
      }
    }

    return null;
  }
}
