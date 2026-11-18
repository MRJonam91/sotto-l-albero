import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { practiceRoute } from "../worker/practice.js";
import { eventRoute } from "../worker/events.js";
import { profileRoute } from "../worker/profile.js";

let sql, db;
const user = { id: "learner", name: "Ada", email: "learner@example.test" };
beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../migrations/", import.meta.url))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    sql.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  db = {
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
  sql.exec(`INSERT INTO users(id,email,name) VALUES('organizer','organizer@example.test','Organizer'),('learner','learner@example.test','Ada');
    INSERT INTO groups(id,owner_id,name) VALUES('group','organizer','Amici');
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES('event','organizer','group','Natale',20,'','2099-12-01','2099-12-10','2099-12-24','invite','');
    INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('member','event','learner','approved','');`);
});
afterEach(() => sql.close());
async function call(path, method = "POST", body = {}) {
  const request = new Request(`http://localhost${path}`, { method });
  const route = path.startsWith("/api/practice/")
    ? practiceRoute
    : path.startsWith("/api/events/")
      ? eventRoute
      : profileRoute;
  const response = await route(request, { DB: db }, path, body, user);
  expect(response.status).toBe(200);
  return response.json();
}
const storedScore = () =>
  sql
    .prepare("SELECT festive_progress_score FROM users WHERE id='learner'")
    .get().festive_progress_score;

describe("conservazione immediata del coinvolgimento", () => {
  it("consolida una partita alla conclusione e la conserva dopo reset prima del primo GET profilo", async () => {
    let quiz = await call("/api/practice/quiz/start");
    for (let index = 0; index < 5; index++) {
      quiz = await call("/api/practice/quiz/step", "POST", {
        revision: quiz.revision,
        choice: 0,
      });
      if (!quiz.done) quiz = await call("/api/practice/quiz/start");
    }
    expect(quiz.done).toBe(true);
    expect(storedScore()).toBe(8);
    await call("/api/practice/quiz/start", "POST", {
      reset: true,
      revision: quiz.revision,
    });
    expect(
      sql
        .prepare("SELECT done FROM practice_games WHERE user_id='learner'")
        .get().done,
    ).toBe(0);
    const profile = await call("/api/profile", "GET");
    expect(profile.context.activity.festiveProgressScore).toBe(8);
  });
  it("preserva anche una vecchia partita completata non ancora consolidata prima di sovrascriverla", async () => {
    sql.exec(
      `INSERT INTO practice_games VALUES('learner','quiz','old','{"index":5,"score":4}',1);`,
    );
    await call("/api/practice/quiz/start", "POST", {
      reset: true,
      revision: "old",
    });
    expect(storedScore()).toBe(8);
    expect(
      (await call("/api/profile", "GET")).context.activity.festiveProgressScore,
    ).toBe(8);
  });
  it("conserva i desideri salvati e poi rimossi prima del primo GET profilo", async () => {
    await call("/api/events/event/wishlist", "PUT", {
      items: [
        { type: "object", title: "Una tazza" },
        { type: "theme", title: "Libri" },
      ],
    });
    expect(storedScore()).toBe(2);
    await call("/api/events/event/wishlist", "PUT", { items: [] });
    expect(
      (await call("/api/profile", "GET")).context.activity.festiveProgressScore,
    ).toBe(2);
  });
  it("consolida i desideri precedenti prima di sostituire la lista", async () => {
    sql.exec(
      `UPDATE members SET wishlist='[{"id":"old","type":"object","title":"Una tazza"}]' WHERE id='member';`,
    );
    await call("/api/events/event/wishlist", "PUT", { items: [] });
    expect(storedScore()).toBe(1);
  });
});
