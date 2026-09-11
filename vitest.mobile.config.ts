import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/mobile/lib/**/*.test.ts"],
  },
});
