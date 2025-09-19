// FILE: src/game/settings.js
/**
 * Game settings management and persistence
 */

import { DEFAULT_CONFIG, STORAGE_KEYS } from '../utils/constants.js';

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
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
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
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
    if (typeof settings.rows === 'number' && typeof settings.cols === 'number') {
      saveSettings(settings);
      return settings;
    }
  } catch (error) {
    console.warn('Failed to import settings:', error);
  }
  return null;
}
