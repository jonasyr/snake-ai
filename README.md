# Snake AI - Hamiltonian Cycle with Smart Shortcuts

<div align="center">

# Snake AI

Modern Snake implementation driven by a Hamiltonian-cycle AI with safe shortcutting. The engine is
fully deterministic, pure, and optimized for long-running simulations while the React UI provides
rich analytics and controls.

<img width="1674" height="1237" alt="Snake AI gameplay" src="https://github.com/user-attachments/assets/c22d1890-11a2-41ff-a0a9-a841c7c16d43" />

</div>

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Available Scripts](#available-scripts)
5. [Git Workflow & Quality Gates](#git-workflow--quality-gates)
6. [Configuration & Controls](#configuration--controls)
7. [Simulation CLI](#simulation-cli)
8. [Testing & Quality](#testing--quality)
9. [Project Structure](#project-structure)
10. [Technology Stack](#technology-stack)

## Features

- **Autonomous AI Snake** – Follows a Hamiltonian cycle and uses heuristics to take safe shortcuts.
- **Deterministic engine** – Seeded RNG produces reproducible runs for debugging and benchmarking.
- **High-performance rendering** – Canvas renderer employs incremental updates and cached layers.
- **Rich telemetry** – Live statistics such as fill percentage, head distances, and efficiency.
- **User customization** – Toggle visualization layers, tweak speed, and tune shortcut safety
  buffers.
- **Resilient UX** – Keyboard shortcuts, responsive layout, and defensive settings validation.

## Architecture Overview

- **Engine (`src/engine`)** – Pure functional logic for state transitions, Hamiltonian traversal,
  shortcuts, and RNG.
- **Game loop (`src/game`)** – Frame-locked loop coordinating ticks and handling deterministic
  scheduling.
- **UI (`src/ui`)** – React components and hooks for visualization, analytics, and configuration.
- **Simulation (`src/simulation`)** – Headless runner for large-scale experiments and regression
  testing.
- **Utilities (`src/utils`)** – Shared math, guards, constants, and data-structure helpers.

The engine layer is intentionally side-effect free. All browser integration lives inside hooks and
loop helpers to keep the core logic portable and easily testable.

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

- **Grid size** – Choose from several presets in the settings panel. The engine enforces at least
  one even dimension to maintain a Hamiltonian cycle.
- **Random seed** – Provide a seed for deterministic gameplay or generate a random one from the UI.
- **Shortcut tuning** – Enable/disable shortcuts and adjust the safety buffer that guards against
  tail collisions.
- **Speed slider** – Adjust tick rate directly from the control bar for rapid or slow-motion
  analysis.

All user-selected values are persisted to `localStorage` and validated before being applied to the
engine.

## Simulation CLI

Run large batches of AI-only games without a browser to gather aggregate statistics:

```bash
# Run 1,000 games on a 20x20 grid and print a summary with sample runs
npm run simulate -- --games 1000 --rows 20 --cols 20 --details --sample 5

# Output the raw JSON payload for downstream analysis
npm run simulate -- --games 500 --rows 16 --cols 16 --json
```

Common flags:

| Flag                        | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `--games <n>`               | Number of games to run (default `1`).                      |
| `--rows <n>` / `--cols <n>` | Grid dimensions used for every run.                        |
| `--seed <n>`                | Base seed. Combine with `--uniqueSeeds=false` to reuse it. |
| `--shortcutsEnabled=false`  | Disable shortcut logic for comparison baselines.           |
| `--details`                 | Include a console table of per-game results.               |
| `--json`                    | Emit machine-readable JSON including per-run data.         |

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
  behavior, and simulations
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
├── engine/        # Pure game-state transitions and Hamiltonian helpers
├── game/          # Game loop orchestration and persistent settings
├── simulation/    # Headless batch runner
├── ui/            # React components, canvas hook, and statistics panels
├── utils/         # Shared constants, guards, math utilities, collections
└── tests/         # Vitest suites (unit, integration, simulation)
```

## Technology Stack

- **React 19** with functional components and hooks
- **Vite** for lightning-fast development and build tooling
- **Tailwind CSS v4** for utility-first styling
- **Vitest** and **Testing Library** for automated testing
- **ESLint** for linting and consistent code quality

---

Enjoy exploring the Hamiltonian-powered Snake AI! Contributions, ideas, and performance improvements
are always welcome.
