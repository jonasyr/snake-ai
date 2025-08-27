// FILE: src/game/gameLoop.js
/**
 * Frame-locked game loop with worker integration - FIXED VERSION
 */

import { gameTick, setGameStatus, getGameStats } from '../engine/gameEngine.js';
import { GAME_STATUS } from '../engine/types.js';

export class GameLoop {
  constructor(initialState, onStateChange, config = {}) {
    this.state = { ...initialState }; // ✅ Create a copy to avoid mutations
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

    // ✅ Immediate state notification
    this.onStateChange(this.state);
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

    // ✅ Notify state change immediately
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

    let stateChanged = false;

    // ✅ Fixed timestep with accumulator - process multiple ticks if needed
    while (this.accumulator >= this.tickInterval) {
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

    // ✅ Only notify state change if state actually changed
    if (stateChanged) {
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
      this.rafId = requestAnimationFrame(this.render);
    } else {
      this.rafId = null;
    }
  }

  /**
   * Reset to new state
   */
  reset(newState) {
    this.state = { ...newState }; // ✅ Create a copy
    this.running = false;
    this.accumulator = 0;
    this.lastTick = performance.now();
    
    // ✅ Stop any running animation frame
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    this.onStateChange(this.state);
  }
}