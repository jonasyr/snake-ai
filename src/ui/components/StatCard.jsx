import React from 'react';
import PropTypes from 'prop-types';

/**
 * Compact statistic card used in the sidebar panels.
 * @param {object} props - Component props.
 * @param {string} props.label - Label text for the statistic.
 * @param {string|number} props.value - Value to display.
 * @param {React.ComponentType} props.icon - Icon component to render.
 * @param {string} [props.color='blue'] - Tailwind color hue for the icon/value.
 * @param {string} [props.subtitle] - Optional descriptive subtitle.
 * @returns {JSX.Element}
 */
const COLOR_CLASSES = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
  pink: 'text-pink-400',
  indigo: 'text-indigo-400',
  cyan: 'text-cyan-400',
};

export default function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  subtitle,
}) {
  const IconComponent = icon;
  const colorClass = COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
  return (
    <div className='bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300'>
      <div className='flex items-center justify-between mb-2'>
        <IconComponent className={`w-5 h-5 ${colorClass}`} />
        <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      </div>
      <p className='text-sm text-gray-300 font-medium'>{label}</p>
      {subtitle && <p className='text-xs text-gray-400 mt-1'>{subtitle}</p>}
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string,
  subtitle: PropTypes.string,
};
