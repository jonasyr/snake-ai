import React from 'react';

/**
 * Fallback UI displayed while the game state initializes.
 * @returns {JSX.Element}
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-300">Initializing Snake AI...</p>
      </div>
    </div>
  );
}
