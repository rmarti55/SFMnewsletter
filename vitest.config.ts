import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
