// FILE: src/engine/pathfinding/algorithmRegistry.js
/**
 * Registry utilities for available pathfinding algorithms.
 */

import { PathfindingManager } from './PathfindingManager.js';
import { HamiltonianStrategy } from './strategies/HamiltonianStrategy.js';
import { AStarStrategy } from './strategies/AStarStrategy.js';

export const ALGORITHMS = {
  HAMILTONIAN: 'hamiltonian',
  HAMILTONIAN_SHORTCUTS: 'hamiltonian-shortcuts',
  ASTAR: 'astar',
  DIJKSTRA: 'dijkstra',
  BFS: 'bfs',
  GREEDY: 'greedy',
  REINFORCEMENT_LEARNING: 'reinforcement-learning',
};

export const ALGORITHM_INFO = {
  [ALGORITHMS.HAMILTONIAN]: {
    name: 'Hamiltonian Cycle',
    description: 'Follows a pre-computed path that visits every cell',
    pros: ['Guaranteed to never lose', 'Simple and deterministic'],
    cons: ['Very slow', 'Inefficient'],
    requiresCycle: true,
    configOptions: [],
  },
  [ALGORITHMS.HAMILTONIAN_SHORTCUTS]: {
    name: 'Hamiltonian + Shortcuts',
    description: 'Hamiltonian cycle with intelligent shortcuts',
    pros: ['Safe like Hamiltonian', 'Much faster with shortcuts'],
    cons: ['Still somewhat conservative'],
    requiresCycle: true,
    configOptions: ['safetyBuffer', 'lateGameLock', 'minShortcutWindow'],
  },
  [ALGORITHMS.ASTAR]: {
    name: 'A* Pathfinding',
    description: 'Finds optimal path to fruit using A* search',
    pros: ['Fast and efficient', 'Always finds shortest path'],
    cons: ['Can trap itself', 'No long-term planning'],
    requiresCycle: false,
    configOptions: [],
  },
  [ALGORITHMS.BFS]: {
    name: 'Breadth-First Search',
    description: 'Explores all paths equally until finding fruit',
    pros: ['Finds shortest path', 'Simple algorithm'],
    cons: ['Slower than A*', 'No heuristic guidance'],
    requiresCycle: false,
    configOptions: [],
  },
  [ALGORITHMS.GREEDY]: {
    name: 'Greedy Best-First',
    description: 'Always moves toward fruit using Manhattan distance',
    pros: ['Very fast', 'Simple to understand'],
    cons: ['Often traps itself', 'No path validation'],
    requiresCycle: false,
    configOptions: [],
  },
};

/**
 * Create a manager pre-populated with all strategies.
 *
 * @param {Object} [options] - Manager configuration.
 * @returns {PathfindingManager} Configured manager instance.
 */
export function createAlgorithmManager(options) {
  const manager = new PathfindingManager(options);

  manager.registerStrategy(ALGORITHMS.HAMILTONIAN, HamiltonianStrategy);
  manager.registerStrategy(ALGORITHMS.HAMILTONIAN_SHORTCUTS, HamiltonianStrategy);
  manager.registerStrategy(ALGORITHMS.ASTAR, AStarStrategy);
  // manager.registerStrategy(ALGORITHMS.DIJKSTRA, DijkstraStrategy);
  // manager.registerStrategy(ALGORITHMS.BFS, BFSStrategy);
  // manager.registerStrategy(ALGORITHMS.GREEDY, GreedyStrategy);

  return manager;
}

/**
 * Retrieve default configuration overrides for a given algorithm.
 *
 * @param {string} algorithm - Algorithm identifier.
 * @returns {Object} Default configuration overrides.
 */
export function getAlgorithmDefaultConfig(algorithm) {
  switch (algorithm) {
    case ALGORITHMS.HAMILTONIAN:
      return { shortcutsEnabled: false };

    case ALGORITHMS.HAMILTONIAN_SHORTCUTS:
      return {
        shortcutsEnabled: true,
        safetyBuffer: 2,
        lateGameLock: 0,
        minShortcutWindow: 5,
      };

    case ALGORITHMS.ASTAR:
      return { allowDiagonals: false };

    default:
      return {};
  }
}
