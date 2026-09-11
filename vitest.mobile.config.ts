import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/mobile"),
    },
  },
  test: {
    include: ["apps/mobile/lib/**/*.test.ts"],
  },
});
