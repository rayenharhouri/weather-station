import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the Next.js `@/*` alias so test files import paths the same way
    // the app does. Keeps the test suite a believable proxy for prod imports.
    alias: {
      '@': resolve(root),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'backend/**'],
  },
});
