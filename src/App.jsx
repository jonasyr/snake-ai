import React, { useEffect, useState } from 'react';
import { useGameState } from './ui/hooks/useGameState.js';
import { useCanvas } from './ui/hooks/useCanvas.js';
import GameHeader from './ui/components/GameHeader.jsx';
import GameControls from './ui/components/GameControls.jsx';
import GameCanvasPanel from './ui/components/GameCanvasPanel.jsx';
import StatsSidebar from './ui/components/StatsSidebar.jsx';
import KeyboardShortcuts from './ui/components/KeyboardShortcuts.jsx';
import LoadingScreen from './ui/components/LoadingScreen.jsx';
import ComparisonDashboard from './ui/components/ComparisonDashboard.jsx';

/**
 * Root application shell that wires together state hooks, rendering hooks, and
 * the presentation layer. It centralizes keyboard controls and global view
 * toggles while delegating rendering to specialized components.
 *
 * @returns {JSX.Element} Fully composed Snake AI application view.
 */
export default function App() {
  const {
    gameState,
    stats,
    settings,
    updateSettings,
    toggleGame,
    stepGame,
    resetGameState,
    exportSettings,
    importSettings,
    clearData,
  } = useGameState();
  const { canvasRef, draw } = useCanvas(gameState, settings);
  const [activeTab, setActiveTab] = useState('play');
  const [showSettings, setShowSettings] = useState(false);
  const [showCycle, setShowCycle] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(true);

  useEffect(() => {
    // Provide intuitive keyboard shortcuts for accessibility and power users.
    const handleKeyPress = event => {
      switch (event.key) {
        case ' ':
          event.preventDefault();
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
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleGame, stepGame, resetGameState]);

  useEffect(() => {
    if (draw) {
      // Delegate the imperative canvas rendering to the dedicated hook so the
      // component can remain focused on declarative UI structure.
      draw({ showCycle, showShortcuts });
    }
  }, [draw, showCycle, showShortcuts]);

  if (!gameState) {
    return <LoadingScreen />;
  }

  const handleToggleSettings = () => setShowSettings(value => !value);
  const handleToggleCycle = () => setShowCycle(value => !value);
  const handleToggleShortcuts = () => setShowShortcuts(value => !value);

  const TAB_CLASSES = active =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-white/10 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
      <GameHeader
        showSettings={showSettings}
        onToggleSettings={handleToggleSettings}
      />

      <main className='max-w-7xl mx-auto p-6'>
        {/* Tab navigation */}
        <div className='flex gap-1 mb-6 bg-black/20 border border-white/10 rounded-xl p-1 w-fit'>
          <button
            className={TAB_CLASSES(activeTab === 'play')}
            onClick={() => setActiveTab('play')}
          >
            Play
          </button>
          <button
            className={TAB_CLASSES(activeTab === 'compare')}
            onClick={() => setActiveTab('compare')}
          >
            Compare
          </button>
        </div>

        {activeTab === 'play' ? (
          <div className='grid lg:grid-cols-[1fr,400px] gap-8'>
            <div className='flex flex-col items-center'>
              <GameControls
                gameState={gameState}
                settings={settings}
                onToggleGame={toggleGame}
                onStepGame={stepGame}
                onResetGame={resetGameState}
                onUpdateSettings={updateSettings}
                showCycle={showCycle}
                showShortcuts={showShortcuts}
                onToggleCycle={handleToggleCycle}
                onToggleShortcuts={handleToggleShortcuts}
              />

              <GameCanvasPanel
                canvasRef={canvasRef}
                gameState={gameState}
                stats={stats}
              />
              <KeyboardShortcuts />
            </div>

            <StatsSidebar
              stats={stats}
              gameState={gameState}
              settings={settings}
              showSettings={showSettings}
              onUpdateSettings={updateSettings}
              onExportSettings={exportSettings}
              onImportSettings={importSettings}
              onClearData={clearData}
            />
          </div>
        ) : (
          <ComparisonDashboard settings={settings} />
        )}
      </main>
    </div>
  );
}
