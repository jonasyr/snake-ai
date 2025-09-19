import React from 'react';
import PropTypes from 'prop-types';

/**
 * Wrapper around the game canvas with gradient border, overlays, and completion messaging.
 * @param {object} props - Component props.
 * @param {React.RefObject<HTMLCanvasElement>} props.canvasRef - Canvas ref from the rendering hook.
 * @param {object} props.gameState - Current game state.
 * @param {object} props.stats - Computed statistics for the current game.
 * @returns {JSX.Element}
 */
export default function GameCanvasPanel({ canvasRef, gameState, stats }) {
  const isGameOver = gameState?.status === 'gameOver' || gameState?.status === 'complete';

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl" />
      <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="block rounded-2xl bg-slate-800"
          style={{
            imageRendering: 'pixelated',
          }}
        />
        {isGameOver && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-400 mb-2">
                {gameState.status === 'complete' ? 'Perfect!' : 'Game Over!'}
              </h2>
              <p className="text-gray-300 mb-4">
                {gameState.status === 'complete' ? 'You filled the entire grid!' : 'Snake collided with itself'}
              </p>
              <p className="text-sm text-gray-400">Final Score: {stats?.score || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

GameCanvasPanel.propTypes = {
  canvasRef: PropTypes.shape({ current: PropTypes.instanceOf(typeof Element !== 'undefined' ? Element : Object) }),
  gameState: PropTypes.shape({ status: PropTypes.string }).isRequired,
  stats: PropTypes.shape({ score: PropTypes.number }),
};
