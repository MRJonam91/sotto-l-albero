import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { competitionRoute, getLeaderboard } from "../worker/competition.js";
import { practiceRoute } from "../worker/practice.js";
import { eventRoute } from "../worker/events.js";
import { stampRoute } from "../worker/stamps.js";
import {
  christmasMovies,
  createMovieQuestions,
} from "../shared/christmasMovies.js";

const eventMigration = "0009_event_competition.sql";
const stampMigration = "0012_stamp_ranking_cutoff.sql";

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
  it("includes all approved members and starts ranked play without a second signup", async () => {
    await expect(api(guest)).rejects.toMatchObject({ status: 403 });
    await expect(api(owner, "/join", {})).rejects.toMatchObject({
      status: 403,
    });
    const board = await api(owner);
    expect(board.canPlay).toBe(false);
    expect(
      board.leaderboard.map(({ userId, score }) => [userId, score]),
    ).toEqual([
      ["anna", 0],
      ["bea", 0],
    ]);
    expect((await start(anna, "quiz")).game).toBe("quiz");
    expect(await api(anna, "/join", {})).toEqual({ joined: true });
    expect((await api(anna, "", undefined, "copy")).joined).toBe(true);
    env.DB.sql
      .prepare("UPDATE members SET status='removed' WHERE id='mb'")
      .run();
    expect((await api(owner)).leaderboard.map((row) => row.userId)).toEqual([
      "anna",
    ]);
    await expect(start(bea, "memory")).rejects.toMatchObject({ status: 403 });
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
    await expect(
      api(anna, "/duels", { userId: guest.id }),
    ).rejects.toMatchObject({ status: 403 });
    const { duelId } = await api(anna, "/duels", { userId: bea.id });
    expect((await api(bea)).duels[0].id).toBe(duelId);
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

  it("counts unique collectible stamps, exposes game scores, and resets current points per event", async () => {
    env.DB.sql.exec(`
      INSERT INTO user_stamps(user_id,stamp) VALUES
        ('anna','star'),('anna','cookie'),('anna','quiz'),('anna','memory'),('anna','unknown'),('guest','star');
      INSERT OR IGNORE INTO user_stamps(user_id,stamp) VALUES('anna','star');
    `);
    const before = (await api(owner)).leaderboard[0];
    expect(before).toMatchObject({
      userId: "anna",
      score: 10,
      stampPoints: 10,
      gamePoints: 0,
    });
    await completeQuiz(anna, await start(anna, "quiz"), true);
    expect((await api(owner)).leaderboard[0]).toMatchObject({
      score: 310,
      stampPoints: 10,
      gamePoints: 300,
      scores: {
        quiz: 300,
        memory: 0,
        film: 0,
        pacchi: 0,
        slitta: 0,
        cartolina: 0,
        addobbi: 0,
      },
    });
    await api(owner, "/adjust", {
      userId: anna.id,
      kind: "reset",
      reason: "Nuovo turno",
    });
    expect(
      (await api(anna)).leaderboard.find((row) => row.userId === anna.id).score,
    ).toBe(0);
    expect((await api(anna, "", undefined, "copy")).leaderboard[0].score).toBe(
      10,
    );
    env.DB.sql.exec(
      "INSERT OR IGNORE INTO user_stamps(user_id,stamp) VALUES('anna','star'); INSERT INTO user_stamps(user_id,stamp) VALUES('anna','bell')",
    );
    expect((await api(anna)).leaderboard[0]).toMatchObject({
      score: 5,
      stampPoints: 15,
    });
    await api(owner, "/adjust", {
      userId: bea.id,
      kind: "add",
      points: 7,
      reason: "Premio",
    });
    expect((await api(owner)).leaderboard[0]).toMatchObject({
      userId: bea.id,
      score: 7,
    });
  });

  it("freezes collectible points at archive even when two actions share the same millisecond", async () => {
    const clock = vi.spyOn(Date, "now");
    try {
      const instant = Date.now();
      clock.mockReturnValue(instant);
      await stampRoute("POST", env.DB, anna.id, { stamp: "star" });
      const attempt = await start(anna, "quiz");
      const path = "/api/events/event/archive";
      const archive = () =>
        eventRoute(
          new Request("https://albero.example" + path, { method: "POST" }),
          env,
          path,
          {},
          owner,
        );
      expect((await archive()).status).toBe(200);
      await stampRoute("POST", env.DB, anna.id, { stamp: "gift" });
      expect((await getLeaderboard(env.DB, event))[0]).toMatchObject({
        stampPoints: 5,
        score: 5,
      });
      expect(
        (await api(anna, "", undefined, "copy")).leaderboard[0],
      ).toMatchObject({ stampPoints: 10, score: 10 });
      expect((await api(anna)).closed).toBe(true);
      await expect(start(anna, "memory")).rejects.toMatchObject({
        status: 409,
      });
      await expect(action(anna, attempt, { choice: 0 })).rejects.toMatchObject({
        status: 409,
      });
      await expect(
        api(owner, "/adjust", {
          userId: anna.id,
          kind: "reset",
          reason: "Chiusa",
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect((await archive()).status).toBe(200);
      expect((await getLeaderboard(env.DB, event))[0].stampPoints).toBe(5);
    } finally {
      clock.mockRestore();
    }
  });

  it("uses the Rome New Year cutoff for closed standings and for a later reset", async () => {
    const year = new Date(event.gift_at).getUTCFullYear();
    const cutoff = Date.parse(`${year}-12-31T23:00:00.000Z`);
    const clock = vi.spyOn(Date, "now").mockReturnValue(cutoff - 1);
    try {
      await stampRoute("POST", env.DB, anna.id, { stamp: "star" });
      clock.mockReturnValue(cutoff);
      await stampRoute("POST", env.DB, anna.id, { stamp: "gift" });
      await stampRoute("POST", env.DB, anna.id, { stamp: "star" });
      const closed = await api(anna);
      expect(closed.closed).toBe(true);
      expect(closed.leaderboard[0]).toMatchObject({ score: 5, stampPoints: 5 });
      const reset = await api(owner, "/adjust", {
        userId: anna.id,
        kind: "reset",
        reason: "Rettifica",
      });
      expect(reset.leaderboard[0]).toMatchObject({
        score: 0,
        stampPoints: 5,
        adjustment: -5,
      });
    } finally {
      clock.mockRestore();
    }
  });

  it.each([
    [
      "pacchi",
      "match",
      {
        nina: "biscotti",
        teo: "lanterna",
        lea: "tazza",
        omar: "libro",
        ada: "sciarpa",
        milo: "puzzle",
      },
    ],
    ["slitta", "pack", ["libro", "lanterna", "biscotti", "sciarpa"]],
  ])(
    "validates and ranks the interactive %s challenge without exposing its answer",
    async (game, type, solution) => {
      const attempt = await start(anna, game);
      expect(attempt.challenge).toMatchObject({
        type,
        edition: 2,
        prompt: expect.any(String),
        clues: expect.any(Array),
      });
      expect(attempt.challenge).not.toHaveProperty("answer");
      expect(attempt.question).toBeUndefined();
      expect(await start(anna, game)).toEqual(attempt);
      await expect(
        action(anna, attempt, { solution: null }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await action(anna, attempt, { solution })).toMatchObject({
        done: true,
        score: 100,
        challenge: null,
      });
      const second = await start(anna, game);
      expect(await action(anna, second, { solution })).toMatchObject({
        done: true,
        score: 95,
      });
      expect((await api(owner)).leaderboard[0]).toMatchObject({
        score: 100,
        scores: { [game]: 100 },
      });
    },
  );

  it("requires inspecting the rooms, saves progress, and deducts points for a wrong lock", async () => {
    let round = await start(anna, "cartolina");
    expect(round.challenge).toMatchObject({
      type: "escape",
      room: 1,
      total: 2,
      notes: [],
    });
    expect(JSON.stringify(round)).not.toMatch(/374|answer|forata/);
    await expect(
      action(anna, round, { move: "unlock", choice: "374" }),
    ).rejects.toMatchObject({ status: 400 });
    for (const choice of ["registro", "cartolina", "finestra", "scaffale"]) {
      round = await action(anna, round, { move: "inspect", choice });
    }
    expect((await start(anna, "cartolina")).challenge.notes).toHaveLength(4);
    round = await action(anna, round, { move: "unlock", choice: "123" });
    expect(round.challenge).toMatchObject({ room: 1, mistakes: 1 });
    round = await action(anna, round, { move: "unlock", choice: "374" });
    expect(round.challenge).toMatchObject({
      room: 2,
      notes: [],
      hasPlate: true,
    });
    await expect(
      action(anna, round, { move: "use", choice: "cartolina" }),
    ).rejects.toMatchObject({ status: 400 });
    for (const choice of ["lampada", "cartolina", "mappa"]) {
      round = await action(anna, round, { move: "inspect", choice });
    }
    expect(round.challenge.ready).toBe(false);
    expect(JSON.stringify(round)).not.toContain("R N A");
    round = await action(anna, round, { move: "use", choice: "lampada" });
    expect(round.challenge.ready).toBe(false);
    round = await action(anna, round, { move: "inspect", choice: "cartolina" });
    expect(round.challenge.ready).toBe(true);
    expect(JSON.stringify(round)).toContain("R N A");
    expect(
      await action(anna, round, { move: "unlock", choice: "renna" }),
    ).toMatchObject({ done: true, score: 85, challenge: null });
  });

  it("scores only a timely matching parcel in each wave and rejects repeated moves", async () => {
    const clock = vi.spyOn(Date, "now");
    const now = Date.parse("2026-11-10T12:00:00Z");
    clock.mockReturnValue(now);
    try {
      let round = await start(anna, "addobbi");
      expect(round.challenge).toMatchObject({
        type: "catch",
        wave: 1,
        total: 8,
        parcelIds: [],
      });
      await expect(
        action(anna, round, { move: "catch", choice: "stella" }),
      ).rejects.toMatchObject({ status: 400 });
      round = await action(anna, round, { move: "begin" });
      expect(round.challenge.parcelIds).toContain(round.challenge.target);
      expect(round.challenge).toMatchObject({
        duration: 6500,
        points: 0,
        lost: 0,
        value: 8,
      });
      await expect(
        action(anna, round, { move: "timeout" }),
      ).rejects.toMatchObject({ status: 409 });
      const previous = round;
      round = await action(anna, round, {
        move: "catch",
        choice: round.challenge.target,
      });
      expect(round.challenge).toMatchObject({
        wave: 2,
        caught: 1,
        duration: 5900,
        points: 8,
      });
      await expect(
        action(anna, previous, {
          move: "catch",
          choice: previous.challenge.target,
        }),
      ).rejects.toMatchObject({ status: 409 });
      clock.mockReturnValue(now + 20_000);
      round = await action(anna, round, {
        move: "catch",
        choice: round.challenge.target,
      });
      expect(round.challenge).toMatchObject({
        wave: 3,
        caught: 1,
        lost: 1,
        points: 3,
      });
      for (let wave = 3; wave <= 8; wave++) {
        round = await action(anna, round, {
          move: "catch",
          choice: round.challenge.target,
        });
      }
      expect(round).toMatchObject({ done: true, score: 86 });

      let second = await start(anna, "addobbi");
      second = await action(anna, second, { move: "begin" });
      second = await action(anna, second, {
        move: "catch",
        choice: second.challenge.target,
      });
      second = await action(anna, second, { move: "pass" });
      clock.mockReturnValue(now + 40_000);
      second = await action(anna, second, { move: "timeout" });
      expect(second.challenge).toMatchObject({ wave: 4, lost: 2, points: 0 });
      const wrong = second.challenge.parcelIds.find(
        (id) => id !== second.challenge.target,
      );
      expect(
        await action(anna, second, { move: "catch", choice: wrong }),
      ).toMatchObject({ done: true, score: 0 });
    } finally {
      clock.mockRestore();
    }
  });

  it("can still finish saved versions of the cipher and ornament games", async () => {
    for (const [game, type, state, solution] of [
      [
        "cartolina",
        "cipher",
        {
          challenge: { type: "cipher", edition: 2, ciphertext: "ZLNBP WL" },
          answer: [7, 11],
        },
        [7, 11],
      ],
      [
        "addobbi",
        "order",
        {
          challenge: {
            type: "order",
            items: [{ id: "stella" }, { id: "renna" }],
          },
          answer: ["renna", "stella"],
        },
        ["renna", "stella"],
      ],
    ]) {
      env.DB.sql
        .prepare(
          "INSERT INTO competition_attempts(id,event_id,user_id,game,ordinal,state,expires) VALUES(?,'event','anna',?,1,?,?)",
        )
        .run(game, game, JSON.stringify(state), Date.now() + 60_000);
      const saved = await start(anna, game);
      expect(saved.challenge.type).toBe(type);
      expect(await action(anna, saved, { solution })).toMatchObject({
        done: true,
        score: 100,
      });
    }
  });

  it.each([
    ["cartolina", "cipher", "escape"],
    ["addobbi", "order", "catch"],
  ])(
    "switches an unfinished %s attempt without spending another try",
    async (game, legacy, current) => {
      env.DB.sql
        .prepare(
          "INSERT INTO competition_attempts(id,event_id,user_id,game,ordinal,state,expires,raw_score,score) VALUES('best','event','anna',?,1,'{}',?,80,80)",
        )
        .run(game, Date.now() + 60_000);
      env.DB.sql
        .prepare(
          "INSERT INTO competition_attempts(id,event_id,user_id,game,ordinal,state,expires) VALUES('old','event','anna',?,2,?,?)",
        )
        .run(
          game,
          JSON.stringify({ challenge: { type: legacy } }),
          Date.now() + 60_000,
        );
      const previous = await start(anna, game);
      expect(previous.challenge.type).toBe(legacy);
      const { attempt } = await api(anna, "/start", {
        game,
        replaceLegacyAttempt: previous.id,
      });
      expect(attempt).toMatchObject({
        id: previous.id,
        revision: previous.revision + 1,
        ordinal: 2,
        challenge: { type: current },
      });
      expect(await start(anna, game)).toMatchObject({
        revision: attempt.revision,
        challenge: { type: current },
      });
      const board = await api(anna);
      expect(board.games.find((item) => item.id === game)).toMatchObject({
        attempts: 2,
        best: 80,
      });
      await expect(
        action(anna, previous, { solution: [] }),
      ).rejects.toMatchObject({ status: 409 });
    },
  );

  it("grades incorrect choices and keeps a legacy multiple-choice challenge playable", async () => {
    const oldState = {
      questions: [
        { text: "Una vecchia prova", options: ["No", "Sì"], answer: 1 },
      ],
      index: 0,
      correct: 0,
    };
    env.DB.sql
      .prepare(
        "INSERT INTO competition_attempts(id,event_id,user_id,game,ordinal,state,expires) VALUES('legacy','event','anna','pacchi',1,?,?)",
      )
      .run(JSON.stringify(oldState), Date.now() + 60_000);
    const resumed = await start(anna, "pacchi");
    expect(resumed).toMatchObject({
      id: "legacy",
      question: { text: "Una vecchia prova" },
    });
    expect(await action(anna, resumed, { choice: 1 })).toMatchObject({
      done: true,
      score: 100,
    });
    const memory = await start(anna, "pacchi");
    expect(memory).toMatchObject({ ordinal: 2, challenge: { type: "match" } });
    expect(
      await action(anna, memory, {
        solution: {
          nina: "lanterna",
          teo: "biscotti",
          lea: "tazza",
          omar: "libro",
          ada: "sciarpa",
          milo: "puzzle",
        },
      }),
    ).toMatchObject({ score: 64 });
    const pack = await start(anna, "slitta");
    expect(
      await action(anna, pack, { solution: ["coperta", "tazza", "gioco"] }),
    ).toMatchObject({ score: 0 });
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
    applyMigration(legacy.sql, stampMigration);
    expect(await getLeaderboard(legacy, { id: "first" })).toMatchObject([
      { userId: "anna", score: 250 },
    ]);
    expect(await getLeaderboard(legacy, { id: "second" })).toMatchObject([
      { userId: "anna", score: 0 },
      { userId: "bea", score: 0 },
    ]);
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

it("preserves undated stamps for legacy archives and excludes new ones after the upgrade", async () => {
  const legacy = database(stampMigration);
  try {
    legacy.sql.exec(`
      INSERT INTO users(id,email,name) VALUES('anna','anna@example.test','Anna');
      INSERT INTO groups(id,owner_id,name) VALUES('group','anna','Famiglia');
      INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,status,invite_token,created_at)
      VALUES('old','anna','group','Natale',20,'','','','2099-12-20T00:00:00.000Z','archived','inv','');
      INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('m','old','anna','approved','');
      INSERT INTO user_stamps(user_id,stamp) VALUES('anna','star');
    `);
    applyMigration(legacy.sql, stampMigration);
    const { archived_at } = legacy.sql
      .prepare("SELECT archived_at FROM events WHERE id='old'")
      .get();
    expect(archived_at).toBeGreaterThan(0);
    legacy.sql
      .prepare(
        "INSERT INTO user_stamps(user_id,stamp,collected_at) VALUES('anna','gift',?)",
      )
      .run(archived_at);
    expect(await getLeaderboard(legacy, { id: "old" })).toMatchObject([
      { userId: "anna", stampPoints: 5, score: 5 },
    ]);
  } finally {
    legacy.sql.close();
  }
});

it("il quiz ha 10 domande e in un duello le domande sono identiche per entrambi i giocatori, gestendo il timeout", async () => {
  await api(anna, "/join", {});
  await api(bea, "/join", {});

  const quizAttempt = await start(anna, "quiz");
  expect(quizAttempt.total).toBe(10);
  expect(quizAttempt.timeLimit).toBe(20);

  await api(anna, "/duels", { userId: "bea" });
  const duelsAnna = (await api(anna)).duels;
  expect(duelsAnna).toHaveLength(1);
  const duelId = duelsAnna[0].id;

  const annaDuel = await start(anna, "duel", duelId);
  const beaDuel = await start(bea, "duel", duelId);

  expect(annaDuel.total).toBe(10);
  expect(beaDuel.total).toBe(10);

  const duelRow = env.DB.sql
    .prepare("SELECT questions FROM competition_duels WHERE id=?")
    .get(duelId);
  const storedQuestions = JSON.parse(duelRow.questions);
  expect(storedQuestions).toHaveLength(10);

  expect(annaDuel.question).toEqual(beaDuel.question);
  const nextAnna = await action(anna, annaDuel, {
    choice: storedQuestions[0].answer,
  });
  expect(nextAnna.progress).toBe(1);

  const q0 = storedQuestions[0];
  const nextBea = await action(bea, beaDuel, { choice: q0.answer });
  expect(nextBea.progress).toBe(1);
  expect(nextAnna.question).toEqual(nextBea.question);
});

it("uses the same server deadline after reopening and gives no points for a late answer", async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  try {
    await api(anna, "/join", {});
    const attempt = await start(anna, "quiz");
    expect(attempt.timeRemaining).toBe(20_000);
    expect((await api(anna)).active[0].timeRemaining).toBe(20_000);
    await expect(
      action(anna, attempt, { timeout: true }),
    ).rejects.toMatchObject({ status: 409 });
    clock.mockReturnValue(now + 20_000);
    const resumed = await start(anna, "quiz");
    expect(resumed).toMatchObject({
      id: attempt.id,
      revision: attempt.revision,
      timeRemaining: 0,
    });
    const stored = JSON.parse(
      env.DB.sql
        .prepare("SELECT state FROM competition_attempts WHERE id=?")
        .get(attempt.id).state,
    );
    const next = await action(anna, resumed, {
      choice: stored.questions[0].answer,
    });
    expect(next).toMatchObject({ progress: 1, timeRemaining: 20_000 });
    const saved = JSON.parse(
      env.DB.sql
        .prepare("SELECT state FROM competition_attempts WHERE id=?")
        .get(attempt.id).state,
    );
    expect(saved.correct).toBe(0);
  } finally {
    clock.mockRestore();
  }
});

it("keeps the practice deadline on reopen and starts the next timer after feedback", async () => {
  const post = async (action, body = {}) => {
    const path = `/api/practice/quiz/${action}`;
    return (
      await practiceRoute(
        new Request(`https://albero.example${path}`, { method: "POST" }),
        env,
        path,
        body,
        anna,
      )
    ).json();
  };
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  try {
    const attempt = await post("start");
    clock.mockReturnValue(now + 21_000);
    const resumed = await post("start");
    expect(resumed).toMatchObject({
      revision: attempt.revision,
      timeRemaining: 0,
    });
    const result = await post("step", {
      revision: attempt.revision,
      choice: 1,
    });
    expect(result).toMatchObject({
      index: 1,
      timeRemaining: null,
      feedback: { choice: -1 },
    });
    clock.mockReturnValue(now + 50_000);
    expect(await post("start")).toMatchObject({
      index: 1,
      timeRemaining: 20_000,
    });
  } finally {
    clock.mockRestore();
  }
});

describe("Indovina il film (100 film natalizi a icone)", () => {
  it("ha un catalogo di esattamente 100 film natalizi unici con 5 icone ciascuno", () => {
    expect(christmasMovies).toHaveLength(100);
    const ids = new Set();
    const titles = new Set();
    for (const movie of christmasMovies) {
      expect(typeof movie.id).toBe("string");
      expect(movie.id.length).toBeGreaterThan(1);
      expect(typeof movie.title).toBe("string");
      expect(movie.title.length).toBeGreaterThan(1);
      expect(Number.isInteger(movie.year)).toBe(true);
      expect(movie.year).toBeGreaterThanOrEqual(1930);
      expect(movie.year).toBeLessThanOrEqual(2026);
      expect(Array.isArray(movie.icons)).toBe(true);
      expect(movie.icons).toHaveLength(5);
      for (const icon of movie.icons) {
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      }
      expect(typeof movie.note).toBe("string");
      expect(movie.note.length).toBeGreaterThan(10);
      ids.add(movie.id);
      titles.add(movie.title);
    }
    expect(ids.size).toBe(100);
    expect(titles.size).toBe(100);

    const sample = createMovieQuestions(10);
    expect(sample).toHaveLength(10);
    for (const q of sample) {
      expect(q.icons).toHaveLength(5);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });

  it("assegna fino a 200 punti nelle sfide ufficiali con moltiplicatori 100%, 95%, 90% e timer da 20s", async () => {
    let attempt = await start(anna, "film");
    expect(attempt.game).toBe("film");
    expect(attempt.total).toBe(10);
    expect(attempt.timeLimit).toBe(20);
    expect(attempt.question.icons).toHaveLength(5);
    expect(attempt.question.options).toHaveLength(4);
    expect(attempt.question).not.toHaveProperty("answer");

    const done1 = await completeQuiz(anna, attempt, true);
    expect(done1).toMatchObject({ done: true, rawScore: 200, score: 200 });

    const done2 = await completeQuiz(anna, await start(anna, "film"), true);
    expect(done2).toMatchObject({ done: true, rawScore: 200, score: 190 });

    const done3 = await completeQuiz(anna, await start(anna, "film"), true);
    expect(done3).toMatchObject({ done: true, rawScore: 200, score: 180 });

    await expect(start(anna, "film")).rejects.toMatchObject({ status: 409 });
    const board = await api(owner);
    expect(
      board.leaderboard.find((row) => row.userId === anna.id),
    ).toMatchObject({
      score: 200,
      scores: { film: 200 },
    });
  });
});
