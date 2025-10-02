# Project Agents.md Guide for OpenAI Codex

This Agents.md file provides comprehensive guidance for OpenAI Codex and other AI agents working with this codebase.

## Project Overview for AI Agents

This is a **Snake AI** project implementing autonomous Snake gameplay using Hamiltonian cycle pathfinding with intelligent shortcuts. The project demonstrates advanced game engine architecture, multi-strategy pathfinding, performance optimization, and comprehensive testing practices.

**Core Concept**: An AI-controlled Snake that can use multiple pathfinding strategies, from guaranteed-safe Hamiltonian cycles to aggressive A* pathfinding, with smart shortcuts to optimize performance.

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
│   │   ├── shortcuts.js     # DEPRECATED - use pathfinding strategies instead
│   │   ├── snake.js         # Snake state with circular buffer optimization
│   │   ├── types.js         # JSDoc type definitions
│   │   └── pathfinding/     # Multi-strategy pathfinding system (NEW)
│   │       ├── index.js              # Public API and manager
│   │       ├── PathfindingManager.js # Strategy coordinator
│   │       ├── PathfindingStrategy.js # Base strategy classes
│   │       ├── GameStateAdapter.js   # State normalization
│   │       ├── WorkerPool.js         # Web Worker pool for expensive operations
│   │       ├── algorithmRegistry.js  # Available algorithms registry
│   │       ├── strategies/           # Strategy implementations
│   │       │   ├── HamiltonianStrategy.js  # Hamiltonian with shortcuts
│   │       │   ├── AStarStrategy.js        # A* pathfinding
│   │       │   └── BFSStrategy.js          # Breadth-first search
│   │       └── worker/               # Worker runtime
│   │           └── PathfindingWorker.js
│   ├── game/                # Game loop and settings
│   │   ├── gameLoop.js      # Frame-locked game loop with state pooling
│   │   └── settings.js      # Persistent settings (uses localStorage - OK here)
│   ├── simulation/          # Headless batch simulation
│   │   ├── index.js         # Simulation exports
│   │   ├── simulator.js     # Batch game runner
│   │   └── parameterSweep.js # Parameter exploration utilities (NEW)
│   ├── ui/                  # React user interface
│   │   ├── components/      # Reusable UI components
│   │   └── hooks/           # Custom React hooks
│   ├── utils/               # Shared utilities
│   │   ├── collections.js   # Performance data structures (object pools, queues)
│   │   ├── constants.js     # Global constants and config
│   │   ├── guards.js        # Type validation utilities
│   │   └── math.js          # Mathematical operations
│   └── tests/               # Comprehensive test suite
├── scripts/                 # CLI tools and automation
│   ├── simulate.js         # Single game simulation
│   ├── optimize.js         # Parameter optimization (NEW)
│   └── analyze-results.js  # Results analysis (NEW)
└── [config files]          # Build and development configuration
```

## Technology Stack & Dependencies

**Core Technologies:**
- **React 19.1.1** - UI framework with latest hooks
- **Vite 7.1.2** - Build tool and development server
- **Tailwind CSS v4.1.12** - Utility-first styling (latest version)
- **Vitest** - Testing framework with coverage support
- **ESLint 9.33.0** - Code quality and standards

**Key Libraries:**
- `lucide-react` - Icon system
- `prop-types` - Runtime type checking for React components

**Development Tools:**
- `jsdom` - DOM simulation for tests
- `husky` - Git hooks
- `lint-staged` - Pre-commit linting
- `prettier` - Code formatting

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
  const internal = getInternalState(snake);
  const updatedOccupied = new Set(internal.occupied);
  // ... pure transformations using circular buffer
  return createSnakeView({ buffer, capacity, headIndex, length, occupied });
}

// ❌ INCORRECT - Mutation
export function moveSnake(snake, newHead, grow = false) {
  snake.body.unshift(newHead); // Mutates input
  return snake;
}
```

