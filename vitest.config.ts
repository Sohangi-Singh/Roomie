import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/__tests__/**/*.test.ts",
      "lib/**/*.test.ts",
      // Added for the pre-launch matching audit (authorized: user said "do what's
      // best"). Purely additive — does not affect discovery of the existing suite.
      "__tests__/**/*.spec.ts",
    ],
  },
});
