// FILE: src/engine/pathfinding/WorkerPool.js
/**
 * Lightweight worker pool abstraction that executes supported tasks inside real Web Workers.
 *
 * Consumers may provide a fallback function so tasks continue to execute when the environment
 * lacks worker support (for example during server-side rendering or unit tests).
 */
export class WorkerPool {
  /**
   * @param {number} [size=1] - Maximum number of concurrent worker tasks.
   */
  constructor(size = 1) {
    this.maxWorkers = Math.max(1, Math.trunc(size) || 1);
    this.queue = [];
    this.pendingJobs = new Map();
    this.jobCounter = 0;

    this.supportsWorkers = typeof Worker === 'function';
    this.workers = [];
    this.workerModuleUrl = null;

    if (this.supportsWorkers) {
      try {
        this.workerModuleUrl = new URL('./worker/PathfindingWorker.js', import.meta.url);
        this.#initializeWorkers();
      } catch (error) {
        console.warn('WorkerPool failed to initialize workers. Falling back to synchronous execution.', error);
        this.supportsWorkers = false;
        this.workerModuleUrl = null;
      }
    }
  }

  /**
   * Determine whether the pool currently has available capacity.
   *
   * @returns {boolean} True if additional tasks can be scheduled.
   */
  hasCapacity() {
    if (this.supportsWorkers && this.workers.length > 0) {
      return this.pendingJobs.size < this.maxWorkers;
    }

    return true;
  }

  /**
   * Enqueue a task for execution.
   *
   * When workers are available and the task declares a worker type, it will be executed inside a
   * background worker. Otherwise the provided fallback function executes on the main thread.
   *
   * @param {Function|Object} task - Task function or worker payload descriptor.
   * @returns {Promise<*>} Resolves with the task result.
   */
  execute(task) {
    if (!this.#canRunInWorker(task)) {
      const fallbackRunner = this.#getFallbackRunner(task);
      if (!fallbackRunner) {
        return Promise.reject(new Error('Worker task is missing a fallback function'));
      }

      return this.#runSynchronously(fallbackRunner);
    }

    return new Promise((resolve, reject) => {
      const job = {
        id: ++this.jobCounter,
        task,
        resolve,
        reject,
        attemptedFallback: false,
      };

      this.queue.push(job);
      this.#processQueue();
    });
  }

  /**
   * Gracefully clear all queued and pending tasks.
   */
  drain() {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        job.reject(new Error('WorkerPool was drained before execution'));
      }
    }

    for (const [id, job] of this.pendingJobs) {
      this.pendingJobs.delete(id);
      job.reject(new Error('WorkerPool was drained before execution'));
    }
  }

  #initializeWorkers() {
    const workerCount = Math.min(this.maxWorkers, Math.max(1, this.maxWorkers));

    for (let i = 0; i < workerCount; i += 1) {
      const workerEntry = this.#createWorkerEntry();
      if (workerEntry) {
        this.workers.push(workerEntry);
      }
    }

    if (this.workers.length === 0) {
      this.supportsWorkers = false;
    }
  }

  #createWorkerEntry() {
    if (!this.workerModuleUrl) {
      return null;
    }

    try {
      const worker = new Worker(this.workerModuleUrl, { type: 'module' });
      const entry = { worker, busy: false };

      worker.addEventListener('message', event => this.#handleWorkerMessage(entry, event));
      worker.addEventListener('error', event => this.#handleWorkerError(entry, event));

      return entry;
    } catch (error) {
      console.warn('Failed to create worker instance.', error);
      return null;
    }
  }

  #handleWorkerMessage(workerEntry, event) {
    const { id, result, error } = event.data ?? {};
    const job = this.pendingJobs.get(id);

    if (!job) {
      workerEntry.busy = false;
      this.#processQueue();
      return;
    }

    this.pendingJobs.delete(id);
    workerEntry.busy = false;

    if (error) {
      if (!job.attemptedFallback) {
        job.attemptedFallback = true;
        const fallbackRunner = this.#getFallbackRunner(job.task);
        if (fallbackRunner) {
          this.#runSynchronously(fallbackRunner).then(job.resolve, job.reject).finally(() => {
            this.#processQueue();
          });
          return;
        }
      }

      const errorMessage = error?.message ?? 'Worker task failed';
      job.reject(new Error(errorMessage));
      this.#processQueue();
      return;
    }

    job.resolve(result);
    this.#processQueue();
  }

  #handleWorkerError(workerEntry, event) {
    workerEntry.busy = false;

    const error = event?.message ? new Error(event.message) : new Error('Worker encountered an unknown error');

    for (const [id, job] of this.pendingJobs) {
      if (!job || job.workerEntry !== workerEntry) {
        continue;
      }

      this.pendingJobs.delete(id);

      if (!job.attemptedFallback) {
        job.attemptedFallback = true;
        const fallbackRunner = this.#getFallbackRunner(job.task);
        if (fallbackRunner) {
          this.#runSynchronously(fallbackRunner).then(job.resolve, job.reject);
          continue;
        }
      }

      job.reject(error);
    }

    this.#processQueue();
  }

  #processQueue() {
    if (!this.supportsWorkers || this.workers.length === 0) {
      return;
    }

    for (const workerEntry of this.workers) {
      if (this.queue.length === 0) {
        break;
      }

      if (workerEntry.busy) {
        continue;
      }

      const job = this.queue.shift();
      if (!job) {
        continue;
      }

      this.#dispatch(workerEntry, job);
    }
  }

  #dispatch(workerEntry, job) {
    const { workerType, payload, transferList } = job.task ?? {};

    if (!workerType) {
      const fallbackRunner = this.#getFallbackRunner(job.task);
      if (fallbackRunner) {
        this.#runSynchronously(fallbackRunner).then(job.resolve, job.reject);
        return;
      }

      job.reject(new Error('Worker task did not specify a workerType'));
      return;
    }

    try {
      workerEntry.busy = true;
      job.workerEntry = workerEntry;
      this.pendingJobs.set(job.id, job);
      workerEntry.worker.postMessage({ id: job.id, type: workerType, payload }, Array.isArray(transferList) ? transferList : undefined);
    } catch (error) {
      this.pendingJobs.delete(job.id);
      workerEntry.busy = false;

      if (!job.attemptedFallback) {
        job.attemptedFallback = true;
        const fallbackRunner = this.#getFallbackRunner(job.task);
        if (fallbackRunner) {
          this.#runSynchronously(fallbackRunner).then(job.resolve, job.reject).finally(() => {
            this.#processQueue();
          });
          return;
        }
      }

      job.reject(error);
      this.#processQueue();
    }
  }

  #canRunInWorker(task) {
    if (!this.supportsWorkers || this.workers.length === 0) {
      return false;
    }

    if (!task || typeof task !== 'object') {
      return false;
    }

    return typeof task.workerType === 'string';
  }

  #getFallbackRunner(task) {
    if (typeof task === 'function') {
      return task;
    }

    if (task && typeof task === 'object') {
      if (typeof task.fallback === 'function') {
        return task.fallback;
      }

      if (typeof task.execute === 'function') {
        return () => task.execute(task.payload);
      }
    }

    return null;
  }

  #runSynchronously(fn) {
    try {
      const result = fn();
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
