// FILE: src/utils/collections.js
/**
 * Collection utilities for efficient data operations
 */

/**
 * Creates a reusable object pool to reduce GC pressure
 * @param {Function} createFn - Function to create new objects
 * @param {Function} resetFn - Function to reset objects for reuse
 * @param {number} maxSize - Maximum pool size
 * @returns {Object} Object pool with get/release methods
 */
export function createObjectPool(createFn, resetFn, maxSize = 100) {
  const pool = [];

  return {
    get() {
      if (pool.length > 0) {
        const obj = pool.pop();
        resetFn(obj);
        return obj;
      }
      return createFn();
    },

    release(obj) {
      if (pool.length < maxSize) {
        pool.push(obj);
      }
    },

    clear() {
      pool.length = 0;
    },
  };
}

/**
 * Efficient queue implementation using circular buffer
 */
export class CircularQueue {
  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  enqueue(item) {
    if (this.size >= this.capacity) {
      throw new Error('Queue overflow');
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
  }

  dequeue() {
    if (this.size === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Help GC
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  isEmpty() {
    return this.size === 0;
  }

  clear() {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.buffer.fill(undefined);
  }
}

/**
 * Creates a memoization function with LRU cache
 * @param {Function} fn - Function to memoize
 * @param {number} maxSize - Maximum cache size
 * @returns {Function} Memoized function
 */
export function createMemoizer(fn, maxSize = 50) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }

    const result = fn.apply(this, args);

    // Remove oldest if at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
}
