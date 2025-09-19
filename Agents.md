# Project Agents.md Guide for OpenAI Codex

This Agents.md file provides comprehensive guidance for OpenAI Codex and other AI agents working with this codebase.

## Project Overview for AI Agents

This is a **Snake AI** project implementing autonomous Snake gameplay using Hamiltonian cycle pathfinding with intelligent shortcuts. The project demonstrates advanced game engine architecture, performance optimization, and comprehensive testing practices.

**Core Concept**: An AI-controlled Snake that never fails by following a Hamiltonian cycle (visiting every cell exactly once) while taking safe shortcuts to optimize performance.

## Project Structure for AI Code Generation

```
/
├── src/                     # Main source code - AI agents focus here
│   ├── engine/              # Pure functional game engine (CRITICAL)
│   │   ├── collision.js     # Collision detection systems
│   │   ├── fruit.js         # Fruit spawning and management
│   │   ├── gameEngine.js    # Core game state transitions
│   │   ├── grid.js          # Grid coordinate utilities
│   │   ├── hamiltonian.js   # Hamiltonian cycle generation
│   │   ├── rng.js           # Seeded random number generator
│   │   ├── shortcuts.js     # Smart shortcut pathfinding
│   │   ├── snake.js         # Snake state management
│   │   └── types.js         # JSDoc type definitions
│   ├── game/                # Game loop and settings
│   │   ├── gameLoop.js      # Frame-locked game loop
│   │   └── settings.js      # Persistent settings management
│   ├── simulation/          # Headless batch simulation
│   │   ├── index.js         # Simulation exports
│   │   └── simulator.js     # Batch game runner
│   ├── ui/                  # React user interface
│   │   ├── components/      # Reusable UI components
│   │   └── hooks/           # Custom React hooks
│   ├── utils/               # Shared utilities
│   │   ├── collections.js   # Performance data structures
│   │   ├── constants.js     # Global constants and config
│   │   ├── guards.js        # Type validation utilities
│   │   └── math.js          # Mathematical operations
│   └── tests/               # Comprehensive test suite
├── scripts/                 # CLI tools and automation
└── [config files]          # Build and development configuration
```

## Technology Stack & Dependencies

**Core Technologies:**
- **React 19.1.1** - UI framework with latest hooks
- **Vite** - Build tool and development server
- **Tailwind CSS v4** - Utility-first styling
- **Vitest** - Testing framework
- **ESLint** - Code quality and standards

**Key Libraries:**
- `lucide-react` - Icon system
- `prop-types` - Runtime type checking for React components

## Architectural Principles for AI Agents

### 1. **Pure Functional Engine Layer**
The `src/engine/` directory contains **pure functions only**. AI agents must:
- Never introduce side effects in engine functions
- Maintain referential transparency
- Use immutable data transformations
- Return new objects instead of mutating existing ones

```javascript
// ✅ CORRECT - Pure function pattern
export function moveSnake(snake, newHead, grow = false) {
  const newBody = [newHead, ...snake.body];
  const newOccupied = new Set(snake.occupied);
  // ... pure transformations
  return { body: newBody, occupied: newOccupied };
}

// ❌ INCORRECT - Mutation
export function moveSnake(snake, newHead, grow = false) {
  snake.body.unshift(newHead); // Mutates input
  return snake;
}
```

### 2. **State Management Hierarchy**
- **Engine Layer**: Pure state transitions
- **Game Layer**: Game loop and lifecycle management
- **UI Layer**: React state and user interactions
- **Simulation Layer**: Batch processing without UI

### 3. **Performance-First Design**
AI agents should prioritize performance optimizations:
- Use `Set` and `Map` for O(1) lookups
- Implement object pooling for frequently created objects
- Memoize expensive calculations
- Minimize canvas redraws with dirty region tracking

## Coding Conventions for AI Agents

### **JavaScript/JSDoc Standards**
- **Documentation**: Every function must have comprehensive JSDoc comments
- **Naming**: Use descriptive camelCase names
- **Error Handling**: Always include proper error boundaries and validation
- **Constants**: Use `UPPER_SNAKE_CASE` for constants, camelCase for configuration objects

```javascript
/**
 * Calculate distance along Hamiltonian cycle
 * @param {number} from - Starting cycle position
 * @param {number} to - Ending cycle position
 * @param {number} cycleLength - Total cycle length
 * @returns {number} Distance along cycle
 */
export function cyclicDistance(from, to, cycleLength) {
  return (to - from + cycleLength) % cycleLength;
}
```

### **React Component Standards**
- Use **functional components with hooks only**
- Implement `PropTypes` for all props
- Use `React.memo` for performance optimization when appropriate
- Follow component file naming: `PascalCase.jsx`

```javascript
const GameCanvas = ({ gameState, settings, visualOptions }) => {
  // Component implementation
};

GameCanvas.propTypes = {
  gameState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    // ... other props
  }).isRequired,
  settings: PropTypes.object.isRequired,
  visualOptions: PropTypes.shape({
    showCycle: PropTypes.bool,
  }),
};

export default React.memo(GameCanvas);
```

