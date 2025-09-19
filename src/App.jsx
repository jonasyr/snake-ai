import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, RotateCcw, SkipForward, Settings, Info, Zap } from 'lucide-react';
import { useGameState } from './ui/hooks/useGameState.js';
import { useCanvas } from './ui/hooks/useCanvas.js';

// UI Components
const StatCard = ({ label, value, icon, color = 'blue', subtitle }) => {
  const IconComponent = icon;
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <IconComponent className={`w-5 h-5 text-${color}-400`} />
        <span className={`text-2xl font-bold text-${color}-400`}>{value}</span>
      </div>
      <p className="text-sm text-gray-300 font-medium">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string,
  subtitle: PropTypes.string,
};

const ControlButton = ({ onClick, children, variant = 'secondary', active = false, disabled = false }) => {
  const baseClasses =
    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100',
    secondary: `${active ? 'bg-white/20' : 'bg-white/10'} text-white border border-white/20 hover:bg-white/20 hover:border-white/30`,
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]}`}>
      {children}
    </button>
  );
};

ControlButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  active: PropTypes.bool,
  disabled: PropTypes.bool,
};

// Main App Component
export default function App() {
  const { gameState, stats, settings, updateSettings, toggleGame, stepGame, resetGameState } =
    useGameState();

  const { canvasRef, draw } = useCanvas(gameState, settings);
  const [showSettings, setShowSettings] = useState(false);
  const [showCycle, setShowCycle] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(true);

  // ✅ All hooks must be called before any early returns
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = e => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          toggleGame();
          break;
        case 'r':
        case 'R':
          resetGameState();
          break;
        case 'ArrowRight':
          stepGame();
          break;
        case 'Escape':
          setShowSettings(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleGame, stepGame, resetGameState]);

  // Redraw when visualization options change
  useEffect(() => {
    if (draw) {
      draw({ showCycle, showShortcuts });
    }
  }, [draw, showCycle, showShortcuts]);

  // ✅ NOW we can do conditional rendering after all hooks
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing Snake AI...</p>
        </div>
      </div>
    );
  }

  const isGameOver = gameState.status === 'gameOver' || gameState.status === 'complete';
  const isPlaying = gameState.status === 'playing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Snake AI
              </h1>
              <p className="text-gray-400 mt-1">Hamiltonian Cycle with Smart Shortcuts</p>
            </div>
            <ControlButton onClick={() => setShowSettings(!showSettings)} active={showSettings}>
              <Settings className="w-4 h-4" />
              Settings
            </ControlButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
          {/* Game Area */}
          <div className="flex flex-col items-center">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <ControlButton onClick={toggleGame} variant="primary" disabled={!gameState}>
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

              <ControlButton onClick={stepGame} disabled={!gameState || isPlaying || isGameOver}>
                <SkipForward className="w-4 h-4" />
                Step
              </ControlButton>

              <ControlButton onClick={resetGameState} variant="danger" disabled={!gameState}>
                <RotateCcw className="w-4 h-4" />
                Reset
              </ControlButton>

              <div className="border-l border-white/20 pl-4 ml-4 flex gap-2">
                <ControlButton
                  onClick={() => setShowCycle(!showCycle)}
                  active={showCycle}
                  variant="secondary"
                >
                  Cycle
                </ControlButton>
                <ControlButton
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  active={showShortcuts}
                  variant="secondary"
                >
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
                  value={settings.tickMs}
                  onChange={e => updateSettings({ ...settings, tickMs: parseInt(e.target.value) })}
                  className="w-24 accent-blue-500"
                />
                <span className="text-sm text-gray-400 w-12">{settings.tickMs}ms</span>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
                <canvas
                  ref={canvasRef}
                  className="block rounded-2xl bg-slate-800"
                  style={{ 
                    imageRendering: 'pixelated'
                  }}
                />
                {isGameOver && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-red-400 mb-2">
                        {gameState.status === 'complete' ? 'Perfect!' : 'Game Over!'}
                      </h2>
                      <p className="text-gray-300 mb-4">
                        {gameState.status === 'complete'
                          ? 'You filled the entire grid!'
                          : 'Snake collided with itself'}
                      </p>
                      <p className="text-sm text-gray-400">Final Score: {stats.score || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Space</kbd>
              <span className="text-gray-400">Play/Pause</span>
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">→</kbd>
              <span className="text-gray-400">Step</span>
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">R</kbd>
              <span className="text-gray-400">Reset</span>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Performance Stats */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Score" value={stats.score || 0} icon={Zap} color="yellow" />
                <StatCard label="Moves" value={stats.moves || 0} icon={Info} color="blue" />
                <StatCard
                  label="Length"
                  value={stats.length || 1}
                  icon={Info}
                  color="green"
                  subtitle={`${Math.round(((stats.length || 1) / (gameState?.cycle?.length || 400)) * 100)}% filled`}
                />
                <StatCard
                  label="Efficiency"
                  value={`${stats.efficiency || 0}%`}
                  icon={Info}
                  color="purple"
                  subtitle="Score per move"
                />
              </div>
            </div>

            {/* Algorithm Status */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Algorithm Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Head → Apple</span>
                  <span className="font-mono text-cyan-400">{stats.distHeadApple || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Head → Tail</span>
                  <span className="font-mono text-green-400">{stats.distHeadTail || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Free Cells</span>
                  <span className="font-mono text-blue-400">{stats.free || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Using Shortcut</span>
                  <div
                    className={`w-3 h-3 rounded-full ${stats.shortcut ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}
                  ></div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Status</span>
                  <span className="font-semibold text-blue-400 capitalize">{gameState?.status || 'Loading'}</span>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-4">Game Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="grid-size-select"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Grid Size
                    </label>
                    <select
                      id="grid-size-select"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
                      value={`${settings.rows}x${settings.cols}`}
                      onChange={e => {
                        const [rows, cols] = e.target.value.split('x').map(x => parseInt(x));
                        updateSettings({ ...settings, rows, cols });
                      }}
                    >
                      <option value="16x16">16×16 (Small)</option>
                      <option value="20x20">20×20 (Medium)</option>
                      <option value="24x24">24×24 (Large)</option>
                      <option value="30x20">30×20 (Wide)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.shortcutsEnabled !== false}
                        onChange={e =>
                          updateSettings({
                            ...settings,
                            shortcutsEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Enable Smart Shortcuts</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Guide */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Visual Guide</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-400 rounded"></div>
                  <span className="text-gray-300">Snake (AI controlled)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300">Apple target</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-cyan-400/40 rounded"></div>
                  <span className="text-gray-300">Planned path</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-yellow-400 rounded"></div>
                  <span className="text-gray-300">Shortcut edge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}