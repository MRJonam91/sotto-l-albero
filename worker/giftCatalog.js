import { getEvent } from "./events.js";
import { HttpError, isLocalRequest, json, safeText } from "./security.js";

const endpoint = "https://catalog.shopify.com/api/ucp/mcp";
const protocolVersion = "2026-08-25";
const categories = {
  all: "idee regalo originali casa giochi cancelleria",
  home: "tazze accessori cucina casa regalo",
  games: "giochi da tavolo puzzle giochi regalo",
  creative: "kit creativi disegno fai da te regalo",
  stationery: "quaderni libri cancelleria regalo",
  care: "saponi candele benessere regalo",
};
const testProfile =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";

export function giftCatalogProfileRoute(request) {
  if (request.method !== "GET")
    throw new HttpError("Metodo non disponibile.", 405);
  return json({
    ucp: {
      version: protocolVersion,
      capabilities: {
        "dev.ucp.shopping.catalog.search": [{ version: protocolVersion }],
        "dev.ucp.shopping.catalog.lookup": [{ version: protocolVersion }],
        "dev.shopify.catalog.global": [
          {
            version: protocolVersion,
            extends: [
              "dev.ucp.shopping.catalog.search",
              "dev.ucp.shopping.catalog.lookup",
            ],
          },
        ],
      },
    },
  });
}

function publicHttps(value) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes(".") ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localdomain") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":")
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeCatalogProducts(products, min, max) {
  const items = [],
    seen = new Set();
  for (const product of Array.isArray(products) ? products.slice(0, 12) : []) {
    if (!product || typeof product.title !== "string" || !product.title.trim())
      continue;
    const variants = (Array.isArray(product.variants) ? product.variants : [])
      .filter((variant) => {
        const amount = variant?.price?.amount;
        return (
          variant?.source !== "external" &&
          variant?.availability?.available === true &&
          variant?.price?.currency === "EUR" &&
          Number.isSafeInteger(amount) &&
          amount > 0 &&
          amount >= Math.round(min * 100) &&
          amount <= Math.round(max * 100)
        );
      })
      .sort((a, b) => a.price.amount - b.price.amount);
    for (const variant of variants) {
      const url = publicHttps(variant.url);
      const seller = publicHttps(variant.seller?.url);
      const media = [
        ...(Array.isArray(variant.media) ? variant.media : []),
        ...(Array.isArray(product.media) ? product.media : []),
      ];
      const image = media.find(
        (entry) =>
          entry?.type === "image" &&
          publicHttps(entry.url)?.hostname === "cdn.shopify.com",
      )?.url;
      if (
        !url ||
        !seller ||
        !image ||
        typeof variant.seller?.name !== "string" ||
        !variant.seller.name.trim() ||
        typeof variant.id !== "string" ||
        seen.has(variant.id)
      )
        continue;
      seen.add(variant.id);
      items.push({
        id: variant.id,
        title: product.title.trim().slice(0, 150),
        url: variant.url,
        image,
        merchant: variant.seller.name.trim().slice(0, 100),
        price: variant.price.amount / 100,
        currency: "EUR",
      });
      break;
    }
  }
  return items;
}

function priceParam(params, name, fallback) {
  if (!params.has(name)) return fallback;
  const value = Number(params.get(name));
  if (!Number.isFinite(value) || value < 0 || value > 10000)
    throw new HttpError("Controlla la fascia di prezzo.");
  return Math.round(value * 100) / 100;
}

export async function giftCatalogRoute(request, env, user) {
  if (!user?.id) throw new HttpError("Accedi per continuare.", 401);
  if (request.method !== "GET")
    throw new HttpError("Metodo non disponibile.", 405);
  const params = new URL(request.url).searchParams;
  const eventId = safeText(params.get("eventId"), 100, true);
  const { e, member, admin } = await getEvent(env.DB, eventId, user);
  if (!admin && member?.status !== "approved" && member?.status !== "confirmed")
    throw new HttpError(
      "Aspetta che l’organizzatore confermi la tua iscrizione.",
      403,
    );
  const budget = Number(e.budget);
  if (!Number.isFinite(budget) || budget < 0 || budget > 10000)
    throw new HttpError("Il budget di questo scambio non è valido.");
  const max = Math.min(priceParam(params, "max", budget), budget);
  const min = priceParam(params, "min", 0);
  if (min > max)
    throw new HttpError(
      "Il prezzo minimo deve rientrare nel budget dello scambio.",
    );
  const category = safeText(params.get("category"), 30) || "all";
  if (!Object.hasOwn(categories, category))
    throw new HttpError("Scegli una categoria disponibile.");
  const query = safeText(params.get("q"), 100) || categories[category];
  const cursor = safeText(params.get("cursor"), 8192);
  const base = { budget, min, max, provider: "Shopify Catalog" };
  if (max === 0)
    return json({
      ...base,
      products: [],
      checkedAt: new Date().toISOString(),
      cursor: "",
      hasMore: false,
    });
  let profile;
  if (isLocalRequest(request, env)) profile = testProfile;
  else {
    const appUrl = publicHttps(env.APP_URL);
    if (!appUrl)
      throw new HttpError(
        "Il catalogo prodotti non è ancora configurato.",
        503,
      );
    profile = new URL("/api/gifts/profile", appUrl).href;
  }
  const catalog = {
    query,
    context: { address_country: "IT", language: "it", currency: "EUR" },
    filters: {
      price: { min: Math.round(min * 100), max: Math.round(max * 100) },
      ships_to: { country: "IT" },
      available: true,
    },
    pagination: { limit: 12, ...(cursor ? { cursor } : {}) },
  };
  let data;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_catalog",
          arguments: { meta: { "ucp-agent": { profile } }, catalog },
        },
      }),
      signal: AbortSignal.timeout(16000),
    });
    if (!response.ok) throw new Error("provider unavailable");
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("provider response too large");
    const payload = JSON.parse(text);
    data = payload.result?.structuredContent;
    if (
      payload.result?.isError ||
      payload.error ||
      !Array.isArray(data?.products)
    )
      throw new Error("invalid catalog");
  } catch {
    throw new HttpError(
      "Il catalogo prodotti non risponde in questo momento. Riprova tra poco o aggiungi un link tuo.",
      503,
    );
  }
  const nextCursor =
    typeof data.pagination?.cursor === "string" &&
    data.pagination.cursor.length <= 8192
      ? data.pagination.cursor
      : "";
  return json({
    ...base,
    products: normalizeCatalogProducts(data.products, min, max),
    checkedAt: new Date().toISOString(),
    cursor: nextCursor,
    hasMore: data.pagination?.has_next_page === true && !!nextCursor,
  });
}
