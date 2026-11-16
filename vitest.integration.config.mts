import { defineConfig } from "vitest/config";

// Integration tests that start Docker containers (Testcontainers). Needs a Docker daemon.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    name: "integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
