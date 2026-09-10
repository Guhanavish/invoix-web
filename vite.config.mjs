import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    // Never ship source maps to production
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core split from app code so repeat visits stay cached
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Charts only load on dashboard/reports routes
          charts: ['recharts'],
        },
      },
    },
  },
});
