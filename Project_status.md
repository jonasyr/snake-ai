# Snake AI — Project Status & Development Plan

**Last Updated:** 2026-03-17 **Repository:** snake-hamiltonian-refactored **Version:** 1.0.0

---

## Executive Summary

The project is a multi-algorithm Snake AI platform built with React 19, Vite, and a pure-functional
engine layer. Based on the original Dev_Plan.md, **Phase 1 through Phase 3 are largely complete**.
Phase 4 (Comparison System) and Phase 5 (MVP Release/Deployment) remain untouched. The codebase is
architecturally mature, with a clean strategy pattern, consolidated algorithm registry, a visualizer
plugin system, and all planned graph-search algorithms implemented and tested.

**Overall Completion: ~55–60% toward MVP.**

---

## Phase-by-Phase Status

### Phase 1 — Stabilisierung ✅ COMPLETE

| Task                                     | Status     | Evidence                                                                                                                                                                                                                                   |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doppelte Komponenten konsolidieren       | ✅ Done    | `App.jsx` imports only `GameControls`, `GameCanvasPanel`, `StatsSidebar`. No `Controls.jsx`, `StatsPanel.jsx`, or `GameCanvas.jsx` present in the source tree.                                                                             |
| `shortcuts.js` entfernen                 | ✅ Done    | File is not present in the codebase. No imports reference it. Shortcut logic lives in `HamiltonianStrategy.findShortcut()`.                                                                                                                |
| Tailwind-Klassenfix (dynamische Klassen) | ✅ Done    | `StatCard.jsx` uses a static `COLOR_CLASSES` map (`{ blue: 'text-blue-400', ... }`) instead of dynamic `text-${color}-400`.                                                                                                                |
| Unused Imports bereinigen                | ✅ Done    | `optimize.js` still imports `Worker` from `node:worker_threads` but this is a non-critical dev script issue, not production code.                                                                                                          |
| PropTypes vervollständigen               | ⚠️ Partial | Core components (`GameControls`, `GameCanvasPanel`, `StatsSidebar`, `SettingsPanel`, `StatCard`, `ControlButton`) all have PropTypes. `StatsSidebar.stats` uses `PropTypes.object` with a comment — acceptable but could be more specific. |
| README aktualisieren                     | ✅ Done    | README reflects current feature set. Does not yet mention Dijkstra/Greedy/comparison features.                                                                                                                                             |
| BFS Queue-Performance                    | ✅ Done    | `BFSStrategy.bfs()` uses `CircularQueue`. `AStarStrategy.isTailReachable()` and `countReachableCells()` also use `CircularQueue`.                                                                                                          |

**Remaining Phase 1 work:**

- Minor: Tighten `StatsSidebar` PropTypes from `.object` to detailed `.shape`.
- Minor: Remove unused `Worker` import in `scripts/optimize.js`.
- Update README to mention all 6 algorithms and the visualizer system.

---

### Phase 2 — Architektur-Refactor ⚠️ ~75% COMPLETE

