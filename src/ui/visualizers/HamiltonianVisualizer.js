// FILE: src/ui/visualizers/HamiltonianVisualizer.js
import { BaseVisualizer } from './BaseVisualizer.js';
import { drawCycle, drawShortcut, drawPlannedPath } from './drawUtils.js';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * Visualizer for Hamiltonian-based algorithms.
 * Renders the Hamiltonian cycle as a static background overlay, and the
 * shortcut edge + planned path as dynamic per-tick overlays.
 */
export class HamiltonianVisualizer extends BaseVisualizer {
  renderStaticOverlay(ctx, state, cols, cellSize) {
    if (Array.isArray(state?.cycle) && state.cycle.length > 0) {
      drawCycle(ctx, state.cycle, cols, cellSize);
    }
  }

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

    if (
      Array.isArray(plannerData?.shortcutEdge) &&
      plannerData.shortcutEdge.length >= 2
    ) {
      drawShortcut(ctx, plannerData.shortcutEdge, cols, cellSize);
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
    const shortcutEdge = Array.isArray(plannerData?.shortcutEdge)
      ? plannerData.shortcutEdge
      : EMPTY_ARRAY;

    return { pathCells, shortcutCells: shortcutEdge };
  }

  getStaticCacheKey(state) {
    const cycle = state?.cycle;
    return Array.isArray(cycle) && cycle.length > 0
      ? `cycle-${cycle.length}`
      : 'no-cycle';
  }
}
