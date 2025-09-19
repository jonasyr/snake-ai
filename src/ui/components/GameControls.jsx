import React from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import ControlButton from './ControlButton.jsx';

/**
 * Control panel containing playback controls and visualization toggles.
 * @param {object} props - Component props.
 * @param {object} props.gameState - Current game state.
 * @param {object} props.settings - Current user settings.
 * @param {() => void} props.onToggleGame - Toggle play/pause handler.
 * @param {() => void} props.onStepGame - Manual step handler.
 * @param {() => void} props.onResetGame - Reset handler.
 * @param {(settings: object) => void} props.onUpdateSettings - Settings update handler.
 * @param {boolean} props.showCycle - Whether to show the Hamiltonian cycle.
 * @param {boolean} props.showShortcuts - Whether to show shortcuts.
 * @param {() => void} props.onToggleCycle - Toggle handler for cycle visualization.
 * @param {() => void} props.onToggleShortcuts - Toggle handler for shortcuts visualization.
 * @returns {JSX.Element}
 */
export default function GameControls({
  gameState,
  settings,
  onToggleGame,
  onStepGame,
  onResetGame,
  onUpdateSettings,
  showCycle,
  showShortcuts,
  onToggleCycle,
  onToggleShortcuts,
}) {
  const isGameOver = gameState?.status === 'gameOver' || gameState?.status === 'complete';
  const isPlaying = gameState?.status === 'playing';
  const tickMs = settings?.tickMs ?? 100;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <ControlButton onClick={onToggleGame} variant="primary" disabled={!gameState}>
        {isGameOver ? (
          <>
            <RotateCcw className="w-4 h-4" />
            Restart
          </>
        ) : (
          <>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </>
        )}
      </ControlButton>

      <ControlButton onClick={onStepGame} disabled={!gameState || isPlaying || isGameOver}>
        <SkipForward className="w-4 h-4" />
        Step
      </ControlButton>

      <ControlButton onClick={onResetGame} variant="danger" disabled={!gameState}>
        <RotateCcw className="w-4 h-4" />
        Reset
      </ControlButton>

      <div className="border-l border-white/20 pl-4 ml-4 flex gap-2">
        <ControlButton onClick={onToggleCycle} active={showCycle}>
          Cycle
        </ControlButton>
        <ControlButton onClick={onToggleShortcuts} active={showShortcuts}>
          Shortcuts
        </ControlButton>
      </div>

      <div className="flex items-center gap-3 ml-6">
        <label htmlFor="speed-slider" className="text-sm text-gray-300">
          Speed
        </label>
        <input
          id="speed-slider"
          type="range"
          min={20}
          max={200}
          step={10}
          value={tickMs}
          onChange={e => onUpdateSettings({ ...settings, tickMs: parseInt(e.target.value, 10) })}
          className="w-24 accent-blue-500"
        />
        <span className="text-sm text-gray-400 w-12">{tickMs}ms</span>
      </div>
    </div>
  );
}

GameControls.propTypes = {
  gameState: PropTypes.shape({ status: PropTypes.string }),
  settings: PropTypes.shape({ tickMs: PropTypes.number }),
  onToggleGame: PropTypes.func.isRequired,
  onStepGame: PropTypes.func.isRequired,
  onResetGame: PropTypes.func.isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
  showCycle: PropTypes.bool.isRequired,
  showShortcuts: PropTypes.bool.isRequired,
  onToggleCycle: PropTypes.func.isRequired,
  onToggleShortcuts: PropTypes.func.isRequired,
};
