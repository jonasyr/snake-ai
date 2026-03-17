# Snake AI - Multi-Algorithm Pathfinding Platform

<div align="center">

# Snake AI

A multi-algorithm Snake AI platform built with React 19 and Vite. Six pathfinding algorithms compete
to fill the grid, with live statistics, algorithm-specific visualizations, and a headless simulation
CLI for benchmarking. The engine is fully deterministic and pure-functional.

<img width="1674" height="1237" alt="Snake AI gameplay" src="https://github.com/user-attachments/assets/c22d1890-11a2-41ff-a0a9-a841c7c16d43" />

</div>

## Table of Contents

1. [Features](#features)
2. [Algorithms](#algorithms)
3. [Architecture Overview](#architecture-overview)
4. [Getting Started](#getting-started)
5. [Available Scripts](#available-scripts)
6. [Git Workflow & Quality Gates](#git-workflow--quality-gates)
7. [Configuration & Controls](#configuration--controls)
8. [Simulation CLI](#simulation-cli)
9. [Testing & Quality](#testing--quality)
10. [Project Structure](#project-structure)
11. [Technology Stack](#technology-stack)

## Features

- **6 AI algorithms** – Switch between Hamiltonian, A\*, BFS, Dijkstra, Greedy Best-First, and
  Hamiltonian + Shortcuts from the settings panel.
- **Algorithm visualizer plugin system** – Each algorithm family renders its own canvas overlay
  (Hamiltonian cycle path, shortcut indicators, planned graph path).
- **Deterministic engine** – Seeded RNG produces reproducible runs for debugging and benchmarking.
- **High-performance rendering** – Canvas renderer employs incremental updates and cached static
  layers.
- **Rich telemetry** – Live statistics: fill percentage, head distances, efficiency, moves, and
  per-algorithm performance badges.
- **User customization** – Toggle visualization layers, tweak speed, tune shortcut safety buffers,
  and choose grid size.

## Algorithms

| Algorithm               | Completion | Speed     | Notes                                                     |
| ----------------------- | ---------- | --------- | --------------------------------------------------------- |
| Hamiltonian Cycle       | 100%       | Slow      | Guaranteed safe — visits every cell in order              |
| Hamiltonian + Shortcuts | 100%       | Medium    | Takes safe shortcuts when the tail is far enough          |
| A\* Pathfinding         | ~60%       | Fast      | Optimal shortest path with tail-reachability safety check |
| Dijkstra's Algorithm    | ~55%       | Medium    | Uniform-cost search — optimal path without a heuristic    |
| Breadth-First Search    | ~55%       | Medium    | Explores all paths equally until fruit is found           |
| Greedy Best-First       | ~20%       | Very Fast | Always moves toward fruit — highest risk, highest speed   |

Select any algorithm from the **Settings → AI Algorithm** dropdown. The info card shows pros, cons,
completion rate, speed, and difficulty for the selected algorithm.

## Architecture Overview

- **Engine (`src/engine`)** – Pure functional logic: state transitions, Hamiltonian generation,
  pathfinding strategies (Strategy pattern), seeded RNG, and object pools.
- **Game loop (`src/game`)** – Frame-locked loop coordinating ticks and deterministic scheduling.
- **UI (`src/ui`)** – React components, canvas hooks with visualizer plugin system, and settings
  panel.
- **Simulation (`src/simulation`)** – Headless runner for large-scale experiments and regression
  testing.
- **Utilities (`src/utils`)** – Shared math, guards, constants, `CircularQueue`, and data helpers.

The engine layer is intentionally side-effect free. All browser integration lives inside hooks and
loop helpers to keep the core logic portable and easily testable.

### Visualizer Plugin System

Each algorithm family has a dedicated `BaseVisualizer` subclass in `src/ui/visualizers/`:

- `HamiltonianVisualizer` – Renders the Hamiltonian cycle and shortcut indicators.
- `GraphVisualizer` – Renders the planned path for A\*, BFS, Dijkstra, and Greedy.

Visualizers are registered in `src/ui/visualizers/index.js` and loaded automatically based on the
active algorithm.

## Getting Started

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev

# Build an optimized production bundle
npm run build
```

Visit `http://localhost:5173` once the dev server is running. Keyboard shortcuts are available for
play/pause (`Space`), single-step (`→`), reset (`R`), and closing the settings panel (`Esc`).

## Available Scripts

### Development

```bash
npm run dev         # Start the development server
npm run build       # Produce a production-ready build
npm run preview     # Preview the production build locally
```

### Testing & Quality (Automated via Git Hooks)

```bash
npm test            # Interactive test runner (watch mode)
npm run test:coverage # Tests with coverage report
npm run test:ci     # CI-friendly test run (no watch)
npm run test:ui     # Visual test interface

npm run lint        # Check code with ESLint
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format code with Prettier
npm run format:check # Verify formatting

# Comprehensive quality validation
npm run quality     # Run all checks (lint + format + test)
npm run quality:fix # Fix all auto-fixable issues
```

### Simulation & Analysis

```bash
npm run simulate    # Execute headless simulations
npm run optimize    # Parameter optimization
npm run analyze     # Analyze simulation results
```

## Configuration & Controls

- **Algorithm selection** – Choose from 6 algorithms via the settings panel dropdown. The info card
  shows description, pros/cons, completion rate, speed, and difficulty.
- **Grid size** – Choose from several presets. The engine enforces at least one even dimension for
  the Hamiltonian cycle.
- **Random seed** – Provide a seed for deterministic gameplay or generate a random one from the UI.
- **Shortcut tuning** – When using Hamiltonian + Shortcuts, adjust safety buffer and late-game lock
  thresholds.
- **Speed slider** – Adjust tick rate directly from the control bar for rapid or slow-motion
  analysis.

All user-selected values are persisted to `localStorage` and validated before being applied to the
engine.

## Simulation CLI

Run large batches of AI-only games without a browser to gather aggregate statistics:

```bash
# Run 1,000 games with A* on a 20x20 grid
npm run simulate -- --games 1000 --rows 20 --cols 20 --algorithm astar --details

# Compare algorithms: run 500 games each with BFS and Dijkstra
npm run simulate -- --games 500 --algorithm bfs
npm run simulate -- --games 500 --algorithm dijkstra

# Output raw JSON for downstream analysis
npm run simulate -- --games 500 --rows 16 --cols 16 --json
```

Common flags:

| Flag                        | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `--games <n>`               | Number of games to run (default `1`).                                                           |
| `--rows <n>` / `--cols <n>` | Grid dimensions used for every run.                                                             |
| `--algorithm <name>`        | Algorithm to use: `hamiltonian`, `hamiltonian-shortcuts`, `astar`, `dijkstra`, `bfs`, `greedy`. |
| `--seed <n>`                | Base seed. Combine with `--uniqueSeeds=false` to reuse it.                                      |
| `--shortcutsEnabled=false`  | Disable shortcut logic for Hamiltonian baseline.                                                |
| `--details`                 | Include a console table of per-game results.                                                    |
| `--json`                    | Emit machine-readable JSON including per-run data.                                              |

### Shortcut parameter sweep

The sweep CLI automates exploration of shortcut tuning parameters. It runs large batches for every
combination of the supplied ranges, tracks progress, and persists aggregated metrics to JSON and/or
CSV for offline analysis.

```bash
# Explore safety buffer values 1–4 and late-game locks 0, 2, 4 with 2,000 games
# per configuration. Results are written to both JSON and CSV files.
npm run simulate:sweep -- \
  --games 2000 \
  --safetyBuffer 1:4:1 \
  --lateGameLock 0,2,4 \
  --output results/shortcut-sweep.json \
  --format both

# Compare shortcut-enabled vs. disabled behavior on a 16x16 grid.
npm run simulate:sweep -- --shortcutsEnabled true,false --rows 16 --cols 16
```

Supported options include ranges (e.g. `0:6:1`) or comma-separated value lists. By default each
configuration runs 1,000 games with unique seeds. Progress and best-performing configurations are
printed to the console while the sweep is in progress.

## Testing & Quality

**Automated via Git Hooks** - Quality checks run automatically on commit/push:

- **Unit and integration tests** - Located under `src/tests`, covering engine logic, game loop
  behavior, simulations, and all 6 pathfinding strategies (54 tests)
- **ESLint** - Enforces consistent code style and best practices
- **Prettier** - Automatic code formatting
- **Build verification** - Ensures production builds work
- **Coverage reporting** - Comprehensive test coverage analysis
- **Deterministic seeds** - Tests use seeded RNG for repeatability

Manual quality checks (optional):

```bash
npm run quality      # Run all quality checks
npm run quality:fix  # Fix all auto-fixable issues
```

## Project Structure

```txt
src/
├── engine/
│   ├── pathfinding/
│   │   ├── strategies/    # HamiltonianStrategy, AStarStrategy, BFSStrategy,
│   │   │                  # DijkstraStrategy, GreedyStrategy
│   │   ├── worker/        # Off-thread pathfinding via WorkerPool
│   │   └── algorithmRegistry.js  # Single source of truth for all algorithms
│   └── ...                # snake, hamiltonian, collision, fruit, rng, grid
├── game/          # Game loop orchestration and persistent settings
├── simulation/    # Headless batch runner and parameter sweep
├── ui/
│   ├── components/        # React UI components
│   ├── hooks/             # useGameState, useCanvas
│   └── visualizers/       # BaseVisualizer, HamiltonianVisualizer, GraphVisualizer
├── utils/         # Shared constants, guards, math, CircularQueue
└── tests/         # Vitest suites (unit, integration, simulation)
```

## Technology Stack

- **React 19** with functional components and hooks
- **Vite** for lightning-fast development and build tooling
- **Tailwind CSS v4** for utility-first styling
- **Vitest** and **Testing Library** for automated testing
- **ESLint** for linting and consistent code quality

---

Enjoy exploring the Snake AI algorithms! Contributions, ideas, and performance improvements are
always welcome.
