import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
const release = {
  version,
  buildId: randomUUID(),
  builtAt: new Date().toISOString(),
};
export default defineConfig({
  define: { __APP_BUILD_ID__: JSON.stringify(release.buildId) },
  plugins: [
    react(),
    {
      name: "release-manifest",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify(release),
        });
      },
    },
  ],
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
});
