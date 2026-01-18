import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@context': path.resolve(__dirname, './src/app/context'),
      '@services': path.resolve(__dirname, './src/app/services'),
      '@routes': path.resolve(__dirname, './src/app/routes'),
      '@dashboards': path.resolve(__dirname, './src/app/dashboards'),
      '@auth': path.resolve(__dirname, './src/app/auth'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
