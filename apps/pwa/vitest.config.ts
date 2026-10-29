import { defineConfig } from 'vitest/config'

// Unit tests for the offline data layer (src/lib/offline). They run in Node
// with an in-memory IndexedDB; no React or service-worker plugins are needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
