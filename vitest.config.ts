// Kept separate from vite.config.ts: the app builds with rolldown-vite,
// whose plugin types conflict with the vite version vitest bundles.
// Tests are pure TypeScript (scheduler, NCC math, plan logic) — no plugins needed.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
