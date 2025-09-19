import { useCallback, useEffect, useRef } from 'react';
import { indexToPosition } from '../../utils/math.js';
import { COLORS, DEFAULT_CONFIG } from '../../utils/constants.js';

/**
 * Frozen empty array used as a safe default when path planning data is
 * unavailable. Prevents accidental mutation across renders.
 */
const EMPTY_ARRAY = Object.freeze([]);

/** No-operation placeholder for optional callbacks. */
const noop = () => {};

/** requestAnimationFrame polyfill for non-browser environments (e.g. tests). */
const RAF_FALLBACK = typeof window !== 'undefined' && window.requestAnimationFrame
  ? window.requestAnimationFrame.bind(window)
  : (cb) => setTimeout(cb, 16);

/** cancelAnimationFrame counterpart for {@link RAF_FALLBACK}. */
const CANCEL_RAF_FALLBACK = typeof window !== 'undefined' && window.cancelAnimationFrame
  ? window.cancelAnimationFrame.bind(window)
  : clearTimeout;

/**
 * Render the static grid lines used as a backdrop behind the snake, fruit, and
 * path overlays.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number} rows - Grid row count.
 * @param {number} cols - Grid column count.
 * @param {number} cellSize - Pixel size of each cell.
 */
function drawGrid(ctx, rows, cols, cellSize) {
  ctx.strokeStyle = '#1f2933';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let row = 0; row <= rows; row++) {
    const y = row * cellSize + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(cols * cellSize, y);
  }

  for (let col = 0; col <= cols; col++) {
    const x = col * cellSize + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rows * cellSize);
  }

  ctx.stroke();
}

/**
 * Render the Hamiltonian cycle overlay so players can visualize the default
 * traversal order used by the AI.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number[]} cycle - Ordered list of cell indices.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 */
function drawCycle(ctx, cycle, cols, cellSize) {
  if (!Array.isArray(cycle) || cycle.length === 0) return;

  ctx.strokeStyle = COLORS.CYCLE;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < cycle.length; i++) {
    const from = cycle[i];
    const to = cycle[(i + 1) % cycle.length];
    if (from < 0 || to < 0) continue;

    const [fromRow, fromCol] = indexToPosition(from, cols);
    const [toRow, toCol] = indexToPosition(to, cols);

    const fromX = fromCol * cellSize + cellSize / 2;
    const fromY = fromRow * cellSize + cellSize / 2;
    const toX = toCol * cellSize + cellSize / 2;
    const toY = toRow * cellSize + cellSize / 2;

    if (i === 0) {
      ctx.moveTo(fromX, fromY);
    }
    ctx.lineTo(toX, toY);
  }

  ctx.stroke();
}

/**
 * Highlight the currently executed shortcut edge as a bold line across the
 * grid.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {[number, number]} shortcut - Start and end cell indices.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 */
function drawShortcut(ctx, shortcut, cols, cellSize) {
  if (!Array.isArray(shortcut) || shortcut.length < 2) return;

  ctx.strokeStyle = COLORS.SHORTCUT_EDGE;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();

  const [from, to] = shortcut;
  const [fromRow, fromCol] = indexToPosition(from, cols);
  const [toRow, toCol] = indexToPosition(to, cols);

  ctx.moveTo(fromCol * cellSize + cellSize / 2, fromRow * cellSize + cellSize / 2);
  ctx.lineTo(toCol * cellSize + cellSize / 2, toRow * cellSize + cellSize / 2);
  ctx.stroke();
}

/**
 * Render the dotted preview path that the snake intends to follow after the
 * current move.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number} snakeHead - Current head cell index.
 * @param {number[]} path - Planned upcoming cell indices.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 */
