// FILE: src/engine/pathfinding/index.js
/**
 * Public entry point for pathfinding utilities.
 */

import { createAlgorithmManager, ALGORITHMS } from './algorithmRegistry.js';

export { PathfindingStrategy } from './PathfindingStrategy.js';
export { PathfindingManager } from './PathfindingManager.js';
export { StandardGameState } from './GameStateAdapter.js';
export { HamiltonianStrategy } from './strategies/HamiltonianStrategy.js';
export { WorkerPool } from './WorkerPool.js';
export { ALGORITHMS } from './algorithmRegistry.js';

let singletonManager = null;

function getOrCreateManager() {
  if (!singletonManager) {
    singletonManager = createAlgorithmManager({ workerPoolSize: 2 });
  }
  return singletonManager;
}

/**
 * Retrieve the shared pathfinding manager instance.
 *
 * @returns {import('./PathfindingManager.js').PathfindingManager}
 */
export function getPathfindingManager() {
  return getOrCreateManager();
}

/**
 * Ensure the manager is configured with the desired strategy.
 *
 * @param {Object} initialState - Game state used for initialization.
 * @param {Object} [options] - Strategy options.
 * @param {string} [options.algorithm] - Algorithm identifier.
 * @param {Object} [options.config] - Strategy specific overrides.
 * @param {boolean} [options.forceInitialize=false] - Force strategy reinitialization.
 * @returns {Promise<import('./PathfindingManager.js').PathfindingManager>} Configured manager.
 */
export async function ensurePathfindingStrategy(initialState, options = {}) {
  const manager = getOrCreateManager();
  const algorithm = options.algorithm || ALGORITHMS.HAMILTONIAN;
  const { name, strategy } = manager.getActiveStrategy();

  if (!strategy || name !== algorithm) {
    await manager.setStrategy(algorithm, options.config ?? {}, initialState);
  } else if (initialState && (options.forceInitialize || !strategy.initialized)) {
    await manager.initializeStrategy(initialState);
  }

  return manager;
}

/**
 * Reset and dispose of the shared manager. Primarily used by tests.
 *
 * @returns {Promise<void>} Resolves when cleanup finishes.
 */
export async function resetPathfindingManager() {
  if (singletonManager) {
    await singletonManager.dispose();
    singletonManager = null;
  }
}
