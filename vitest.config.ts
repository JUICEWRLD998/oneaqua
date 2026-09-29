import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: { include: ['engine/**/*.ts'], exclude: ['engine/**/__tests__/**'] },
  },
})
