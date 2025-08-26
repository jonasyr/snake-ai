// FILE: src/tests/setup.js
/**
 * Test environment setup
 */

import '@testing-library/jest-dom';

// Mock requestAnimationFrame for tests
globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = id => clearTimeout(id);

// Mock Canvas API for tests
HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: () => {},
  fillRect: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  scale: () => {},
  save: () => {},
  restore: () => {},
  createLinearGradient: () => ({
    addColorStop: () => {},
  }),
  set fillStyle(val) {},
  set strokeStyle(val) {},
  set lineWidth(val) {},
  set shadowColor(val) {},
  set shadowBlur(val) {},
  set globalAlpha(val) {},
});
