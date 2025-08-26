// FILE: src/ui/components/SettingsPanel.jsx
/**
 * Game settings and configuration panel
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Download, Upload, RotateCcw } from 'lucide-react';

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

  const handleGridSizeChange = e => {
    const [rows, cols] = e.target.value.split('x').map(x => parseInt(x));
    onUpdateSettings({ ...settings, rows, cols });
  };

  const handleSeedChange = e => {
    const seed = parseInt(e.target.value) || Date.now();
    onUpdateSettings({ ...settings, seed });
  };

  const handleRandomSeed = () => {
    onUpdateSettings({ ...settings, seed: Date.now() });
  };

  const handleFileImport = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const importedSettings = onImportSettings(event.target.result);
        if (importedSettings) {
          alert('Settings imported successfully!');
        } else {
          alert('Invalid settings file format.');
        }
      } catch (error) {
        alert('Failed to import settings: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Game Settings</h3>

      <div className="space-y-6">
        {/* Grid Size */}
        <div>
          <label htmlFor="grid-size" className="block text-sm font-medium text-gray-300 mb-2">
            Grid Size
          </label>
          <select
            id="grid-size"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={`${settings.rows}x${settings.cols}`}
            onChange={handleGridSizeChange}
          >
            {gridSizeOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-800">
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
              placeholder="Enter seed for deterministic gameplay"
            />
            <button
              onClick={handleRandomSeed}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
              title="Generate random seed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Same seed produces identical gameplay for testing
          </p>
        </div>

        {/* Algorithm Settings */}
        <div>
          <h4 className="text-lg font-medium text-gray-200 mb-3">Algorithm Tuning</h4>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.shortcutsEnabled}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      shortcutsEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Enable Smart Shortcuts</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-7">
                Allow AI to take safe shortcuts to reach fruit faster
              </p>
            </div>

            <div>
              <label
                htmlFor="safety-buffer"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Safety Buffer: {settings.safetyBuffer || 2}
              </label>
              <input
                id="safety-buffer"
                type="range"
                min="1"
                max="10"
                value={settings.safetyBuffer || 2}
                onChange={e =>
                  onUpdateSettings({
                    ...settings,
                    safetyBuffer: parseInt(e.target.value),
                  })
                }
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum distance from tail when taking shortcuts
              </p>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-lg font-medium text-gray-200 mb-3">Data Management</h4>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Settings
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import Settings
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>

            <button
              onClick={onClearData}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All Data
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
    seed: PropTypes.string.isRequired,
    shortcutsEnabled: PropTypes.bool.isRequired,
    safetyBuffer: PropTypes.number.isRequired,
  }).isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
  onExportSettings: PropTypes.func.isRequired,
  onImportSettings: PropTypes.func.isRequired,
  onClearData: PropTypes.func.isRequired,
};

export default React.memo(SettingsPanel);
