Ich habe das gesamte Repository analysiert. Hier ist meine umfassende Bewertung und der
Entwicklungsplan.

---

## 1. Repository-Analyse

### Architektur

Das Projekt folgt einer sauberen **3-Schichten-Architektur** mit einer zusätzlichen
Simulationsschicht:

**Engine Layer** (`src/engine/`) — Reine, seiteneffektfreie Funktionen für
Spielzustandstransitionen. Enthält Snake-Bewegung (Circular Buffer), Hamiltonian-Cycle-Generierung,
Kollisionserkennung, Fruit-Spawning, einen seeded RNG und das gesamte Pathfinding-System.

**Game Layer** (`src/game/`) — Imperative Spielschleife (`GameLoop`-Klasse) mit
`requestAnimationFrame`, sequentieller Update-Queue gegen Re-Entrancy, und Settings-Persistenz via
`localStorage`.

**UI Layer** (`src/ui/`) — React 19 mit funktionalen Komponenten, Canvas-Rendering über einen
`useCanvas`-Hook mit inkrementellem Rendering und statischer Background-Layer-Cacheung, und ein
`useGameState`-Hook als zentrale State-Brücke zwischen Engine und React.

**Simulation Layer** (`src/simulation/`) — Headless Batch-Runner für Performanzmessungen,
Parameter-Sweeps und Optimierung ohne Browser.

### Datenfluss

```
Settings (localStorage)
  → useGameState Hook
    → initializeGame() (Engine)
      → GameLoop Klasse
        → gameTick() (async, Engine)
          → ensurePathfindingStrategy() → PathfindingManager → Strategy.planNextMove()
          → checkCollision() → moveSnake() → spawnFruit()
        → onStateChange Callback
          → React setState → useCanvas → Canvas Rendering
```

### Wie die aktuelle Snake-AI funktioniert

Die Kern-AI basiert auf der `HamiltonianStrategy`. Sie generiert beim Spielstart einen
Hamiltonian-Zyklus (eine Reihenfolge, die jede Zelle genau einmal besucht), und die Snake folgt
diesem Zyklus. Der Trick sind **Shortcuts**: Wenn die Snake sicher eine Abkürzung zum Fruit nehmen
kann (gemessen an der zyklischen Distanz zum eigenen Tail, mit konfigurierbarem Safety-Buffer),
überspringt sie Teile des Zyklus. Das garantiert Vollständigkeit bei gleichzeitiger
Effizienzsteigerung.

---

## 2. Statusbewertung

### Vollständig implementiert

- Hamiltonian-Cycle-Generierung mit Validierung (even rows und even cols)
- Snake-State mit Circular Buffer und Object Pooling
- `HamiltonianStrategy` mit konfigurierbaren Shortcuts (safetyBuffer, lateGameLock,
  minShortcutWindow)
- `AStarStrategy` mit Tail-Reachability-Check und Survival-Modus
- `BFSStrategy` als einfache Breitensuche
- Komplettes Strategy Pattern via `PathfindingManager` + `algorithmRegistry`
- Simulation-CLI mit Batch-Runs, Parameter-Sweeps, und JSON/CSV-Export
- Canvas-Rendering mit inkrementellem Update und statischem Layer-Cache
- Settings-Persistenz, Import/Export, Validation
- Deterministische Tests mit seeded RNG
- Pre-commit Hooks (Husky + lint-staged), ESLint, Prettier
- WorkerPool-Abstraktion für Off-Thread-Pathfinding

### Teilweise implementiert

- **Dijkstra und Greedy** sind im `ALGORITHMS`-Enum und in `ALGORITHM_INFO` definiert, aber die
  Strategy-Klassen existieren nicht. Im Registry sind sie auskommentiert.
- **Reinforcement Learning** hat eine `LearningStrategy`-Basisklasse mit
  `loadModel`/`saveModel`/`recordTrainingData` Stubs, aber keine konkrete Implementierung.
- **Algorithmus-Vergleich** — die Simulation kann verschiedene Algorithmen testen, aber es gibt
  keine UI dafür und kein Comparison-Dashboard.
- **A-Star Safety** — der Tail-Reachability-Check ist vorhanden, aber A\* und BFS haben keine
  Garantie gegen Selbstblockierung bei längerer Snake. Sie verlieren regelmäßig.

### Fehlt komplett

- Algorithmus-Vergleichs-UI (Side-by-Side, Leaderboard, Statistiken)
- Visualisierung von Algorithmus-Internals (offene/geschlossene Knoten bei A\*, BFS-Frontier,
  Q-Values bei RL)
