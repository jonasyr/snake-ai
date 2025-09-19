// FILE: src/engine/pathfinding/PathfindingStrategy.js
/**
 * Base class defining the interface for all pathfinding strategies.
 *
 * Strategies encapsulate the logic required to determine the snake's next
 * move. Implementations may keep internal caches or precomputed data, but they
 * must avoid mutating the provided game state objects. All heavy computations
 * should be performed inside {@link planNextMove} so that the game engine can
 * execute them off the main thread when necessary.
 */
export class PathfindingStrategy {
  /**
   * Create a new strategy instance.
   *
   * @param {Object} [config={}] - Optional strategy configuration.
   */
  constructor(config = {}) {
    /** @type {Object} */
    this.config = { ...config };

    /** @type {string} */
    this.name = 'base';

    /** @type {boolean} */
    this.isExpensive = false;

    /** @type {boolean} */
    this.initialized = false;
  }

  /**
   * Initialize the strategy with the first observed game state.
   *
   * Subclasses may override this hook to warm caches or precompute data. The
   * default implementation simply records that initialization has occurred.
   *
   * @param {Object} initialState - Raw engine game state.
   * @returns {Promise<void>} Resolves when initialization completes.
   */
  async initialize(initialState) { // eslint-disable-line no-unused-vars
    this.initialized = true;
  }

  /**
   * Determine the next move for the provided game state.
   *
   * Subclasses must override this method. Implementations should return an
   * object describing the next cell to occupy as well as any metadata that the
   * engine may surface for debugging.
   *
   * @param {import('./GameStateAdapter.js').StandardGameState} state -
   *   Normalized state adapter wrapping the engine state.
   * @param {Object} [options={}] - Optional strategy specific overrides.
   * @returns {Promise<Object>} Planning result with `nextMove` and metadata.
   */
  async planNextMove(state, options = {}) { // eslint-disable-line no-unused-vars
    const strategyName = this.constructor?.name ?? 'PathfindingStrategy';
    throw new Error(`${strategyName}.planNextMove must be implemented by subclasses`);
  }

  /**
   * Retrieve debug information describing the strategy.
   *
   * @returns {Object} Debug payload safe for logging or inspection.
   */
  getDebugInfo() {
    return {
      algorithm: this.name,
      config: { ...this.config },
      initialized: this.initialized,
    };
  }

  /**
   * Serialize the strategy configuration for worker execution.
   *
   * Strategies running inside workers need enough information to recreate the
   * algorithm instance. The default implementation only returns the strategy
   * name and configuration.
   *
   * @returns {Object} Serializable snapshot of strategy configuration.
   */
  serialize() {
    return {
      name: this.name,
      config: { ...this.config },
    };
  }

  /**
   * Dispose of any resources held by the strategy.
   *
   * Subclasses should override this method if they allocate resources that
   * require manual cleanup (for example WebGL or machine learning models).
   *
   * @returns {Promise<void>} Resolves once cleanup is finished.
   */
  async dispose() {
    this.initialized = false;
  }
}
