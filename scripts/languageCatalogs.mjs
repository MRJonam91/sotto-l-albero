import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { localeCodes } from "../shared/languages.js";

const translations = localeCodes.filter((code) => code !== "it");
const registry = "virtual:language-catalogs";
const catalogId = (code) => `virtual:language-catalog-${code}`;
const resolvedId = (id) => `\0${id}`;

// A row is authored once in Italian alongside its translations. Browsers only
// receive the selected column, merged with that language's editorial content.
export function languageCatalogs() {
  let directory;
  let building;
  const modules = new Map(
    translations.map((code) => [resolvedId(catalogId(code)), code]),
  );
  return {
    name: "language-catalogs",
    configResolved(config) {
      directory = path.resolve(config.root, "src/locales");
      building = config.command === "build";
    },
    configureServer(server) {
      server.watcher.add(directory);
    },
    resolveId(id) {
      if (id === registry || modules.has(resolvedId(id))) return resolvedId(id);
    },
    async load(id) {
      if (id === resolvedId(registry)) {
        return (
          "export default {" +
          translations
            .map(
              (code) =>
                `${code}: () => import(${JSON.stringify(catalogId(code))}).then(m => m.default)`,
            )
            .join(",") +
          "}"
        );
      }
      const code = modules.get(id);
      if (!code) return;
      if (building) this.addWatchFile(directory);
      const content = path.join(directory, "content", code + ".json");
      if (building) this.addWatchFile(content);
      const dictionary = new Map(
        Object.entries(JSON.parse(await readFile(content, "utf8"))),
      );
      const files = (await readdir(directory))
        .filter((file) => file.endsWith(".js"))
        .sort();
      const catalogs = await Promise.all(
        files.map(async (filename) => {
          const file = path.join(directory, filename);
          if (building) this.addWatchFile(file);
          const { mtimeNs } = await stat(file, { bigint: true });
          const url = pathToFileURL(file);
          url.searchParams.set("v", String(mtimeNs));
          return (await import(url.href)).default;
        }),
      );
      const column = localeCodes.indexOf(code);
      for (const rows of catalogs)
        for (const row of rows) {
          if (
            row.length !== localeCodes.length ||
            typeof row[column] !== "string"
          )
            throw new Error(`Missing ${code} translation for "${row[0]}"`);
          dictionary.set(row[0], row[column]);
        }
      const entries = JSON.stringify([...dictionary]);
      if (building) return `export default new Map(${entries});`;
      // On a development edit, update the same Map held by the mounted app
      // and by earlier dynamic imports. Production does not need this path.
      return `const dictionary = import.meta.hot?.data.dictionary ?? new Map();
dictionary.clear();
for (const [key, value] of ${entries}) dictionary.set(key, value);
export default dictionary;
if (import.meta.hot) {
  import.meta.hot.data.dictionary = dictionary;
  import.meta.hot.accept(() => window.dispatchEvent(new Event("language-catalog-updated")));
}`;
    },
    hotUpdate({ file, modules: affected }) {
      const relative = path.relative(directory, file).split(path.sep).join("/");
      const curated = /^[^/]+\.js$/.test(relative);
      const changed = [...modules].filter(
        ([, code]) => curated || relative === `content/${code}.json`,
      );
      if (!changed.length) return;
      const graph = this.environment.moduleGraph;
      return [
        ...new Set([
          ...affected,
          ...changed.map(([id]) => graph.getModuleById(id)).filter(Boolean),
        ]),
      ];
    },
  };
}
