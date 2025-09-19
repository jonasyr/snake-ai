// FILE: src/engine/pathfinding/algorithmRegistry.js
/**
 * Registry for available pathfinding algorithms.
 */

import { PathfindingManager } from './PathfindingManager.js';
import { HamiltonianStrategy } from './strategies/HamiltonianStrategy.js';

export const ALGORITHMS = {
  HAMILTONIAN: 'hamiltonian',
  ASTAR: 'astar',
  DIJKSTRA: 'dijkstra',
  REINFORCEMENT_LEARNING: 'reinforcement_learning',
};

/**
 * Create a manager pre-populated with built-in strategies.
 *
 * @param {Object} [options] - Manager configuration.
 * @returns {PathfindingManager} Configured manager instance.
 */
export function createAlgorithmManager(options) {
  const manager = new PathfindingManager(options);
  manager.registerStrategy(ALGORITHMS.HAMILTONIAN, HamiltonianStrategy);
  return manager;
}
