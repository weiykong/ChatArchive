import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,ts}"],
    environment: "node",
    // Tests that need a DOM opt in with `// @vitest-environment jsdom`.
    globals: false
  }
});
