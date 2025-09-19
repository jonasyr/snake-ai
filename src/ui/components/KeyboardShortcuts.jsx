import React from 'react';

/**
 * Display helper listing keyboard shortcuts for the game.
 * @returns {JSX.Element}
 */
export default function KeyboardShortcuts() {
  return (
    <div className="mt-6 flex flex-wrap gap-2 text-xs">
      <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Space</kbd>
      <span className="text-gray-400">Play/Pause</span>
      <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">→</kbd>
      <span className="text-gray-400">Step</span>
      <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">R</kbd>
      <span className="text-gray-400">Reset</span>
    </div>
  );
}
