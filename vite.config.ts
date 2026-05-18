import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative base ('./') for builds so the bundle works under ANY subpath
// (or domain root) without recompiling — including GitHub Pages project
// subpaths, regardless of repo name. Dev server stays at '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  build: {
    outDir: 'publish',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
}));