### **Canvas Rendering Conventions**
- Use `pixelated` image rendering for retro aesthetics
- Implement dirty region rendering for performance
- Handle high DPI displays properly
- Clean up resources in useEffect cleanup functions

### **Testing Requirements**
- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test component interactions
- **Simulation Tests**: Test batch game running
- **Mock Browser APIs**: Use test setup for Canvas, requestAnimationFrame

## File Organization Patterns

### **Module Exports**
- Use named exports for utilities and functions
- Use default exports for React components
- Group related exports in index files

### **Import Organization**
```javascript
// 1. External libraries
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// 2. Internal modules (engine first, then UI)
import { gameTick, resetGame } from '../engine/gameEngine.js';
import { useGameState } from './hooks/useGameState.js';

// 3. Assets and styles (if any)
```

## Performance Optimization Guidelines

### **Critical Performance Areas**
1. **Canvas Rendering**: Implement dirty regions, avoid full redraws
2. **Game Loop**: Use fixed timestep with accumulator pattern
3. **Pathfinding**: Cache calculated paths when possible
4. **Memory Management**: Use object pooling for frequently created objects

### **Optimization Patterns AI Agents Should Follow**
```javascript
// ✅ Memoization for expensive calculations
const memoizedPathCalculation = createMemoizer(
  (headCell, fruitCell, cycleLength) => {
    return calculatePlannedPath(headCell, fruitCell, cycle, cycleIndex);
  },
  50 // Cache size
);

// ✅ Object pooling for performance
const statePool = createObjectPool(
  () => ({ ...initialState }),
  (state) => Object.keys(state).forEach(k => delete state[k]),
  10
);
```

## Testing Strategy for AI Agents

### **Running Tests**
```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test file
npm test src/tests/engine/gameEngine.test.js

# Run tests with UI
npm test:ui
```

### **Test File Organization**
- `src/tests/engine/` - Engine module unit tests
- `src/tests/integration/` - Cross-module integration tests  
- `src/tests/simulation/` - Batch simulation tests
- `src/tests/setup.js` - Test environment configuration

### **Testing Patterns**
```javascript
// ✅ Proper test structure
describe('Game Engine Integration', () => {
  let gameState;

  beforeEach(() => {
    seed(12345); // Deterministic tests
    gameState = initializeGame({ rows: 10, cols: 10, seed: 12345 });
  });

  it('should advance game when playing', () => {
    const playingState = setGameStatus(gameState, GAME_STATUS.PLAYING);
    const result = gameTick(playingState);

    expect(result.result.valid).toBe(true);
    expect(result.state.moves).toBe(1);
  });
});
```

## Development Workflow

### **Code Quality Checks**
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Build verification
npm run build
```

### **Development Server**
```bash
# Start development server
npm run dev

# Preview production build
npm run preview
```

### **Batch Simulation CLI**
```bash
# Run 1000 games with detailed output
npm run simulate -- --games 1000 --rows 20 --cols 20 --details

# Output JSON for analysis
npm run simulate -- --games 500 --json --shortcutsEnabled=false
```

## Critical Implementation Notes for AI Agents

### **Never Modify These Patterns**
1. **Hamiltonian Cycle Logic**: The cycle generation is mathematically precise
2. **RNG Seeding**: Maintains deterministic gameplay for testing
3. **Collision Detection**: Critical for game integrity
4. **State Immutability**: Essential for debugging and testing

### **Safe Areas for Enhancement**
1. **UI Components**: Visual improvements and new features
2. **Performance Optimizations**: Caching, memoization, object pooling
3. **New Visualization Options**: Additional rendering modes
4. **Statistics and Analytics**: Performance monitoring features
5. **Settings and Configuration**: New game parameters

### **Error Handling Requirements**
- Always validate inputs in public functions
- Use proper error boundaries in React components
- Log errors appropriately but don't break game flow
- Provide fallback behavior for edge cases

## Browser Compatibility Notes

- **No localStorage/sessionStorage in Artifacts**: Use React state instead
- **Canvas API**: Properly handle different device pixel ratios
- **requestAnimationFrame**: Include fallbacks for non-browser environments

## Pull Request Guidelines

When creating PRs, AI agents should ensure:
1. **Clear Description**: Explain the changes and rationale
2. **Test Coverage**: Include or update relevant tests
3. **Performance Impact**: Document any performance implications
4. **Code Quality**: Pass all linting and formatting checks
5. **Documentation**: Update JSDoc comments if needed

## AI Agent Success Criteria

AI agents working with this codebase are considered successful when they:
1. **Maintain Architecture**: Preserve the clean separation between layers
2. **Enhance Performance**: Improve frame rates and reduce memory usage
3. **Extend Functionality**: Add features without breaking existing behavior
4. **Follow Conventions**: Match the established coding patterns and standards
5. **Pass All Tests**: Ensure comprehensive test coverage for new code