### 2. **State Management Hierarchy**
- **Engine Layer**: Pure state transitions with object pooling
- **Game Layer**: Game loop with sequential update queue to prevent re-entrancy
- **UI Layer**: React state with memoization for performance
- **Simulation Layer**: Batch processing without UI overhead

### 3. **Pathfinding Architecture** (CRITICAL NEW SYSTEM)
The project now uses a **strategy pattern** for pathfinding:

```javascript
// Strategies available:
const ALGORITHMS = {
  HAMILTONIAN: 'hamiltonian',              // Pure cycle following
  HAMILTONIAN_SHORTCUTS: 'hamiltonian-shortcuts',  // With smart shortcuts
  ASTAR: 'astar',                          // A* search to fruit
  BFS: 'bfs',                              // Breadth-first search
  // More strategies can be added by implementing PathfindingStrategy
};

// Using the pathfinding system:
import { ensurePathfindingStrategy } from '../engine/pathfinding/index.js';

const manager = await ensurePathfindingStrategy(gameState, {
  algorithm: 'hamiltonian-shortcuts',
  config: { safetyBuffer: 3, lateGameLock: 2 }
});

const plan = await manager.planMove(gameState, options);
// Returns: { nextMove, isShortcut, reason, plannedPath, metadata }
```

**Adding New Strategies:**
1. Extend `PathfindingStrategy` or `GraphPathfindingStrategy`
2. Implement `async planNextMove(standardState, options)`
3. Register in `algorithmRegistry.js`
4. Add default config in `ALGORITHM_DEFAULT_CONFIGS`

### 4. **Performance-First Design**
AI agents should prioritize performance optimizations:
- **Circular Buffer**: Snake state uses circular buffer for O(1) moves
- **Object Pooling**: Game states and planner data are pooled to reduce GC
- **Set/Map Usage**: O(1) lookups for occupied cells and cycle positions
- **Canvas Optimization**: Incremental rendering with dirty region tracking
- **Memoization**: Cached calculations where appropriate
- **Worker Pool**: Expensive pathfinding can run off main thread

**Example - Object Pool Pattern:**
```javascript
const statePool = createObjectPool(
  () => ({ ...initialState }),              // Create function
  (state) => { /* reset state */ },         // Reset function
  256                                        // Max pool size
);

const state = statePool.get();              // Acquire from pool
// ... use state ...
statePool.release(state);                   // Return to pool
```

## Coding Conventions for AI Agents

### **JavaScript/JSDoc Standards**
- **Documentation**: Every function must have comprehensive JSDoc comments
- **Naming**: Use descriptive camelCase names, UPPER_SNAKE_CASE for constants
- **Error Handling**: Always include proper error boundaries and validation
- **Configuration**: Use `createRuntimeConfig()` to merge base + algorithm defaults

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
- Use `useCallback` and `useMemo` to prevent unnecessary re-renders

```javascript
const GameCanvas = ({ gameState, settings, visualOptions }) => {
  // Memoize expensive computations
  const drawOptions = useMemo(() => ({
    showCycle: visualOptions.showCycle,
    showShortcuts: visualOptions.showShortcuts,
  }), [visualOptions.showCycle, visualOptions.showShortcuts]);
  
  // Component implementation
};

GameCanvas.propTypes = {
  gameState: PropTypes.shape({
    status: PropTypes.string.isRequired,
  }).isRequired,
  settings: PropTypes.object.isRequired,
  visualOptions: PropTypes.object,
};

export default React.memo(GameCanvas);
```

### **Canvas Rendering Conventions**
- Use `pixelated` image rendering for retro aesthetics
- Implement **incremental rendering** - only redraw changed cells
- Create static background layer for grid and cycle
- Handle high DPI displays properly
- Clean up resources in useEffect cleanup functions

