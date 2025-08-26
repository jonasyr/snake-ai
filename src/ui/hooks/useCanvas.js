// FILE: src/ui/hooks/useCanvas.js
/**
 * Canvas setup and drawing utilities
 */

import { useRef, useEffect, useCallback } from 'react';
import { indexToPosition } from '../../utils/math.js';
import { COLORS, DEFAULT_CONFIG } from '../../utils/constants.js';

export function useCanvas(gameState, settings) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const dprRef = useRef(1);

  const { rows, cols } = settings;
  const cellSize = DEFAULT_CONFIG.cellSize || 24;

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    const width = cols * cellSize;
    const height = rows * cellSize;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    ctxRef.current = ctx;
    dprRef.current = dpr;
  }, [rows, cols, cellSize]);

  // Drawing functions
  const drawCell = useCallback(
    (cellIndex, color, size = cellSize - 2) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const [row, col] = indexToPosition(cellIndex, cols);
      const x = col * cellSize + (cellSize - size) / 2;
      const y = row * cellSize + (cellSize - size) / 2;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    },
    [cols, cellSize]
  );

  const drawCircle = useCallback(
    (cellIndex, color, radius = cellSize / 3) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const [row, col] = indexToPosition(cellIndex, cols);
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    [cols, cellSize]
  );

  const drawLine = useCallback(
    (fromIndex, toIndex, color, width = 2) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const [fromRow, fromCol] = indexToPosition(fromIndex, cols);
      const [toRow, toCol] = indexToPosition(toIndex, cols);

      const x1 = fromCol * cellSize + cellSize / 2;
      const y1 = fromRow * cellSize + cellSize / 2;
      const x2 = toCol * cellSize + cellSize / 2;
      const y2 = toRow * cellSize + cellSize / 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
    [cols, cellSize]
  );

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, cols * cellSize, rows * cellSize);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, cols * cellSize, rows * cellSize);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
  }, [rows, cols, cellSize]);

  // Main draw function
  const draw = useCallback(
    (options = {}) => {
      const { showCycle = true, showShortcuts = true, showPlanned = true } = options;

      clearCanvas();

      if (!gameState) return;

      const { snake, fruit, cycle, plannerData } = gameState;

      // Draw grid
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.strokeStyle = '#1e40af20';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0; i <= rows; i++) {
          const y = i * cellSize + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(cols * cellSize, y);
        }

        for (let i = 0; i <= cols; i++) {
          const x = i * cellSize + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rows * cellSize);
        }

        ctx.stroke();
      }

      // Draw Hamiltonian cycle
      if (showCycle && cycle) {
        for (let i = 0; i < cycle.length; i++) {
          const fromIndex = cycle[i];
          const toIndex = cycle[(i + 1) % cycle.length];
          drawLine(fromIndex, toIndex, COLORS.CYCLE, 1);
        }
      }

      // Draw planned path
      if (showPlanned && plannerData?.plannedPath) {
        plannerData.plannedPath.forEach(cellIndex => {
          drawCell(cellIndex, '#06b6d440', cellSize - 6);
        });
      }

      // Draw fruit
      if (fruit >= 0) {
        drawCircle(fruit, COLORS.FRUIT);

        // Fruit glow effect
        if (ctx) {
          ctx.save();
          ctx.shadowColor = COLORS.FRUIT;
          ctx.shadowBlur = 15;
          drawCircle(fruit, COLORS.FRUIT, cellSize / 4);
          ctx.restore();
        }
      }

      // Draw snake
      if (snake?.body) {
        snake.body.forEach((cellIndex, i) => {
          const isHead = i === 0;
          const color = isHead ? COLORS.SNAKE_HEAD : COLORS.SNAKE_BODY;
          const size = isHead ? cellSize - 2 : cellSize - 4;

          if (isHead) {
            // Head with glow
            if (ctx) {
              ctx.save();
              ctx.shadowColor = COLORS.SNAKE_HEAD;
              ctx.shadowBlur = 20;
              drawCell(cellIndex, color, size);
              ctx.restore();
            }
          } else {
            drawCell(cellIndex, color, size);
          }
        });
      }

      // Draw shortcut edge
      if (showShortcuts && plannerData?.shortcutEdge) {
        const [from, to] = plannerData.shortcutEdge;
        drawLine(from, to, COLORS.SHORTCUT_EDGE, 3);
      }
    },
    [gameState, clearCanvas, drawCell, drawCircle, drawLine, rows, cols, cellSize]
  );

  return {
    canvasRef,
    draw,
  };
}
