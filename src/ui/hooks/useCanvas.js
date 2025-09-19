import { useCallback, useEffect, useRef } from 'react';
import { indexToPosition } from '../../utils/math.js';
import { COLORS, DEFAULT_CONFIG } from '../../utils/constants.js';

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

export function useCanvas(gameState, settings = DEFAULT_CONFIG) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const cleanupRef = useRef(null);
  const drawOptionsRef = useRef({ showCycle: true, showShortcuts: true });

  const rows = settings?.rows ?? DEFAULT_CONFIG.rows;
  const cols = settings?.cols ?? DEFAULT_CONFIG.cols;
  const cellSize = settings?.cellSize ?? DEFAULT_CONFIG.cellSize;

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

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const cleanup = () => {
      if (rafRef.current !== null) {
        CANCEL_RAF_FALLBACK(rafRef.current);
        rafRef.current = null;
      }

      if (canvasRef.current) {
        try {
          const currentCanvas = canvasRef.current;
          ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
        } catch (error) {
          console.warn('Failed to clear canvas during cleanup:', error);
        }
      }

      if (ctxRef.current === ctx) {
        ctxRef.current = null;
      }

      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [rows, cols, cellSize]);

  const render = useCallback(
    (options = {}) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const appliedOptions = {
        ...drawOptionsRef.current,
        ...options,
      };
      drawOptionsRef.current = appliedOptions;

      const width = cols * cellSize;
      const height = rows * cellSize;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      drawGrid(ctx, rows, cols, cellSize);

      if (!gameState) return;

      const { cycle, snake, fruit, plannerData } = gameState;
      const snakeBody = snake?.body ?? [];
      const snakeHead = snakeBody[0];

      if (appliedOptions.showCycle) {
        drawCycle(ctx, cycle, cols, cellSize);
      }

      if (fruit !== undefined && fruit >= 0) {
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

      if (appliedOptions.showShortcuts && plannerData?.plannedPath?.length) {
        drawPlannedPath(ctx, snakeHead, plannerData.plannedPath, cols, cellSize);
      }

      if (appliedOptions.showShortcuts && plannerData?.shortcutEdge) {
        drawShortcut(ctx, plannerData.shortcutEdge, cols, cellSize);
      }

      if (snakeBody.length) {
        drawCells(ctx, snakeBody.slice(1), cols, cellSize, COLORS.SNAKE_BODY, 4);
        drawCells(ctx, [snakeHead], cols, cellSize, COLORS.SNAKE_HEAD, 2);
      }
    },
    [cols, rows, cellSize, gameState]
  );

  useEffect(() => {
    const cancelRaf = () => {
      if (rafRef.current !== null) {
        CANCEL_RAF_FALLBACK(rafRef.current);
        rafRef.current = null;
      }
    };

    cancelRaf();

    if (!ctxRef.current) {
      return cancelRaf;
    }

    rafRef.current = RAF_FALLBACK(() => {
      try {
        render();
      } catch (error) {
        console.error('Canvas render failed:', error);
        cancelRaf();
      }
    });

    return cancelRaf;
  }, [render]);

  useEffect(() => () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    } else if (rafRef.current !== null) {
      CANCEL_RAF_FALLBACK(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  return {
    canvasRef,
    draw: render,
  };
}