- Replay/Aufzeichnungssystem
- Dijkstra-Strategy, Greedy-Strategy
- Konkrete RL-Implementierung
- Responsives Layout für Mobile
- Accessibility (ARIA-Labels fehlen teilweise)
- E2E-Tests
- CI/CD Pipeline (nur lokale Hooks)

### Technische Schulden

1. **Doppelte Komponenten**: `Controls.jsx` und `GameControls.jsx` existieren parallel mit fast
   identischer Funktionalität. `StatsPanel.jsx` und `StatsSidebar.jsx` ebenso. `GameCanvas.jsx` und
   `GameCanvasPanel.jsx` auch.
2. **Deprecated Code**: `src/engine/shortcuts.js` ist als deprecated markiert, wird aber nie
   entfernt.
3. **Inkonsistente Prop-Types**: Manche Komponenten nutzen detaillierte shapes, andere
   `PropTypes.object`.
4. **Object Pool Mutation**: `moveSnake` mutiert den shared `buffer` des Circular Buffers direkt,
   obwohl die Architektur Immutabilität verspricht. Das funktioniert aktuell, weil der Buffer nie
   parallel gelesen wird, ist aber ein latentes Problem.
5. **Unused Imports**: `Worker` in `optimize.js` wird importiert aber nie genutzt.
6. **Tailwind v4 Dynamische Klassen**: `text-${color}-400` in `StatCard.jsx` funktioniert mit
   Tailwind v4 nicht zuverlässig (kein JIT-Scan von dynamischen Strings).

---

## 3. Rekonstruktion der ursprünglichen Vision

Aus der Codestruktur lässt sich klar ablesen:

Die ursprüngliche Vision war bereits eine **Multi-Algorithmus-Plattform**. Das belegen die
`PathfindingStrategy`-Basisklasse mit abstraktem `planNextMove`, die `GraphPathfindingStrategy` für
Graphen-basierte Algorithmen, die `LearningStrategy` für RL, das `algorithmRegistry` mit
vordefinierten Plätzen für Dijkstra/Greedy/RL, der `PathfindingManager` als zentrale
Koordinierungsstelle, und die `StandardGameState`-Adapter-Klasse, die den Engine-State für
verschiedene Algorithmustypen normalisiert (Graph-Repräsentation, Grid-Tensor für ML,
Feature-Extraktion).

Die Architektur war also bereits auf genau das ausgelegt, was du beschreibst. Die Kernabstraktion
steht. Was fehlt, ist hauptsächlich die Umsetzung auf UI-Ebene (Vergleiche, Visualisierung von
Internals) und die Fertigstellung der fehlenden Strategien.

---

## 4. Architekturvorschlag

Die bestehende Architektur ist gut. Ich empfehle Anpassungen, keine Neuentwicklung:

### Zielarchitektur

```
src/
├── engine/                    # Pure functional core (keine Änderung)
│   ├── pathfinding/
│   │   ├── strategies/        # Alle Algorithmus-Implementierungen
│   │   │   ├── HamiltonianStrategy.js
│   │   │   ├── AStarStrategy.js
│   │   │   ├── BFSStrategy.js
│   │   │   ├── DijkstraStrategy.js      ← NEU
│   │   │   ├── GreedyStrategy.js        ← NEU
│   │   │   └── RLStrategy.js            ← SPÄTER
│   │   ├── PathfindingStrategy.js       # Basisklassen
│   │   ├── PathfindingManager.js
│   │   ├── algorithmRegistry.js
│   │   └── index.js
│   └── ...
│
├── game/                      # Game loop + settings (minimal ändern)
│
├── simulation/                # Headless runner (bereits gut)
│
├── ui/
│   ├── components/
│   │   ├── layout/            ← NEU: Header, Sidebar, Layout
│   │   ├── controls/          ← NEU: Konsolidierte Controls
│   │   ├── canvas/            ← NEU: Canvas + Overlays
│   │   ├── stats/             ← NEU: Konsolidierte Stats
│   │   ├── settings/          ← NEU: Settings Panel
│   │   └── comparison/        ← NEU: Algorithmus-Vergleich
│   │       ├── ComparisonDashboard.jsx
│   │       ├── AlgorithmCard.jsx
│   │       └── BenchmarkRunner.jsx
│   ├── hooks/
│   │   ├── useGameState.js
│   │   ├── useCanvas.js
│   │   └── useComparison.js   ← NEU
│   └── visualizers/           ← NEU: Algorithmus-spezifische Overlays
│       ├── BaseVisualizer.js
│       ├── AStarVisualizer.js
│       ├── BFSVisualizer.js
│       └── HamiltonianVisualizer.js
│
├── utils/
└── tests/
```