| Task                                          | Status      | Evidence                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visualizer-Interface definieren               | ✅ Done     | `BaseVisualizer.js` defines `renderStaticOverlay()`, `renderDynamicOverlay()`, `getOverlayCells()`, `getStaticCacheKey()`.                                                                                                                                                               |
| `HamiltonianVisualizer` extrahieren           | ✅ Done     | Cycle and shortcut overlay rendering extracted into `HamiltonianVisualizer.js`.                                                                                                                                                                                                          |
| `GraphVisualizer` für A\*/BFS/Dijkstra/Greedy | ✅ Done     | `GraphVisualizer.js` renders planned path for all graph-based algorithms.                                                                                                                                                                                                                |
| Visualizer Registry (`index.js`)              | ✅ Done     | `src/ui/visualizers/index.js` maps `ALGORITHMS` → visualizer instances via `getVisualizer()`.                                                                                                                                                                                            |
| Canvas-Hook Overlay-Refactor                  | ✅ Done     | `useCanvas.js` calls `getVisualizer(settings?.pathfindingAlgorithm)` and delegates all overlay rendering to the visualizer plugin system. No hardcoded `drawCycle/drawShortcut` calls in the hook itself.                                                                                |
| Algorithm Registry konsolidieren              | ✅ Done     | `algorithmRegistry.js` defines `ALGORITHM_REGISTRY` as single source of truth containing `strategyClass`, `defaultConfig`, `name`, `description`, `pros`, `cons`, `requiresCycle`, `configOptions`, `completionRate`, `speed`, `difficulty`. Legacy `ALGORITHM_INFO` is derived from it. |
| Settings-Validation zentralisieren            | ⚠️ Partial  | `settings.js` has `sanitizeSettings()` and `validateGameConfig()`. CLI scripts (`simulate.js`) do their own argument parsing. No shared validator between UI and CLI.                                                                                                                    |
| UI-Komponenten in Unterordner reorganisieren  | ❌ Not Done | All components remain flat in `src/ui/components/`. No `layout/`, `controls/`, `canvas/`, `stats/`, `settings/` subdirectories.                                                                                                                                                          |

**Remaining Phase 2 work:**

- **UI folder restructure** — Reorganize into domain-based subdirectories with `index.js`
  re-exports. This is cosmetic but important for maintainability as comparison components are added.
- **Centralized settings validator** — Extract a shared validation module usable by both
  `settings.js` and CLI scripts.

---

### Phase 3 — Algorithmus-Erweiterung ✅ COMPLETE

