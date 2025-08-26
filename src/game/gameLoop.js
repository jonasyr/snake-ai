// FILE: src/game/gameLoop.js
/**
 * Frame-locked game loop with worker integration
 */

import { gameTick, setGameStatus, getGameStats } from '../engine/gameEngine.js';
import { GAME_STATUS } from '../engine/types.js';

export class GameLoop {
  constructor(initialState, onStateChange, config = {}) {
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
    this.lastTick = performance.now();
    this.accumulator = 0;

    this.onStateChange(this.state);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.render);
    }
  }

  /**
   * Pause the game loop
   */
  pause() {
    this.state = setGameStatus(this.state, GAME_STATUS.PAUSED);
    this.running = false;
    this.onStateChange(this.state);
  }

  /**
   * Stop the game loop completely
   */
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
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
    this.state = result.state;
    this.onStateChange(this.state);

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

    // Fixed timestep with accumulator
    while (this.accumulator >= this.tickInterval) {
      const result = gameTick(this.state);
      this.state = result.state;

      // Stop if game ended
      if (
        this.state.status === GAME_STATUS.GAME_OVER ||
        this.state.status === GAME_STATUS.COMPLETE
      ) {
        this.running = false;
      }

      this.accumulator -= this.tickInterval;
    }

    // Notify state change
    this.onStateChange(this.state);
  }

  /**
   * Render loop (called by requestAnimationFrame)
   */
  render(currentTime) {
    // Update game logic
    this.tick(currentTime);

    // Continue render loop
    if (this.running || this.state.status === GAME_STATUS.PAUSED) {
      this.rafId = requestAnimationFrame(this.render);
    } else {
      this.rafId = null;
    }
  }

  /**
   * Reset to new state
   */
  reset(newState) {
    this.state = newState;
    this.running = false;
    this.accumulator = 0;
    this.onStateChange(this.state);
  }
}
