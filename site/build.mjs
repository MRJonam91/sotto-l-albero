import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { languages } from "../shared/languages.js";
import { copy } from "./copy.mjs";

const source = fileURLToPath(new URL(".", import.meta.url));
const output = resolve(process.argv[2] ?? ".wrangler/presentation-preview");
const githubPagesBase = "https://mrjonam91.github.io/sotto-l-albero/";
const base = process.argv[3] ?? githubPagesBase;
const app = "https://sottolalbero.gifts/";
const github = "https://github.com/MRJonam91/sotto-l-albero";
const brand = "Sotto l’Albero";
const codes = Object.keys(languages);
const pathFor = (code) => (code === "it" ? "" : `${code}/`);
const urlFor = (code) => base + pathFor(code);
const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function render(code) {
  const t = copy[code];
  const home = code === "it" ? "./" : "../";
  const url = urlFor(code);
  const title = escape(`${t.title} · ${brand}`);
  const description = escape(t.description);
  const imageAlt = escape(t.artwork);
  const socialImage = `${base}assets/sotto-l-albero-social.jpg`;
  const whatsapp = `https://wa.me/?${new URLSearchParams({ text: `${t.caption}\n${url}` })}`;
  const telegram = `https://t.me/share/url?${new URLSearchParams({ url, text: t.caption })}`;
  const alternatives = codes.map((lang) =>
    `<link rel="alternate" hreflang="${lang}" href="${urlFor(lang)}">`
  ).join("\n  ");
  const socialLocales = codes.filter((lang) => lang !== code).map((lang) =>
    `<meta property="og:locale:alternate" content="${copy[lang].locale}">`
  ).join("\n  ");
  const languageLinks = codes.map((lang) =>
    `<a href="${home + pathFor(lang)}" lang="${lang}" hreflang="${lang}"${lang === code ? ' aria-current="page"' : ""}>${languages[lang]}</a>`
  ).join("\n      ");
  const cards = (items) => items.map(([heading, body]) =>
    `<li><h3>${escape(heading)}</h3><p>${escape(body)}</p></li>`
  ).join("\n        ");

  return `<!doctype html>
<html lang="${code}">
<head prefix="og: https://ogp.me/ns#">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#102720">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  ${alternatives}
  <link rel="alternate" hreflang="x-default" href="${base}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${brand}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="${t.locale}">
  ${socialLocales}
  <meta property="og:image" content="${socialImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${imageAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${socialImage}">
  <meta name="twitter:image:alt" content="${imageAlt}">
  <link rel="icon" href="${home}assets/icon.png" type="image/png">
  <link rel="stylesheet" href="${home}assets/styles.css">
  <script src="${home}assets/share.js" defer></script>
</head>
<body>
  <a class="skip" href="#main">${escape(t.skip)}</a>
  <header class="topbar wrap">
    <a class="wordmark" href="${home + pathFor(code)}">${brand}</a>
    <nav class="languages" aria-label="${escape(t.language)}">
      ${languageLinks}
    </nav>
  </header>
  <main id="main">
    <section class="hero" aria-labelledby="title">
      <div class="wrap hero-inner">
        <div class="hero-copy">
          <h1 id="title">${escape(t.title)}</h1>
          <p>${description}</p>
          <div class="actions">
            <a class="button primary" href="${app}">${escape(t.open)}</a>
            <a class="button outline" href="#how">${escape(t.how)}</a>
          </div>
        </div>
      </div>
    </section>
    <section class="section wrap" aria-labelledby="group">
      <h2 id="group">${escape(t.group)}</h2>
      <ul class="cards">
        ${cards(t.features)}
      </ul>
    </section>
    <section class="instructions" aria-labelledby="how">
      <div class="section wrap">
        <h2 id="how">${escape(t.how)}</h2>
        <ol class="steps">
          ${cards(t.steps)}
        </ol>
      </div>
    </section>
    <section class="section wrap share" aria-labelledby="share-title">
      <div>
        <h2 id="share-title">${escape(t.shareTitle)}</h2>
        <p>${escape(t.shareText)}</p>
      </div>
      <div class="share-tools">
        <div class="actions">
          <a class="button outline" href="${escape(whatsapp)}">WhatsApp</a>
          <a class="button outline" href="${escape(telegram)}">Telegram</a>
          <button class="button primary" type="button" id="copy-link" data-success="${escape(t.copied)}" hidden>${escape(t.copyLink)}</button>
        </div>
        <label class="manual" id="manual-copy">
          ${escape(t.copyHelp)}
          <input type="url" value="${url}" readonly>
        </label>
        <p class="status" role="status" id="copy-status"></p>
      </div>
    </section>
  </main>
  <footer class="wrap">
    <div><span>${brand}</span> · <a href="${github}">${escape(t.repository)}</a></div>
    <div class="support"><span>${escape(t.support)}</span> <a href="https://ko-fi.com/mrjonam">Ko-fi</a> · <a href="https://buymeacoffee.com/mrjonam">Buy Me a Coffee</a> · <a href="https://paypal.me/manorollo">PayPal</a></div>
  </footer>
</body>
</html>
`;
}

const assets = join(output, "assets");
await mkdir(assets, { recursive: true });
await Promise.all([
  copyFile(join(source, "../public/hero.webp"), join(assets, "hero.webp")),
  ...["styles.css", "share.js", "icon.png", "sotto-l-albero-social.jpg"].map((name) =>
    copyFile(join(source, name), join(assets, name))
  ),
  ...codes.map(async (code) => {
    const directory = join(output, pathFor(code));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), render(code));
  }),
  writeFile(join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${codes.map((code) => `  <url><loc>${urlFor(code)}</loc></url>`).join("\n")}
</urlset>
`),
]);
if (base === githubPagesBase) await writeFile(join(output, ".nojekyll"), "");
console.log(`Built ${codes.length} language pages in ${output}`);
