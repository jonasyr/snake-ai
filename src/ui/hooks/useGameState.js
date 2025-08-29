// FILE: src/ui/hooks/useGameState.js
/**
 * React hook for managing game state - SIMPLIFIED FIXED VERSION
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { initializeGame, resetGame } from '../../engine/gameEngine.js';
import { GameLoop } from '../../game/gameLoop.js';
import { loadSettings, saveSettings, updateHighScore } from '../../game/settings.js';
import { seed } from '../../engine/rng.js';

export function useGameState() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [gameState, setGameState] = useState(null);
  const [stats, setStats] = useState({});

  const gameLoopRef = useRef(null);
  const initializedRef = useRef(false);

  // Helper functions for stats calculation
  const calculateDistance = useCallback((state) => {
    if (!state.snake?.body?.[0] || !state.cycleIndex || state.fruit === undefined) return 0;
    const headPos = state.cycleIndex.get(state.snake.body[0]);
    const fruitPos = state.cycleIndex.get(state.fruit);
    if (headPos === undefined || fruitPos === undefined) return 0;
    return (fruitPos - headPos + state.cycle.length) % state.cycle.length;
  }, []);

  const calculateTailDistance = useCallback((state) => {
    if (!state.snake?.body || state.snake.body.length < 2 || !state.cycleIndex) return 0;
    const headPos = state.cycleIndex.get(state.snake.body[0]);
    const tailPos = state.cycleIndex.get(state.snake.body[state.snake.body.length - 1]);
    if (headPos === undefined || tailPos === undefined) return 0;
    return (tailPos - headPos + state.cycle.length) % state.cycle.length;
  }, []);

  // Initialize game state ONCE when component mounts or settings change meaningfully
  useEffect(() => {
    if (initializedRef.current) {
      return; // Already initialized
    }
    
    console.log('Initializing game state...');
    seed(settings.seed);
    const newState = initializeGame(settings);
    setGameState(newState);
    
    // Reset stats
    const initialStats = {
      moves: 0,
      length: 1,
      score: 0,
      free: (newState.cycle?.length || 400) - 1,
      distHeadApple: calculateDistance(newState),
      distHeadTail: calculateTailDistance(newState),
      shortcut: false,
      efficiency: 0,
    };
    setStats(initialStats);
    
    initializedRef.current = true;
  }, [settings.rows, settings.cols, settings.seed, calculateDistance, calculateTailDistance]); // Only reinit on major setting changes

  // Initialize game loop when gameState becomes available
  useEffect(() => {
    if (!gameState) return;

    console.log('Setting up game loop...');
    
    // Stop existing loop
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
      gameLoopRef.current = null;
    }

    const loop = new GameLoop(
      gameState,
      newState => {
        setGameState(newState);
        
        // Update stats
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
        gameLoopRef.current = null;
      }
    };
  }, [gameState?.snake?.body?.length, calculateDistance, calculateTailDistance, settings]);

  // Update game loop speed when tick interval changes
  useEffect(() => {
    if (gameLoopRef.current && settings.tickMs !== undefined) {
      gameLoopRef.current.setTickInterval(settings.tickMs);
    }
  }, [settings.tickMs]);

  // Update settings
  const updateSettings = useCallback(newSettings => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      saveSettings(updatedSettings);
      
      // Check if we need to reinitialize the game
      const needsReinit = (
        updatedSettings.rows !== prevSettings.rows ||
        updatedSettings.cols !== prevSettings.cols ||
        updatedSettings.seed !== prevSettings.seed
      );
      
      if (needsReinit) {
        initializedRef.current = false;
      }
      
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
    console.log('Resetting game state...');
    seed(settings.seed);
    const newState = resetGame(settings);
    setGameState(newState);
    
    // Reset stats
    const resetStats = {
      moves: 0,
      length: 1,
      score: 0,
      free: (newState.cycle?.length || 400) - 1,
      distHeadApple: calculateDistance(newState),
      distHeadTail: calculateTailDistance(newState),
      shortcut: false,
      efficiency: 0,
    };
    setStats(resetStats);
  }, [settings, calculateDistance, calculateTailDistance]);

  const toggleGame = useCallback(() => {
    if (!gameState) return;
    
    if (gameState.status === 'playing') {
      pauseGame();
    } else if (gameState.status === 'paused') {
      startGame();
    } else {
      resetGameState();
    }
  }, [gameState?.status, startGame, pauseGame, resetGameState]);

  // Return current state
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