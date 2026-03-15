// FILE: src/game/gameLoop.js
/**
 * Frame-locked game loop with worker integration - FIXED VERSION
 */

import { gameTick, setGameStatus, getGameStats, releaseGameState } from '../engine/gameEngine.js';
import { GAME_STATUS } from '../engine/types.js';

const getNow = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

const requestFrame =
  typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (cb) => setTimeout(() => cb(getNow()), 16);

const cancelFrame =
  typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function'
    ? globalThis.cancelAnimationFrame.bind(globalThis)
    : clearTimeout;

export class GameLoop {
  constructor(initialState, onStateChange, config = {}, callbacks = {}) {
    // ✅ Don't deep copy - just reference the original state
    this.state = initialState;
    this.onStateChange = onStateChange;
    this.config = config;

    const { onError } = callbacks ?? {};
    this.errorHandler = typeof onError === 'function'
      ? onError
      : (error, context) => {
          console.error('Game loop error:', context, error);
        };

    // Timing
    this.tickInterval = config.tickMs || 100;
    this.lastTick = 0;
    this.accumulator = 0;
    this.running = false;

    // Animation frame
    this.rafId = null;
    this.lastRenderTime = 0;

    // Worker for complex planning (future extension)
    this.plannerWorker = null;

    // Sequential update queue to avoid re-entrancy
    this.updateQueue = [];
    this.processingQueue = false;

    // Bind methods
    this.tick = this.tick.bind(this);
    this.render = this.render.bind(this);

    // Initialize without triggering state change
    this.initialized = false;
  }

  /**
   * Report an error using the configured error handler.
   * @param {*} error - Error instance or value
   * @param {Object} [context={}] - Additional context information
   */
  reportError(error, context = {}) {
    try {
      this.errorHandler(error, context);
    } catch (handlerError) {
      console.error('Game loop error handler failed:', handlerError, {
        originalError: error,
        context,
      });
    }
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.state.status === GAME_STATUS.GAME_OVER || this.state.status === GAME_STATUS.COMPLETE) {
      return; // Cannot start from terminal states
    }

    const previousState = this.state;
    this.state = setGameStatus(this.state, GAME_STATUS.PLAYING);
    this.running = true;
    this.lastTick = getNow();
    this.accumulator = 0;

    // Notify state change
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (previousState && previousState !== this.state) {
      releaseGameState(previousState);
    }

