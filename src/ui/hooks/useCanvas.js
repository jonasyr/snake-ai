import { useCallback, useEffect, useRef } from 'react';
import { indexToPosition } from '../../utils/math.js';
import { COLORS, DEFAULT_CONFIG } from '../../utils/constants.js';

const EMPTY_ARRAY = Object.freeze([]);

const noop = () => {};
const RAF_FALLBACK = typeof window !== 'undefined' && window.requestAnimationFrame
  ? window.requestAnimationFrame.bind(window)
  : (cb) => setTimeout(cb, 16);
const CANCEL_RAF_FALLBACK = typeof window !== 'undefined' && window.cancelAnimationFrame
  ? window.cancelAnimationFrame.bind(window)
  : clearTimeout;

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

function drawCells(ctx, cells, cols, cellSize, color, shrink = 0) {
  if (!Array.isArray(cells)) return;
  ctx.fillStyle = color;
  const size = cellSize - shrink;
  const offset = shrink / 2;

  for (const cell of cells) {
    if (cell < 0) continue;
    const [row, col] = indexToPosition(cell, cols);
    ctx.fillRect(col * cellSize + offset, row * cellSize + offset, size, size);
  }
}

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
