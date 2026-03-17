// FILE: src/engine/pathfinding/algorithmRegistry.js
/**
 * Registry utilities for available pathfinding algorithms.
 *
 * ALGORITHM_REGISTRY is the single source of truth. It combines strategy class,
 * default config, and UI metadata in one place. The legacy exports
 * ALGORITHM_INFO and getAlgorithmDefaultConfig are derived from it.
 */

import { PathfindingManager } from './PathfindingManager.js';
import { HamiltonianStrategy } from './strategies/HamiltonianStrategy.js';
import { AStarStrategy } from './strategies/AStarStrategy.js';
import { BFSStrategy } from './strategies/BFSStrategy.js';
import { DijkstraStrategy } from './strategies/DijkstraStrategy.js';
import { GreedyStrategy } from './strategies/GreedyStrategy.js';

export const ALGORITHMS = {
  HAMILTONIAN: 'hamiltonian',
  HAMILTONIAN_SHORTCUTS: 'hamiltonian-shortcuts',
  ASTAR: 'astar',
  DIJKSTRA: 'dijkstra',
  BFS: 'bfs',
  GREEDY: 'greedy',
  REINFORCEMENT_LEARNING: 'reinforcement-learning',
};

/**
 * Single source of truth for all algorithm metadata, defaults, and strategy classes.
 *
 * @type {Record<string, {
 *   strategyClass: Function|null,
 *   defaultConfig: Record<string, *>,
 *   name: string,
 *   description: string,
 *   pros: string[],
 *   cons: string[],
 *   requiresCycle: boolean,
 *   configOptions: string[],
 * }>}
 */
export const ALGORITHM_REGISTRY = Object.freeze({
  [ALGORITHMS.HAMILTONIAN]: {
    strategyClass: HamiltonianStrategy,
    defaultConfig: Object.freeze({ shortcutsEnabled: false }),
    name: 'Hamiltonian Cycle',
    description: 'Follows a pre-computed path that visits every cell',
    pros: ['Guaranteed to never lose', 'Simple and deterministic'],
    cons: ['Very slow', 'Inefficient'],
    requiresCycle: true,
    configOptions: [],
    completionRate: 100,
    speed: 'Slow',
    difficulty: 'Easy',
  },
  [ALGORITHMS.HAMILTONIAN_SHORTCUTS]: {
    strategyClass: HamiltonianStrategy,
    defaultConfig: Object.freeze({
      shortcutsEnabled: true,
      safetyBuffer: 2,
      lateGameLock: 0,
      minShortcutWindow: 5,
    }),
    name: 'Hamiltonian + Shortcuts',
    description: 'Hamiltonian cycle with intelligent shortcuts',
    pros: ['Safe like Hamiltonian', 'Much faster with shortcuts'],
    cons: ['Still somewhat conservative'],
    requiresCycle: true,
    configOptions: ['safetyBuffer', 'lateGameLock', 'minShortcutWindow'],
    completionRate: 100,
    speed: 'Medium',
    difficulty: 'Easy',
  },
  [ALGORITHMS.ASTAR]: {
    strategyClass: AStarStrategy,
    defaultConfig: Object.freeze({ allowDiagonals: false }),
    name: 'A* Pathfinding',
    description: 'Finds optimal path to fruit using A* search',
    pros: ['Fast and efficient', 'Always finds shortest path'],
    cons: ['Can trap itself', 'No long-term planning'],
    requiresCycle: false,
    configOptions: [],
    completionRate: 60,
    speed: 'Fast',
    difficulty: 'Medium',
  },
  [ALGORITHMS.DIJKSTRA]: {
    strategyClass: DijkstraStrategy,
    defaultConfig: Object.freeze({}),
    name: "Dijkstra's Algorithm",
    description:
      'Uniform-cost search that finds the shortest path without a heuristic',
    pros: [
      'Optimal shortest path',
      'Complete — always finds a path if one exists',
    ],
    cons: ['Slower than A* on open grids', 'No directional bias'],
    requiresCycle: false,
    configOptions: [],
    completionRate: 55,
    speed: 'Medium',
    difficulty: 'Medium',
  },
  [ALGORITHMS.BFS]: {
    strategyClass: BFSStrategy,
    defaultConfig: Object.freeze({}),
    name: 'Breadth-First Search',
    description: 'Explores all paths equally until finding fruit',
    pros: ['Finds shortest path', 'Simple algorithm'],
    cons: ['Slower than A*', 'No heuristic guidance'],
    requiresCycle: false,
    configOptions: [],
    completionRate: 55,
    speed: 'Medium',
    difficulty: 'Medium',
  },
  [ALGORITHMS.GREEDY]: {
    strategyClass: GreedyStrategy,
    defaultConfig: Object.freeze({}),
    name: 'Greedy Best-First',
    description: 'Always moves toward fruit using Manhattan distance',
    pros: ['Very fast', 'Simple to understand'],
    cons: ['Often traps itself', 'No path validation'],
    requiresCycle: false,
    configOptions: [],
    completionRate: 20,
    speed: 'Very Fast',
    difficulty: 'Hard',
  },
  [ALGORITHMS.REINFORCEMENT_LEARNING]: {
    strategyClass: null,
    defaultConfig: Object.freeze({}),
    name: 'Reinforcement Learning',
    description: 'Neural network agent that learns by playing',
    pros: ['Can discover novel strategies', 'Improves over time'],
    cons: ['Requires training', 'Not yet implemented'],
    requiresCycle: false,
    configOptions: [],
    completionRate: null,
    speed: null,
    difficulty: null,
  },
});

/**
 * Create a manager pre-populated with all available strategies.
 *
 * @param {Object} [options] - Manager configuration.
 * @returns {PathfindingManager} Configured manager instance.
 */
export function createAlgorithmManager(options) {
  const manager = new PathfindingManager(options);

  for (const [algorithm, entry] of Object.entries(ALGORITHM_REGISTRY)) {
    if (entry.strategyClass != null) {
      manager.registerStrategy(algorithm, entry.strategyClass);
    }
  }

  return manager;
}

/**
 * Retrieve default configuration overrides for a given algorithm.
 *
 * @param {string} algorithm - Algorithm identifier.
 * @returns {Object} Default configuration overrides.
 */
export function getAlgorithmDefaultConfig(algorithm) {
  const entry = ALGORITHM_REGISTRY[algorithm];
  if (!entry) {
    return {};
  }
  return { ...entry.defaultConfig };
}
