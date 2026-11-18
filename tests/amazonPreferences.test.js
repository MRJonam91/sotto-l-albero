import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  amazonPreferencesRoute,
  loadAmazonPreferences,
} from "../worker/amazonPreferences.js";
import { eventRoute } from "../worker/events.js";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('owner'),('other');",
  );
  sql.exec(
    readFileSync(
      new URL("../migrations/0019_amazon_preferences.sql", import.meta.url),
      "utf8",
    ),
  );
  sql.exec(`CREATE TABLE groups(id TEXT PRIMARY KEY,name TEXT); INSERT INTO groups VALUES('group','Friends');
    CREATE TABLE events(id TEXT PRIMARY KEY,group_id TEXT,owner_id TEXT); INSERT INTO events VALUES('event','group','owner');
    CREATE TABLE members(id TEXT PRIMARY KEY,event_id TEXT,user_id TEXT,status TEXT,wishlist TEXT,updated_at TEXT);
    INSERT INTO members VALUES('m-owner','event','owner','approved','[]',''),('m-other','event','other','approved','[]','');`);
  return {
    sql,
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
        async run() {
          return {
            meta: { changes: Number(sql.prepare(query).run(...args).changes) },
          };
        },
      };
      return statement;
    },
  };
}
const owner = { id: "owner", email: "  AFFILIATION-OWNER@EXAMPLE.TEST " };
const other = { id: "other", email: "someone@gmail.com" };
const request = (method) =>
  new Request("https://example.test/api/preferences/amazon", { method });

