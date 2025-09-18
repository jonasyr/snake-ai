import { useCallback, useEffect, useRef, useState } from 'react';
import { initializeGame } from '../../engine/gameEngine.js';
import { GameLoop } from '../../game/gameLoop.js';
import { loadSettings, saveSettings, updateHighScore } from '../../game/settings.js';
import { seed } from '../../engine/rng.js';
import { GAME_STATUS } from '../../engine/types.js';
import { DEFAULT_CONFIG } from '../../utils/constants.js';
import { cyclicDistance } from '../../utils/math.js';

function safeLoadSettings() {
  try {
    return loadSettings();
  } catch (error) {
    return { ...DEFAULT_CONFIG };
  }
}

function computeStats(state) {
  if (!state) {
    return {
      moves: 0,
      length: 0,
      score: 0,
      free: 0,
      distHeadApple: 0,
      distHeadTail: 0,
      shortcut: false,
      efficiency: 0,
    };
  }

  const { cycle, cycleIndex, snake, fruit, moves = 0, score = 0, lastMoveWasShortcut } = state;
  const cycleLength = cycle?.length ?? 0;
  const body = snake?.body ?? [];
  const head = body[0];
  const tail = body[body.length - 1];

  let distHeadApple = 0;
  let distHeadTail = 0;

  if (cycle && cycleIndex instanceof Map && head !== undefined) {
    const headPos = cycleIndex.get(head);

    if (headPos !== undefined) {
      if (fruit !== undefined && fruit >= 0) {
        const fruitPos = cycleIndex.get(fruit);
        if (fruitPos !== undefined) {
          distHeadApple = cyclicDistance(headPos, fruitPos, cycleLength);
        }
      }

      if (tail !== undefined) {
        const tailPos = cycleIndex.get(tail);
        if (tailPos !== undefined) {
          distHeadTail = cyclicDistance(headPos, tailPos, cycleLength);
        }
      }
    }
  }

  return {
    moves,
    length: body.length,
    score,
    free: Math.max(cycleLength - body.length, 0),
    distHeadApple,
    distHeadTail,
    shortcut: Boolean(lastMoveWasShortcut),
    efficiency: moves > 0 ? Math.round((score / moves) * 100) : 0,
  };
}

export function useGameState() {
  const initialSettingsRef = useRef(safeLoadSettings());
  const settingsRef = useRef(initialSettingsRef.current);
  const gameLoopRef = useRef(null);
  const initialStateRef = useRef(null);

  const [settings, setSettings] = useState(initialSettingsRef.current);
  const [gameState, setGameState] = useState(() => {
    seed(initialSettingsRef.current.seed ?? DEFAULT_CONFIG.seed);
    const initialState = initializeGame(initialSettingsRef.current);
    initialStateRef.current = initialState;
    return initialState;
  });
  const [stats, setStats] = useState(() => computeStats(initialStateRef.current));

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const handleStateUpdate = useCallback(nextState => {
    setGameState(nextState);
    setStats(computeStats(nextState));

    if (
      nextState.status === GAME_STATUS.GAME_OVER ||
      nextState.status === GAME_STATUS.COMPLETE
    ) {
      updateHighScore(nextState.score ?? 0);
    }
  }, []);

  useEffect(() => {
    const loop = new GameLoop(initialStateRef.current, handleStateUpdate, settingsRef.current);
    gameLoopRef.current = loop;

    return () => {
      loop.stop();
      gameLoopRef.current = null;
    };
  }, [handleStateUpdate]);

  const applyNewState = useCallback(newState => {
    setGameState(newState);
    setStats(computeStats(newState));

    if (gameLoopRef.current) {
      gameLoopRef.current.reset(newState);
      if (typeof newState.config?.tickMs === 'number') {
        gameLoopRef.current.setTickInterval(newState.config.tickMs);
      }
    }
  }, []);

  const resetGameState = useCallback(() => {
    const currentSettings = settingsRef.current;
    seed(currentSettings.seed ?? DEFAULT_CONFIG.seed);
    const freshState = initializeGame(currentSettings);
    applyNewState(freshState);
  }, [applyNewState]);

  const updateSettings = useCallback(updates => {
    setSettings(prevSettings => {
      const merged = { ...prevSettings, ...updates };
      saveSettings(merged);

      const requiresReinit =
        merged.rows !== prevSettings.rows ||
        merged.cols !== prevSettings.cols ||
        merged.seed !== prevSettings.seed;

      if (requiresReinit) {
        seed(merged.seed ?? DEFAULT_CONFIG.seed);
        const freshState = initializeGame(merged);
        applyNewState(freshState);
      } else {
        setGameState(prevState => {
          if (!prevState) return prevState;
          return {
            ...prevState,
            config: { ...prevState.config, ...updates },
          };
        });

        if (gameLoopRef.current && typeof updates.tickMs === 'number') {
          gameLoopRef.current.setTickInterval(merged.tickMs);
        }
      }

      return merged;
    });
  }, [applyNewState]);

  const startGame = useCallback(() => {
    gameLoopRef.current?.start();
  }, []);

  const pauseGame = useCallback(() => {
    gameLoopRef.current?.pause();
  }, []);

  const stepGame = useCallback(() => {
    gameLoopRef.current?.step();
  }, []);

  const toggleGame = useCallback(() => {
    if (!gameState) return;

    if (gameState.status === GAME_STATUS.PLAYING) {
      pauseGame();
    } else if (gameState.status === GAME_STATUS.PAUSED) {
      startGame();
    } else {
      resetGameState();
    }
  }, [gameState, pauseGame, startGame, resetGameState]);

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
