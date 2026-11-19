import { expect, it } from "vitest";
import { build } from "vite";
import { mkdir, mkdtempDisposable, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { localeCodes } from "../shared/languages.js";

// Run the build plugin in Node as Vite does, outside Vitest's app module graph.
const { languageCatalogs } = createRequire(import.meta.url)(
  "../scripts/languageCatalogs.mjs",
);

it("bundles each language independently and gives curated translations precedence", async () => {
  const project = await mkdtempDisposable(
    path.join(os.tmpdir(), "santa-language-build-"),
  );
  try {
    const root = project.path;
    const directory = path.join(root, "src/locales");
    await mkdir(path.join(directory, "content"), { recursive: true });
    await writeFile(path.join(root, "package.json"), '{"type":"module"}');
    await writeFile(
      path.join(root, "index.html"),
      '<script type="module" src="/entry.js"></script>',
    );
    await writeFile(
      path.join(root, "entry.js"),
      'import load from "virtual:language-catalogs"; globalThis.loadLanguage = load;',
    );
    const codes = localeCodes.filter((code) => code !== "it");
    for (const code of codes) {
      await writeFile(
        path.join(directory, "content", code + ".json"),
        JSON.stringify({
          letter: "fallback-" + code,
          greeting: "editorial-" + code,
        }),
      );
    }
    await writeFile(
      path.join(directory, "event.js"),
      "export default " +
        JSON.stringify([["letter", ...codes.map((code) => "curated-" + code)]]),
    );
    const { output } = await build({
      root,
      plugins: [languageCatalogs()],
      configFile: false,
      logLevel: "silent",
      build: { write: false },
    });
    const chunks = output.filter((item) => item.type === "chunk");
    const entry = chunks.find((chunk) => chunk.isEntry);
    const catalogs = chunks.filter((chunk) => chunk.isDynamicEntry);
    expect(catalogs).toHaveLength(codes.length);
    expect(entry.code).not.toMatch(/curated-|editorial-/);
    for (const code of codes) {
      const chunk = catalogs.find((item) =>
        item.facadeModuleId.endsWith("catalog-" + code),
      );
      expect(chunk.code).toContain("editorial-" + code);
      expect(chunk.code).toContain("curated-" + code);
      expect(chunk.code).not.toContain("fallback-");
      expect(chunk.imports).toEqual([]);
      for (const other of codes.filter((candidate) => candidate !== code))
        expect(chunk.code).not.toContain("curated-" + other);
    }
  } finally {
    await project.remove();
  }
});
