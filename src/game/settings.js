// FILE: src/game/settings.js
/**
 * Game settings management and persistence
 */

import { DEFAULT_CONFIG, STORAGE_KEYS } from '../utils/constants.js';
import { validateGameConfig } from '../utils/guards.js';

function sanitizeSettings(settings) {
  const merged = { ...DEFAULT_CONFIG, ...settings };
  const normalizedRows = Math.trunc(Number(merged.rows));
  const normalizedCols = Math.trunc(Number(merged.cols));
  const normalizedSeed = Math.trunc(Number(merged.seed));
  const normalizedSafetyBuffer =
    merged.safetyBuffer !== undefined ? Math.trunc(Number(merged.safetyBuffer)) : DEFAULT_CONFIG.safetyBuffer;

  const sanitized = {
    ...merged,
    rows: Number.isSafeInteger(normalizedRows) ? normalizedRows : DEFAULT_CONFIG.rows,
    cols: Number.isSafeInteger(normalizedCols) ? normalizedCols : DEFAULT_CONFIG.cols,
    seed: Number.isSafeInteger(normalizedSeed) ? normalizedSeed : DEFAULT_CONFIG.seed,
    safetyBuffer: Number.isSafeInteger(normalizedSafetyBuffer)
      ? Math.max(1, normalizedSafetyBuffer)
      : DEFAULT_CONFIG.safetyBuffer,
  };

  if (typeof merged.shortcutsEnabled !== 'boolean') {
    sanitized.shortcutsEnabled = DEFAULT_CONFIG.shortcutsEnabled;
  }

  if (typeof merged.pathfindingAlgorithm !== 'string') {
    sanitized.pathfindingAlgorithm = DEFAULT_CONFIG.pathfindingAlgorithm;
  }

  return sanitized;
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

  return { ...DEFAULT_CONFIG };
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
