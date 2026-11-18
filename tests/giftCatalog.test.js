import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  giftCatalogProfileRoute,
  giftCatalogRoute,
  normalizeCatalogProducts,
} from "../worker/giftCatalog.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GiftProductCard } from "../src/GiftBrowser.jsx";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE groups(id TEXT PRIMARY KEY,name TEXT); INSERT INTO groups VALUES('group','Friends');
    CREATE TABLE events(id TEXT PRIMARY KEY,group_id TEXT,owner_id TEXT,budget REAL); INSERT INTO events VALUES('event','group','owner',25);
    CREATE TABLE members(id TEXT,event_id TEXT,user_id TEXT,status TEXT); INSERT INTO members VALUES('m1','event','member','approved');`);
  return {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async first() {
          return sql.prepare(query).get(...args) || null;
        },
      };
      return statement;
    },
  };
}
const product = (overrides = {}) => ({
  id: "gid://shopify/p/test",
  title: "Tazza di prova",
  media: [{ type: "image", url: "https://cdn.shopify.com/s/files/test.jpg" }],
  variants: [
    {
      id: "gid://shopify/ProductVariant/1",
      title: "Blu",
      price: { amount: 1290, currency: "EUR" },
      availability: { available: true },
      url: "https://merchant.example/products/tazza?shcgid=keep&shclid=also-keep",
      seller: { name: "Negozio di prova", url: "https://merchant.example" },
      source: "shopify",
      ...overrides,
    },
  ],
});
const request = (query = "") =>
  new Request(`https://santa.example/api/gifts?eventId=event${query}`);
const env = () => ({ DB: database(), APP_URL: "https://santa.example" });
afterEach(() => vi.unstubAllGlobals());

describe("live gift catalog", () => {
  it("normalizes actual EUR offers and preserves the merchant attribution", () => {
    expect(normalizeCatalogProducts([product()], 0, 25)).toEqual([
      {
        id: "gid://shopify/ProductVariant/1",
        title: "Tazza di prova",
        url: "https://merchant.example/products/tazza?shcgid=keep&shclid=also-keep",
        image: "https://cdn.shopify.com/s/files/test.jpg",
        merchant: "Negozio di prova",
        price: 12.9,
        currency: "EUR",
      },
    ]);
  });
  it("omits over-budget, unavailable, unsafe, unpriced or non-EUR products", () => {
    for (const variant of [
      { price: { amount: 2501, currency: "EUR" } },
      { price: { amount: 1290, currency: "USD" } },
      { price: { amount: 0, currency: "EUR" } },
      { price: { amount: 1290.2, currency: "EUR" } },
      { price: null },
      { availability: { available: false } },
      { url: "http://merchant.example/gift" },
      { url: "https://localhost/gift" },
      { url: "https://127.0.0.1/gift" },
      { url: "https://user:password@merchant.example/gift" },
      { source: "external" },
    ])
      expect(normalizeCatalogProducts([product(variant)], 0, 25)).toEqual([]);
    expect(
      normalizeCatalogProducts(
        [
          {
            ...product(),
            media: [{ type: "image", url: "https://evil.example/img.jpg" }],
          },
        ],
        0,
        25,
      ),
    ).toEqual([]);
    expect(normalizeCatalogProducts([product()], 13, 25)).toEqual([]);
  });
  it("publishes only the minimal catalog capabilities in the public profile", async () => {
    const response = await giftCatalogProfileRoute(
      new Request("https://santa.example/api/gifts/profile"),
    );
    const profile = await response.json();
    expect(
      profile.ucp.capabilities["dev.ucp.shopping.catalog.search"],
    ).toBeTruthy();
    expect(profile.ucp.capabilities["dev.shopify.catalog.global"]).toBeTruthy();
    expect(JSON.stringify(profile)).not.toContain("checkout");
  });
  it("checks membership before contacting the public catalog", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      giftCatalogRoute(request(), env(), { id: "stranger" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      giftCatalogRoute(request(), env(), null),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("clamps results and upstream filters to the saved group budget using only generic shopping context", async () => {
    let body;
    vi.stubGlobal("fetch", async (url, options) => {
      body = JSON.parse(options.body);
      expect(url).toBe("https://catalog.shopify.com/api/ucp/mcp");
      return Response.json({
        result: {
          structuredContent: {
            products: [
              product(),
              product({
                id: "expensive",
                price: { amount: 3000, currency: "EUR" },
              }),
            ],
            pagination: { has_next_page: true, cursor: "next-page" },
          },
        },
      });
    });
    const response = await giftCatalogRoute(
      request("&max=999&q=tazza"),
      env(),
      {
        id: "member",
        email: "private@example.test",
        holidayProfile: { secret: "private taste" },
      },
    );
    const result = await response.json();
    expect(result.products).toHaveLength(1);
    expect(result).toMatchObject({
      budget: 25,
      max: 25,
      min: 0,
      hasMore: true,
      cursor: "next-page",
      provider: "Shopify Catalog",
    });
    expect(body.params.arguments.catalog).toMatchObject({
      query: "tazza",
      context: { address_country: "IT", language: "it", currency: "EUR" },
      filters: { price: { min: 0, max: 2500 }, ships_to: { country: "IT" } },
      pagination: { limit: 12 },
    });
    expect(body.params.arguments.meta["ucp-agent"].profile).toBe(
      "https://santa.example/api/gifts/profile",
    );
    expect(JSON.stringify(body)).not.toContain("private");
  });
  it("uses the official test profile only for explicit local development", async () => {
    let body;
    vi.stubGlobal("fetch", async (_, options) => {
      body = JSON.parse(options.body);
      return Response.json({
        result: {
          structuredContent: {
            products: [],
            pagination: { has_next_page: false },
          },
        },
      });
    });
    await giftCatalogRoute(
      new Request("http://127.0.0.1:8787/api/gifts?eventId=event"),
      { ...env(), LOCAL_DEV: "true" },
      { id: "member" },
    );
    expect(body.params.arguments.meta["ucp-agent"].profile).toBe(
      "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json",
    );
  });
  it("returns a visible service error for provider failure and validates budget inputs", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response("Too many requests", { status: 429 }),
    );
    await expect(
      giftCatalogRoute(request(), env(), { id: "member" }),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      giftCatalogRoute(request("&min=26"), env(), { id: "member" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      giftCatalogRoute(request("&max=NaN"), env(), { id: "member" }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("renders merchant product cards with a real price, separate shop link and native wishlist action", () => {
    const item = normalizeCatalogProducts([product()], 0, 25)[0];
    const html = renderToStaticMarkup(
      createElement(GiftProductCard, {
        product: item,
        selected: false,
        onAdd: () => {},
      }),
    );
    expect(html).toContain("12,90");
    expect(html).toContain("Negozio di prova");
    expect(html).toContain('src="https://cdn.shopify.com/s/files/test.jpg"');
    expect(html).toContain('aria-label="Aggiungi Tazza di prova alla lettera"');
    expect(html).toContain("shcgid=keep&amp;shclid=also-keep");
    expect(html).not.toMatch(/<a[^>]*>[^]*?<button[^]*?<\/a>/);
    const selected = renderToStaticMarkup(
      createElement(GiftProductCard, {
        product: { ...item, title: "<script>alert(1)</script>" },
        selected: true,
        onAdd: () => {},
      }),
    );
    expect(selected).toContain("Nella tua lettera");
    expect(selected).toContain("disabled");
    expect(selected).not.toContain("<script>");
  });
});