    if (!this.rafId) {
      this.rafId = requestFrame(this.render);
    }
  }

  /**
   * Pause the game loop
   */
  pause() {
    const previousState = this.state;
    this.state = setGameStatus(this.state, GAME_STATUS.PAUSED);
    this.running = false;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (previousState && previousState !== this.state) {
      releaseGameState(previousState);
    }
  }

  /**
   * Stop the game loop completely
   */
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelFrame(this.rafId);
      this.rafId = null;
    }

    this.updateQueue.length = 0;
    this.processingQueue = false;

    if (this.plannerWorker) {
      this.plannerWorker.terminate();
      this.plannerWorker = null;
    }
  }

  /**
   * Execute a single step
   */
  step() {
    if (this.processingQueue) {
      console.warn('Ignoring manual step while update is in progress.');
      return Promise.resolve({
        state: this.state,
        result: { valid: false, reason: 'Update in progress' },
      });
    }

    if (this.state.status === GAME_STATUS.GAME_OVER || this.state.status === GAME_STATUS.COMPLETE) {
      return Promise.resolve(undefined);
    }

    return this.enqueueUpdate(() => this.executeStep()).catch(error => {
      this.reportError(error, { phase: 'stepPromise' });
      return {
        state: this.state,
        result: { valid: false, reason: 'Manual step failed with exception' },
      };
    });
  }

  /**
   * Update tick interval
   */
  setTickInterval(ms) {
    this.tickInterval = ms;
  }

  /**
   * Get current game statistics
   */
  getStats() {
    return getGameStats(this.state);
  }

  /**
   * Main game tick (called by render loop)
   */
  tick(currentTime) {
    if (!this.running) {
      return;
    }

    const pending = this.enqueueUpdate(() => this.executeTick(currentTime));
    pending.catch(error => {
      this.reportError(error, { phase: 'tickPromise' });
    });
  }

  /**
   * Render loop (called by requestAnimationFrame)
   */
  render(currentTime) {
    // Update game logic
    this.tick(currentTime);

    // Continue render loop
    if (this.running || this.state.status === GAME_STATUS.PAUSED) {
      this.rafId = requestFrame(this.render);
    } else {
      this.rafId = null;
    }
  }

  /**
   * Reset to new state
   */
  reset(newState) {
    // ✅ Don't deep copy - just reference the new state
    const previousState = this.state;
    this.state = newState;
    this.config = newState?.config ?? this.config;
    if (this.config && typeof this.config.tickMs === 'number') {
      this.tickInterval = this.config.tickMs;
    }
    this.running = false;
    this.accumulator = 0;
    this.lastTick = getNow();
    this.updateQueue.length = 0;
    this.processingQueue = false;

    // Stop any running animation frame
    if (this.rafId) {
      cancelFrame(this.rafId);
      this.rafId = null;
    }

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (previousState && previousState !== this.state) {
      releaseGameState(previousState);
    }
  }

  enqueueUpdate(task) {
    return new Promise((resolve, reject) => {
      this.updateQueue.push({ task, resolve, reject });
      if (!this.processingQueue) {
        this.processQueue().catch(error => {
          this.reportError(error, { phase: 'processQueueRoot' });
        });
      }
    });
  }

  async processQueue() {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    try {
      while (this.updateQueue.length > 0) {
        const entry = this.updateQueue.shift();
        if (!entry) {
          continue;
        }
        try {
          const result = await entry.task();
          entry.resolve(result);
        } catch (error) {
          this.reportError(error, { phase: 'processQueue' });
          entry.reject(error);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  async executeStep() {
    try {
      const currentState = this.state;
      const result = await gameTick(currentState);

      if (result?.result?.valid) {
        const nextState = result.state;
        this.state = nextState;
        if (this.onStateChange) {
          this.onStateChange(this.state);
        }
        if (currentState && currentState !== nextState) {
          releaseGameState(currentState);
        }
      } else if (result?.result?.reason !== 'Game not running') {
        this.reportError(new Error(`Manual step failed: ${result?.result?.reason ?? 'Unknown reason'}`), {
          phase: 'executeStep',
          result,
        });
        if (result?.state && result.state !== currentState && result.state !== this.state) {
          releaseGameState(result.state);
        }
      } else if (result?.state && result.state !== currentState && result.state !== this.state) {
        releaseGameState(result.state);
      }

      return result;
    } catch (error) {
      this.reportError(error, { phase: 'executeStep' });
      this.running = false;
      return {
        state: this.state,
        result: { valid: false, reason: 'Manual step failed with exception' },
      };
    }
  }

  async executeTick(currentTime) {
    const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : getNow();
    const deltaTimeRaw = safeCurrentTime - this.lastTick;
    const deltaTime = Number.isFinite(deltaTimeRaw) && deltaTimeRaw > 0 ? deltaTimeRaw : 0;
    this.lastTick = safeCurrentTime;
    this.accumulator += deltaTime;

    const tickInterval = Number.isFinite(this.tickInterval) && this.tickInterval > 0
      ? this.tickInterval
      : 16;

    if (tickInterval !== this.tickInterval) {
      this.reportError(new Error('Invalid tick interval detected; falling back to 16ms'), {
        previousInterval: this.tickInterval,
      });
      this.tickInterval = tickInterval;
    }

    const maxTicksPerFrame = 5;
    const updates = [];
    let tickCount = 0;
    let workingState = this.state;

    while (this.accumulator >= tickInterval && tickCount < maxTicksPerFrame) {
      if (!workingState || workingState.status !== GAME_STATUS.PLAYING) {
        break;
      }

      let tickResult;
      try {
        tickResult = await gameTick(workingState);
      } catch (error) {
        this.reportError(error, { phase: 'executeTick', tickCount });
        this.running = false;
        break;
      }

      if (!tickResult || typeof tickResult !== 'object') {
        this.reportError(new Error('Game tick returned invalid result object'), {
          phase: 'executeTick',
          tickCount,
          result: tickResult,
        });
        this.running = false;
        break;
      }

      if (!tickResult.result?.valid) {
        if (tickResult.result?.reason !== 'Game not running') {
          this.reportError(new Error(`Game tick invalid: ${tickResult.result?.reason ?? 'Unknown reason'}`), {
            phase: 'executeTick',
            tickCount,
            result: tickResult.result,
          });
        }
        if (tickResult.state && tickResult.state !== workingState && tickResult.state !== this.state) {
          releaseGameState(tickResult.state);
        }
        this.running = false;
        break;
      }

      workingState = tickResult.state;
      updates.push(workingState);
      tickCount += 1;
      this.accumulator -= tickInterval;

      if (
        !workingState ||
        workingState.status === GAME_STATUS.GAME_OVER ||
        workingState.status === GAME_STATUS.COMPLETE
      ) {
        this.running = false;
        break;
      }
    }

    if (tickCount >= maxTicksPerFrame) {
      this.accumulator = 0;
    }

    if (updates.length > 0) {
      const previousState = this.state;
      const finalState = updates[updates.length - 1];
      this.state = finalState;
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }

      if (previousState && previousState !== finalState) {
        releaseGameState(previousState);
      }

      for (let i = 0; i < updates.length - 1; i += 1) {
        const interimState = updates[i];
        if (
          interimState &&
          interimState !== previousState &&
          interimState !== finalState
        ) {
          releaseGameState(interimState);
        }
      }
    }
  }
}
