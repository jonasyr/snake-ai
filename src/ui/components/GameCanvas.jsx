// FILE: src/ui/components/GameCanvas.jsx
/**
 * Dedicated game canvas component with optimized rendering
 */

import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useCanvas } from '../hooks/useCanvas.js';

const GameCanvas = ({ gameState, settings, visualOptions }) => {
  const { canvasRef, draw } = useCanvas(gameState, settings);
  const { showCycle = true, showShortcuts = true, showPlanned = true } = visualOptions || {};

  // Memoize draw options to prevent unnecessary re-renders
  const drawOptions = useMemo(
    () => ({
      showCycle,
      showShortcuts,
      showPlanned,
    }),
    [showCycle, showShortcuts, showPlanned]
  );

  // Redraw when game state or options change
  useEffect(() => {
    draw(drawOptions);
  }, [draw, drawOptions, gameState]);

  return (
    <div className="relative">
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>

      {/* Canvas container */}
      <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="block rounded-2xl"
          style={{ imageRendering: 'pixelated' }}
          alt="Snake game grid"
        />

        {/* Game over overlay */}
        {(gameState.status === 'gameOver' || gameState.status === 'complete') && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-400 mb-2">
                {gameState.status === 'complete' ? 'Perfect Game!' : 'Game Over'}
              </h2>
              <p className="text-gray-300 mb-4">
                {gameState.status === 'complete'
                  ? 'You filled the entire grid!'
                  : 'Snake collided with itself'}
              </p>
              <div className="space-y-1 text-sm text-gray-400">
                <p>Final Score: {gameState.score}</p>
                <p>
                  Length: {gameState.snake.body.length}/{gameState.cycle.length}
                </p>
                <p>Moves: {gameState.moves}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

GameCanvas.propTypes = {
  gameState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    cycle: PropTypes.shape({
      length: PropTypes.number.isRequired,
    }).isRequired,
    snake: PropTypes.shape({
      body: PropTypes.array.isRequired,
    }).isRequired,
    moves: PropTypes.number.isRequired,
  }).isRequired,
  settings: PropTypes.object.isRequired,
  visualOptions: PropTypes.shape({
    showCycle: PropTypes.bool,
    showShortcuts: PropTypes.bool,
    showPlanned: PropTypes.bool,
  }),
};

export default React.memo(GameCanvas);
