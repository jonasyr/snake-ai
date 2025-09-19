# Snake AI - Hamiltonian Cycle with Smart Shortcuts

<div align="center">

# Snake AI

Modern Snake implementation driven by a Hamiltonian-cycle AI with safe shortcutting. The engine is fully deterministic, pure, and optimized for long-running simulations while the React UI provides rich analytics and controls.

<img width="1674" height="1237" alt="Snake AI gameplay" src="https://github.com/user-attachments/assets/c22d1890-11a2-41ff-a0a9-a841c7c16d43" />

</div>

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Available Scripts](#available-scripts)
5. [Configuration & Controls](#configuration--controls)
6. [Simulation CLI](#simulation-cli)
7. [Testing & Quality](#testing--quality)
8. [Project Structure](#project-structure)
9. [Technology Stack](#technology-stack)

## Features

- **Autonomous AI Snake** – Follows a Hamiltonian cycle and uses heuristics to take safe shortcuts.
- **Deterministic engine** – Seeded RNG produces reproducible runs for debugging and benchmarking.
- **High-performance rendering** – Canvas renderer employs incremental updates and cached layers.
- **Rich telemetry** – Live statistics such as fill percentage, head distances, and efficiency.
- **User customization** – Toggle visualization layers, tweak speed, and tune shortcut safety buffers.
- **Resilient UX** – Keyboard shortcuts, responsive layout, and defensive settings validation.

## Architecture Overview

- **Engine (`src/engine`)** – Pure functional logic for state transitions, Hamiltonian traversal, shortcuts, and RNG.
- **Game loop (`src/game`)** – Frame-locked loop coordinating ticks and handling deterministic scheduling.
- **UI (`src/ui`)** – React components and hooks for visualization, analytics, and configuration.
- **Simulation (`src/simulation`)** – Headless runner for large-scale experiments and regression testing.
- **Utilities (`src/utils`)** – Shared math, guards, constants, and data-structure helpers.

The engine layer is intentionally side-effect free. All browser integration lives inside hooks and loop helpers to keep the core logic portable and easily testable.

## Getting Started

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev

# Build an optimized production bundle
npm run build
```

Visit `http://localhost:5173` once the dev server is running. Keyboard shortcuts are available for play/pause (`Space`), single-step (`→`), reset (`R`), and closing the settings panel (`Esc`).

## Available Scripts

```bash
npm run dev         # Start the development server
npm run build       # Produce a production-ready build
npm run preview     # Preview the production build locally
npm test            # Execute the Vitest test suite
npm run lint        # Run ESLint with the repo configuration
npm run simulate    # Execute headless simulations (see below)
```

## Configuration & Controls

- **Grid size** – Choose from several presets in the settings panel. The engine enforces at least one even dimension to maintain a Hamiltonian cycle.
- **Random seed** – Provide a seed for deterministic gameplay or generate a random one from the UI.
- **Shortcut tuning** – Enable/disable shortcuts and adjust the safety buffer that guards against tail collisions.
- **Speed slider** – Adjust tick rate directly from the control bar for rapid or slow-motion analysis.

All user-selected values are persisted to `localStorage` and validated before being applied to the engine.

## Simulation CLI

Run large batches of AI-only games without a browser to gather aggregate statistics:

```bash
# Run 1,000 games on a 20x20 grid and print a summary with sample runs
npm run simulate -- --games 1000 --rows 20 --cols 20 --details --sample 5

# Output the raw JSON payload for downstream analysis
npm run simulate -- --games 500 --rows 16 --cols 16 --json
```

Common flags:

| Flag | Description |
| --- | --- |
| `--games <n>` | Number of games to run (default `1`). |
| `--rows <n>` / `--cols <n>` | Grid dimensions used for every run. |
| `--seed <n>` | Base seed. Combine with `--uniqueSeeds=false` to reuse it. |
| `--shortcutsEnabled=false` | Disable shortcut logic for comparison baselines. |
| `--details` | Include a console table of per-game results. |
| `--json` | Emit machine-readable JSON including per-run data. |

## Testing & Quality

- **Unit and integration tests** – Located under `src/tests`, covering engine logic, game loop behavior, and simulations.
- **ESLint** – Enforces consistent code style and best practices.
- **Deterministic seeds** – Many tests rely on seeded RNG for repeatability.

Run tests before committing:

```bash
npm test
npm run lint
```

## Project Structure

```
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

Enjoy exploring the Hamiltonian-powered Snake AI! Contributions, ideas, and performance improvements are always welcome.
