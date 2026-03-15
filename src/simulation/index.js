// FILE: src/simulation/index.js
/**
 * Public entry point for simulation utilities. Re-exported to provide a clean
 * module interface when importing from `src/simulation`.
 */
export { runGame, simulateGames } from './simulator.js';
export {
  DEFAULT_SHORTCUT_PARAMETER_RANGES,
  runShortcutParameterSweep,
} from './parameterSweep.js';