describe("account-scoped Amazon preferences", () => {
  it("keeps the capability unavailable when the server secret is absent", async () => {
    const env = { DB: database() };
    expect(
      await (
        await amazonPreferencesRoute(request("GET"), env, {}, owner)
      ).json(),
    ).toEqual({ allowed: false });
    await expect(
      amazonPreferencesRoute(
        request("PUT"),
        env,
        { enabled: true, tag: "myshop-21" },
        owner,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("starts empty and persists only the authorized account's explicit preference", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    expect(
      await (
        await amazonPreferencesRoute(request("GET"), env, {}, owner)
      ).json(),
    ).toEqual({ allowed: true, enabled: false, tag: "" });
    const response = await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: true, tag: "myshop-21" },
      owner,
    );
    expect(response.status).toBe(200);
    expect(await loadAmazonPreferences(env.DB, owner, env)).toEqual({
      allowed: true,
      enabled: true,
      tag: "myshop-21",
    });
    await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: false, tag: "" },
      owner,
    );
    expect(await loadAmazonPreferences(env.DB, owner, env)).toEqual({
      allowed: true,
      enabled: false,
      tag: "",
    });
  });
  it("does not expose the tag to another account and rejects forged writes", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: true, tag: "myshop-21" },
      owner,
    );
    expect(
      await (
        await amazonPreferencesRoute(request("GET"), env, {}, other)
      ).json(),
    ).toEqual({ allowed: false });
    for (const user of [
      other,
      { ...other, email: "affiliation-owner@example.test.evil.test" },
      { ...other, email: "affiliation-owner+alias@example.test" },
    ])
      await expect(
        amazonPreferencesRoute(
          request("PUT"),
          env,
          { enabled: true, tag: "forged-21", email: owner.email },
          user,
        ),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      amazonPreferencesRoute(request("GET"), env, {}, null),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("rejects invalid tags and nonboolean enable values", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    for (const body of [
      { enabled: true, tag: "bad&tag-21" },
      { enabled: true, tag: "" },
      { enabled: "true", tag: "good-21" },
      { enabled: true, tag: "x".repeat(65) + "-21" },
    ])
      await expect(
        amazonPreferencesRoute(request("PUT"), env, body, owner),
      ).rejects.toMatchObject({ status: 400 });
  });
  it("computes affiliate metadata at wishlist save from the owner preference only", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: true, tag: "saved-21" },
      owner,
    );
    const items = [
      {
        type: "object",
        title: "Book",
        url: "https://amazon.it/dp/ABC?tag=forged-21",
        amazonAffiliate: true,
        affiliate: true,
      },
    ];
    await eventRoute(
      request("PUT"),
      env,
      "/api/events/event/wishlist",
      { items },
      owner,
    );
    const saved = JSON.parse(
      env.DB.sql
        .prepare("SELECT wishlist FROM members WHERE user_id='owner'")
        .get().wishlist,
    )[0];
    expect(new URL(saved.url).searchParams.get("tag")).toBe("saved-21");
    expect(saved.affiliate).toBe(true);
    await eventRoute(
      request("PUT"),
      env,
      "/api/events/event/wishlist",
      { items },
      other,
    );
    const unprivileged = JSON.parse(
      env.DB.sql
        .prepare("SELECT wishlist FROM members WHERE user_id='other'")
        .get().wishlist,
    )[0];
    expect(new URL(unprivileged.url).searchParams.get("tag")).toBe("forged-21");
    expect(unprivileged.affiliate).toBeUndefined();
    expect(unprivileged.amazonAffiliate).toBeUndefined();
  });
  it("requires an explicit pickup city, limits it, and preserves other shop links as plain data", async () => {
    const env = { DB: database() };
    const wish = {
      type: "object",
      title: "Gioco",
      url: "https://www.toyscenter.it/prodotto/example",
      fulfillment: "pickup",
    };
    for (const pickupCity of ["", " ", "x".repeat(81)])
      await expect(
        eventRoute(
          request("PUT"),
          env,
          "/api/events/event/wishlist",
          { items: [{ ...wish, pickupCity }] },
          other,
        ),
      ).rejects.toMatchObject({ status: 400 });
    await eventRoute(
      request("PUT"),
      env,
      "/api/events/event/wishlist",
      {
        items: [
          {
            ...wish,
            pickupCity: " Torino <script>alert(1)</script> ",
            affiliate: true,
          },
        ],
      },
      other,
    );
    const saved = JSON.parse(
      env.DB.sql
        .prepare("SELECT wishlist FROM members WHERE user_id='other'")
        .get().wishlist,
    )[0];
    expect(saved.pickupCity).toBe("Torino <script>alert(1)</script>");
    expect(saved.fulfillment).toBe("pickup");
    expect(saved.url).toBe(wish.url);
    expect(saved.affiliate).toBeUndefined();
    await expect(
      eventRoute(
        request("PUT"),
        env,
        "/api/events/event/wishlist",
        {
          items: [
            { ...wish, url: "javascript:alert(1)", pickupCity: "Torino" },
          ],
        },
        other,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("returns normalized items and removes a previously managed tag on explicit opt-out without reloading", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: true, tag: "saved-21" },
      owner,
    );
    const save = async (items) =>
      (
        await eventRoute(
          request("PUT"),
          env,
          "/api/events/event/wishlist",
          { items },
          owner,
        )
      ).json();
    const first = await save([
      {
        type: "object",
        title: "Book",
        url: "https://amazon.it/dp/ABC?ref=gift",
        amazonAffiliate: true,
      },
    ]);
    expect(first.items).toHaveLength(1);
    expect(new URL(first.items[0].url).searchParams.get("tag")).toBe(
      "saved-21",
    );
    const second = await save([{ ...first.items[0], amazonAffiliate: false }]);
    expect(second.items[0].id).toBe(first.items[0].id);
    expect(second.items[0].url).toBe("https://amazon.it/dp/ABC?ref=gift");
    expect(second.items[0].affiliate).toBeUndefined();
    expect(second.items[0].amazonAffiliate).toBeUndefined();
    expect(
      JSON.parse(
        env.DB.sql
          .prepare("SELECT wishlist FROM members WHERE user_id='owner'")
          .get().wishlist,
      ),
    ).toEqual(second.items);
  });
  it("preserves unmanaged tags and a manually changed URL when opting out", async () => {
    const env = {
      DB: database(),
      AMAZON_AFFILIATE_EMAIL: "affiliation-owner@example.test",
    };
    await amazonPreferencesRoute(
      request("PUT"),
      env,
      { enabled: true, tag: "saved-21" },
      owner,
    );
    const save = async (items) =>
      (
        await eventRoute(
          request("PUT"),
          env,
          "/api/events/event/wishlist",
          { items },
          owner,
        )
      ).json();
    const manual = await save([
      {
        type: "object",
        title: "Manual",
        url: "https://amazon.it/dp/MANUAL?tag=manual-21",
        amazonAffiliate: false,
        affiliate: true,
      },
    ]);
    expect(manual.items[0].url).toBe(
      "https://amazon.it/dp/MANUAL?tag=manual-21",
    );
    const managed = await save([
      {
        type: "object",
        title: "Managed",
        url: "https://amazon.it/dp/ABC",
        amazonAffiliate: true,
      },
    ]);
    const changed = await save([
      {
        ...managed.items[0],
        url: "https://amazon.it/dp/ABC?tag=manual-21",
        amazonAffiliate: false,
      },
    ]);
    expect(changed.items[0].url).toBe("https://amazon.it/dp/ABC?tag=manual-21");
    expect(changed.items[0].affiliate).toBeUndefined();
  });
});
