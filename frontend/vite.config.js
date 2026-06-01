// vite.config.js
// ================
// Vite is the build tool that runs our React app in development.
// This config file tells Vite how to set up the project.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],  // Enable React support (JSX transformation)

  server: {
    port: 5173,  // Frontend runs on http://localhost:5173

    // Proxy: any request to /api/... gets forwarded to our FastAPI backend.
    // This prevents CORS issues during development.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // FastAPI address
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})