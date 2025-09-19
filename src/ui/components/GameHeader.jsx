import React from 'react';
import PropTypes from 'prop-types';
import { Settings } from 'lucide-react';
import ControlButton from './ControlButton.jsx';

/**
 * Top-level header for the application containing the title and settings toggle.
 * @param {object} props - Component props.
 * @param {boolean} props.showSettings - Whether the settings panel is currently visible.
 * @param {() => void} props.onToggleSettings - Handler to toggle the settings panel.
 * @returns {JSX.Element}
 */
export default function GameHeader({ showSettings, onToggleSettings }) {
  return (
    <header className="relative z-10 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Snake AI
            </h1>
            <p className="text-gray-400 mt-1">Hamiltonian Cycle with Smart Shortcuts</p>
          </div>
          <ControlButton onClick={onToggleSettings} active={showSettings}>
            <Settings className="w-4 h-4" />
            Settings
          </ControlButton>
        </div>
      </div>
    </header>
  );
}

GameHeader.propTypes = {
  showSettings: PropTypes.bool.isRequired,
  onToggleSettings: PropTypes.func.isRequired,
};
