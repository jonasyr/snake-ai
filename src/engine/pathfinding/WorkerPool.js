// FILE: src/engine/pathfinding/WorkerPool.js
/**
 * Lightweight asynchronous worker pool abstraction.
 *
 * The current implementation does not spin up real Web Workers. Instead it
 * provides a small task scheduler that can defer expensive work and ensure it
 * runs sequentially when the environment lacks worker support (such as the
 * Vitest environment). The abstraction mirrors a true worker pool so the
 * implementation can be swapped later without touching the consumers.
 */
export class WorkerPool {
  /**
   * @param {number} [size=1] - Maximum number of concurrent tasks.
   */
  constructor(size = 1) {
    this.maxWorkers = Math.max(1, Math.trunc(size) || 1);
    this.activeWorkers = 0;
    this.queue = [];
  }

  /**
   * Enqueue a task for execution.
   *
   * @param {Function} taskFn - Function returning a value or promise.
   * @returns {Promise<*>} Resolves with the task's result.
   */
  execute(taskFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.#processQueue();
    });
  }

  /**
   * Whether the pool currently has capacity to execute tasks.
   *
   * @returns {boolean} True when workers are available.
   */
  hasCapacity() {
    return this.activeWorkers < this.maxWorkers;
  }

  /**
   * Gracefully clear all queued tasks.
   */
  drain() {
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry) {
        entry.reject(new Error('WorkerPool was drained before execution'));
      }
    }
  }

  async #processQueue() {
    if (this.activeWorkers >= this.maxWorkers) {
      return;
    }

    const entry = this.queue.shift();
    if (!entry) {
      return;
    }

    this.activeWorkers += 1;
    try {
      const result = await entry.taskFn();
      entry.resolve(result);
    } catch (error) {
      entry.reject(error);
    } finally {
      this.activeWorkers -= 1;
      if (this.queue.length > 0) {
        this.#processQueue();
      }
    }
  }
}
