import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import worker from "../worker/index.js";
import { digest } from "../worker/security.js";

function database() {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(
    new URL("../migrations/", import.meta.url),
  ).sort())
    sql.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
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
          return sql.prepare(query).get(...args) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
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

let env;
const session = "a".repeat(64);
async function api(method = "GET", body, cookie = `santa_session=${session}`) {
  const response = await worker.fetch(
    new Request("https://albero.example/api/stamps", {
      method,
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: "https://albero.example",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    env,
  );
  return { status: response.status, data: await response.json() };
}

function addEvent({
  id = "event",
  gift = "2026-11-28T18:00:00Z",
  created = "2026-11-01T12:00:00Z",
  status = "open",
  membership = "approved",
} = {}) {
  env.DB.sql
    .prepare(
      "INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at,status) VALUES(?,'owner','group',?,20,'','','',?,?,?,?)",
    )
    .run(id, id, gift, `invite-${id}`, created, status);
  if (membership)
    env.DB.sql
      .prepare(
        "INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES(?,?,'user',?,'')",
      )
      .run(`member-${id}`, id, membership);
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
  env = { DB: database(), STAMP_ROLLOUT_START: "2026-11-18" };
  env.DB.sql.exec(
    "INSERT INTO users(id,email,name) VALUES('owner','owner@example.test','Owner'),('user','user@example.test','User'); INSERT INTO groups(id,owner_id,name) VALUES('group','owner','Amici');",
  );
  env.DB.sql
    .prepare("INSERT INTO sessions(digest,user_id,expires) VALUES(?,'user',?)")
    .run(await digest(session), Date.now() + 8640000000);
});
afterEach(() => {
  env.DB.sql.close();
  vi.useRealTimers();
});

describe("stamp release API", () => {
  it("requires authentication for reading and collecting", async () => {
    expect((await api("GET", undefined, "")).status).toBe(401);
    expect((await api("POST", { stamp: "office_ipod" }, "")).status).toBe(401);
  });

  it("keeps collected stamps and exposes the server-calculated release", async () => {
    addEvent();
    env.DB.sql.exec(
      "INSERT INTO user_stamps(user_id,stamp) VALUES('user','star'),('user','polar_bell')",
    );
    expect(await api()).toMatchObject({
      status: 200,
      data: {
        stamps: ["polar_bell", "star"],
        release: {
          enabled: true,
          availableIds: ["office_ipod"],
          availableCount: 1,
          total: 10,
          startDate: "2026-11-18",
          giftDate: "2026-11-28",
          eventName: "event",
          nextDate: "2026-11-19",
        },
      },
    });
  });

  it("blocks direct early requests and ignores forged client dates and events", async () => {
    addEvent();
    const result = await api("POST", {
      stamp: "polar_bell",
      now: "2099-01-01",
      giftDate: "2026-11-19",
      eventId: "made-up",
    });
    expect(result.status).toBe(409);
    expect(
      env.DB.sql.prepare("SELECT COUNT(*) AS n FROM user_stamps").get().n,
    ).toBe(0);
    expect((await api("POST", { stamp: "office_ipod" })).status).toBe(200);
    expect(
      env.DB.sql.prepare("SELECT stamp,collected_at FROM user_stamps").get(),
    ).toMatchObject({ stamp: "office_ipod", collected_at: Date.now() });
  });

  it("unlocks at Rome midnight without cron and records collection once", async () => {
    addEvent();
    vi.setSystemTime(new Date("2026-11-18T22:59:59Z"));
    expect((await api("POST", { stamp: "polar_bell" })).status).toBe(409);
    vi.setSystemTime(new Date("2026-11-18T23:00:00Z"));
    expect((await api("POST", { stamp: "polar_bell" })).status).toBe(200);
    vi.setSystemTime(new Date("2026-11-19T02:00:00Z"));
    expect((await api("POST", { stamp: "polar_bell" })).status).toBe(200);
    expect(
      env.DB.sql
        .prepare(
          "SELECT COUNT(*) AS n,MIN(collected_at) AS at FROM user_stamps",
        )
        .get(),
    ).toMatchObject({ n: 1, at: Date.parse("2026-11-18T23:00:00Z") });
  });

  it("deduplicates concurrent collection requests on the database key", async () => {
    addEvent();
    const results = await Promise.all([
      api("POST", { stamp: "office_ipod" }),
      api("POST", { stamp: "office_ipod" }),
    ]);
    expect(results.map(({ status }) => status)).toEqual([200, 200]);
    expect(
      env.DB.sql
        .prepare(
          "SELECT COUNT(*) AS n FROM user_stamps WHERE stamp='office_ipod'",
        )
        .get().n,
    ).toBe(1);
  });

  it("rejects collection before the configured launch date", async () => {
    addEvent();
    vi.setSystemTime(new Date("2026-11-17T22:59:59Z"));
    expect((await api()).data.release).toMatchObject({
      availableCount: 0,
      nextDate: "2026-11-18",
    });
    expect(
      (await api("POST", { stamp: "office_ipod", now: "2099-01-01" })).status,
    ).toBe(409);
  });

  it.each(["pending", "removed", null])(
    "requires approved membership, including for an owner (%s)",
    async (membership) => {
      addEvent({ membership });
      env.DB.sql.exec("UPDATE events SET owner_id='user'");
      expect((await api()).data.release).toMatchObject({
        enabled: true,
        availableCount: 0,
        eventName: null,
      });
      expect((await api("POST", { stamp: "office_ipod" })).status).toBe(403);
    },
  );

  it("ignores archived memberships and chooses the nearest eligible event", async () => {
    addEvent({ id: "archive", gift: "2026-11-19", status: "archived" });
    addEvent({ id: "pending", gift: "2026-11-19", membership: "pending" });
    addEvent({ id: "later", gift: "2026-12-08" });
    addEvent({ id: "nearer", gift: "2026-11-28" });
    expect((await api()).data.release).toMatchObject({
      eventName: "nearer",
      availableCount: 1,
    });
    env.DB.sql.exec("UPDATE events SET status='archived' WHERE id='nearer'");
    expect((await api()).data.release).toMatchObject({
      eventName: "later",
      nextDate: "2026-11-20",
    });
  });

  it("retains collected new stamps when eligibility or configuration is removed", async () => {
    addEvent({ gift: "2026-11-19" });
    expect((await api("POST", { stamp: "rudolph_nose" })).status).toBe(200);
    env.DB.sql.exec(
      "UPDATE members SET status='removed'; UPDATE events SET status='archived'",
    );
    delete env.STAMP_ROLLOUT_START;
    expect((await api()).data).toMatchObject({
      stamps: ["rudolph_nose"],
      release: { enabled: false, availableIds: [] },
    });
    expect((await api("POST", { stamp: "rudolph_nose" })).status).toBe(200);
    expect((await api("POST", { stamp: "office_ipod" })).status).toBe(403);
  });

  it("excludes old editions and keeps uncollected unlocks after a nearer gift date passes", async () => {
    addEvent({ id: "old", gift: "2025-12-25" });
    expect((await api()).data.release.availableCount).toBe(0);
    expect((await api("POST", { stamp: "office_ipod" })).status).toBe(403);
    addEvent({ id: "soon", gift: "2026-11-19" });
    addEvent({ id: "later", gift: "2026-12-08" });
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    expect((await api()).data.release.availableCount).toBe(10);
    expect((await api("POST", { stamp: "rudolph_nose" })).status).toBe(200);
  });

  it("keeps the new series disabled without valid configuration and preserves base stamps", async () => {
    addEvent();
    env.STAMP_ROLLOUT_START = "2026-02-30";
    expect((await api()).data.release.enabled).toBe(false);
    expect((await api("POST", { stamp: "office_ipod" })).status).toBe(403);
    expect((await api("POST", { stamp: "star" })).status).toBe(200);
    expect((await api("POST", { stamp: "santa" })).status).toBe(409);
    expect((await api("POST", { stamp: "cookie" })).status).toBe(409);
    expect((await api("POST", { stamp: "quiz" })).status).toBe(403);
    expect((await api("POST", { stamp: "not-a-stamp" })).status).toBe(400);
  });
});
