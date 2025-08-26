// FILE: src/ui/components/Controls.jsx
/**
 * Game control buttons and settings
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, RotateCcw, SkipForward, Settings } from 'lucide-react';

const ControlButton = ({
  onClick,
  children,
  variant = 'secondary',
  active = false,
  disabled = false,
}) => {
  const baseClasses =
    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100',
    secondary: `${active ? 'bg-white/20' : 'bg-white/10'} text-white border border-white/20 hover:bg-white/20 hover:border-white/30`,
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]}`}
      aria-label={typeof children === 'string' ? children : ''}
    >
      {children}
    </button>
  );
};

const Controls = ({
  gameState,
  settings,
  onToggleGame,
  onStepGame,
  onResetGame,
  onUpdateSettings,
  visualOptions,
  onUpdateVisualOptions,
  showSettings,
  onToggleSettings,
}) => {
  const { status } = gameState;
  const isGameOver = status === 'gameOver' || status === 'complete';
  const isPlaying = status === 'playing';
  const canStep = status === 'paused' && !isGameOver;

  const handleSpeedChange = e => {
    const tickMs = parseInt(e.target.value);
    onUpdateSettings({ ...settings, tickMs });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      {/* Primary controls */}
      <ControlButton onClick={onToggleGame} variant="primary">
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

      <ControlButton onClick={onStepGame} disabled={!canStep}>
        <SkipForward className="w-4 h-4" />
        Step
      </ControlButton>

      <ControlButton onClick={onResetGame} variant="danger">
        <RotateCcw className="w-4 h-4" />
        Reset
      </ControlButton>

      {/* Visualization toggles */}
      <div className="border-l border-white/20 pl-4 ml-4 flex gap-2">
        <ControlButton
          onClick={() =>
            onUpdateVisualOptions({
              ...visualOptions,
              showCycle: !visualOptions.showCycle,
            })
          }
          active={visualOptions.showCycle}
          variant="secondary"
        >
          Cycle
        </ControlButton>
        <ControlButton
          onClick={() =>
            onUpdateVisualOptions({
              ...visualOptions,
              showShortcuts: !visualOptions.showShortcuts,
            })
          }
          active={visualOptions.showShortcuts}
          variant="secondary"
        >
          Shortcuts
        </ControlButton>
        <ControlButton
          onClick={() =>
            onUpdateVisualOptions({
              ...visualOptions,
              showPlanned: !visualOptions.showPlanned,
            })
          }
          active={visualOptions.showPlanned}
          variant="secondary"
        >
          Path
        </ControlButton>
      </div>

      {/* Speed control */}
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
          value={settings.tickMs}
          onChange={handleSpeedChange}
          className="w-24 accent-blue-500"
          aria-label="Game speed in milliseconds"
        />
        <span className="text-sm text-gray-400 w-12">{settings.tickMs}ms</span>
      </div>

      {/* Settings toggle */}
      <div className="border-l border-white/20 pl-4 ml-4">
        <ControlButton onClick={onToggleSettings} active={showSettings} variant="secondary">
          <Settings className="w-4 h-4" />
          Settings
        </ControlButton>
      </div>
    </div>
  );
};

ControlButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  active: PropTypes.bool,
  disabled: PropTypes.bool,
};

Controls.propTypes = {
  gameState: PropTypes.shape({
    status: PropTypes.string.isRequired,
  }).isRequired,
  settings: PropTypes.shape({
    tickMs: PropTypes.number.isRequired,
  }).isRequired,
  onToggleGame: PropTypes.func.isRequired,
  onStepGame: PropTypes.func.isRequired,
  onResetGame: PropTypes.func.isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
  visualOptions: PropTypes.shape({
    showCycle: PropTypes.bool,
    showShortcuts: PropTypes.bool,
    showPlanned: PropTypes.bool,
  }).isRequired,
  onUpdateVisualOptions: PropTypes.func.isRequired,
  showSettings: PropTypes.bool.isRequired,
  onToggleSettings: PropTypes.func.isRequired,
};

export default React.memo(Controls);
