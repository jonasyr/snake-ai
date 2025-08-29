// FILE: src/ui/hooks/useCanvas.js
/**
 * Simplified Canvas hook - FIXED VERSION
 */

import { useRef, useEffect, useCallback } from 'react';
import { indexToPosition } from '../../utils/math.js';
import { COLORS } from '../../utils/constants.js';

export function useCanvas(gameState, settings) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const setupAttemptRef = useRef(0);
  const hasSetupRef = useRef(false);

  const { rows = 20, cols = 20 } = settings || {};
  const cellSize = 24;

  // Setup canvas when ref becomes available or settings change
  useEffect(() => {
    // Reset setup state when settings change
    hasSetupRef.current = false;
    setupAttemptRef.current = 0;
    
    const setupCanvas = () => {
      if (hasSetupRef.current) return; // Already set up
      
      const canvas = canvasRef.current;
      if (!canvas) {
        setupAttemptRef.current += 1;
        if (setupAttemptRef.current < 50) { // Try for up to 500ms
          console.log(`Canvas ref not available yet, retrying... (attempt ${setupAttemptRef.current})`);
          setTimeout(setupCanvas, 10);
        } else {
          console.error('Failed to get canvas ref after 50 attempts');
        }
        return;
      }

      console.log('Setting up canvas...', { canvas });
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // Setup canvas dimensions
      const width = cols * cellSize;
      const height = rows * cellSize;
      
      console.log('Setting canvas dimensions:', { width, height, cols, rows, cellSize });
      
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.imageSmoothingEnabled = false;
      ctxRef.current = ctx;
      hasSetupRef.current = true;

      console.log('Canvas setup complete:', { width, height, contextSet: !!ctxRef.current });

      // Draw a simple test pattern to verify canvas works
      ctx.fillStyle = '#0f172a'; // Use hardcoded background color first
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 10, 30, 30);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(50, 10, 30, 30);
      console.log('Drew test pattern with context:', !!ctx);
    };

    // Start setup immediately
    setupCanvas();
  }, [cols, rows, cellSize]);

  // Drawing functions
  const drawCell = useCallback((cellIndex, color, size = cellSize - 2) => {
    const ctx = ctxRef.current;
    if (!ctx || cellIndex < 0) return;

    try {
      const [row, col] = indexToPosition(cellIndex, cols);
      const x = col * cellSize + (cellSize - size) / 2;
      const y = row * cellSize + (cellSize - size) / 2;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    } catch (error) {
      console.warn('Error in drawCell:', error);
    }
  }, [cols, cellSize]);

  const drawCircle = useCallback((cellIndex, color, radius = cellSize / 3) => {
    const ctx = ctxRef.current;
    if (!ctx || cellIndex < 0) return;

    try {
      const [row, col] = indexToPosition(cellIndex, cols);
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } catch (error) {
      console.warn('Error in drawCircle:', error);
    }
  }, [cols, cellSize]);

  const drawLine = useCallback((fromIndex, toIndex, color, width = 1) => {
    const ctx = ctxRef.current;
    if (!ctx || fromIndex < 0 || toIndex < 0) return;

    try {
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
    } catch (error) {
      console.warn('Error in drawLine:', error);
    }
  }, [cols, cellSize]);

  // Main draw function
  const draw = useCallback((options = {}) => {
    const ctx = ctxRef.current;
    if (!ctx) {
      console.warn('No canvas context available in draw function');
      return;
    }

    const { showCycle = true, showShortcuts = true } = options;

    console.log('Drawing with gameState:', {
      hasGameState: !!gameState,
      snakeLength: gameState?.snake?.body?.length,
      fruit: gameState?.fruit,
      status: gameState?.status
    });

    try {
      // Clear canvas and draw background
      const width = cols * cellSize;
      const height = rows * cellSize;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0f172a'; // Use hardcoded background color
      ctx.fillRect(0, 0, width, height);

      if (!gameState) {
        console.log('No gameState to draw - drawing test pattern instead');
        // Draw test pattern when no game state
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 50, 50, 50);
        return;
      }

      const { snake, fruit, cycle, plannerData } = gameState;

      // Draw grid
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i <= rows; i++) {
        const y = i * cellSize + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      for (let i = 0; i <= cols; i++) {
        const x = i * cellSize + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      ctx.stroke();

      // Draw Hamiltonian cycle
      if (showCycle && cycle && cycle.length > 0) {
        console.log('Drawing Hamiltonian cycle with length:', cycle.length);
        for (let i = 0; i < cycle.length; i++) {
          const fromIndex = cycle[i];
          const toIndex = cycle[(i + 1) % cycle.length];
          drawLine(fromIndex, toIndex, '#1e40af30', 1); // Use hardcoded blue color
        }
      }

      // Draw fruit
      if (fruit !== undefined && fruit >= 0) {
        console.log('Drawing fruit at position:', fruit);
        drawCircle(fruit, '#ef4444'); // Use hardcoded red color
      }

      // Draw snake
      if (snake?.body && snake.body.length > 0) {
        console.log('Drawing snake with length:', snake.body.length);
        snake.body.forEach((cellIndex, i) => {
          const isHead = i === 0;
          const color = isHead ? '#10b981' : '#059669'; // Use hardcoded green colors
          const size = isHead ? cellSize - 2 : cellSize - 4;
          drawCell(cellIndex, color, size);
        });
      }

      // Draw shortcut edge
      if (showShortcuts && plannerData?.shortcutEdge) {
        const [from, to] = plannerData.shortcutEdge;
        drawLine(from, to, '#fbbf24', 3); // Use hardcoded yellow color
      }

      console.log('Draw complete - Snake length:', snake?.body?.length, 'Fruit:', fruit);

    } catch (error) {
      console.error('Error in draw:', error);
    }
  }, [gameState, cols, rows, cellSize, drawCell, drawCircle, drawLine]);

  // Redraw when gameState changes - prevent infinite loops
  useEffect(() => {
    console.log('Draw effect triggered:', { 
      hasContext: !!ctxRef.current, 
      hasGameState: !!gameState,
      gameStateStatus: gameState?.status,
      moves: gameState?.moves,
      snakeLength: gameState?.snake?.body?.length
    });
    
    if (ctxRef.current && gameState) {
      // Use requestAnimationFrame to prevent excessive redraws
      requestAnimationFrame(() => draw());
    }
  }, [gameState?.moves, gameState?.status, gameState?.snake?.body?.length, gameState?.fruit, draw]);

  // Remove the redundant effect that was causing infinite loops

  return {
    canvasRef,
    draw,
  };
}
