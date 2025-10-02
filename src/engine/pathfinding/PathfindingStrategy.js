// FILE: src/engine/pathfinding/PathfindingStrategy.js

/**
 * @typedef {Object} PlanningResult
 * @property {number} nextMove - Flattened index of the cell to move into next.
 * @property {boolean} isShortcut - Indicates whether the move deviates from the default cycle.
 * @property {string} reason - Human readable explanation for the chosen move.
 * @property {number[]} plannedPath - Sequence of future cells for visualization (may be empty).
 * @property {Object|null} metadata - Algorithm specific data useful for debugging or analytics.
 */

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

    /** @type {boolean} */
    this.requiresCycle = false;
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
  // eslint-disable-next-line no-unused-vars
  async initialize(initialState) {
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
   * @returns {Promise<PlanningResult>} Planning result with the next move and metadata.
   */
  // eslint-disable-next-line no-unused-vars
  async planNextMove(state, options = {}) {
    const strategyName = this.constructor?.name ?? 'PathfindingStrategy';
    throw new Error(
      `${strategyName}.planNextMove must be implemented by subclasses`
    );
  }

  /**
   * Helper utility to create a normalized planning result payload.
   *
   * @param {number} nextMove - Flattened index of the chosen move.
   * @param {Object} [options={}] - Additional planning metadata.
   * @param {boolean} [options.isShortcut=false] - Whether the move is a shortcut.
   * @param {string} [options.reason='Move planned'] - Explanation describing the move.
   * @param {number[]} [options.plannedPath=[]] - Sequence of future cells.
   * @param {Object|null} [options.metadata=null] - Strategy specific debugging metadata.
   * @returns {PlanningResult} Standardized planning result payload.
   */
  createPlanningResult(nextMove, options = {}) {
    const {
      isShortcut = false,
      reason = 'Move planned',
      plannedPath = [],
      metadata = null,
    } = options ?? {};

    return {
      nextMove,
      isShortcut,
      reason,
      plannedPath,
      metadata,
    };
  }

  /**
   * Calculate the planned path for visualization.
   *
   * Subclasses may override this method to provide path data when
   * visualization is available.
   *
   * @param {Object} gameState - Raw engine game state.
   * @param {PlanningResult} planResult - Result returned from {@link planNextMove}.
   * @returns {number[]} Planned path for visualization.
   */
  // eslint-disable-next-line no-unused-vars
  calculatePlannedPath(gameState, planResult) {
    return [];
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
      requiresCycle: this.requiresCycle,
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

/**
 * Base class for graph-based pathfinding algorithms (A*, Dijkstra, BFS).
 */
export class GraphPathfindingStrategy extends PathfindingStrategy {
  /**
   * Create a graph-based strategy instance.
   *
   * @param {Object} [config={}] - Optional strategy configuration.
   */
  constructor(config = {}) {
    super(config);
    this.requiresCycle = false;
    this.isExpensive = true;
  }

  /**
   * Heuristic function for A* style algorithms.
   *
   * The default implementation returns the Manhattan distance between the two
   * cells which works well for 4-connected grids. Subclasses can override this
   * to provide domain specific heuristics.
   *
   * @param {number} from - Flattened index of the starting cell.
   * @param {number} to - Flattened index of the destination cell.
   * @param {import('./GameStateAdapter.js').StandardGameState} state -
   *   Normalized state for accessing board dimensions.
   * @returns {number} Estimated distance from `from` to `to`.
   */
  heuristic(from, to, state) {
    const { cols } = state.config;
    const fromRow = Math.floor(from / cols);
    const fromCol = from % cols;
    const toRow = Math.floor(to / cols);
    const toCol = to % cols;
    return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);
  }

  /**
   * Compute valid neighbor cells for a position.
   *
   * @param {number} cellIndex - Flattened index of the current cell.
   * @param {import('./GameStateAdapter.js').StandardGameState} state -
   *   Normalized state describing the board and snake.
   * @returns {number[]} Array of neighbor cell indices.
   */
  getNeighbors(cellIndex, state) {
    const { rows, cols } = state.config;
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const neighbors = [];
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        const neighborCell = newRow * cols + newCol;
        if (!state.original.snake.occupied.has(neighborCell)) {
          neighbors.push(neighborCell);
        }
      }
    }

    return neighbors;
  }

  /**
   * Reconstruct a path from a parent map.
   *
   * @param {Map<number, number>} cameFrom - Mapping of node to its parent.
   * @param {number} current - Index of the final node in the path.
   * @returns {number[]} Ordered list of nodes describing the path.
   */
  reconstructPath(cameFrom, current) {
    const path = [current];
    let node = current;
    while (cameFrom.has(node)) {
      node = cameFrom.get(node);
      path.unshift(node);
    }
    return path;
  }
}

/**
 * Base class for learning-based strategies (reinforcement learning, etc.).
 */
export class LearningStrategy extends PathfindingStrategy {
  /**
   * Create a learning strategy instance.
   *
   * @param {Object} [config={}] - Optional strategy configuration.
   */
  constructor(config = {}) {
    super(config);
    this.requiresCycle = false;
    this.isExpensive = true;
    this.model = null;
    this.trainingData = [];
  }

  /**
   * Initialize the strategy and attempt to load any persisted models.
   *
   * @param {Object} initialState - Raw engine game state.
   * @returns {Promise<void>} Resolves when initialization completes.
   */
  async initialize(initialState) {
    await super.initialize(initialState);
    await this.loadModel();
  }

  /**
   * Load a previously trained model.
   *
   * Subclasses should override this method when they need to hydrate a
   * persisted model from storage or network resources.
   *
   * @returns {Promise<void>} Resolves when the model has been loaded.
   */
  async loadModel() {
    // To be implemented by subclasses when necessary.
  }

  /**
   * Persist the current model.
   *
   * Subclasses should override this method to save learned parameters between
   * sessions.
   *
   * @returns {Promise<void>} Resolves when persistence is complete.
   */
  async saveModel() {
    // To be implemented by subclasses when necessary.
  }

  /**
   * Record a training experience tuple.
   *
   * @param {Object} state - Observed game state.
   * @param {string} action - Action taken in the state.
   * @param {number} reward - Reward signal observed after acting.
   */
  recordTrainingData(state, action, reward) {
    this.trainingData.push({ state, action, reward });
  }

  /**
   * Dispose the strategy and persist any learned knowledge.
   *
   * @returns {Promise<void>} Resolves when cleanup is finished.
   */
  async dispose() {
    await this.saveModel();
    await super.dispose();
  }
}
