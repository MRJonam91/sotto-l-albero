import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE users(id TEXT PRIMARY KEY);
    CREATE TABLE members(user_id TEXT,status TEXT);
    INSERT INTO users VALUES('approved'),('pending');
    INSERT INTO members VALUES('approved','approved'),('pending','pending');`);
  sql.exec(
    readFileSync(
      new URL("../migrations/0020_profile_activity.sql", import.meta.url),
      "utf8",
    ),
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

const request = (method = "POST") =>
  new Request("http://localhost/api/profile/activity", { method });
async function route(
  db,
  body = { game: "curling" },
  user = { id: "approved" },
  method = "POST",
) {
  const { profileActivityRoute } = await import("../worker/profileActivity.js");
  return profileActivityRoute(request(method), { DB: db }, body, user);
}

describe("partecipazione al curling fuori classifica", () => {
  it("salva una sola partecipazione al giorno e al massimo tre in totale senza punti", async () => {
    const db = database();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
      expect(await (await route(db)).json()).toMatchObject({
        ok: true,
        recorded: true,
      });
      expect(await (await route(db)).json()).toMatchObject({
        ok: true,
        recorded: false,
      });
      for (const day of [19, 20, 21]) {
        vi.setSystemTime(new Date(`2026-11-${day}T12:00:00Z`));
        await route(db);
      }
      expect(
        db.sql
          .prepare(
            "SELECT user_id,game,COUNT(*) AS count FROM profile_activity GROUP BY user_id,game",
          )
          .all(),
      ).toEqual([{ user_id: "approved", game: "curling", count: 3 }]);
      expect(
        db.sql
          .prepare("PRAGMA table_info(profile_activity)")
          .all()
          .map((column) => column.name),
      ).not.toContain("score");
    } finally {
      vi.useRealTimers();
    }
  });
  it("usa il giorno di Roma per deduplicare", async () => {
    const db = database();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-18T22:59:00Z"));
      await route(db);
      vi.setSystemTime(new Date("2026-11-18T23:01:00Z"));
      await route(db);
      expect(
        db.sql.prepare("SELECT day FROM profile_activity ORDER BY day").all(),
      ).toEqual([{ day: "2026-11-18" }, { day: "2026-11-19" }]);
    } finally {
      vi.useRealTimers();
    }
  });
  it("richiede accesso e iscrizione approvata e rifiuta altri giochi e punteggi", async () => {
    const db = database();
    await expect(route(db, { game: "curling" }, null)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      route(db, { game: "curling" }, { id: "pending" }),
    ).rejects.toMatchObject({ status: 403 });
    for (const body of [
      { game: "quiz" },
      { game: "tris" },
      { game: "curling", score: 100 },
      { game: "curling", raw_score: 100 },
    ])
      await expect(route(db, body)).rejects.toMatchObject({ status: 400 });
    await expect(
      route(db, { game: "curling" }, { id: "approved" }, "GET"),
    ).rejects.toMatchObject({ status: 405 });
    expect(
      db.sql.prepare("SELECT COUNT(*) AS count FROM profile_activity").get()
        .count,
    ).toBe(0);
  });
});