### Schlüssel-Designentscheidungen

**Strategy Pattern bleibt** — es ist bereits korrekt implementiert. Jede Strategy implementiert
`planNextMove()` und liefert ein `PlanningResult` zurück.

**Visualizer-System NEU** — Jeder Algorithmus bekommt einen optionalen Visualizer, der
Algorithmus-Internals als Canvas-Overlay rendern kann (offene Knoten, Frontiers, Heuristik-Werte).
Der Visualizer wird über die Registry mit der Strategy verknüpft.

**Comparison Engine NEU** — Ein `useComparison`-Hook orchestriert parallele Simulation-Runs
verschiedener Algorithmen auf demselben Seed und aggregiert die Ergebnisse für ein Dashboard.

---

## 5. Refactoring-Plan

### Sofort refactoren

| Was                         | Warum                            | Wie                                                                                                                                                                                          |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doppelte UI-Komponenten     | 3 Paare redundanter Dateien      | `Controls.jsx` entfernen (durch `GameControls.jsx` ersetzt), `StatsPanel.jsx` entfernen (durch `StatsSidebar.jsx` ersetzt), `GameCanvas.jsx` entfernen (durch `GameCanvasPanel.jsx` ersetzt) |
| `shortcuts.js`              | Deprecated, nur Legacy-Wrapper   | Datei löschen, keine Imports mehr vorhanden                                                                                                                                                  |
| Dynamische Tailwind-Klassen | Brechen mit Tailwind v4          | Durch statische Klassenmappings ersetzen (`const colorMap = { blue: 'text-blue-400', ... }`)                                                                                                 |
| PropTypes-Konsistenz        | Manche Shapes sind unvollständig | Alle Komponenten auf vollständige shapes bringen                                                                                                                                             |

### Abstrahieren

| Was                                               | Zu was                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Canvas-Overlay-Rendering (Cycle, Shortcuts, Path) | `VisualizerPlugin`-Interface mit `render(ctx, state, options)`                          |
| Algorithmus-Metadaten (Info, Defaults, UI-Config) | Einzelne Registry-Datei statt verstreute `ALGORITHM_INFO` + `ALGORITHM_DEFAULT_CONFIGS` |
| Settings-Validation                               | Zentraler Validator der sowohl Settings-Panel als auch CLI nutzt                        |

### Neu erstellen

| Modul                 | Zweck                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `DijkstraStrategy`    | Dijkstra-Implementierung auf Basis von `GraphPathfindingStrategy` |
| `GreedyStrategy`      | Greedy Best-First auf Basis von `GraphPathfindingStrategy`        |
| `ComparisonEngine`    | Parallele Runs mit verschiedenen Algorithmen auf gleichen Seeds   |
| `AlgorithmVisualizer` | Abstraktes Interface für Algorithmus-spezifische Canvas-Overlays  |

---

## 6. Schritt-für-Schritt Development Plan

### Phase 1 — Stabilisierung (1–2 Wochen)

Ziel: Saubere Codebasis, alle Tests grün, keine Redundanz.

- Doppelte Komponenten konsolidieren
- `shortcuts.js` entfernen
- Tailwind-Klassenfixes
- Unused Imports bereinigen
- Alle bestehenden Tests durchlaufen lassen und fixen
- PropTypes vervollständigen
- README aktualisieren auf aktuellen Stand

### Phase 2 — Architektur-Refactor (2–3 Wochen)

Ziel: Klare Modulstruktur, Visualizer-Abstraktion.

- UI-Komponenten in Unterordner reorganisieren (`layout/`, `controls/`, `canvas/`, `stats/`)
- Visualizer-Interface definieren (`BaseVisualizer` mit `render()`, `getOverlayData()`)
- `HamiltonianVisualizer` extrahieren (Cycle + Shortcut Overlay aus `useCanvas` herauslösen)
- Algorithm Registry konsolidieren (Info + Defaults + Visualizer in einer Stelle)
- Settings-Validation zentralisieren
- Canvas-Hook refactoren: Overlays als Plugin-System statt hartcodierter Funktionen

### Phase 3 — Algorithmus-Erweiterung (2–3 Wochen)

Ziel: Alle geplanten Graph-Algorithmen implementiert und visualisierbar.

