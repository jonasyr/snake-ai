// FILE: src/ui/components/SettingsPanel.jsx
/**
 * Game settings and configuration panel
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Download, Upload, RotateCcw, Info } from 'lucide-react';
import {
  ALGORITHMS,
  ALGORITHM_INFO,
  getAlgorithmDefaultConfig,
} from '../../engine/pathfinding/algorithmRegistry.js';
import { resetPathfindingManager } from '../../engine/pathfinding/index.js';

/**
 * Display a user-facing notification via alert or console fallback.
 *
 * @param {string} message - Message to display to the user.
 */
const notifyUser = message => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  } else {
    console.warn(message);
  }
};

/**
 * Render algorithm-specific configuration controls.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.algorithm - Currently selected algorithm identifier.
 * @param {Object} props.settings - Complete settings object for the game.
 * @param {Function} props.onUpdateSettings - Handler to persist settings updates.
 * @returns {JSX.Element|null} Algorithm settings section if applicable.
 */
const AlgorithmSettings = ({ algorithm, settings, onUpdateSettings }) => {
  switch (algorithm) {
    case ALGORITHMS.HAMILTONIAN_SHORTCUTS:
      return (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-lg font-medium text-gray-200 mb-3">Shortcut Tuning</h4>

          <div className="space-y-4">
            <div>
              <label htmlFor="safety-buffer" className="block text-sm font-medium text-gray-300 mb-2">
                Safety Buffer: {settings.safetyBuffer ?? 2}
              </label>
              <input
                id="safety-buffer"
                type="range"
                min="1"
                max="10"
                value={settings.safetyBuffer ?? 2}
                onChange={event =>
                  onUpdateSettings({
                    ...settings,
                    safetyBuffer: Number.parseInt(event.target.value, 10),
                  })
                }
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum distance from tail when taking shortcuts
              </p>
            </div>

            <div>
              <label htmlFor="late-game-lock" className="block text-sm font-medium text-gray-300 mb-2">
                Late Game Lock: {settings.lateGameLock ?? 0}
              </label>
              <input
                id="late-game-lock"
                type="range"
                min="0"
                max="10"
                value={settings.lateGameLock ?? 0}
                onChange={event =>
                  onUpdateSettings({
                    ...settings,
                    lateGameLock: Number.parseInt(event.target.value, 10),
                  })
                }
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Free cells required before disabling shortcuts
              </p>
            </div>
          </div>
        </div>
      );

    case ALGORITHMS.ASTAR:
      return (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-lg font-medium text-gray-200 mb-3">A* Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allowDiagonals ?? false}
                  onChange={event =>
                    onUpdateSettings({
                      ...settings,
                      allowDiagonals: event.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <span className="text-sm text-gray-300">Allow Diagonal Movement</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-7">
                Enables 8-directional pathfinding (4 orthogonal + 4 diagonal)
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

AlgorithmSettings.propTypes = {
  algorithm: PropTypes.string.isRequired,
  settings: PropTypes.shape({
    allowDiagonals: PropTypes.bool,
    lateGameLock: PropTypes.number,
    safetyBuffer: PropTypes.number,
  }).isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
};

/**
 * Settings management panel for configuring game and AI behavior.
 *
 * @param {Object} props - Component properties.
 * @param {Object} props.settings - Current game settings state.
 * @param {Function} props.onUpdateSettings - Callback to update settings state.
 * @param {Function} props.onExportSettings - Callback to export settings to a file.
 * @param {Function} props.onImportSettings - Callback to import settings from a file.
 * @param {Function} props.onClearData - Callback to clear persisted settings.
 * @returns {JSX.Element} Rendered settings panel component.
 */
const SettingsPanel = ({
  settings,
  onUpdateSettings,
  onExportSettings,
  onImportSettings,
  onClearData,
}) => {
  const gridSizeOptions = [
    { label: '16×16 (Small)', value: '16x16' },
    { label: '20×20 (Medium)', value: '20x20' },
    { label: '24×24 (Large)', value: '24x24' },
    { label: '30×20 (Wide)', value: '30x20' },
    { label: '20×30 (Tall)', value: '20x30' },
  ];

  const currentAlgorithm =
    settings.pathfindingAlgorithm || ALGORITHMS.HAMILTONIAN_SHORTCUTS;
  const algorithmInfo = ALGORITHM_INFO[currentAlgorithm];

  /**
   * Update algorithm selection, reinitializing the pathfinding manager and applying defaults.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} event - Change event.
   * @returns {Promise<void>} Resolves when the manager has been reset.
   */
  const handleAlgorithmChange = async event => {
    const algorithm = event.target.value;

    await resetPathfindingManager();

    onUpdateSettings({
      ...settings,
      pathfindingAlgorithm: algorithm,
      ...getAlgorithmDefaultConfig(algorithm),
    });
  };

  /**
   * Adjust grid dimensions based on user selection.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} event - Change event.
   */
  const handleGridSizeChange = event => {
    const [rowsValue, colsValue] = event.target.value.split('x');
    const rows = Number.parseInt(rowsValue, 10);
    const cols = Number.parseInt(colsValue, 10);

    if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
      notifyUser('Invalid grid size selected. Please choose a supported option.');
      return;
    }

    if (rows <= 0 || cols <= 0) {
      notifyUser('Grid dimensions must be positive integers.');
      return;
    }

    if (rows % 2 !== 0 && cols % 2 !== 0) {
      notifyUser('At least one grid dimension must be even to generate a Hamiltonian cycle.');
      return;
    }

    onUpdateSettings({ ...settings, rows, cols });
  };

  /**
   * Update random seed when the user types a value.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - Change event.
   */
  const handleSeedChange = event => {
    const rawValue = event.target.value.trim();

    if (rawValue === '') {
      return;
    }

    const parsedSeed = Number.parseInt(rawValue, 10);

    if (!Number.isSafeInteger(parsedSeed)) {
      notifyUser('Seed must be a safe integer value.');
      return;
    }

    onUpdateSettings({ ...settings, seed: parsedSeed });
  };

  /**
   * Generate a new random seed using the current timestamp.
   */
  const handleRandomSeed = () => {
    onUpdateSettings({ ...settings, seed: Date.now() });
  };

  /**
   * Import settings from a user-provided JSON file.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - Change event.
   */
  const handleFileImport = event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      try {
        const importedSettings = onImportSettings(loadEvent.target.result);
        if (importedSettings) {
          notifyUser('Settings imported successfully!');
        } else {
          notifyUser('Invalid settings file format.');
        }
      } catch (error) {
        notifyUser('Failed to import settings: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Game Settings</h3>

      <div className="space-y-6">
        {/* Algorithm Selection */}
        <div>
          <label htmlFor="algorithm" className="block text-sm font-medium text-gray-300 mb-2">
            AI Algorithm
          </label>
          <select
            id="algorithm"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white/15 transition-colors"
            value={currentAlgorithm}
            onChange={handleAlgorithmChange}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <optgroup label="Hamiltonian-Based" className="bg-gray-800 text-white">
              <option value={ALGORITHMS.HAMILTONIAN} className="bg-gray-800 text-white">
                {ALGORITHM_INFO[ALGORITHMS.HAMILTONIAN].name}
              </option>
              <option value={ALGORITHMS.HAMILTONIAN_SHORTCUTS} className="bg-gray-800 text-white">
                {ALGORITHM_INFO[ALGORITHMS.HAMILTONIAN_SHORTCUTS].name}
              </option>
            </optgroup>
            <optgroup label="Graph Search" className="bg-gray-800 text-white">
              <option value={ALGORITHMS.ASTAR} className="bg-gray-800 text-white">
                {ALGORITHM_INFO[ALGORITHMS.ASTAR].name}
              </option>
              <option value={ALGORITHMS.BFS} className="bg-gray-800 text-white">
                {ALGORITHM_INFO[ALGORITHMS.BFS].name}
              </option>
              <option value={ALGORITHMS.GREEDY} disabled className="bg-gray-800 text-gray-400">
                Greedy (Coming Soon)
              </option>
            </optgroup>
            <optgroup label="Learning-Based" className="bg-gray-800 text-white">
              <option value={ALGORITHMS.REINFORCEMENT_LEARNING} disabled className="bg-gray-800 text-gray-400">
                Reinforcement Learning (Coming Soon)
              </option>
            </optgroup>
          </select>

          {/* Algorithm Info Card */}
          {algorithmInfo && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">{algorithmInfo.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-green-400">✓ Pros:</span>
                  <ul className="text-gray-400 ml-4 mt-1">
                    {algorithmInfo.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-red-400">✗ Cons:</span>
                  <ul className="text-gray-400 ml-4 mt-1">
                    {algorithmInfo.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Algorithm-Specific Settings */}
        <AlgorithmSettings
          algorithm={currentAlgorithm}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />

        {/* Grid Size */}
        <div className="border-t border-white/10 pt-4">
          <label htmlFor="grid-size" className="block text-sm font-medium text-gray-300 mb-2">
            Grid Size
          </label>
          <select
            id="grid-size"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white/15 transition-colors"
            value={`${settings.rows}x${settings.cols}`}
            onChange={handleGridSizeChange}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            {gridSizeOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Random Seed */}
        <div>
          <label htmlFor="seed" className="block text-sm font-medium text-gray-300 mb-2">
            Random Seed
          </label>
          <div className="flex gap-2">
            <input
              id="seed"
              type="number"
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={settings.seed}
              onChange={handleSeedChange}
              placeholder="Enter seed"
            />
            <button
              onClick={handleRandomSeed}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20"
              title="Generate random seed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-lg font-medium text-gray-200 mb-3">Data Management</h4>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
            <button
              onClick={onClearData}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPanel.propTypes = {
  settings: PropTypes.shape({
    cols: PropTypes.number.isRequired,
    rows: PropTypes.number.isRequired,
    seed: PropTypes.number.isRequired,
    pathfindingAlgorithm: PropTypes.string,
    lateGameLock: PropTypes.number,
    safetyBuffer: PropTypes.number,
    shortcutsEnabled: PropTypes.bool,
    allowDiagonals: PropTypes.bool,
  }).isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
  onExportSettings: PropTypes.func.isRequired,
  onImportSettings: PropTypes.func.isRequired,
  onClearData: PropTypes.func.isRequired,
};

export default React.memo(SettingsPanel);
