import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React + MUI must stay in the same chunk — MUI imports React internally
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-is') ||
            id.includes('node_modules/@mui') ||
            id.includes('node_modules/@emotion')
          ) {
            return 'ui-vendor';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'chart-vendor';
          }
          if (id.includes('node_modules/xlsx-js-style') || id.includes('node_modules/xlsx')) {
            return 'file-vendor';
          }
          if (id.includes('packages/capa-core')) return 'capa-core';
          if (id.includes('packages/capa-ui')) return 'capa-ui';
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material', '@mui/icons-material'],
    alias: {
      '@ohmycapa/capa-core': path.resolve(import.meta.dirname, './packages/capa-core/src/index.ts'),
      '@ohmycapa/capa-ui': path.resolve(import.meta.dirname, './packages/capa-ui/src/index.ts'),
    },
  },
});
