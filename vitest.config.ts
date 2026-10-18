import { defineConfig } from "vitest/config"

export default defineConfig({
  // Flag SVGs load from node_modules, which sits outside the root in a nested git worktree.
  server: { fs: { strict: false } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
