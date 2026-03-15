// FILE: src/ui/visualizers/BaseVisualizer.js
/**
 * Abstract base class for algorithm-specific canvas visualizers.
 *
 * Each algorithm visualizer is responsible for rendering its own overlays
 * onto the game canvas. There are two rendering phases:
 *
 * - Static overlay: rendered once into the background layer (e.g. Hamiltonian
 *   cycle). Rebuilt only when the game state's cycle changes or when grid
 *   dimensions change.
 *
 * - Dynamic overlay: rendered every tick over the static background (e.g.
 *   planned path, shortcut highlights).
 *
 * Subclasses should override the methods they need and leave the rest as no-ops.
 */
export class BaseVisualizer {
  /**
   * Render algorithm-specific elements into the static background layer.
   * This is called once when (re-)building the cached background canvas.
   *
   * @param {CanvasRenderingContext2D} _ctx
   * @param {object} _state - Current engine game state.
   * @param {number} _cols - Grid columns.
   * @param {number} _cellSize - Cell dimension in pixels.
   */
  renderStaticOverlay(_ctx, _state, _cols, _cellSize) {
    // No-op by default.
  }

  /**
   * Render algorithm-specific elements that change every tick (e.g. planned
   * path, open set, frontier visualization).
   *
   * @param {CanvasRenderingContext2D} _ctx
   * @param {object} _state - Current engine game state.
   * @param {object} _options - Visualization options (e.g. showShortcuts).
   * @param {number} _cols - Grid columns.
   * @param {number} _cellSize - Cell dimension in pixels.
   */
  renderDynamicOverlay(_ctx, _state, _options, _cols, _cellSize) {
    // No-op by default.
  }

  /**
   * Return the cell indices that make up the current dynamic overlay so the
   * incremental renderer can restore them before the next frame.
   *
   * @param {object} _state - Current engine game state.
   * @param {object} _options - Visualization options.
   * @returns {{ pathCells: number[], shortcutCells: number[] }}
   */
  getOverlayCells(_state, _options) {
    return { pathCells: [], shortcutCells: [] };
  }

  /**
   * Return a cache key fragment that changes whenever the static overlay
   * content changes. The renderer appends this to the background layer cache
   * key to trigger a rebuild when necessary.
   *
   * @param {object} _state - Current engine game state.
   * @returns {string}
   */
  getStaticCacheKey(_state) {
    return 'plain';
  }
}