function drawPlannedPath(ctx, snakeHead, path, cols, cellSize) {
  if (!Array.isArray(path) || path.length === 0 || snakeHead === undefined) return;

  ctx.strokeStyle = COLORS.SHORTCUT;
  ctx.lineWidth = 2;
  ctx.setLineDash([cellSize / 2, cellSize / 2]);
  ctx.beginPath();

  const [headRow, headCol] = indexToPosition(snakeHead, cols);
  ctx.moveTo(headCol * cellSize + cellSize / 2, headRow * cellSize + cellSize / 2);

  for (const cell of path) {
    const [row, col] = indexToPosition(cell, cols);
    ctx.lineTo(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw the fruit as a circular dot centered within its grid cell.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number} fruit - Fruit cell index.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 */
function drawFruitDot(ctx, fruit, cols, cellSize) {
  if (fruit === undefined || fruit < 0) {
    return;
  }

  const [fruitRow, fruitCol] = indexToPosition(fruit, cols);
  ctx.fillStyle = COLORS.FRUIT;
  ctx.beginPath();
  ctx.arc(
    fruitCol * cellSize + cellSize / 2,
    fruitRow * cellSize + cellSize / 2,
    Math.max(cellSize * 0.3, 4),
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/**
 * Fill a single cell, typically used for the head and tail to give them
 * distinct styling compared to the rest of the body.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number} cell - Cell index to fill.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 * @param {string} color - Fill color.
 * @param {number} [shrink=0] - Optional inset for border separation.
 */
function fillCell(ctx, cell, cols, cellSize, color, shrink = 0) {
  if (cell === undefined || cell < 0) {
    return;
  }

  const [row, col] = indexToPosition(cell, cols);
  const size = cellSize - shrink;
  const offset = shrink / 2;

  ctx.fillStyle = color;
  ctx.fillRect(col * cellSize + offset, row * cellSize + offset, size, size);
}

/**
 * Render a contiguous section of the snake body beginning at the supplied
 * index. Allows selective drawing of head versus body segments with different
 * styling.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {number[]} cells - Snake body indices.
 * @param {number} startIndex - First index to render.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 * @param {string} color - Fill color.
 * @param {number} [shrink=0] - Optional inset.
 */
function drawSnakeSection(ctx, cells, startIndex, cols, cellSize, color, shrink = 0) {
  if (!Array.isArray(cells) || cells.length <= startIndex) {
    return;
  }

  const size = cellSize - shrink;
  const offset = shrink / 2;
  ctx.fillStyle = color;

  for (let i = startIndex; i < cells.length; i += 1) {
    const cell = cells[i];
    if (cell < 0) continue;
    const [row, col] = indexToPosition(cell, cols);
    ctx.fillRect(col * cellSize + offset, row * cellSize + offset, size, size);
  }
}

/**
 * Create an off-screen canvas containing immutable background layers (grid and
 * optional cycle). This allows the main canvas to quickly restore background
 * pixels without re-rendering geometry each frame.
 *
 * @param {number} rows - Grid rows.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 * @param {number[]} cycle - Hamiltonian cycle path.
 * @param {boolean} showCycle - Whether to include the cycle in the static layer.
 * @returns {HTMLCanvasElement | null} Off-screen canvas or null when DOM access is unavailable.
 */
function createStaticLayer(rows, cols, cellSize, cycle, showCycle) {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  const width = cols * cellSize;
  const height = rows * cellSize;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, rows, cols, cellSize);

  if (showCycle && Array.isArray(cycle) && cycle.length > 0) {
    drawCycle(ctx, cycle, cols, cellSize);
  }

  return canvas;
}

/**
 * Copy the background pixels for a particular cell from the static layer. Used
 * to erase previous snake positions before drawing their new location.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {HTMLCanvasElement|null} staticCanvas - Pre-rendered background layer.
 * @param {number} cell - Cell index to restore.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 */
function restoreCellFromStatic(ctx, staticCanvas, cell, cols, cellSize) {
  if (!staticCanvas || cell === undefined || cell < 0) {
    return;
  }

  const [row, col] = indexToPosition(cell, cols);
  ctx.drawImage(
    staticCanvas,
    col * cellSize,
    row * cellSize,
    cellSize,
    cellSize,
    col * cellSize,
    row * cellSize,
    cellSize,
    cellSize
  );
}

/**
 * Produce a deterministic signature for the currently rendered path/shortcut
 * combination so we can skip expensive redraws when nothing has changed.
 *
 * @param {number[]|undefined} pathCells - Planned path cells.
 * @param {[number, number]|undefined} shortcutEdge - Active shortcut edge.
 * @param {boolean} showShortcuts - Whether shortcut visuals are enabled.
 * @returns {string} Signature string capturing the current overlay state.
 */
function createPathSignature(pathCells, shortcutEdge, showShortcuts) {
  if (!showShortcuts) {
    return 'off';
  }

  const pathPart = Array.isArray(pathCells) && pathCells.length
    ? pathCells.join(',')
    : '';
  const shortcutPart = Array.isArray(shortcutEdge) && shortcutEdge.length === 2
    ? `${shortcutEdge[0]}-${shortcutEdge[1]}`
    : '';
  return `${pathPart}|${shortcutPart}`;
}

/**
 * Draw the entire scene from scratch. Used on first render and whenever the
 * background layer needs to be regenerated.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {HTMLCanvasElement|null} staticCanvas - Optional background canvas.
 * @param {object} state - Current game state.
 * @param {number} rows - Grid rows.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell dimension in pixels.
 * @param {{showCycle:boolean, showShortcuts:boolean}} options - Visualization options.
 */
function renderFullScene(ctx, staticCanvas, state, rows, cols, cellSize, options) {
  const width = cols * cellSize;
  const height = rows * cellSize;

  if (staticCanvas) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(staticCanvas, 0, 0, width, height, 0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, rows, cols, cellSize);
    if (options.showCycle) {
      drawCycle(ctx, state.cycle, cols, cellSize);
    }
  }

  drawFruitDot(ctx, state.fruit, cols, cellSize);

  const snakeBody = state.snake?.body ?? EMPTY_ARRAY;
  const snakeHead = snakeBody[0];

  if (options.showShortcuts && state.plannerData?.plannedPath?.length && snakeHead !== undefined) {
    drawPlannedPath(ctx, snakeHead, state.plannerData.plannedPath, cols, cellSize);
  }

  if (options.showShortcuts && state.plannerData?.shortcutEdge) {
    drawShortcut(ctx, state.plannerData.shortcutEdge, cols, cellSize);
  }

  if (snakeBody.length) {
    drawSnakeSection(ctx, snakeBody, 1, cols, cellSize, COLORS.SNAKE_BODY, 4);
    fillCell(ctx, snakeHead, cols, cellSize, COLORS.SNAKE_HEAD, 2);
  }
}

/**
 * Perform a minimal redraw by restoring only the cells that changed. This keeps
 * rendering costs low even when the game runs at high tick rates.
 *
 * @param {CanvasRenderingContext2D} ctx - Drawing context.
 * @param {HTMLCanvasElement|null} staticCanvas - Background layer.
 * @param {object} state - Current game state.
 * @param {object|null} prevRender - Cached metadata from the previous render.
 * @param {number} rows - Grid rows.
 * @param {number} cols - Grid columns.
 * @param {number} cellSize - Cell size in pixels.
 * @param {{showCycle:boolean, showShortcuts:boolean}} options - Visualization options.
 * @param {number[]} pathCells - Planned path cells for the current frame.
 * @param {[number, number]|null} shortcutEdge - Shortcut edge for the current frame.
 * @param {boolean} hasOverlay - Whether overlay layers exist.
 */
function renderIncremental(
  ctx,
  staticCanvas,
  state,
  prevRender,
  rows,
  cols,
  cellSize,
  options,
  pathCells,
  shortcutEdge,
  hasOverlay
) {
  if (!staticCanvas) {
    renderFullScene(ctx, staticCanvas, state, rows, cols, cellSize, options);
    return;
  }

  const snakeBody = state.snake?.body ?? EMPTY_ARRAY;
  const snakeLength = snakeBody.length;
  const snakeHead = snakeBody[0] ?? -1;
  const snakeTail = snakeLength ? snakeBody[snakeLength - 1] : -1;

  const prevHead = prevRender?.snakeHead ?? -1;
  const prevTail = prevRender?.snakeTail ?? -1;
  const prevLength = prevRender?.snakeLength ?? 0;
  const prevFruit = prevRender?.fruit ?? -1;
  const prevPathCells = prevRender?.pathCells ?? EMPTY_ARRAY;
  const prevShortcutCells = prevRender?.shortcutCells ?? EMPTY_ARRAY;

  const fruit = state.fruit ?? -1;
  const grew = snakeLength > prevLength;

  const cellsToRestore = new Set();

  if (!grew && prevTail >= 0 && prevTail !== snakeTail) {
    cellsToRestore.add(prevTail);
  }

  if (prevFruit >= 0 && prevFruit !== fruit) {
    cellsToRestore.add(prevFruit);
  }

  for (const cell of prevPathCells) {
    if (cell >= 0) {
      cellsToRestore.add(cell);
    }
  }

  for (const cell of prevShortcutCells) {
    if (cell >= 0) {
      cellsToRestore.add(cell);
    }
  }

  cellsToRestore.forEach((cell) => {
    restoreCellFromStatic(ctx, staticCanvas, cell, cols, cellSize);
  });

  // Always redraw fruit if it was in a restored cell or if its position changed
  if (fruit >= 0 && (fruit !== prevFruit || cellsToRestore.has(fruit))) {
    drawFruitDot(ctx, fruit, cols, cellSize);
  }

  if (options.showShortcuts && Array.isArray(pathCells) && pathCells.length && snakeHead !== undefined) {
    drawPlannedPath(ctx, snakeHead, pathCells, cols, cellSize);
  }

  if (options.showShortcuts && Array.isArray(shortcutEdge)) {
    drawShortcut(ctx, shortcutEdge, cols, cellSize);
  }

  if (snakeBody.length === 0) {
    return;
  }

  if (hasOverlay) {
    drawSnakeSection(ctx, snakeBody, 1, cols, cellSize, COLORS.SNAKE_BODY, 4);
    fillCell(ctx, snakeHead, cols, cellSize, COLORS.SNAKE_HEAD, 2);
  } else {
    if (prevHead >= 0 && prevHead !== snakeHead) {
      fillCell(ctx, prevHead, cols, cellSize, COLORS.SNAKE_BODY, 4);
    }
    if (snakeHead >= 0) {
      fillCell(ctx, snakeHead, cols, cellSize, COLORS.SNAKE_HEAD, 2);
    }
  }
}

/**
 * React hook that manages the canvas element used to visualize the game. It
 * memoizes rendering work, creates an off-screen static layer for the grid, and
 * exposes an imperative `draw` callback that components can use to request
 * redraws with updated visualization options.
 *
 * @param {object} gameState - Current immutable game state from the engine.
 * @param {object} [settings=DEFAULT_CONFIG] - Configuration controlling grid dimensions and cell size.
 * @returns {{canvasRef: import('react').RefObject<HTMLCanvasElement>, draw: (options?: object) => void}}
 * Canvas ref for JSX wiring plus a draw function to control overlays.
 */
export function useCanvas(gameState, settings = DEFAULT_CONFIG) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const cleanupRef = useRef(null);
  const drawOptionsRef = useRef({ showCycle: true, showShortcuts: true });
  const latestStateRef = useRef(gameState);

  const rows = settings?.rows ?? DEFAULT_CONFIG.rows;
  const cols = settings?.cols ?? DEFAULT_CONFIG.cols;
  const cellSize = settings?.cellSize ?? DEFAULT_CONFIG.cellSize;
  const dimensionsRef = useRef({ rows, cols, cellSize });
  const staticLayerRef = useRef({ canvas: null, key: '', cycleRef: null });
  const previousRenderRef = useRef({ initialized: false });
  const needsFullRedrawRef = useRef(true);

  useEffect(() => {
    latestStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    dimensionsRef.current = { rows, cols, cellSize };
    needsFullRedrawRef.current = true;
    previousRenderRef.current = { initialized: false };
  }, [rows, cols, cellSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      cleanupRef.current = null;
      return noop;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to acquire 2D context for canvas rendering.');
      cleanupRef.current = null;
      return noop;
    }

    const width = cols * cellSize;
    const height = rows * cellSize;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.imageSmoothingEnabled = false;
    ctxRef.current = ctx;

    needsFullRedrawRef.current = true;
    previousRenderRef.current = { initialized: false };
    staticLayerRef.current = { canvas: null, key: '', cycleRef: null };

    const cleanup = () => {
      if (rafRef.current !== null) {
        CANCEL_RAF_FALLBACK(rafRef.current);
        rafRef.current = null;
      }

      if (canvasRef.current === canvas) {
        try {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        } catch (error) {
          console.warn('Failed to reset canvas during cleanup:', error);
        }

        canvas.width = 0;
        canvas.height = 0;
        canvas.removeAttribute('style');
      }

      if (ctxRef.current === ctx) {
        ctxRef.current = null;
      }

      staticLayerRef.current = { canvas: null, key: '', cycleRef: null };
      previousRenderRef.current = { initialized: false };
      needsFullRedrawRef.current = true;
      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [rows, cols, cellSize]);

  /**
   * Central rendering routine reused by the animation loop and manual draw
   * requests. Handles background caching, overlay diffing, and incremental
   * updates.
   */
  const stableRender = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { rows: currentRows, cols: currentCols, cellSize: currentCellSize } = dimensionsRef.current;
    const appliedOptions = drawOptionsRef.current;
    const width = currentCols * currentCellSize;
    const height = currentRows * currentCellSize;
    const currentState = latestStateRef.current;

    const cycle = currentState?.cycle ?? null;
    const showCycle = appliedOptions.showCycle && Array.isArray(cycle) && cycle.length > 0;

    let staticLayer = staticLayerRef.current;
    const staticKey = `${currentRows}x${currentCols}_${currentCellSize}_${showCycle ? 'cycle' : 'plain'}`;

    if (!staticLayer || staticLayer.key !== staticKey || staticLayer.cycleRef !== cycle) {
      const staticCanvas = createStaticLayer(currentRows, currentCols, currentCellSize, cycle, showCycle);
      staticLayer = { canvas: staticCanvas, key: staticKey, cycleRef: cycle };
      staticLayerRef.current = staticLayer;
      needsFullRedrawRef.current = true;
    }

    if (!currentState) {
      if (staticLayer?.canvas) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(staticLayer.canvas, 0, 0, width, height, 0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);
        drawGrid(ctx, currentRows, currentCols, currentCellSize);
      }
      previousRenderRef.current = { initialized: false };
      return;
    }

    const plannerData = currentState.plannerData;
    const pathCells = appliedOptions.showShortcuts && Array.isArray(plannerData?.plannedPath)
      ? plannerData.plannedPath
      : EMPTY_ARRAY;
    const shortcutEdge = appliedOptions.showShortcuts && Array.isArray(plannerData?.shortcutEdge)
      ? plannerData.shortcutEdge
      : null;
    const hasOverlay = appliedOptions.showShortcuts && (pathCells.length > 0 || !!shortcutEdge);

    const pathSignature = createPathSignature(pathCells, shortcutEdge, appliedOptions.showShortcuts);
    const prevRender = previousRenderRef.current || { initialized: false };
    const optionsKey = `${showCycle ? '1' : '0'}_${appliedOptions.showShortcuts ? '1' : '0'}`;

    if (
      prevRender.optionsKey !== optionsKey ||
      prevRender.pathSignature !== pathSignature ||
      prevRender.cycleRef !== cycle
    ) {
      needsFullRedrawRef.current = true;
    }

    if (needsFullRedrawRef.current || !prevRender.initialized || !staticLayer?.canvas) {
      renderFullScene(ctx, staticLayer?.canvas, currentState, currentRows, currentCols, currentCellSize, appliedOptions);
      needsFullRedrawRef.current = false;
    } else {
      renderIncremental(
        ctx,
        staticLayer.canvas,
        currentState,
        prevRender,
        currentRows,
        currentCols,
        currentCellSize,
        appliedOptions,
        pathCells,
        shortcutEdge,
        hasOverlay
      );
    }

    const snakeBody = currentState.snake?.body ?? EMPTY_ARRAY;
    const snakeLength = snakeBody.length;
    const snakeHead = snakeBody[0] ?? -1;
    const snakeTail = snakeLength ? snakeBody[snakeLength - 1] : -1;
    const fruit = currentState.fruit ?? -1;

    previousRenderRef.current = {
      initialized: true,
      snakeHead,
      snakeTail,
      snakeLength,
      fruit,
      optionsKey,
      pathSignature,
      cycleRef: cycle,
      pathCells: hasOverlay && pathCells.length ? Array.from(pathCells) : EMPTY_ARRAY,
      shortcutCells: hasOverlay && Array.isArray(shortcutEdge) ? [shortcutEdge[0], shortcutEdge[1]] : EMPTY_ARRAY,
      hasOverlay,
    };
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) {
      CANCEL_RAF_FALLBACK(rafRef.current);
      rafRef.current = null;
    }

    let mounted = true;

    const renderLoop = () => {
      try {
        stableRender();
      } catch (error) {
        console.error('Canvas render failed:', error);
      }

      if (!mounted) {
        return;
      }

      rafRef.current = RAF_FALLBACK(renderLoop);
    };

    rafRef.current = RAF_FALLBACK(renderLoop);

    return () => {
      mounted = false;
      if (rafRef.current !== null) {
        CANCEL_RAF_FALLBACK(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [stableRender]);

  useEffect(() => () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    } else if (rafRef.current !== null) {
      CANCEL_RAF_FALLBACK(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const draw = useCallback(
    (options = {}) => {
      drawOptionsRef.current = {
        ...drawOptionsRef.current,
        ...options,
      };
      needsFullRedrawRef.current = true;
      stableRender();
    },
    [stableRender]
  );

  return {
    canvasRef,
    draw,
  };
}