```javascript
// ✅ CORRECT - Incremental rendering
function renderIncremental(ctx, staticCanvas, state, prevRender, ...) {
  const cellsToRestore = new Set();
  // Identify changed cells
  if (prevTail !== snakeTail) cellsToRestore.add(prevTail);
  // Restore only changed cells from static layer
  cellsToRestore.forEach(cell => restoreCellFromStatic(ctx, staticCanvas, cell));
  // Redraw only what changed
}

// ❌ INCORRECT - Full redraw every frame
function render(ctx, state) {
  ctx.clearRect(0, 0, width, height);
  // Redraw everything - too expensive
}
```

### **localStorage Usage Guidelines** (IMPORTANT)
- **✅ ALLOWED**: Main application code (`src/game/settings.js`)
- **❌ FORBIDDEN**: Web Workers, artifacts, isolated contexts
- **Alternative**: Use React state, memory, or worker messages

```javascript
// ✅ CORRECT - In main application
export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// ❌ INCORRECT - In worker or artifact
self.addEventListener('message', () => {
  localStorage.setItem('key', 'value'); // Will fail!
});

// ✅ CORRECT - In worker, use messages
self.addEventListener('message', (event) => {
  const result = compute(event.data);
  self.postMessage({ result }); // Send back to main thread
});
```

### **Testing Requirements**
- **Unit Tests**: Test individual functions in isolation with deterministic seeds
- **Integration Tests**: Test component interactions and game flow
- **Simulation Tests**: Test batch game running and parameter exploration
- **Mock Browser APIs**: Use test setup for Canvas, requestAnimationFrame
- **Coverage**: Aim for high coverage, especially in engine layer

```javascript
describe('Game Engine Integration', () => {
  let gameState;

  beforeEach(() => {
    seed(12345); // Deterministic tests with seeded RNG
    gameState = initializeGame({ rows: 10, cols: 10, seed: 12345 });
  });

  it('should advance game when playing', async () => {
    const playingState = setGameStatus(gameState, GAME_STATUS.PLAYING);
    const result = await gameTick(playingState);

    expect(result.result.valid).toBe(true);
    expect(result.state.moves).toBe(1);
  });
});
```

## File Organization Patterns

### **Module Exports**
- Use **named exports** for utilities and functions
- Use **default exports** for React components
- Group related exports in index files
- Export constants alongside functions

```javascript
// ✅ Engine module exports
export function moveSnake(snake, newHead, grow) { /* ... */ }
export function getHead(snake) { /* ... */ }
export const DIRECTIONS = { UP, DOWN, LEFT, RIGHT };

// ✅ React component exports
export default React.memo(GameCanvas);
```

### **Import Organization**
```javascript
// 1. External libraries (React, third-party)
import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

// 2. Internal modules (engine first, then game, then UI)
import { gameTick, resetGame } from '../engine/gameEngine.js';
import { ensurePathfindingStrategy } from '../engine/pathfinding/index.js';
import { useGameState } from './hooks/useGameState.js';

// 3. Constants and utilities
import { DEFAULT_CONFIG, COLORS } from '../utils/constants.js';

// 4. Assets and styles (if any)
```

## Performance Optimization Guidelines

### **Critical Performance Areas**
1. **Canvas Rendering**: Incremental updates, static layer caching
2. **Game Loop**: Fixed timestep with accumulator, sequential update queue
3. **Pathfinding**: Worker pool for expensive strategies, strategy switching
4. **Memory Management**: Object pooling for states and planner data
5. **Snake State**: Circular buffer for O(1) head/tail operations

### **Optimization Patterns AI Agents Should Follow**

**Object Pooling:**
```javascript
// Create pools for frequently allocated objects
const statePool = createObjectPool(
  () => ({ /* initial state */ }),
  (state) => { /* reset state */ },
  256  // Max pool size
);

// Use in hot paths
const state = statePool.get();
// ... use state ...
statePool.release(state);  // Return to pool when done
```

**Memoization:**
```javascript
// Memoize expensive calculations
const memoizedPath = useMemo(
  () => calculatePath(from, to, obstacles),
  [from, to, obstacles]
);
```

