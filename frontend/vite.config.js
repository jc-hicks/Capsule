import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express backend so the frontend can use
      // relative "/api/..." URLs in both dev and production.
      '/api': 'http://localhost:3000',
    },
  },
});
