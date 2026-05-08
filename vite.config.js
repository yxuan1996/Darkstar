import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// For GitHub Pages deployment set base to your repo name: base: '/your-repo-name/'
// For root deployment or local testing, use: base: './'
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          anime: ['animejs'],
          three: ['three'],
        },
      },
    },
  },
});
