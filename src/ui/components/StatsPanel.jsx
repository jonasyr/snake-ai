// FILE: src/ui/components/StatsPanel.jsx
/**
 * Game statistics and algorithm status display
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Info, Zap, TrendingUp, Target, Activity } from 'lucide-react';

const StatCard = ({ label, value, icon, color = 'blue', subtitle, trend }) => {
  const IconComponent = icon;
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <IconComponent className={`w-5 h-5 text-${color}-400`} />
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold text-${color}-400`}>{value}</span>
          {trend && (
            <TrendingUp className={`w-4 h-4 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`} />
          )}
        </div>
      </div>
      <p className="text-sm text-gray-300 font-medium">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

const getStatusColor = status => {
  switch (status) {
    case 'gameOver':
      return 'text-red-400';
    case 'complete':
      return 'text-green-400';
    case 'playing':
      return 'text-blue-400';
    default:
      return 'text-yellow-400';
  }
};

const getStatusText = status => {
  switch (status) {
    case 'gameOver':
      return 'Game Over';
    case 'complete':
      return 'Complete!';
    case 'playing':
      return 'Running';
    default:
      return 'Paused';
  }
};

const StatusIndicator = ({ label, value, color = 'gray' }) => (
  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
    <span className="text-gray-300">{label}</span>
    <span className={`font-mono text-${color}-400`}>{value}</span>
  </div>
);

const StatsPanel = ({ stats, gameState, highScore }) => {
  const totalCells = gameState.cycle?.length || 400;
  const fillPercentage = Math.round((stats.length / totalCells) * 100);
  const isNewHighScore = stats.score > highScore;

  return (
    <div className="space-y-6">
      {/* Performance Stats */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Performance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Score"
            value={stats.score}
            icon={Zap}
            color="yellow"
            subtitle={isNewHighScore ? 'New High Score!' : `Best: ${highScore}`}
          />
          <StatCard label="Moves" value={stats.moves} icon={Info} color="blue" />
          <StatCard
            label="Length"
            value={stats.length}
            icon={Target}
            color="green"
            subtitle={`${fillPercentage}% filled`}
          />
          <StatCard
            label="Efficiency"
            value={`${stats.efficiency}%`}
            icon={TrendingUp}
            color="purple"
            subtitle="Score per move"
          />
        </div>
      </div>

      {/* Algorithm Status */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          Algorithm Status
        </h3>
        <div className="space-y-4">
          <StatusIndicator label="Head → Apple" value={stats.distHeadApple} color="cyan" />
          <StatusIndicator label="Head → Tail" value={stats.distHeadTail} color="green" />
          <StatusIndicator label="Free Cells" value={stats.free} color="blue" />
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
            <span className="text-gray-300">Using Shortcut</span>
            <div
              className={`w-3 h-3 rounded-full ${
                stats.shortcut ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
              }`}
            ></div>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
            <span className="text-gray-300">Game Status</span>
            <span className={`font-semibold ${getStatusColor(gameState.status)}`}>
              {getStatusText(gameState.status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string,
  subtitle: PropTypes.string,
  trend: PropTypes.number,
};

StatusIndicator.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string,
};

StatsPanel.propTypes = {
  stats: PropTypes.shape({
    length: PropTypes.number.isRequired,
    score: PropTypes.number.isRequired,
    moves: PropTypes.number.isRequired,
    efficiency: PropTypes.number.isRequired,
    distHeadApple: PropTypes.number.isRequired,
    distHeadTail: PropTypes.number.isRequired,
    free: PropTypes.number.isRequired,
    shortcut: PropTypes.bool.isRequired,
  }).isRequired,
  gameState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    cycle: PropTypes.shape({
      length: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  highScore: PropTypes.number.isRequired,
};

export default React.memo(StatsPanel);
