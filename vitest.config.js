import { defineConfig } from "vitest/config";
import { languageCatalogs } from "./scripts/languageCatalogs.mjs";
export default defineConfig({
  plugins: [languageCatalogs()],
  test: { include: ["tests/**/*.test.js"], exclude: ["tests/e2e/**"] },
});