**Circular Queue for BFS:**
```javascript
import { CircularQueue } from '../utils/collections.js';

const queue = new CircularQueue(1000);
queue.enqueue(startNode);
while (!queue.isEmpty()) {
  const node = queue.dequeue();
  // Process node
}
```

## Testing Strategy for AI Agents

### **Running Tests**
```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run with UI
npm test:ui

# Run specific test file
npm test src/tests/engine/gameEngine.test.js

# Run tests in watch mode during development
npm test -- --watch
```

### **Test File Organization**
- `src/tests/engine/` - Engine module unit tests (pure functions)
- `src/tests/integration/` - Cross-module integration tests
- `src/tests/simulation/` - Batch simulation tests
- `src/tests/setup.js` - Test environment configuration (mocks Canvas, RAF)

### **Testing Patterns**
```javascript
// ✅ Proper test structure with seeded RNG
import { seed } from '../../engine/rng.js';

describe('Game Engine Integration', () => {
  let gameState;

  beforeEach(() => {
    seed(12345); // Deterministic tests
    gameState = initializeGame({ rows: 10, cols: 10, seed: 12345 });
  });

  it('should advance game when playing', async () => {
    const playingState = setGameStatus(gameState, GAME_STATUS.PLAYING);
    const result = await gameTick(playingState);

    expect(result.result.valid).toBe(true);
    expect(result.state.moves).toBe(1);
  });
});
```

## Development Workflow

### **Code Quality Checks**
```bash
# Linting (runs ESLint with project config)
npm run lint
npm run lint:fix

# Formatting (uses Prettier)
npm run format
npm run format:check

# Build verification
npm run build

# All checks before commit
npm run lint && npm run format:check && npm test
```

### **Development Server**
```bash
# Start development server (Vite)
npm run dev

# Preview production build
npm run preview
```

### **Batch Simulation CLI**
```bash
# Run 1000 games with detailed output
npm run simulate -- --games 1000 --rows 20 --cols 20 --details

# Output JSON for analysis
npm run simulate -- --games 500 --json

# Test different algorithm
npm run simulate -- --games 100 --algorithm astar

# Disable shortcuts for baseline comparison
npm run simulate -- --games 1000 --shortcutsEnabled=false
```

### **Parameter Optimization** (NEW TOOLS)
```bash
# Quick parameter discovery
npm run optimize -- --games 1000 --samples 100

# Deep parameter exploration
npm run optimize -- --games 2000 --samples 200 --rounds 5

# Analyze results
npm run analyze -- --file results/optimize-*.json

# Parameter sweep for specific values
npm run simulate:sweep -- \
  --games 2000 \
  --safetyBuffer 2:4:0.1 \
  --lateGameLock 0:6:0.5 \
  --output sweep-results.json
```

## Critical Implementation Notes for AI Agents

### **Never Modify These Patterns**
1. **Hamiltonian Cycle Logic**: Mathematically precise, handles both even rows and even columns
2. **RNG Seeding**: Maintains deterministic gameplay for testing and reproducibility
3. **Collision Detection**: Critical for game integrity
4. **State Immutability**: Essential for debugging, testing, and time-travel
5. **Circular Buffer**: Snake state implementation - maintains O(1) operations

### **Safe Areas for Enhancement**
1. **New Pathfinding Strategies**: Implement new PathfindingStrategy subclasses
2. **UI Components**: Visual improvements and new features
3. **Performance Optimizations**: Additional caching, memoization, pooling
4. **New Visualization Options**: Additional rendering modes
5. **Statistics and Analytics**: Performance monitoring features
6. **Settings and Configuration**: New game parameters
7. **CLI Tools**: New simulation or analysis scripts

