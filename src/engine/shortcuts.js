// FILE: src/engine/shortcuts.js
/**
 * @deprecated This file is deprecated. Shortcut logic has been moved into
 * HamiltonianStrategy. This file is kept for backward compatibility only.
 * DO NOT import from this file in new code.
 */

import { HamiltonianStrategy } from './pathfinding/strategies/HamiltonianStrategy.js';
import { getHead } from './snake.js';

const legacyStrategy = new HamiltonianStrategy();

/**
 * Resolve runtime configuration using the legacy strategy instance.
 *
 * @param {Object} [config={}] - Legacy configuration overrides.
 * @returns {Object} Normalized configuration for shortcut helpers.
 */
function resolveLegacyConfig(config = {}) {
  return legacyStrategy.resolveRuntimeConfig(config);
}

/**
 * Retrieve a safe shortcut move if available.
 *
 * @param {Object} gameState - Current engine state.
 * @param {Object} [config={}] - Optional configuration overrides.
 * @returns {Object|null} Shortcut metadata or null when none available.
 */
export function findShortcut(gameState, config = {}) {
  const runtimeConfig = resolveLegacyConfig(config);
  return legacyStrategy.findShortcut(gameState, runtimeConfig);
}

/**
 * Validate that moving from one cell to another is a safe shortcut.
 *
 * @param {number} fromCell - Current head cell index.
 * @param {number} toCell - Candidate shortcut cell index.
 * @param {Object} gameState - Current engine state.
 * @param {Object} [config={}] - Optional configuration overrides.
 * @returns {Object} Validation metadata describing shortcut safety.
 */
export function validateShortcut(fromCell, toCell, gameState, config = {}) {
  const runtimeConfig = resolveLegacyConfig(config);
  return legacyStrategy.validateShortcut(fromCell, toCell, gameState, runtimeConfig);
}

/**
 * Plan the next move using Hamiltonian shortcuts when safe.
 *
 * @param {Object} gameState - Current engine state.
 * @param {Object} [config={}] - Optional configuration overrides.
 * @returns {Object} Planning result describing the next move.
 */
export function planPath(gameState, config = {}) {
  if (!gameState?.snake || gameState.snake.body?.length === 0) {
    return legacyStrategy.createPlanningResult(0, {
      reason: 'Invalid state',
      metadata: {
        shortcutInfo: null,
        cycleAvailable: Boolean(gameState?.cycle?.length),
      },
    });
  }

  const runtimeConfig = resolveLegacyConfig(config);
  const headCell = getHead(gameState.snake);

  if (runtimeConfig.shortcutsEnabled) {
    const shortcut = legacyStrategy.findShortcut(gameState, runtimeConfig);
    if (shortcut) {
      const validation = legacyStrategy.validateShortcut(
        headCell,
        shortcut.cell,
        gameState,
        runtimeConfig,
      );

      if (validation.valid) {
        return legacyStrategy.createPlanningResult(shortcut.cell, {
          isShortcut: true,
          reason: 'Taking safe shortcut',
          plannedPath: legacyStrategy.calculatePlannedPath(gameState, { nextMove: shortcut.cell }),
          metadata: {
            shortcutInfo: shortcut,
            safeWindow: shortcut.safeWindow,
          },
        });
      }
    }
  }

  return legacyStrategy.followCycle(gameState);
}
