import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Info, Zap } from 'lucide-react';
import StatCard from './StatCard.jsx';

function PerformanceSection({ stats, cycleLength }) {
  const fillPercentage = cycleLength > 0 ? Math.round(((stats.length || 1) / cycleLength) * 100) : 0;

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-400" />
        Performance
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Score" value={stats.score || 0} icon={Zap} color="yellow" />
        <StatCard label="Moves" value={stats.moves || 0} icon={Info} color="blue" />
        <StatCard
          label="Length"
          value={stats.length || 1}
          icon={Info}
          color="green"
          subtitle={`${fillPercentage}% filled`}
        />
        <StatCard
          label="Efficiency"
          value={`${stats.efficiency || 0}%`}
          icon={Info}
          color="purple"
          subtitle="Score per move"
        />
      </div>
    </div>
  );
}

PerformanceSection.propTypes = {
  stats: PropTypes.shape({
    score: PropTypes.number,
    moves: PropTypes.number,
    length: PropTypes.number,
    efficiency: PropTypes.number,
  }).isRequired,
  cycleLength: PropTypes.number.isRequired,
};

function AlgorithmStatusSection({ stats, status }) {
  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Algorithm Status</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <span className="text-gray-300">Head → Apple</span>
          <span className="font-mono text-cyan-400">{stats.distHeadApple || 0}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <span className="text-gray-300">Head → Tail</span>
          <span className="font-mono text-green-400">{stats.distHeadTail || 0}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <span className="text-gray-300">Free Cells</span>
          <span className="font-mono text-blue-400">{stats.free || 0}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <span className="text-gray-300">Using Shortcut</span>
          <div className={`w-3 h-3 rounded-full ${stats.shortcut ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`} />
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <span className="text-gray-300">Status</span>
          <span className="font-semibold text-blue-400 capitalize">{status || 'Loading'}</span>
        </div>
      </div>
    </div>
  );
}

AlgorithmStatusSection.propTypes = {
  stats: PropTypes.shape({
    distHeadApple: PropTypes.number,
    distHeadTail: PropTypes.number,
    free: PropTypes.number,
    shortcut: PropTypes.bool,
  }).isRequired,
  status: PropTypes.string,
};

function SettingsSection({ settings, onUpdateSettings }) {
  const gridValue = `${settings.rows}x${settings.cols}`;

  const handleGridChange = event => {
    const [rows, cols] = event.target.value.split('x').map(Number);
    onUpdateSettings({ ...settings, rows, cols });
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Game Settings</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="grid-size-select" className="block text-sm font-medium text-gray-300 mb-2">
            Grid Size
          </label>
          <select
            id="grid-size-select"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
            value={gridValue}
            onChange={handleGridChange}
          >
            <option value="16x16">16×16 (Small)</option>
            <option value="20x20">20×20 (Medium)</option>
            <option value="24x24">24×24 (Large)</option>
            <option value="30x20">30×20 (Wide)</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.shortcutsEnabled !== false}
              onChange={event =>
                onUpdateSettings({
                  ...settings,
                  shortcutsEnabled: event.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable Smart Shortcuts</span>
          </label>
        </div>
      </div>
    </div>
  );
}

SettingsSection.propTypes = {
  settings: PropTypes.shape({
    rows: PropTypes.number,
    cols: PropTypes.number,
    shortcutsEnabled: PropTypes.bool,
  }).isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
};

function VisualGuideSection() {
  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">Visual Guide</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-400 rounded" />
          <span className="text-gray-300">Snake (AI controlled)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-red-500 rounded-full" />
          <span className="text-gray-300">Apple target</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-cyan-400/40 rounded" />
          <span className="text-gray-300">Planned path</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-1 bg-yellow-400 rounded" />
          <span className="text-gray-300">Shortcut edge</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar container aggregating performance statistics, algorithm status, settings, and guides.
 * @param {object} props - Component props.
 * @param {object} props.stats - Computed statistics for the current game state.
 * @param {object} props.gameState - Current game state.
 * @param {object} props.settings - Current settings values.
 * @param {boolean} props.showSettings - Whether the settings panel is visible.
 * @param {(settings: object) => void} props.onUpdateSettings - Settings update callback.
 * @returns {JSX.Element}
 */
export default function StatsSidebar({ stats, gameState, settings, showSettings, onUpdateSettings }) {
  const memoizedStats = useMemo(
    () => ({
      score: stats?.score || 0,
      moves: stats?.moves || 0,
      length: stats?.length || 1,
      efficiency: stats?.efficiency || 0,
      distHeadApple: stats?.distHeadApple || 0,
      distHeadTail: stats?.distHeadTail || 0,
      free: stats?.free || 0,
      shortcut: Boolean(stats?.shortcut),
    }),
    [stats]
  );

  const cycleLength = gameState?.cycle?.length ?? 0;

  return (
    <div className="space-y-6">
      <PerformanceSection stats={memoizedStats} cycleLength={cycleLength} />
      <AlgorithmStatusSection stats={memoizedStats} status={gameState?.status} />
      {showSettings && <SettingsSection settings={settings} onUpdateSettings={onUpdateSettings} />}
      <VisualGuideSection />
    </div>
  );
}

StatsSidebar.propTypes = {
  stats: PropTypes.object.isRequired, // Detailed shape handled by memoization function.
  gameState: PropTypes.shape({
    status: PropTypes.string,
    cycle: PropTypes.shape({ length: PropTypes.number }),
  }).isRequired,
  settings: PropTypes.shape({
    rows: PropTypes.number,
    cols: PropTypes.number,
    shortcutsEnabled: PropTypes.bool,
  }).isRequired,
  showSettings: PropTypes.bool.isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
};
