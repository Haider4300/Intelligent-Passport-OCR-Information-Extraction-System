// src/main.jsx
// =============
// This is the ENTRY POINT for React.
// It finds the <div id="root"> in index.html and mounts our App there.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'  // Import global styles (Tailwind + custom CSS)

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode runs extra checks in development to catch bugs early
  <React.StrictMode>
    <App />
  </React.StrictMode>
)