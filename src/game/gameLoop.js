// FILE: src/game/gameLoop.js
/**
 * Frame-locked game loop with worker integration - FIXED VERSION
 */

import { gameTick, setGameStatus, getGameStats } from '../engine/gameEngine.js';
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
  constructor(initialState, onStateChange, config = {}) {
    // ✅ Don't deep copy - just reference the original state
    this.state = initialState;
    this.onStateChange = onStateChange;
    this.config = config;

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

    // Bind methods
    this.tick = this.tick.bind(this);
    this.render = this.render.bind(this);

    // Initialize without triggering state change
    this.initialized = false;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.state.status === GAME_STATUS.GAME_OVER || this.state.status === GAME_STATUS.COMPLETE) {
      return; // Cannot start from terminal states
    }

    this.state = setGameStatus(this.state, GAME_STATUS.PLAYING);
    this.running = true;
    this.lastTick = getNow();
    this.accumulator = 0;

    // Notify state change
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (!this.rafId) {
      this.rafId = requestFrame(this.render);
    }
  }

  /**
   * Pause the game loop
   */
  pause() {
    this.state = setGameStatus(this.state, GAME_STATUS.PAUSED);
    this.running = false;
    
    if (this.onStateChange) {
      this.onStateChange(this.state);
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

    if (this.plannerWorker) {
      this.plannerWorker.terminate();
      this.plannerWorker = null;
    }
  }

  /**
   * Execute a single step
   */
  step() {
    if (this.state.status === GAME_STATUS.GAME_OVER || this.state.status === GAME_STATUS.COMPLETE) {
      return;
    }

    const result = gameTick(this.state);
    if (result.result.valid) {
      this.state = result.state;
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }
    }

    return result;
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
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTick;
    this.lastTick = currentTime;
    this.accumulator += deltaTime;

    let stateChanged = false;
    let tickCount = 0;
    const maxTicksPerFrame = 5; // Prevent too many ticks in one frame

    // Fixed timestep with accumulator
    while (this.accumulator >= this.tickInterval && tickCount < maxTicksPerFrame) {
      if (this.state.status !== GAME_STATUS.PLAYING) {
        break;
      }

      const result = gameTick(this.state);
      
      if (!result.result.valid) {
        console.warn('Invalid game tick result:', result.result.reason);
        this.running = false;
        break;
      }

      this.state = result.state;
      stateChanged = true;
      tickCount++;

      // Stop if game ended
      if (
        this.state.status === GAME_STATUS.GAME_OVER ||
        this.state.status === GAME_STATUS.COMPLETE
      ) {
        this.running = false;
        break;
      }

      this.accumulator -= this.tickInterval;
    }

    // Clear remaining accumulator if we hit the tick limit
    if (tickCount >= maxTicksPerFrame) {
      this.accumulator = 0;
    }

    // Only notify state change if state actually changed
    if (stateChanged && this.onStateChange) {
      this.onStateChange(this.state);
    }
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
    this.state = newState;
    this.config = newState?.config ?? this.config;
    if (this.config && typeof this.config.tickMs === 'number') {
      this.tickInterval = this.config.tickMs;
    }
    this.running = false;
    this.accumulator = 0;
    this.lastTick = getNow();

    // Stop any running animation frame
    if (this.rafId) {
      cancelFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
