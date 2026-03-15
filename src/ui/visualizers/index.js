// FILE: src/ui/visualizers/index.js
/**
 * Maps algorithm identifiers to their visualizer instances.
 * Kept separate from the engine registry to avoid cross-layer imports.
 */

import { ALGORITHMS } from '../../engine/pathfinding/algorithmRegistry.js';
import { HamiltonianVisualizer } from './HamiltonianVisualizer.js';
import { GraphVisualizer } from './GraphVisualizer.js';
import { BaseVisualizer } from './BaseVisualizer.js';

const hamiltonianViz = new HamiltonianVisualizer();
const graphViz = new GraphVisualizer();
const fallbackViz = new BaseVisualizer();

/** @type {Record<string, import('./BaseVisualizer.js').BaseVisualizer>} */
const VISUALIZER_MAP = {
  [ALGORITHMS.HAMILTONIAN]: hamiltonianViz,
  [ALGORITHMS.HAMILTONIAN_SHORTCUTS]: hamiltonianViz,
  [ALGORITHMS.ASTAR]: graphViz,
  [ALGORITHMS.DIJKSTRA]: graphViz,
  [ALGORITHMS.BFS]: graphViz,
  [ALGORITHMS.GREEDY]: graphViz,
  [ALGORITHMS.REINFORCEMENT_LEARNING]: graphViz,
};

/**
 * Return the visualizer for the given algorithm identifier.
 *
 * @param {string} algorithm - Algorithm identifier from ALGORITHMS enum.
 * @returns {import('./BaseVisualizer.js').BaseVisualizer} Visualizer instance.
 */
export function getVisualizer(algorithm) {
  return VISUALIZER_MAP[algorithm] ?? fallbackViz;
}

export { HamiltonianVisualizer, GraphVisualizer, BaseVisualizer };
