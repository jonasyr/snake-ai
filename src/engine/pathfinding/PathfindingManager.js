// FILE: src/engine/pathfinding/PathfindingManager.js
/**
 * Central manager that coordinates pathfinding strategies.
 */

import { StandardGameState } from './GameStateAdapter.js';
import { WorkerPool } from './WorkerPool.js';

/**
 * @typedef {import('./PathfindingStrategy.js').PathfindingStrategy} PathfindingStrategy
 */

export class PathfindingManager {
  /**
   * @param {Object} [options] - Manager configuration.
   * @param {number} [options.workerPoolSize=1] - Maximum concurrent worker tasks.
   */
  constructor(options = {}) {
    const { workerPoolSize = 1 } = options;

    /** @type {Map<string, new (...args: any[]) => PathfindingStrategy>} */
    this.strategies = new Map();

    /** @type {PathfindingStrategy|null} */
    this.currentStrategy = null;

    /** @type {string|null} */
    this.currentStrategyName = null;

    /** @type {WorkerPool} */
    this.workerPool = new WorkerPool(workerPoolSize);
  }

  /**
   * Register a strategy class for later use.
   *
   * @param {string} name - Unique identifier for the strategy.
   * @param {new (...args: any[]) => PathfindingStrategy} StrategyClass - Class implementing the strategy.
   */
  registerStrategy(name, StrategyClass) {
    if (!name || typeof name !== 'string') {
      throw new Error('Strategy name must be a non-empty string');
    }
    if (typeof StrategyClass !== 'function') {
      throw new Error('StrategyClass must be a constructor function');
    }

    this.strategies.set(name, StrategyClass);
  }

  /**
   * Switch the current strategy implementation.
   *
   * @param {string} name - Registered strategy name.
   * @param {Object} [config={}] - Strategy specific configuration.
   * @param {Object} [initialState] - Optional initial game state for eager initialization.
   * @returns {Promise<PathfindingStrategy>} The instantiated strategy.
   */
  async setStrategy(name, config = {}, initialState) {
    const StrategyClass = this.strategies.get(name);
    if (!StrategyClass) {
      throw new Error(`Unknown pathfinding strategy: ${name}`);
    }

    if (this.currentStrategy) {
      await this.currentStrategy.dispose();
    }

    const strategy = new StrategyClass(config);
    this.currentStrategy = strategy;
    this.currentStrategyName = name;

    if (initialState) {
      await strategy.initialize(initialState);
    }

    return strategy;
  }

  /**
   * Initialize the active strategy with a fresh game state.
   *
   * @param {Object} initialState - Engine state to prime the strategy.
   * @returns {Promise<void>} Resolves when initialization finishes.
   */
  async initializeStrategy(initialState) {
    if (!this.currentStrategy) {
      return;
    }

    await this.currentStrategy.initialize(initialState);
  }

  /**
   * Plan the next move using the active strategy.
   *
   * @param {Object} gameState - Current engine state.
   * @param {Object} [options={}] - Optional overrides for the strategy.
   * @returns {Promise<Object>} Result describing the next move.
   */
  async planMove(gameState, options = {}) {
    if (!this.currentStrategy) {
      throw new Error('No pathfinding strategy selected');
    }

    const standardState = new StandardGameState(gameState);
    const execute = () => this.currentStrategy.planNextMove(standardState, options);

    if (this.currentStrategy.isExpensive && this.workerPool.hasCapacity() && options.useWorker !== false) {
      return this.workerPool.execute(execute);
    }

    return execute();
  }

  /**
   * Retrieve metadata about the currently active strategy.
   *
   * @returns {{ name: string|null, strategy: PathfindingStrategy|null }}
   */
  getActiveStrategy() {
    return {
      name: this.currentStrategyName,
      strategy: this.currentStrategy,
    };
  }

  /**
   * Dispose the active strategy and clear registrations.
   *
   * @returns {Promise<void>} Resolves once cleanup completes.
   */
  async dispose() {
    if (this.currentStrategy) {
      await this.currentStrategy.dispose();
    }

    this.currentStrategy = null;
    this.currentStrategyName = null;
    this.workerPool.drain();
  }
}
