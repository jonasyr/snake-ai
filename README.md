# Snake AI - Hamiltonian Cycle with Smart Shortcuts

A modern, highly optimized Snake game featuring autonomous AI that uses Hamiltonian cycle pathfinding with intelligent shortcuts. Built with React and a pure functional game engine.

![Snake AI Demo](<img width="1674" height="1237" alt="image" src="https://github.com/user-attachments/assets/c22d1890-11a2-41ff-a0a9-a841c7c16d43" />)




## ✨ Features

- **Autonomous AI Snake** - Never fails using Hamiltonian cycle algorithm
- **Smart Shortcuts** - AI takes safe shortcuts to reach fruit faster
- **Deterministic Gameplay** - Seeded RNG for reproducible games
- **High Performance** - 60+ FPS with Web Workers for pathfinding
- **Modern Architecture** - Clean separation between engine and UI
- **Comprehensive Testing** - Unit, integration, and property-based tests
- **Visual Customization** - Toggle cycle visualization and shortcuts

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Run headless simulations
npm run simulate -- --games 1000 --rows 20 --cols 20 --details
```

## 🧪 Headless simulations

Use the built-in simulator to execute thousands of AI-only games without the browser. This is ideal for collecting statistics such as completion rate, average moves, or duration for a given grid size.

```bash
# Run 1,000 games on a 20x20 board and show summary plus sample runs
npm run simulate -- --games 1000 --rows 20 --cols 20 --details --sample 5

# Output the raw JSON data for further processing
npm run simulate -- --games 500 --rows 16 --cols 16 --json
```

Key flags:

- `--games` – number of games to run (defaults to 1)
- `--rows` / `--cols` – grid dimensions
- `--seed` – base seed for deterministic runs
- `--uniqueSeeds=false` – reuse the same seed for each run
- `--details` – print a table with per-game results
- `--json` – emit machine-readable JSON instead of formatted text
- `--shortcutsEnabled=false` – disable shortcut logic for comparison runs