- `DijkstraStrategy` implementieren (Priority Queue statt Set-basierte open list wie bei A\*)
- `GreedyStrategy` implementieren (wie A\* aber ohne g-Score)
- A\* und BFS mit erweiterter Metadaten-Rückgabe (expandedNodes, frontier, closedSet als
  Overlay-Daten)
- `AStarVisualizer` und `BFSVisualizer` implementieren
- Für jeden Algorithmus: Unit-Tests, Simulation-Benchmarks
- Algorithmus-Auswahl in der UI verifizieren und testen

### Phase 4 — Vergleichssystem (2–3 Wochen)

Ziel: Algorithmen können direkt verglichen werden.

- `useComparison`-Hook: Orchestriert N Simulationen mit verschiedenen Algorithmen auf identischen
  Seeds
- `ComparisonDashboard`-Komponente: Zeigt Ergebnisse als Tabelle/Charts (Completion Rate, Avg Moves,
  Efficiency)
- Side-by-Side Canvas-Ansicht (2 Canvas-Elemente mit synchronisiertem Stepping)
- Benchmark-Runner: Headless Vergleich über CLI
  (`npm run compare -- --algorithms hamiltonian-shortcuts,astar,bfs`)
- Ergebnispersistenz und Export

### Phase 5 — MVP Release (1–2 Wochen)

Ziel: Deploybare, polierte Anwendung.

- Responsive Layout für verschiedene Bildschirmgrößen
- Performance-Profiling und Optimierung
- Error Boundaries um alle kritischen Bereiche
- Landing-Page mit Erklärung der Algorithmen
- GitHub Pages oder Vercel Deployment
- CI/CD mit GitHub Actions (Lint, Test, Build, Deploy)

---

## 7. MVP-Definition

Ein realistischer MVP umfasst:

**Algorithmen**: Hamiltonian (mit/ohne Shortcuts), A\*, BFS, Dijkstra, Greedy — alle spielbar und
visualisierbar.

**Kern-Features**: Einzelnes Canvas mit Algorithmus-Auswahl per Dropdown. Live-Statistiken (Score,
Moves, Efficiency, Completion Rate). Algorithmus-spezifische Overlays (Cycle-Pfad, expandierte
Knoten, geplanter Pfad). Speed-Kontrolle, Play/Pause/Step/Reset. Settings für Grid-Größe und Seed.

**Vergleichs-Feature**: Ein "Compare"-Modus der 2–3 Algorithmen auf dem gleichen Seed laufen lässt
und ein einfaches Ergebnis-Dashboard zeigt (Tabelle mit Metrics).

**Qualität**: Alle Tests grün. Builds und deploys automatisiert. Responsive mindestens auf Desktop
und Tablet.

**Nicht im MVP**: Reinforcement Learning, Replay-System, Mobile-optimiertes Layout, User Accounts,
persistente Leaderboards.

---

## 8. Code-Qualität & Skalierbarkeit

### Projektstruktur

Die aktuelle flache Komponentenstruktur sollte in domänenbasierte Unterordner migriert werden (siehe
Abschnitt 4). Jeder Unterordner bekommt eine `index.js` für saubere Re-Exports.

### Design Patterns

**Strategy Pattern** (bereits vorhanden) — korrekt eingesetzt für Algorithmen. Die
`PathfindingStrategy`-Hierarchie mit `GraphPathfindingStrategy` und `LearningStrategy` ist gut
designed.

**Observer/Callback Pattern** — der `onStateChange`-Callback in `GameLoop` ist sauber. Für das
Vergleichssystem empfehle ich ein Event-basiertes System (`EventEmitter` oder Custom Events) statt
verschachtelter Callbacks.

**Registry Pattern** — das `algorithmRegistry` sollte zur Single Source of Truth werden:
Strategy-Klasse, Default-Config, Visualizer-Klasse, und UI-Metadaten (Name, Beschreibung, Pros/Cons)
an einer Stelle.

### Testbarkeit

Die Engine-Schicht ist vorbildlich testbar (reine Funktionen, seeded RNG). Empfehlungen: Jede neue
Strategy bekommt einen standardisierten Testkanon: "findet Fruit auf leerem Grid", "überlebt 1000
Ticks auf 8x8", "deterministisch bei gleichem Seed". Integration-Tests für das Vergleichssystem.
Snapshot-Tests für Canvas-Output sind übertrieben — stattdessen Unit-Tests für die Renderfunktionen.

### Performance

