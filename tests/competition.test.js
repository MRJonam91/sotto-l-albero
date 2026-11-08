import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { competitionRoute, getLeaderboard } from "../worker/competition.js";

const eventMigration = "0009_event_competition.sql";

function applyMigration(sql, file) {
  sql.exec(
    readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
  );
}

function database(stopBefore) {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(
    new URL("../migrations/", import.meta.url),
  ).sort()) {
    if (file === stopBefore) break;
    applyMigration(sql, file);
  }
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
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sql.exec("COMMIT");
        return result;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

let env, event;
const owner = { id: "owner", name: "Ada" };
const anna = { id: "anna", name: "Anna" };
const bea = { id: "bea", name: "Bea" };
const guest = { id: "guest", name: "Giulia" };
async function api(user, suffix = "", body, eventId = "event") {
  const path = `/api/competition/${eventId}${suffix}`;
  const request = new Request(`https://albero.example${path}`, {
    method: body ? "POST" : "GET",
  });
  return (await competitionRoute(request, env, path, body ?? {}, user)).json();
}

beforeEach(() => {
  env = { DB: database() };
  const year = new Date().getUTCFullYear() + 1;
  const date = `${year}-12-20T00:00:00.000Z`;
  env.DB.sql.exec(`
    INSERT INTO users(id,email,name) VALUES ('owner','a@example.com','Ada'),('anna','b@example.com','Anna'),('bea','c@example.com','Bea'),('guest','d@example.com','Giulia');
    INSERT INTO groups(id,owner_id,name) VALUES ('group','owner','Famiglia');
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES
      ('event','owner','group','Natale',20,'','${date}','${date}','${date}','inv','${date}'),
      ('copy','owner','group','Natale bis',20,'','${date}','${date}','${date}','inv2','${date}');
    INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES
      ('ma','event','anna','approved',''),('mb','event','bea','approved',''),('mg','event','guest','pending',''),
      ('mc','copy','anna','approved','');
  `);
  event = env.DB.sql.prepare("SELECT * FROM events WHERE id='event'").get();
});

async function start(user, game, duelId) {
  return (await api(user, "/start", { game, ...(duelId ? { duelId } : {}) }))
    .attempt;
}
async function action(user, attempt, move) {
  return (
    await api(user, "/action", {
      attemptId: attempt.id,
      revision: attempt.revision,
      ...move,
    })
  ).attempt;
}
async function completeQuiz(user, attempt, correct) {
  const stored = JSON.parse(
    env.DB.sql
      .prepare("SELECT state FROM competition_attempts WHERE id=?")
      .get(attempt.id).state,
  );
  for (const q of stored.questions) {
    attempt = await action(user, attempt, {
      choice: correct ? q.answer : (q.answer + 1) % q.options.length,
    });
  }
  return attempt;
}

