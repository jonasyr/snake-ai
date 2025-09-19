// FILE: src/engine/snake.js
/**
 * Snake state management and movement logic
 */

import { isValidSnakeBody } from '../utils/guards.js';

/**
 * Symbol used to hide internal snake state details from consumers.
 * @type {symbol}
 */
const INTERNAL_STATE = Symbol('snakeInternalState');

/**
 * Default buffer size used when capacity is not explicitly provided.
 * @type {number}
 */
const DEFAULT_BUFFER_CAPACITY = 512;

/**
 * Create a public snake view backed by an internal state descriptor.
 * @param {Object} state - Internal snake state descriptor
 * @returns {Object} Snake view exposed to the rest of the engine
 */
function createSnakeView(state) {
  const snakeView = {};

  Object.defineProperty(snakeView, INTERNAL_STATE, {
    value: {
      buffer: state.buffer,
      capacity: state.capacity,
      headIndex: state.headIndex,
      length: state.length,
      occupied: state.occupied,
      bodyCache: state.bodyCache ?? null,
      cacheValid: Boolean(state.cacheValid && state.bodyCache),
    },
    enumerable: false,
    writable: false,
  });

  Object.defineProperty(snakeView, 'occupied', {
    value: state.occupied,
    enumerable: true,
    writable: false,
  });

  Object.defineProperty(snakeView, 'body', {
    enumerable: true,
    get() {
      const internal = snakeView[INTERNAL_STATE];

      if (!internal.cacheValid) {
        const { buffer, capacity, headIndex, length } = internal;
        const result = new Array(length);

        for (let i = 0; i < length; i += 1) {
          result[i] = buffer[(headIndex + i) % capacity];
        }

        internal.bodyCache = result;
        internal.cacheValid = true;
      }

      return internal.bodyCache;
    },
  });

  return snakeView;
}

function createViewFromBody(body, occupied, capacityHint) {
  const length = Array.isArray(body) ? body.length : 0;
  const capacity = Math.max(capacityHint, length || DEFAULT_BUFFER_CAPACITY);
  const buffer = new Int32Array(capacity);

  for (let i = 0; i < capacity; i += 1) {
    buffer[i] = -1;
  }

  for (let i = 0; i < length; i += 1) {
    buffer[i] = body[i];
  }

  return createSnakeView({
    buffer,
    capacity,
    headIndex: 0,
    length,
    occupied,
    bodyCache: Array.from(body),
    cacheValid: true,
  });
}

/**
 * Retrieve the internal state descriptor from a snake view.
 * @param {Object} snake - Snake view
 * @returns {Object} Internal state descriptor
 */
function getInternalState(snake) {
  if (snake?.[INTERNAL_STATE]) {
    return snake[INTERNAL_STATE];
  }

  const normalized = normalizeSnake(snake);
  if (normalized?.[INTERNAL_STATE]) {
    return normalized[INTERNAL_STATE];
  }

  throw new Error('Invalid snake instance provided.');
}

/**
 * Creates a new snake state using a circular buffer for body tracking.
 * @param {number} startCell - Starting cell index
 * @param {number} [capacity=DEFAULT_BUFFER_CAPACITY] - Maximum supported length
 * @returns {Object} Snake state
 */
export function createSnake(startCell, capacity = DEFAULT_BUFFER_CAPACITY) {
  const maxLength = Number.isInteger(capacity) && capacity > 0 ? capacity : DEFAULT_BUFFER_CAPACITY;
  const buffer = new Int32Array(maxLength);

  for (let i = 0; i < maxLength; i += 1) {
    buffer[i] = -1;
  }

  buffer[0] = startCell;

  const occupied = new Set([startCell]);

  return createSnakeView({
    buffer,
    capacity: maxLength,
    headIndex: 0,
    length: 1,
    occupied,
    bodyCache: [startCell],
    cacheValid: true,
  });
}

/**
 * Normalize legacy snake structures into optimized views.
 * @param {Object} snake - Snake-like object
 * @param {number} capacityHint - Estimated maximum capacity
 * @returns {Object} Normalized snake view
 */