Der Circular Buffer für Snake-State und Object Pooling für GameStates sind gut. Das inkrementelle
Canvas-Rendering mit statischem Layer-Cache ist effizient. Für den Vergleichsmodus: Web Workers für
parallele Algorithmus-Ausführung nutzen (WorkerPool ist bereits vorhanden). BFS und Dijkstra sollten
`CircularQueue` statt `Array.shift()` verwenden (O(1) statt O(n)).

### Fehlerhandling

Die aktuelle `reportError`-Strategie in `GameLoop` ist gut. Für die UI fehlen React Error
Boundaries. Empfehlung: Eine `ErrorBoundary`-Komponente um `GameCanvasPanel` und `StatsSidebar`
wrappen.

### UI/UX

Die Glassmorphism-Ästhetik (backdrop-blur, gradients) ist konsistent. Für die Plattform-Vision
empfehle ich ein Tab-basiertes Layout: "Play" (aktuelles Single-Game), "Compare" (Vergleichsmodus),
"Learn" (Algorithmus-Erklärungen).

---

## 9. Konkrete nächste 10 Tasks

1. **Doppelte Komponenten entfernen** — `Controls.jsx`, `StatsPanel.jsx`, `GameCanvas.jsx` löschen.
   Sicherstellen, dass nur `GameControls.jsx`, `StatsSidebar.jsx`, `GameCanvasPanel.jsx` importiert
   werden. `shortcuts.js` löschen.

2. **Tailwind-Klassenfix** — In `StatCard.jsx` und `StatsPanel.jsx` dynamische `text-${color}-400`
   durch eine statische Klassen-Map ersetzen. Testen, dass alle Farben korrekt rendern.

3. **BFS Queue-Performance** — In `BFSStrategy.bfs()` den `Array.shift()`-basierten Queue durch
   `CircularQueue` aus `collections.js` ersetzen. Gleiches in `AStarStrategy.isTailReachable()` und
   `countReachableCells()`.

4. **DijkstraStrategy implementieren** — Neue Datei
   `src/engine/pathfinding/strategies/DijkstraStrategy.js`. Extends `GraphPathfindingStrategy`.
   Priority Queue (Min-Heap) für die Open List. Registrierung im `algorithmRegistry`. Unit-Tests.

5. **GreedyStrategy implementieren** — Neue Datei
   `src/engine/pathfinding/strategies/GreedyStrategy.js`. Wie A\* aber f(n) = h(n) (nur Heuristik,
   kein g-Score). Registrierung, Tests.

6. **Algorithm Registry konsolidieren** — `ALGORITHM_INFO` und `ALGORITHM_DEFAULT_CONFIGS` zu einer
   einzigen `ALGORITHM_REGISTRY`-Map zusammenführen mit Schema
   `{ strategyClass, defaultConfig, info, visualizer }`.

7. **Visualizer-Interface definieren** — `src/ui/visualizers/BaseVisualizer.js` erstellen mit
   Interface `render(ctx, gameState, options)` und `getOverlayData(planResult)`.
   `HamiltonianVisualizer` als erste Implementierung extrahieren.

8. **Canvas-Hook Overlay-Refactor** — In `useCanvas.js` die hartcodierten `drawCycle()`,
   `drawShortcut()`, `drawPlannedPath()` durch einen Visualizer-Plugin-Aufruf ersetzen. Der aktive
   Visualizer wird basierend auf `settings.pathfindingAlgorithm` aus der Registry geladen.

9. **Algorithmus-Metadaten in UI erweitern** — Im `SettingsPanel` für jeden Algorithmus anzeigen:
   geschätzte Completion Rate, typische Geschwindigkeit, Schwierigkeitsgrad. Diese Daten können
   statisch sein oder aus einem einmaligen Benchmark kommen.

10. **CI Pipeline aufsetzen** — GitHub Actions Workflow:
    `npm ci → npm run lint → npm run test:ci → npm run build`. Damit ist die Qualitäts-Baseline für
    alle weiteren Änderungen gesichert.

---

**Zusammenfassung**: Das Projekt ist architektonisch überraschend weit fortgeschritten. Das Strategy
Pattern, der PathfindingManager, die standardisierte GameState-Adapter-Klasse — das sind solide
Fundamente. Die Hauptarbeit liegt nicht im Neudesign, sondern in der Konsolidierung (redundante
Komponenten, Registry-Vereinheitlichung), der Fertigstellung fehlender Strategien (Dijkstra,
Greedy), und dem Aufbau der Vergleichs-UI. Die Engine-Schicht braucht minimale Änderungen.
