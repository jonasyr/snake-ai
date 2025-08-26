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

  // Initialize game loop only once or when settings change
  useEffect(() => {
    // Stop existing loop
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }

    const loop = new GameLoop(
      gameState,
      newState => {
        setGameState(newState);
        
        // Get stats from the loop itself to avoid stale closure
        const currentStats = loop.getStats();
        setStats(currentStats);

        // Update high score if game ended
        if (newState.status === 'gameOver' || newState.status === 'complete') {
          updateHighScore(newState.score);
        }
      },
      settings
    );

    gameLoopRef.current = loop;

    return () => {
      if (gameLoopRef.current) {
        gameLoopRef.current.stop();
      }
    };
  }, [settings]); // ✅ Only recreate when settings change, not gameState

  // Update game loop settings when they change
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setTickInterval(settings.tickMs);
    }
  }, [settings.tickMs]);

  // Update settings
  const updateSettings = useCallback(newSettings => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      saveSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  // Game control functions
  const startGame = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.start();
    }
  }, []);

  const pauseGame = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.pause();
    }
  }, []);

  const stepGame = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.step();
    }
  }, []);

  const resetGameState = useCallback(() => {
    seed(settings.seed);
    const newState = resetGame(settings);
    setGameState(newState);
    if (gameLoopRef.current) {
      gameLoopRef.current.reset(newState);
    }
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