### **Pathfinding Strategy Implementation Pattern**
```javascript
// To add a new pathfinding strategy:

// 1. Create strategy class
import { GraphPathfindingStrategy } from '../PathfindingStrategy.js';

export class MyNewStrategy extends GraphPathfindingStrategy {
  constructor(config = {}) {
    super(config);
    this.name = 'my-strategy';
    this.isExpensive = true;  // Set true if should use worker pool
  }

  async planNextMove(standardState, options = {}) {
    const gameState = standardState.original;
    // ... implement strategy logic ...
    return this.createPlanningResult(nextMove, {
      isShortcut: false,
      reason: 'Strategy reasoning',
      plannedPath: [...],
      metadata: { /* debug info */ }
    });
  }
}

// 2. Register in algorithmRegistry.js
import { MyNewStrategy } from './strategies/MyNewStrategy.js';

manager.registerStrategy('my-strategy', MyNewStrategy);

// 3. Add to ALGORITHMS and ALGORITHM_INFO
export const ALGORITHMS = {
  // ... existing ...
  MY_STRATEGY: 'my-strategy',
};

// 4. Add default config if needed
const ALGORITHM_DEFAULT_CONFIGS = {
  'my-strategy': { myParam: 42 },
};
```

### **Error Handling Requirements**
- Always validate inputs in public functions
- Use proper error boundaries in React components
- Log errors appropriately but don't break game flow
- Provide fallback behavior for edge cases
- In game loop, use sequential update queue to prevent re-entrancy

```javascript
// ✅ CORRECT - Error handling with fallback
try {
  const manager = await ensurePathfindingStrategy(gameState, { algorithm });
  pathPlan = await manager.planMove(gameState, config);
} catch (error) {
  console.error('Pathfinding error:', error);
  pathPlan = null;  // Fall back to cycle following
}

if (!isValidCellIndex(nextCell, totalCells)) {
  const fallbackCell = getCycleFallbackMove(gameState);
  // Use fallback instead of crashing
}
```

## Browser Compatibility Notes

- **localStorage/sessionStorage**: Only use in main application code, NOT in workers or artifacts
- **Canvas API**: Properly handle different device pixel ratios
- **requestAnimationFrame**: Include fallbacks for non-browser environments (tests)
- **Web Workers**: Use WorkerPool abstraction for portable pathfinding
- **ES Modules**: All files use ES module syntax (`import`/`export`)

## Pull Request Guidelines

When creating PRs, AI agents should ensure:
1. **Clear Description**: Explain changes and rationale, reference algorithm/strategy if applicable
2. **Test Coverage**: Include or update relevant tests, especially for engine changes
3. **Performance Impact**: Document any performance implications (profiling if significant)
4. **Code Quality**: Pass all linting, formatting, and build checks
5. **Documentation**: Update JSDoc comments, add examples for new APIs
6. **Breaking Changes**: Clearly flag any breaking changes to public APIs
7. **Backward Compatibility**: Maintain compatibility when possible

## AI Agent Success Criteria

AI agents working with this codebase are considered successful when they:

1. **Maintain Architecture**: Preserve clean separation between engine/game/UI layers
2. **Enhance Performance**: Improve frame rates, reduce memory usage, optimize hot paths
3. **Extend Functionality**: Add features (strategies, visualizations) without breaking existing behavior
4. **Follow Conventions**: Match established coding patterns and standards
5. **Pass All Tests**: Ensure comprehensive test coverage for new code
6. **Document Thoroughly**: Provide clear JSDoc and inline comments
7. **Optimize Strategically**: Use object pooling, memoization, and caching appropriately
8. **Handle Errors Gracefully**: Include proper error handling with fallbacks

## Common Pitfalls to Avoid

1. **Breaking Immutability**: Never mutate state objects in engine layer
2. **Forgetting Seeds**: Always use seeded RNG for deterministic tests
3. **localStorage in Workers**: Don't use browser storage in worker contexts
4. **Ignoring Object Pools**: Use pools for frequently allocated objects
5. **Full Canvas Redraws**: Use incremental rendering for performance
6. **Mixing Concerns**: Keep engine pure, game logic separate from UI
7. **Hardcoded Values**: Use constants or configuration instead
8. **Skipping PropTypes**: Always define PropTypes for React components
9. **Missing Cleanup**: Always clean up in useEffect return functions
10. **Re-entrancy Issues**: Use sequential update queue in game loop
