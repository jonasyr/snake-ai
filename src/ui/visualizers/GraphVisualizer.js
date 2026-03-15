// FILE: src/ui/visualizers/GraphVisualizer.js
import { BaseVisualizer } from './BaseVisualizer.js';
import { drawPlannedPath } from './drawUtils.js';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * Visualizer for graph-based pathfinding algorithms (A*, Dijkstra, BFS, Greedy).
 * Has no static overlay — only renders the planned path as a dynamic per-tick line.
 */
export class GraphVisualizer extends BaseVisualizer {
  renderDynamicOverlay(ctx, state, options, cols, cellSize) {
    if (!options?.showShortcuts) return;

    const plannerData = state?.plannerData;
    const snakeHead = state?.snake?.body?.[0];

    if (
      Array.isArray(plannerData?.plannedPath) &&
      plannerData.plannedPath.length > 0
    ) {
      drawPlannedPath(ctx, snakeHead, plannerData.plannedPath, cols, cellSize);
    }
  }

  getOverlayCells(state, options) {
    if (!options?.showShortcuts) {
      return { pathCells: [], shortcutCells: [] };
    }

    const plannerData = state?.plannerData;
    const pathCells = Array.isArray(plannerData?.plannedPath)
      ? plannerData.plannedPath
      : EMPTY_ARRAY;

    return { pathCells, shortcutCells: [] };
  }
}