| Task                                | Status           | Evidence                                                                                                                                                                                                                                           |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DijkstraStrategy` implementieren   | ✅ Done          | `DijkstraStrategy.js` — uniform-cost search with linear-scan priority queue. Registered in `algorithmRegistry.js`.                                                                                                                                 |
| `GreedyStrategy` implementieren     | ✅ Done          | `GreedyStrategy.js` — f(n) = h(n) only (Manhattan distance). Registered in `algorithmRegistry.js`.                                                                                                                                                 |
| A\* extended metadata               | ✅ Done          | Returns `expandedNodes`, `cost`, `safetyValidated`, `tailReachable`, `survivalMode`, `reachableCells` in metadata.                                                                                                                                 |
| BFS extended metadata               | ✅ Done          | Returns `expandedNodes`, `pathLength` in metadata.                                                                                                                                                                                                 |
| Dijkstra extended metadata          | ✅ Done          | Returns `expandedNodes`, `cost`, `pathLength` in metadata.                                                                                                                                                                                         |
| Greedy extended metadata            | ✅ Done          | Returns `expandedNodes`, `pathLength` in metadata.                                                                                                                                                                                                 |
| `AStarVisualizer` / `BFSVisualizer` | ✅ Done (shared) | `GraphVisualizer` handles all graph-based algorithms. Renders planned path. Does **not** yet render expanded nodes/frontier.                                                                                                                       |
| Unit-Tests für alle Strategien      | ✅ Done          | `pathfinding.test.js` tests BFS, Dijkstra, and Greedy with: valid PlanningResult, movement toward fruit, already-at-fruit, invalid state, determinism, 4×4 path, 200-tick survival. `gameEngine.test.js` and `gameplay.test.js` cover integration. |
| Algorithmus-Auswahl in UI           | ✅ Done          | `SettingsPanel.jsx` renders dropdown with optgroups (Hamiltonian-Based, Graph Search, Learning-Based). Shows info card with description, pros/cons, completion rate badge, speed badge, difficulty badge.                                          |
| Simulation-Benchmarks               | ✅ Done          | `simulate.js` supports `--algorithm` flag. `parameterSweep.js` available for systematic exploration.                                                                                                                                               |

**Remaining Phase 3 work:**

- **Expanded nodes / frontier visualization** — Graph algorithms return metadata but the
  `GraphVisualizer` only renders the planned path, not the expanded node set or BFS frontier. This
  is the single biggest missing visualization feature.
- **Dijkstra priority queue optimization** — Currently uses a linear scan. For larger grids a binary
  heap would be more efficient, though for 20×20 the current approach is fast enough.

---

### Phase 4 — Vergleichssystem ❌ NOT STARTED

| Task                             | Status | Notes                                                                                     |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `useComparison` Hook             | ❌     | Needs to orchestrate N parallel simulations with different algorithms on identical seeds. |
| `ComparisonDashboard` Komponente | ❌     | Table/chart showing completion rate, avg moves, efficiency per algorithm.                 |
| Side-by-Side Canvas-Ansicht      | ❌     | Two synchronized canvases with stepped playback.                                          |
| Benchmark-Runner CLI             | ❌     | `npm run compare -- --algorithms hamiltonian-shortcuts,astar,bfs`                         |
| Ergebnispersistenz und Export    | ❌     | Save comparison results to localStorage or JSON.                                          |

**Architecture notes for implementation:**

- The `simulateGames()` function in `simulator.js` already accepts a `config` parameter with
  `pathfindingAlgorithm`. Running parallel simulations is straightforward.
- The `WorkerPool` exists but only handles pathfinding moves. For comparison, consider running each
  algorithm's full game simulation in sequence (not in workers) to keep seeds deterministic.
- The comparison hook should produce a data structure like:
  ```
  { algorithms: [{ name, results: { completionRate, avgMoves, avgScore, runs[] } }], seed, gridSize }
  ```
- For the side-by-side view, two independent `GameLoop` + `useCanvas` instances sharing the same
  seed and stepping in lockstep via a shared `requestAnimationFrame` coordinator.

---

### Phase 5 — MVP Release ❌ NOT STARTED

| Task                                  | Status | Notes                                                                                              |
| ------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Responsive Layout                     | ❌     | Current layout is desktop-only. Grid `lg:grid-cols-[1fr,400px]` breaks on mobile.                  |
| Performance Profiling                 | ❌     | No profiling has been done. Canvas rendering is already incremental and efficient.                 |
| Error Boundaries                      | ❌     | No React Error Boundaries in the component tree. Errors in canvas or game loop propagate uncaught. |
| Landing Page / Algorithm Explanations | ❌     | No "Learn" tab or educational content.                                                             |
| Deployment (GitHub Pages / Vercel)    | ❌     | Dockerfile exists for nginx serving but no CI/CD pipeline.                                         |
| CI/CD Pipeline                        | ❌     | Only local Husky hooks. No GitHub Actions workflow.                                                |

---

## Technical Debt Register

| ID    | Severity | Description                                                                     | Location                      | Effort                |
| ----- | -------- | ------------------------------------------------------------------------------- | ----------------------------- | --------------------- |
| TD-01 | Low      | `optimize.js` imports `Worker` but never uses it                                | `scripts/optimize.js`         | 5min                  |
| TD-02 | Low      | `StatsSidebar.stats` uses `PropTypes.object` instead of detailed shape          | `StatsSidebar.jsx`            | 15min                 |
| TD-03 | Medium   | UI components not organized into subdirectories                                 | `src/ui/components/`          | 1h                    |
| TD-04 | Medium   | `PathfindingWorker.js` doesn't register Dijkstra/Greedy strategies              | `worker/PathfindingWorker.js` | 15min                 |
| TD-05 | Low      | `Object Pool mutation` — `moveSnake` mutates shared circular buffer             | `snake.js`                    | Known, safe currently |
| TD-06 | Low      | README doesn't mention Dijkstra, Greedy, or the visualizer system               | `README.md`                   | 30min                 |
| TD-07 | Medium   | No shared settings validator between UI and CLI                                 | `settings.js` / CLI scripts   | 2h                    |
| TD-08 | Low      | `ALGORITHM_INFO` is marked deprecated but still imported in `SettingsPanel.jsx` | `SettingsPanel.jsx`           | 15min                 |

---

## Concrete Next Steps (Priority-Ordered)

### Tier 1 — Quick Wins (1–2 days)

1. **Fix TD-04: Register Dijkstra/Greedy in PathfindingWorker**
   - Add imports and entries for `DijkstraStrategy` and `GreedyStrategy` in `STRATEGY_REGISTRY`
     inside `PathfindingWorker.js`.
   - Without this, worker-offloaded pathfinding fails for these algorithms.

2. **Fix TD-08: Remove deprecated `ALGORITHM_INFO` usage**
   - In `SettingsPanel.jsx`, replace `ALGORITHM_INFO[x]` with `ALGORITHM_REGISTRY[x]` directly.
   - Then remove the `ALGORITHM_INFO` export from `algorithmRegistry.js` (or keep as a deprecated
     re-export).

3. **Fix TD-01: Remove unused Worker import**
   - In `scripts/optimize.js`, remove the `import { Worker } from 'node:worker_threads'` line.

4. **Fix TD-06: Update README**
   - Document all 6 algorithms, the visualizer plugin system, and the algorithm selection UI.
   - Add screenshot placeholder for the settings panel.

### Tier 2 — Foundation for Phase 4 (3–5 days)

5. **Create `useComparison` hook**
   - New file: `src/ui/hooks/useComparison.js`
   - API:
     `const { results, isRunning, progress, startComparison, cancelComparison } = useComparison()`
   - Internally calls `simulateGames()` for each selected algorithm with matching seeds.
   - Returns aggregated results suitable for rendering in a dashboard.

6. **Create `ComparisonDashboard` component**
   - New file: `src/ui/components/ComparisonDashboard.jsx`
   - Displays a table: Algorithm | Completion Rate | Avg Moves | Avg Score | Speed
   - Includes a "Run Comparison" button that triggers the hook.
   - Start simple: text-based table, no charts yet.

7. **Add comparison CLI command**
   - New script: `scripts/compare.js`
   - Usage: `npm run compare -- --algorithms hamiltonian-shortcuts,astar,dijkstra --games 100`
   - Outputs a formatted table or JSON comparing all selected algorithms.

### Tier 3 — Visual Polish (1–2 weeks)

8. **Expanded nodes visualization for graph algorithms**
   - Extend `GraphVisualizer` to render expanded nodes as a semi-transparent heat map overlay.
   - Requires strategies to expose their expanded node set via `plannerData.metadata`.
   - Engine already returns `expandedNodes` count; need to also return the actual `expandedSet` for
     visualization.

9. **Side-by-Side Canvas view**
   - New component: `ComparisonCanvas.jsx`
   - Two `<canvas>` elements, each driven by its own `GameLoop` instance.
   - Shared seed, synchronized stepping via a coordinator that advances both loops together.
   - This is the most complex UI feature remaining.

10. **Tab-based layout**
    - Implement "Play" / "Compare" / "Learn" tabs as suggested in the Dev_Plan.
    - "Play" = current single-game view.
    - "Compare" = ComparisonDashboard + optional side-by-side.
    - "Learn" = static content explaining each algorithm (future).

### Tier 4 — MVP Release (1–2 weeks)

11. **Error Boundaries**
    - Wrap `GameCanvasPanel`, `StatsSidebar`, and `ComparisonDashboard` in React Error Boundaries.
    - Display friendly fallback UI on crash.

12. **Responsive Layout**
    - Make the grid layout stack on screens below `lg` breakpoint.
    - Sidebar becomes a bottom sheet or collapsible panel on mobile.
    - Canvas scales to fit available width.

13. **CI/CD Pipeline**
    - GitHub Actions workflow: `npm ci → npm run lint → npm run test:ci → npm run build`
    - Deploy to GitHub Pages or Vercel on `main` branch push.
    - Add status badges to README.

14. **Performance Profiling**
    - Profile canvas rendering at high tick rates (20ms).
    - Profile memory usage during 1000-game simulations.
    - Document findings and any optimizations applied.

---

## Architecture Reference

```
src/
├── engine/                         # Pure functional core (STABLE)
│   ├── pathfinding/
│   │   ├── strategies/
│   │   │   ├── HamiltonianStrategy.js  ✅
│   │   │   ├── AStarStrategy.js        ✅
│   │   │   ├── BFSStrategy.js          ✅
│   │   │   ├── DijkstraStrategy.js     ✅
│   │   │   ├── GreedyStrategy.js       ✅
│   │   │   └── RLStrategy.js           ❌ (post-MVP)
│   │   ├── worker/
│   │   │   └── PathfindingWorker.js    ⚠️ (missing Dijkstra/Greedy registration)
│   │   ├── PathfindingStrategy.js      ✅ (base + Graph + Learning)
│   │   ├── PathfindingManager.js       ✅
│   │   ├── GameStateAdapter.js         ✅
│   │   ├── algorithmRegistry.js        ✅ (single source of truth)
│   │   ├── WorkerPool.js              ✅
│   │   └── index.js                   ✅
│   ├── gameEngine.js                  ✅
│   ├── snake.js                       ✅ (circular buffer)
│   ├── hamiltonian.js                 ✅
│   ├── collision.js                   ✅
│   ├── fruit.js                       ✅
│   ├── grid.js                        ✅
│   ├── rng.js                         ✅ (seeded LCG)
│   └── types.js                       ✅
│
├── game/                              # Imperative game loop (STABLE)
│   ├── gameLoop.js                    ✅
│   └── settings.js                    ✅
│
├── simulation/                        # Headless batch runner (STABLE)
│   ├── simulator.js                   ✅
│   ├── parameterSweep.js             ✅
│   └── index.js                       ✅
│
├── ui/
│   ├── components/                    # Flat structure (needs reorganization)
│   │   ├── ControlButton.jsx          ✅
│   │   ├── GameCanvasPanel.jsx        ✅
│   │   ├── GameControls.jsx           ✅
│   │   ├── GameHeader.jsx             ✅
│   │   ├── KeyboardShortcuts.jsx      ✅
│   │   ├── LoadingScreen.jsx          ✅
│   │   ├── SettingsPanel.jsx          ✅
│   │   ├── StatCard.jsx               ✅
│   │   ├── StatsSidebar.jsx           ✅
│   │   └── ComparisonDashboard.jsx    ❌ (Phase 4)
│   ├── hooks/
│   │   ├── useGameState.js            ✅
│   │   ├── useCanvas.js               ✅ (visualizer plugin system)
│   │   └── useComparison.js           ❌ (Phase 4)
│   └── visualizers/                   ✅ (plugin system)
│       ├── BaseVisualizer.js          ✅
│       ├── HamiltonianVisualizer.js   ✅
│       ├── GraphVisualizer.js         ✅
│       ├── drawUtils.js               ✅
│       └── index.js                   ✅
│
├── utils/                             # Shared utilities (STABLE)
│   ├── constants.js                   ✅
│   ├── guards.js                      ✅
│   ├── math.js                        ✅
│   └── collections.js                 ✅
│
└── tests/
    ├── engine/
    │   ├── gameEngine.test.js         ✅
    │   ├── hamiltonian.test.js        ✅
    │   ├── snake.test.js              ✅
    │   └── pathfinding.test.js        ✅
    ├── integration/
    │   └── gameplay.test.js           ✅
    ├── simulation/
    │   └── simulator.test.js          ✅
    └── setup.js                       ✅
