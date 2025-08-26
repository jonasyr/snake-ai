// FILE: src/ui/hooks/useGameState.js
/**
 * React hook for managing game state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { initializeGame, resetGame } from '../../engine/gameEngine.js';
import { GameLoop } from '../../game/gameLoop.js';
import { loadSettings, saveSettings, updateHighScore } from '../../game/settings.js';
import { seed } from '../../engine/rng.js';

export function useGameState() {
  const [settings, setSettings] = useState(loadSettings);
  const [gameState, setGameState] = useState(() => {
    seed(settings.seed);
    return initializeGame(settings);
  });
  const [stats, setStats] = useState({});

  const gameLoopRef = useRef(null);

  // Initialize game loop
  useEffect(() => {
    const loop = new GameLoop(
      gameState,
      newState => {
        setGameState(newState);
        setStats(loop.getStats());

        // Update high score if game ended
        if (newState.status === 'gameOver' || newState.status === 'complete') {
          updateHighScore(newState.score);
        }
      },
      settings
    );

    gameLoopRef.current = loop;

    return () => loop.stop();
  }, [gameState, settings]);

  // Update settings
  const updateSettings = useCallback(
    newSettings => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      saveSettings(updatedSettings);

      if (gameLoopRef.current) {
        gameLoopRef.current.setTickInterval(updatedSettings.tickMs);
      }
    },
    [settings]
  );

  // Game control functions
  const startGame = useCallback(() => {
    gameLoopRef.current?.start();
  }, []);

  const pauseGame = useCallback(() => {
    gameLoopRef.current?.pause();
  }, []);

  const stepGame = useCallback(() => {
    gameLoopRef.current?.step();
  }, []);

  const resetGameState = useCallback(() => {
    seed(settings.seed);
    const newState = resetGame(settings);
    setGameState(newState);
    gameLoopRef.current?.reset(newState);
  }, [settings]);

  const toggleGame = useCallback(() => {
    if (gameState.status === 'playing') {
      pauseGame();
    } else if (gameState.status === 'paused') {
      startGame();
    } else {
      resetGameState();
    }
  }, [gameState.status, startGame, pauseGame, resetGameState]);

  return {
    gameState,
    stats,
    settings,
    updateSettings,
    startGame,
    pauseGame,
    stepGame,
    resetGameState,
    toggleGame,
  };
}
