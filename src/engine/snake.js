// FILE: src/engine/snake.js
/**
 * Snake state management and movement logic
 */

import { isValidSnakeBody } from '../utils/guards.js';

/**
 * Creates a new snake state
 * @param {number} startCell - Starting cell index
 * @returns {Object} Snake state
 */
export function createSnake(startCell) {
  return {
    body: [startCell],
    occupied: new Set([startCell]),
  };
}

/**
 * Move snake to new head position
 * @param {Object} snake - Current snake state
 * @param {number} newHead - New head cell index
 * @param {boolean} grow - Whether to grow (ate fruit)
 * @returns {Object} New snake state
 */
export function moveSnake(snake, newHead, grow = false) {
  const newBody = [newHead, ...snake.body];
  const newOccupied = new Set(snake.occupied);
  newOccupied.add(newHead);

  if (!grow) {
    const tail = newBody.pop();
    newOccupied.delete(tail);
  }

  return {
    body: newBody,
    occupied: newOccupied,
  };
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
    return false; // No collision
  }

  // If eating, tail doesn't move, so collision with tail is fatal
  if (willEat) {
    return true;
  }

  // If not eating, collision only fatal if not with tail
  const tail = snake.body[snake.body.length - 1];
  return newHead !== tail;
}

/**
 * Get the head position of the snake
 * @param {Object} snake - Snake state
 * @returns {number} Head cell index
 */
export function getHead(snake) {
  return snake.body[0];
}

/**
 * Get the tail position of the snake
 * @param {Object} snake - Snake state
 * @returns {number} Tail cell index
 */
export function getTail(snake) {
  return snake.body[snake.body.length - 1];
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
  return snake.body.length;
}

/**
 * Validate snake state consistency
 * @param {Object} snake - Snake state to validate
 * @param {number} totalCells - Total cells in grid
 * @returns {boolean} Whether snake state is valid
 */
export function validateSnake(snake, totalCells) {
  if (!snake || typeof snake !== 'object') return false;
  if (!Array.isArray(snake.body) || !(snake.occupied instanceof Set)) return false;
  if (snake.body.length !== snake.occupied.size) return false;

  return (
    isValidSnakeBody(snake.body, totalCells) && snake.body.every(cell => snake.occupied.has(cell))
  );
}
