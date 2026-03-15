// FILE: src/ui/visualizers/drawUtils.js
/**
 * Low-level canvas drawing primitives shared by all visualizers.
 */

import { indexToPosition } from '../../utils/math.js';
import { COLORS } from '../../utils/constants.js';

/**
 * Render the Hamiltonian cycle overlay.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} cycle - Ordered cell indices.
 * @param {number} cols
 * @param {number} cellSize
 */
export function drawCycle(ctx, cycle, cols, cellSize) {
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
 * Highlight the currently executed shortcut edge.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {[number, number]} shortcut - Start and end cell indices.
 * @param {number} cols
 * @param {number} cellSize
 */
export function drawShortcut(ctx, shortcut, cols, cellSize) {
  if (!Array.isArray(shortcut) || shortcut.length < 2) return;

  ctx.strokeStyle = COLORS.SHORTCUT_EDGE;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();

  const [from, to] = shortcut;
  const [fromRow, fromCol] = indexToPosition(from, cols);
  const [toRow, toCol] = indexToPosition(to, cols);

  ctx.moveTo(
    fromCol * cellSize + cellSize / 2,
    fromRow * cellSize + cellSize / 2
  );
  ctx.lineTo(toCol * cellSize + cellSize / 2, toRow * cellSize + cellSize / 2);
  ctx.stroke();
}

/**
 * Render the dotted preview path the snake intends to follow.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} snakeHead - Current head cell index.
 * @param {number[]} path - Planned upcoming cell indices.
 * @param {number} cols
 * @param {number} cellSize
 */
export function drawPlannedPath(ctx, snakeHead, path, cols, cellSize) {
  if (!Array.isArray(path) || path.length === 0 || snakeHead === undefined)
    return;

  ctx.strokeStyle = COLORS.SHORTCUT;
  ctx.lineWidth = 2;
  ctx.setLineDash([cellSize / 2, cellSize / 2]);
  ctx.beginPath();

  const [headRow, headCol] = indexToPosition(snakeHead, cols);
  ctx.moveTo(
    headCol * cellSize + cellSize / 2,
    headRow * cellSize + cellSize / 2
  );

  for (const cell of path) {
    const [row, col] = indexToPosition(cell, cols);
    ctx.lineTo(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}