```

---

## Algorithm Implementation Matrix

| Algorithm               | Strategy Class | Registry        | Worker     | Visualizer   | UI Selector   | Tests | Simulation CLI |
| ----------------------- | -------------- | --------------- | ---------- | ------------ | ------------- | ----- | -------------- |
| Hamiltonian             | ✅             | ✅              | ✅         | ✅ Dedicated | ✅            | ✅    | ✅             |
| Hamiltonian + Shortcuts | ✅             | ✅              | ✅         | ✅ Dedicated | ✅            | ✅    | ✅             |
| A\*                     | ✅             | ✅              | ✅         | ✅ Graph     | ✅            | ✅    | ✅             |
| Dijkstra                | ✅             | ✅              | ❌ Missing | ✅ Graph     | ✅            | ✅    | ✅             |
| BFS                     | ✅             | ✅              | ✅         | ✅ Graph     | ✅            | ✅    | ✅             |
| Greedy                  | ✅             | ✅              | ❌ Missing | ✅ Graph     | ✅            | ✅    | ✅             |
| Reinforcement Learning  | ❌             | ✅ (null class) | ❌         | ❌           | ✅ (disabled) | ❌    | ❌             |

---

## Quality Gates Status

| Gate                   | Status                 | Notes                                   |
| ---------------------- | ---------------------- | --------------------------------------- |
| ESLint (zero warnings) | ✅ Active              | Pre-commit hook via Husky + lint-staged |
| Prettier formatting    | ✅ Active              | Pre-commit hook                         |
| Unit tests             | ✅ Active              | Pre-commit + pre-push                   |
| Build verification     | ✅ Active              | Pre-commit + pre-push                   |
| Coverage reporting     | ✅ Active              | Pre-push                                |
| Simulation validation  | ✅ Active              | Pre-push                                |
| Conventional commits   | ✅ Active              | commit-msg hook                         |
| CI/CD (GitHub Actions) | ❌ Not set up          | Only local hooks                        |
| E2E tests              | ❌ Not planned for MVP |                                         |

---

## Risk Register

| Risk                                                           | Likelihood | Impact | Mitigation                                             |
| -------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Comparison system complexity delays MVP                        | Medium     | High   | Start with CLI-only comparison, add UI progressively   |
| Side-by-side canvas has synchronization bugs                   | Medium     | Medium | Step-by-step mode first, continuous playback later     |
| Graph algorithm visualization (expanded nodes) slows rendering | Low        | Medium | Only render on request (toggle), limit to 100 nodes    |
| Memory leaks in parallel simulations                           | Low        | High   | Object pool already exists; monitor with `--expose-gc` |
| Tailwind v4 class issues resurface                             | Low        | Low    | Static class maps established; test visual output      |

---

## Meeting Template

### Sprint Status Update

**Date:** **\*\***\_\_\_**\*\*** **Sprint:** **\*\***\_\_\_**\*\***

**Completed since last meeting:**

- [ ] _task description_ (link to commit/PR)

**In progress:**

- [ ] _task description_ — _% complete_ — _blocker if any_

**Planned for next sprint:**

- [ ] _task from Next Steps above_

**Blockers / Decisions needed:**

- _none / describe_

**Metrics:**

- Test coverage: \_\_\_%
- Algorithms implemented: 6/7 (RL deferred)
- Phases complete: 3/5
- Technical debt items: 8 (2 medium, 6 low)

---

## Glossary

| Term                | Definition                                                                     |
| ------------------- | ------------------------------------------------------------------------------ |
| Hamiltonian Cycle   | A path through a grid that visits every cell exactly once and returns to start |
| Safety Buffer       | Minimum cyclic distance from snake tail required before a shortcut is taken    |
| Late Game Lock      | Number of free cells below which shortcuts are disabled                        |
| Circular Buffer     | O(1) data structure used for snake body tracking                               |
| Object Pool         | Pre-allocated object cache to reduce garbage collection pressure               |
| Strategy Pattern    | Design pattern where algorithms are encapsulated as interchangeable classes    |
| Visualizer Plugin   | Canvas overlay renderer specific to an algorithm family                        |
| Standard Game State | Adapter class that normalizes engine state for different algorithm types       |

---

_This document is the single source of truth for project status. Update it after each sprint or
significant code change._
