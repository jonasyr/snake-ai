// FILE: src/game/settings.js
/**
 * Game settings management and persistence
 */

import { DEFAULT_CONFIG, STORAGE_KEYS, createRuntimeConfig, getAlgorithmConfig } from '../utils/constants.js';
import { validateGameConfig } from '../utils/guards.js';

function sanitizeSettings(settings) {
  const provided = settings && typeof settings === 'object' ? settings : {};
  const requestedAlgorithm =
    typeof provided.pathfindingAlgorithm === 'string'
      ? provided.pathfindingAlgorithm
      : DEFAULT_CONFIG.pathfindingAlgorithm;

  const baseRuntime = createRuntimeConfig({ pathfindingAlgorithm: requestedAlgorithm });
  const algorithm = baseRuntime.pathfindingAlgorithm;
  const algorithmDefaults = getAlgorithmConfig(baseRuntime, algorithm);

  const sanitized = {
    ...baseRuntime,
    ...provided,
  };

  const normalizedRows = Math.trunc(Number(sanitized.rows));
  const normalizedCols = Math.trunc(Number(sanitized.cols));
  const normalizedSeed = Math.trunc(Number(sanitized.seed));

  sanitized.rows = Number.isSafeInteger(normalizedRows) ? normalizedRows : baseRuntime.rows;
  sanitized.cols = Number.isSafeInteger(normalizedCols) ? normalizedCols : baseRuntime.cols;
  sanitized.seed = Number.isSafeInteger(normalizedSeed) ? normalizedSeed : baseRuntime.seed;

  const enforceIntegerSetting = (key, minimum) => {
    if (sanitized[key] === undefined && algorithmDefaults[key] === undefined) {
      delete sanitized[key];
      return;
    }

    const normalized = Math.trunc(Number(sanitized[key]));
    if (Number.isSafeInteger(normalized)) {
      sanitized[key] = minimum !== undefined ? Math.max(minimum, normalized) : normalized;
      return;
    }

    if (Number.isSafeInteger(algorithmDefaults[key])) {
      const fallback = minimum !== undefined
        ? Math.max(minimum, Math.trunc(Number(algorithmDefaults[key])))
        : Math.trunc(Number(algorithmDefaults[key]));
      sanitized[key] = fallback;
      return;
    }

    delete sanitized[key];
  };

  enforceIntegerSetting('safetyBuffer', 1);
  enforceIntegerSetting('lateGameLock', 0);
  enforceIntegerSetting('minShortcutWindow', 1);

  const enforceBooleanSetting = (key) => {
    if (sanitized[key] === undefined && algorithmDefaults[key] === undefined) {
      delete sanitized[key];
      return;
    }

    if (typeof sanitized[key] === 'boolean') {
      return;
    }

    if (typeof algorithmDefaults[key] === 'boolean') {
      sanitized[key] = algorithmDefaults[key];
      return;
    }

    delete sanitized[key];
  };

  enforceBooleanSetting('shortcutsEnabled');
  enforceBooleanSetting('allowDiagonals');

  if (typeof sanitized.pathfindingAlgorithm !== 'string') {
    sanitized.pathfindingAlgorithm = baseRuntime.pathfindingAlgorithm;
  }

  return createRuntimeConfig(sanitized);
}

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = sanitizeSettings(parsed);
      const validation = validateGameConfig(merged);
      if (validation.valid) {
        return merged;
      }

      console.warn('Loaded settings failed validation:', validation.errors, parsed);
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }

  return createRuntimeConfig();
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings to save
 */
export function saveSettings(settings) {
  try {
    const sanitized = sanitizeSettings(settings);

    const validation = validateGameConfig(sanitized);
    if (!validation.valid) {
      console.warn('Attempted to save invalid settings:', validation.errors, settings);
      return;
    }

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

/**
 * Get high score from localStorage
 * @returns {number} High score
 */
export function getHighScore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to load high score:', error);
    return 0;
  }
}

/**
 * Update high score if new score is higher
 * @param {number} score - New score to check
 * @returns {boolean} Whether high score was updated
 */
export function updateHighScore(score) {
  const currentHigh = getHighScore();
  if (score > currentHigh) {
    try {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
      return true;
    } catch (error) {
      console.warn('Failed to save high score:', error);
    }
  }
  return false;
}

/**
 * Clear all saved data
 */
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear data:', error);
  }
}

/**
 * Export current settings for sharing/backup
 * @returns {string} JSON string of settings
 */
export function exportSettings() {
  const settings = loadSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON string
 * @param {string} jsonString - Settings JSON
 * @returns {Object} Imported settings or null if invalid
 */
export function importSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    // Validate required fields
    const sanitized = sanitizeSettings(settings);
    const validation = validateGameConfig(sanitized);
    if (validation.valid) {
      saveSettings(sanitized);
      return sanitized;
    }

    console.warn('Rejected imported settings due to validation errors:', validation.errors, settings);
  } catch (error) {
    console.warn('Failed to import settings:', error);
  }
  return null;
}
