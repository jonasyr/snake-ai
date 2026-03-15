// FILE: src/engine/pathfinding/worker/PathfindingWorker.js
/**
 * Dedicated worker runtime for executing pathfinding strategies off the main thread.
 */

import { StandardGameState } from '../GameStateAdapter.js';
import { HamiltonianStrategy } from '../strategies/HamiltonianStrategy.js';
import { AStarStrategy } from '../strategies/AStarStrategy.js';
import { BFSStrategy } from '../strategies/BFSStrategy.js';

/**
 * Mapping of strategy identifiers to their concrete implementations.
 *
 * @type {Record<string, new (...args: any[]) => import('../PathfindingStrategy.js').PathfindingStrategy>}
 */
const STRATEGY_REGISTRY = {
  hamiltonian: HamiltonianStrategy,
  'hamiltonian-shortcuts': HamiltonianStrategy,
  astar: AStarStrategy,
  bfs: BFSStrategy,
};

/**
 * Execute a pathfinding plan request inside the worker.
 *
 * @param {Object} payload - Worker payload describing the plan request.
 * @param {{ key: string, config?: Object }} payload.strategy - Strategy metadata.
 * @param {Object} payload.gameState - Raw engine game state object.
 * @param {Object} [payload.options] - Optional strategy specific overrides.
 * @param {Object} [payload.initialState] - Optional initialization state for the strategy.
 * @returns {Promise<Object>} Planning result returned by the strategy.
 */
async function executePlan(payload) {
  const { strategy, gameState, options = {}, initialState } = payload ?? {};

  if (!strategy || typeof strategy.key !== 'string') {
    throw new Error('Worker payload is missing a strategy descriptor');
  }

  const StrategyClass = STRATEGY_REGISTRY[strategy.key];
  if (!StrategyClass) {
    throw new Error(`Unknown strategy requested for worker execution: ${strategy.key}`);
  }

  const instance = new StrategyClass(strategy.config ?? {});

  if (typeof instance.initialize === 'function' && initialState) {
    await instance.initialize(initialState);
  }

  const standardState = new StandardGameState(gameState);
  return instance.planNextMove(standardState, options ?? {});
}

/**
 * Serialize an error for transfer back to the main thread.
 *
 * @param {any} error - Error thrown during worker execution.
 * @returns {{ message: string, stack?: string }} Plain error payload.
 */
function serializeError(error) {
  if (!error) {
    return { message: 'Unknown worker error' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  const { message = 'Unknown worker error' } = error;
  return { message };
}

self.addEventListener('message', async event => {
  const { id, type, payload } = event.data ?? {};

  if (typeof id !== 'number') {
    return;
  }

  try {
    switch (type) {
      case 'pathfinding.plan': {
        const result = await executePlan(payload);
        self.postMessage({ id, result, error: null });
        return;
      }
      default: {
        throw new Error(`Unknown worker task type: ${type}`);
      }
    }
  } catch (error) {
    self.postMessage({ id, result: null, error: serializeError(error) });
  }
});
