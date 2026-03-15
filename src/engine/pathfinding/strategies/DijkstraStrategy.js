// FILE: src/engine/pathfinding/strategies/DijkstraStrategy.js
import { GraphPathfindingStrategy } from '../PathfindingStrategy.js';
import { getHead } from '../../snake.js';

/**
 * Pathfinding strategy that uses Dijkstra's algorithm (uniform-cost search).
 * Unlike A*, Dijkstra uses no heuristic — it explores by actual cost only.
 */
export class DijkstraStrategy extends GraphPathfindingStrategy {
  /**
   * @param {Object} [config={}] - Strategy configuration.
   */
  constructor(config = {}) {
    super(config);
    this.name = 'dijkstra';
  }

  /**
   * Plan the next move using Dijkstra's algorithm.
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
        metadata: { pathLength: 0, expandedNodes: 0, cost: 0 },
      });
    }

    const start = getHead(snake);
    if (!Number.isInteger(start) || start < 0) {
      return this.createPlanningResult(0, {
        reason: 'Invalid snake head position',
        metadata: { pathLength: 0, expandedNodes: 0, cost: 0 },
      });
    }

    if (start === fruit) {
      return this.createPlanningResult(start, {
        reason: 'Already at fruit position',
        plannedPath: [],
        metadata: { pathLength: 0, expandedNodes: 0, cost: 0 },
      });
    }

    const searchResult = this.dijkstra(start, fruit, standardState);

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
            cost: plannedPath.length,
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
        },
      });
    }

    const plannedPath = searchResult.path.slice(1);
    return this.createPlanningResult(searchResult.path[1], {
      reason: 'Following Dijkstra path to fruit',
      plannedPath,
      metadata: {
        pathLength: plannedPath.length,
        expandedNodes: searchResult.expandedNodes,
        cost: searchResult.cost,
      },
    });
  }

  /**
   * Execute Dijkstra's uniform-cost search.
   *
   * @param {number} start - Starting cell index.
   * @param {number} goal - Goal cell index.
   * @param {import('../GameStateAdapter.js').StandardGameState} state - Normalized state wrapper.
   * @returns {{ path: number[], expandedNodes: number, cost: number }|null} Search result or null if no path found.
   */
  dijkstra(start, goal, state) {
    // Min-heap priority queue entries: [cost, node]
    const openList = [[0, start]];
    const cameFrom = new Map();
    const costSoFar = new Map([[start, 0]]);
    const expanded = new Set();

    while (openList.length > 0) {
      // Extract minimum cost entry (simple linear scan — grid is small enough)
      let minIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i][0] < openList[minIdx][0]) {
          minIdx = i;
        }
      }
      const [currentCost, current] = openList[minIdx];
      openList.splice(minIdx, 1);

      if (expanded.has(current)) {
        continue;
      }
      expanded.add(current);

      if (current === goal) {
        return {
          path: this.reconstructPath(cameFrom, current),
          expandedNodes: expanded.size,
          cost: currentCost,
        };
      }

      const neighbors = this.getNeighbors(current, state);
      for (const neighbor of neighbors) {
        const newCost = currentCost + 1;
        if (newCost < (costSoFar.get(neighbor) ?? Infinity)) {
          costSoFar.set(neighbor, newCost);
          cameFrom.set(neighbor, current);
          openList.push([newCost, neighbor]);
        }
      }
    }

    return null;
  }
}
