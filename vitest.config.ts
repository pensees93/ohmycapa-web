import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@ohmycapa/capa-core': path.resolve(import.meta.dirname, './packages/capa-core/src/index.ts'),
      '@ohmycapa/capa-ui': path.resolve(import.meta.dirname, './packages/capa-ui/src/index.ts'),
    },
  },
  test: {
    include: ['packages/capa-core/tests/**/*.test.ts', 'packages/capa-ui/tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
