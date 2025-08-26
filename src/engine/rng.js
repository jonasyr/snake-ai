// FILE: src/engine/rng.js
/**
 * Seeded random number generator for deterministic gameplay
 */

/**
 * Linear Congruential Generator for seeded random numbers
 */
export class SeededRNG {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.current = seed;
  }

  /**
   * Generate next random number [0, 1)
   * @returns {number} Random number
   */
  next() {
    // LCG parameters (same as used in Java)
    this.current = (this.current * 1103515245 + 12345) & 0x7fffffff;
    return this.current / 0x80000000;
  }

  /**
   * Generate random integer in range [min, max)
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random integer
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Choose random element from array
   * @param {Array} array - Array to choose from
   * @returns {*} Random element
   */
  choice(array) {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Reset to original seed
   */
  reset() {
    this.current = this.seed;
  }

  /**
   * Set new seed
   * @param {number} newSeed - New seed value
   */
  setSeed(newSeed) {
    this.seed = newSeed;
    this.current = newSeed;
  }
}

// Default global RNG instance
export const rng = new SeededRNG();

/**
 * Seed the global RNG
 * @param {number} seed - Seed value
 */
export function seed(value) {
  rng.setSeed(value);
}

/**
 * Generate random number [0, 1) using global RNG
 * @returns {number} Random number
 */
export function random() {
  return rng.next();
}

/**
 * Generate random integer using global RNG
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
  return rng.nextInt(min, max);
}

/**
 * Choose random element using global RNG
 * @param {Array} array - Array to choose from
 * @returns {*} Random element
 */
export function randomChoice(array) {
  return rng.choice(array);
}