describe("competition", () => {
  it("requires approval and explicit signup, and lets an owner see the board without playing", async () => {
    await expect(api(guest)).rejects.toMatchObject({ status: 403 });
    await expect(api(owner, "/join", {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(start(anna, "quiz")).rejects.toMatchObject({ status: 403 });
    expect((await api(owner)).canPlay).toBe(false);
    await api(anna, "/join", {});
    expect((await api(anna, "", undefined, "copy")).joined).toBe(false);
  });

  it("isolates scores, attempts, adjustments and duels between events in the same group and year", async () => {
    env.DB.sql.exec(
      "INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('copy-bea','copy','bea','approved','')",
    );
    for (const user of [anna, bea]) {
      await api(user, "/join", {});
      await api(user, "/join", {}, "copy");
    }
    await completeQuiz(anna, await start(anna, "quiz"), true);
    const { duelId } = await api(anna, "/duels", { userId: bea.id });
    const attempt = await start(anna, "memory");
    const other = await api(anna, "", undefined, "copy");
    expect(other.leaderboard.find((row) => row.userId === anna.id).score).toBe(
      0,
    );
    expect(other.games.find((game) => game.id === "quiz").attempts).toBe(0);
    expect(other.active).toEqual([]);
    expect(other.duels).toEqual([]);
    await expect(
      api(anna, "/start", { game: "duel", duelId }, "copy"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      api(
        anna,
        "/action",
        { attemptId: attempt.id, revision: attempt.revision, position: 0 },
        "copy",
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await api(anna, "/duels", { userId: bea.id }, "copy")).duelId,
    ).not.toBe(duelId);
    await api(
      owner,
      "/adjust",
      { userId: anna.id, kind: "add", points: 11, reason: "Correzione" },
      "copy",
    );
    expect(
      (await api(anna)).leaderboard.find((row) => row.userId === anna.id).score,
    ).toBe(300);
    expect(
      (await api(anna, "", undefined, "copy")).leaderboard.find(
        (row) => row.userId === anna.id,
      ).score,
    ).toBe(11);
  });

  it("preserves registration, scores and active attempts when the gift date changes year", async () => {
    await api(anna, "/join", {});
    await completeQuiz(anna, await start(anna, "quiz"), true);
    const attempt = await start(anna, "memory");
    env.DB.sql
      .prepare("UPDATE events SET gift_at=? WHERE id='event'")
      .run(
        `${new Date(event.gift_at).getUTCFullYear() + 1}-12-20T00:00:00.000Z`,
      );
    const board = await api(anna);
    expect(board.joined).toBe(true);
    expect(board.leaderboard[0].score).toBe(300);
    expect(board.active[0].id).toBe(attempt.id);
    expect((await action(anna, attempt, { position: 0 })).revision).toBe(1);
  });

  it("verifies answers, resumes the same attempt, and records the best of three weighted results", async () => {
    await api(anna, "/join", {});
    const first = await start(anna, "quiz");
    expect((await start(anna, "quiz")).id).toBe(first.id);
    expect(first.question.answer).toBeUndefined();
    await expect(action(bea, first, { choice: 0 })).rejects.toMatchObject({
      status: 403,
    });
    const before = await action(anna, first, { choice: 0 });
    await expect(action(anna, first, { choice: 0 })).rejects.toMatchObject({
      status: 409,
    });
    expect((await start(anna, "quiz")).revision).toBe(before.revision);
    env.DB.sql
      .prepare("UPDATE competition_attempts SET expires=0 WHERE id=?")
      .run(first.id);
    const second = await completeQuiz(anna, await start(anna, "quiz"), true);
    expect(second.score).toBe(285);
    expect(
      (await completeQuiz(anna, await start(anna, "quiz"), true)).score,
    ).toBe(270);
    await expect(start(anna, "quiz")).rejects.toMatchObject({ status: 409 });
    expect((await getLeaderboard(env.DB, event))[0].score).toBe(285);
    expect(
      env.DB.sql
        .prepare("SELECT stamp FROM user_stamps WHERE user_id='anna'")
        .get().stamp,
    ).toBe("quiz");
  });

  it("reveals memory cards one at a time and computes errors on the server", async () => {
    await api(anna, "/join", {});
    let attempt = await start(anna, "memory");
    expect(attempt.cards).toHaveLength(16);
    expect(attempt.cards.every((card) => card.symbol === null)).toBe(true);
    const { deck } = JSON.parse(
      env.DB.sql
        .prepare("SELECT state FROM competition_attempts WHERE id=?")
        .get(attempt.id).state,
    );
    attempt = await action(anna, attempt, { position: 0 });
    expect(attempt.cards.filter((card) => card.symbol)).toHaveLength(1);
    const miss = deck.findIndex((symbol) => symbol !== deck[0]);
    attempt = await action(anna, attempt, { position: miss });
    await expect(action(anna, attempt, { position: 1 })).rejects.toMatchObject({
      status: 400,
    });
    attempt = await action(anna, attempt, { cover: true });
    for (const symbol of new Set(deck)) {
      attempt = await action(anna, attempt, { position: deck.indexOf(symbol) });
      attempt = await action(anna, attempt, {
        position: deck.lastIndexOf(symbol),
      });
    }
    expect(attempt.score).toBe(280);
    expect(
      env.DB.sql
        .prepare("SELECT stamp FROM user_stamps WHERE user_id='anna'")
        .get().stamp,
    ).toBe("memory");
  });

  it("upgrades an unfinished eight-card ranked attempt without spending a new attempt or erasing its errors", async () => {
    await api(anna, "/join", {});
    const previous = await start(anna, "memory");
    env.DB.sql
      .prepare(
        "UPDATE competition_attempts SET raw_score=220,score=220 WHERE id=?",
      )
      .run(previous.id);
    const next = await start(anna, "memory");
    const state = {
      deck: [
        "Stella",
        "Albero",
        "Regalo",
        "Campanella",
        "Stella",
        "Albero",
        "Regalo",
        "Campanella",
      ],
      open: [0],
      matched: [],
      mistakes: 2,
    };
    env.DB.sql
      .prepare("UPDATE competition_attempts SET state=? WHERE id=?")
      .run(JSON.stringify(state), next.id);
    await expect(action(anna, next, { position: 4 })).rejects.toMatchObject({
      status: 409,
    });
    const updated = await start(anna, "memory");
    expect(updated).toMatchObject({
      id: next.id,
      ordinal: 2,
      mistakes: 2,
      revision: next.revision + 1,
    });
    expect(updated.cards).toEqual(
      Array(16).fill({ symbol: null, paired: false }),
    );
    const memory = (await api(anna)).games.find((game) => game.id === "memory");
    expect(memory).toMatchObject({ attempts: 2, best: 220 });
  });

  it("restricts point adjustments to the owner and resets the score without restoring attempts", async () => {
    await api(anna, "/join", {});
    await completeQuiz(anna, await start(anna, "quiz"), true);
    const adjustment = {
      userId: anna.id,
      kind: "add",
      points: 10,
      reason: "Recupero",
    };
    await expect(api(anna, "/adjust", adjustment)).rejects.toMatchObject({
      status: 403,
    });
    await api(owner, "/adjust", adjustment);
    expect((await getLeaderboard(env.DB, event))[0].score).toBe(310);
    await api(owner, "/adjust", {
      ...adjustment,
      kind: "subtract",
      points: 20,
    });
    expect((await getLeaderboard(env.DB, event))[0].score).toBe(290);
    await api(owner, "/adjust", { ...adjustment, kind: "reset" });
    const board = await api(anna);
    expect(board.leaderboard[0].score).toBe(0);
    expect(board.games.find((game) => game.id === "quiz").attempts).toBe(1);
  });

  it("lets two players take the same duel asynchronously, without ranking points", async () => {
    await api(anna, "/join", {});
    await api(bea, "/join", {});
    const { duelId } = await api(anna, "/duels", { userId: bea.id });
    const a = await start(anna, "duel", duelId);
    const b = await start(bea, "duel", duelId);
    expect(a.question).toEqual(b.question);
    expect((await completeQuiz(anna, a, true)).score).toBeNull();
    expect((await api(anna)).duels[0].scores).toBeNull();
    await completeQuiz(bea, b, false);
    expect((await api(anna)).duels[0].scores).toEqual({ anna: 100, bea: 0 });
    expect(
      (await getLeaderboard(env.DB, event)).map((x) => [x.score, x.rank]),
    ).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });
});

it("moves legacy scores to one eligible event and keeps duels on their original event", async () => {
  const legacy = database(eventMigration);
  try {
    legacy.sql.exec(`
      INSERT INTO users(id,email,name) VALUES
        ('owner','a@example.com','Ada'),('anna','b@example.com','Anna'),
        ('bea','c@example.com','Bea'),('guest','d@example.com','Giulia');
      INSERT INTO groups(id,owner_id,name) VALUES ('group','owner','Famiglia');
      INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES
        ('first','owner','group','Natale',20,'','','','2026-12-20T00:00:00.000Z','inv','2026-11-01T00:00:00.000Z'),
        ('second','owner','group','Natale bis',20,'','','','2026-12-20T00:00:00.000Z','inv2','2026-11-02T00:00:00.000Z');
      INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES
        ('ma','first','anna','approved',''),('mb','first','guest','removed',''),
        ('mc','second','anna','approved',''),('md','second','bea','approved','');
      INSERT INTO competition_entries(group_id,year,user_id,adjustment) VALUES
        ('group',2026,'anna',10),('group',2026,'guest',25);
      INSERT INTO competition_duels(id,group_id,year,event_id,sender_id,receiver_id,questions,expires)
        VALUES ('duel','group',2026,'second','anna','bea','[]',100000);
      INSERT INTO competition_attempts(id,group_id,year,user_id,game,duel_id,ordinal,state,expires,raw_score,score) VALUES
        ('game','group',2026,'anna','quiz','',1,'{}',100000,240,240),
        ('match','group',2026,'anna','duel','duel',1,'{}',100000,80,NULL),
        ('unassigned','group',2026,'guest','quiz','',1,'{}',100000,120,120);
      INSERT INTO competition_adjustments(id,group_id,year,user_id,owner_id,action,points,reason,created_at)
        VALUES ('adjustment','group',2026,'anna','owner','add',10,'Correzione',100);
    `);
    applyMigration(legacy.sql, eventMigration);
    expect(await getLeaderboard(legacy, { id: "first" })).toMatchObject([
      { userId: "anna", score: 250 },
    ]);
    expect(await getLeaderboard(legacy, { id: "second" })).toEqual([]);
    const attempts = legacy.sql
      .prepare("SELECT id,event_id FROM competition_attempts ORDER BY id")
      .all();
    expect(attempts).toEqual([
      { id: "game", event_id: "first" },
      { id: "match", event_id: "second" },
    ]);
    expect(
      legacy.sql
        .prepare("SELECT event_id FROM competition_duels WHERE id='duel'")
        .get().event_id,
    ).toBe("second");
    expect(
      legacy.sql
        .prepare(
          "SELECT event_id FROM competition_adjustments WHERE id='adjustment'",
        )
        .get().event_id,
    ).toBe("first");
    const quarantine = legacy.sql
      .prepare(
        "SELECT kind,json_extract(data,'$.user_id') AS userId FROM competition_migration_unassigned ORDER BY kind",
      )
      .all();
    expect(quarantine).toEqual([
      { kind: "attempt", userId: "guest" },
      { kind: "entry", userId: "guest" },
    ]);
  } finally {
    legacy.sql.close();
  }
});
