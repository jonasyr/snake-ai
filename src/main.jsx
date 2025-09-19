import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/**
 * Bootstraps the React application and mounts it into the DOM while enabling
 * StrictMode to surface potential lifecycle or effect issues during
 * development builds.
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