export function normalizeSnake(snake, capacityHint = DEFAULT_BUFFER_CAPACITY) {
  if (snake?.[INTERNAL_STATE]) {
    return snake;
  }

  if (!snake || !Array.isArray(snake.body)) {
    throw new Error('Invalid snake instance provided.');
  }

  const occupied = snake.occupied instanceof Set
    ? new Set(snake.occupied)
    : new Set(snake.body);

  return createViewFromBody(snake.body, occupied, capacityHint);
}

/**
 * Move snake to new head position using the circular buffer.
 * @param {Object} snake - Current snake state
 * @param {number} newHead - New head cell index
 * @param {boolean} grow - Whether to grow (ate fruit)
 * @returns {Object} New snake state
 */
export function moveSnake(snake, newHead, grow = false) {
  const internal = getInternalState(snake);
  const {
    buffer,
    capacity,
    headIndex,
    length,
    occupied,
  } = internal;

  const updatedOccupied = new Set(occupied);
  let newLength = length;

  if (!grow && length > 0) {
    const tailIndex = (headIndex + length - 1) % capacity;
    const tailCell = buffer[tailIndex];
    updatedOccupied.delete(tailCell);
  }

  updatedOccupied.add(newHead);

  if (grow) {
    newLength = Math.min(length + 1, capacity);
  }

  const nextHeadIndex = (headIndex - 1 + capacity) % capacity;
  buffer[nextHeadIndex] = newHead;

  return createSnakeView({
    buffer,
    capacity,
    headIndex: nextHeadIndex,
    length: newLength,
    occupied: updatedOccupied,
    bodyCache: null,
    cacheValid: false,
  });
}

/**
 * Check if snake would collide with itself
 * @param {Object} snake - Snake state
 * @param {number} newHead - Proposed new head position
 * @param {boolean} willEat - Whether snake will eat fruit (tail won't move)
 * @returns {boolean} Whether collision would occur
 */
export function wouldCollide(snake, newHead, willEat = false) {
  if (!snake.occupied.has(newHead)) {
    return false;
  }

  if (willEat) {
    return true;
  }

  const tail = getTail(snake);
  return newHead !== tail;
}

/**
 * Get the head position of the snake
 * @param {Object} snake - Snake state
 * @returns {number} Head cell index
 */
export function getHead(snake) {
  const internal = getInternalState(snake);
  return internal.buffer[internal.headIndex];
}

/**
 * Get the tail position of the snake
 * @param {Object} snake - Snake state
 * @returns {number} Tail cell index
 */
export function getTail(snake) {
  const internal = getInternalState(snake);
  if (internal.length <= 0) {
    return -1;
  }

  const tailIndex = (internal.headIndex + internal.length - 1) % internal.capacity;
  return internal.buffer[tailIndex];
}

/**
 * Check if snake is occupying a cell
 * @param {Object} snake - Snake state
 * @param {number} cell - Cell index to check
 * @returns {boolean} Whether cell is occupied
 */
export function occupiesCell(snake, cell) {
  return snake.occupied.has(cell);
}

/**
 * Get snake length
 * @param {Object} snake - Snake state
 * @returns {number} Snake length
 */
export function getLength(snake) {
  return getInternalState(snake).length;
}

/**
 * Validate snake state consistency
 * @param {Object} snake - Snake state to validate
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether snake state is valid
 */
export function validateSnake(snake, totalCells) {
  if (!snake || typeof snake !== 'object') return false;
  if (!(snake.occupied instanceof Set)) return false;

  const internal = snake[INTERNAL_STATE];
  if (!internal) return false;

  if (internal.length !== snake.occupied.size) {
    return false;
  }

  const bodySegments = snake.body;
  if (!Array.isArray(bodySegments)) {
    return false;
  }

  if (!isValidSnakeBody(bodySegments, totalCells)) {
    return false;
  }

  for (const cell of bodySegments) {
    if (!snake.occupied.has(cell)) {
      return false;
    }
  }

  return true;
}
