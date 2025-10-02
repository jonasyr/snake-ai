import { useCallback, useEffect, useRef, useState } from 'react';
import { initializeGame } from '../../engine/gameEngine.js';
import { GameLoop } from '../../game/gameLoop.js';
import { loadSettings, saveSettings, updateHighScore, exportSettings, importSettings, clearAllData } from '../../game/settings.js';
import { seed } from '../../engine/rng.js';
import { GAME_STATUS } from '../../engine/types.js';
import { DEFAULT_CONFIG } from '../../utils/constants.js';
import { validateGameConfig } from '../../utils/guards.js';
import { cyclicDistance } from '../../utils/math.js';

/**
 * Safely load persisted settings from storage, falling back to defaults when
 * serialization errors or restricted environments (such as SSR) prevent
 * access.
 *
 * @returns {typeof DEFAULT_CONFIG} Stored or default configuration.
 */
function safeLoadSettings() {
  try {
    return loadSettings();
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Create a game state from provided settings with validation and fallbacks.
 * @param {Object} settings - Game settings to use when creating the state
 * @returns {Object} Initialized game state
 */
function createGameStateFromSettings(settings) {
  const mergedSettings = { ...DEFAULT_CONFIG, ...settings };
  const validation = validateGameConfig(mergedSettings);

  if (!validation.valid) {
    console.warn('Falling back to default configuration due to invalid settings.', {
      errors: validation.errors,
      settings: mergedSettings,
    });
    seed(DEFAULT_CONFIG.seed);
    return initializeGame(DEFAULT_CONFIG);
  }

  try {
    seed(mergedSettings.seed ?? DEFAULT_CONFIG.seed);
    return initializeGame(mergedSettings);
  } catch (error) {
    console.error('Failed to initialize game state with provided settings. Using defaults.', error, {
      settings: mergedSettings,
      validationErrors: validation.errors,
    });
    seed(DEFAULT_CONFIG.seed);
    return initializeGame(DEFAULT_CONFIG);
  }
}

/**
 * Derive user-friendly statistics from a raw engine state. The returned values
 * power analytics panels without leaking internal engine data structures into
 * the UI layer.
 *
 * @param {import('../../engine/gameEngine.js').GameState} state - Current engine state.
 * @returns {{moves:number,length:number,score:number,free:number,distHeadApple:number,distHeadTail:number,shortcut:boolean,efficiency:number}} Aggregated statistics.
 */
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

/**
 * Primary React hook that owns the lifecycle of the game engine, exposes
 * memoized callbacks for UI interaction, and synchronizes settings persistence.
 * The hook encapsulates the imperative {@link GameLoop} class while presenting
 * a declarative interface tailored for components.
 *
 * @returns {{
 *   gameState: object,
 *   stats: object,
 *   settings: object,
 *   updateSettings: Function,
 *   startGame: Function,
 *   pauseGame: Function,
 *   stepGame: Function,
 *   resetGameState: Function,
 *   toggleGame: Function,
 * }} Game control API consumed by the UI layer.
 */
export function useGameState() {
  const initialSettingsRef = useRef(safeLoadSettings());
  const settingsRef = useRef(initialSettingsRef.current);
  const gameLoopRef = useRef(null);
  const initialStateRef = useRef(null);

  const [settings, setSettings] = useState(initialSettingsRef.current);
  const [gameState, setGameState] = useState(() => {
    const initialState = createGameStateFromSettings(initialSettingsRef.current);
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

  const handleLoopError = useCallback((error, context) => {
    console.error('Game loop encountered an error. Pausing gameplay.', context, error);
    setGameState(prevState => {
      if (!prevState) {
        return prevState;
      }
      return { ...prevState, status: GAME_STATUS.PAUSED };
    });
  }, []);

  useEffect(() => {
    const loop = new GameLoop(initialStateRef.current, handleStateUpdate, settingsRef.current, {
      onError: handleLoopError,
    });
    gameLoopRef.current = loop;

    return () => {
      loop.stop();
      gameLoopRef.current = null;
    };
  }, [handleStateUpdate, handleLoopError]);

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
    const freshState = createGameStateFromSettings(currentSettings);
    applyNewState(freshState);
  }, [applyNewState]);

  const updateSettings = useCallback(updates => {
    setSettings(prevSettings => {
      const merged = { ...prevSettings, ...updates };
      saveSettings(merged);

      const requiresReinit =
        merged.rows !== prevSettings.rows ||
        merged.cols !== prevSettings.cols ||
        merged.seed !== prevSettings.seed ||
        merged.pathfindingAlgorithm !== prevSettings.pathfindingAlgorithm;

      if (requiresReinit) {
        const freshState = createGameStateFromSettings(merged);
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

  const handleExportSettings = useCallback(() => {
    try {
      const settingsData = exportSettings();
      const blob = new Blob([settingsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'snake-ai-settings.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  }, []);

  const handleImportSettings = useCallback((jsonString) => {
    try {
      const imported = importSettings(jsonString);
      if (imported) {
        setSettings(imported);
        const freshState = createGameStateFromSettings(imported);
        applyNewState(freshState);
        return imported;
      }
      return null;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return null;
    }
  }, [applyNewState]);

  const handleClearData = useCallback(() => {
    try {
      clearAllData();
      const defaultSettings = { ...DEFAULT_CONFIG };
      setSettings(defaultSettings);
      const freshState = createGameStateFromSettings(defaultSettings);
      applyNewState(freshState);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, [applyNewState]);

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
    exportSettings: handleExportSettings,
    importSettings: handleImportSettings,
    clearData: handleClearData,
  };
}
