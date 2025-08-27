// FILE: src/ui/hooks/useGameState.js
/**
 * React hook for managing game state - FIXED VERSION
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { initializeGame, resetGame } from '../../engine/gameEngine.js';
import { GameLoop } from '../../game/gameLoop.js';
import { loadSettings, saveSettings, updateHighScore } from '../../game/settings.js';
import { seed } from '../../engine/rng.js';

export function useGameState() {
  const [settings, setSettings] = useState(loadSettings);
  const [gameState, setGameState] = useState(null); // ✅ Start with null
  const [stats, setStats] = useState({});

  const gameLoopRef = useRef(null);

  // Initialize game state when settings change
  useEffect(() => {
    seed(settings.seed);
    const newState = initializeGame(settings);
    setGameState(newState);
  }, [settings]); // ✅ Reset game state when settings change

  // Initialize game loop when gameState is available
  useEffect(() => {
    if (!gameState) return;

    // Stop existing loop
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
    }

    const loop = new GameLoop(
      gameState, // ✅ Use current gameState, not stale closure
      newState => {
        setGameState(newState);
        
        // Get stats from the new state, not from loop
        const currentStats = {
          moves: newState.moves || 0,
          length: newState.snake?.body?.length || 1,
          score: newState.score || 0,
          free: (newState.cycle?.length || 400) - (newState.snake?.body?.length || 1),
          distHeadApple: calculateDistance(newState),
          distHeadTail: calculateTailDistance(newState),
          shortcut: newState.lastMoveWasShortcut || false,
          efficiency: newState.moves > 0 ? Math.round((newState.score / newState.moves) * 100) : 0,
        };
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
  }, [gameState]); // ✅ Recreate loop when gameState changes

  // Update game loop settings when they change
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setTickInterval(settings.tickMs);
    }
  }, [settings.tickMs]); // ✅ Only depend on the specific property we need

  // Helper functions for stats calculation
  const calculateDistance = (state) => {
    if (!state.snake?.body?.[0] || !state.cycleIndex || state.fruit === undefined) return 0;
    const headPos = state.cycleIndex.get(state.snake.body[0]);
    const fruitPos = state.cycleIndex.get(state.fruit);
    if (headPos === undefined || fruitPos === undefined) return 0;
    return (fruitPos - headPos + state.cycle.length) % state.cycle.length;
  };

  const calculateTailDistance = (state) => {
    if (!state.snake?.body || state.snake.body.length < 2 || !state.cycleIndex) return 0;
    const headPos = state.cycleIndex.get(state.snake.body[0]);
    const tailPos = state.cycleIndex.get(state.snake.body[state.snake.body.length - 1]);
    if (headPos === undefined || tailPos === undefined) return 0;
    return (tailPos - headPos + state.cycle.length) % state.cycle.length;
  };

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
    setGameState(newState); // ✅ This will trigger the useEffect to recreate the loop
  }, [settings]);

  const toggleGame = useCallback(() => {
    if (!gameState) return;
    
    if (gameState.status === 'playing') {
      pauseGame();
    } else if (gameState.status === 'paused') {
      startGame();
    } else {
      resetGameState();
    }
  }, [gameState?.status, startGame, pauseGame, resetGameState]); // ✅ Only depend on the specific property

  // Return null for gameState until it's initialized
  if (!gameState) {
    return {
      gameState: null,
      stats: {},
      settings,
      updateSettings,
      startGame: () => {},
      pauseGame: () => {},
      stepGame: () => {},
      resetGameState,
      toggleGame: () => {},
    };
  }

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