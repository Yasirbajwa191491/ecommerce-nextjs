import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["convex/**/*.test.ts", "packages/shared/src/**/*.test.ts"],
  },
});
