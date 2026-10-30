import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": resolve("apps/web/src"), "@convex": resolve("convex") } },
  test: {
    include: ["convex/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}", "packages/shared/src/**/*.test.ts"],
  },
});
