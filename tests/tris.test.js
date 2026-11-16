import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  evaluateBoard,
  playMove,
  chooseBotMove,
} from "../shared/snowTicTacToe.js";
import { competitionRoute } from "../worker/competition.js";
import {
  newInteractiveChallenge,
  turnInteractiveChallenge,
} from "../worker/interactiveChallenges.js";

describe("snow tic tac toe rules", () => {
  it("checks turns, occupied cells and finished boards without mutating input", () => {
    const board = Array(9).fill(null);
    const next = playMove(board, 4, "X");
    expect(board).toEqual(Array(9).fill(null));
    expect(next[4]).toBe("X");
    expect(() => playMove(next, 4, "O")).toThrow();
    expect(() => playMove(next, 0, "X")).toThrow();
    expect(() => playMove(board, -1, "X")).toThrow();
    expect(() => playMove(board, "0", "X")).toThrow();
    expect(() =>
      playMove(["X", "X", "X", "O", "O", null, null, null, null], 5, "O"),
    ).toThrow();
  });
  it("recognizes a winning line and a genuine draw", () => {
    expect(
      evaluateBoard(["X", "O", null, "O", "X", null, null, null, "X"]),
    ).toMatchObject({ winner: "X", line: [0, 4, 8], done: true });
    expect(
      evaluateBoard(["X", "O", "X", "X", "O", "O", "O", "X", "X"]),
    ).toMatchObject({ winner: null, draw: true, done: true });
    expect(evaluateBoard(Array(9).fill(null))).toMatchObject({
      turn: "X",
      done: false,
    });
  });
  it("the bot wins before blocking and blocks an immediate threat", () => {
    expect(
      chooseBotMove(
        ["O", "O", null, "X", "X", null, "X", null, null],
        (v) => v,
      ),
    ).toBe(2);
    expect(
      chooseBotMove(
        ["X", "X", null, null, "O", null, null, null, null],
        (v) => v,
      ),
    ).toBe(2);
  });
});

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
      let values = [];
      const statement = {
        bind(...args) {
          values = args;
          return statement;
        },
        async first() {
          return sql.prepare(query).get(...values) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...values) };
        },
        async run() {
          return {
            meta: {
              changes: Number(sql.prepare(query).run(...values).changes),
            },
          };
        },
      };
      return statement;
    },
  };
}
let env;
const users = Object.fromEntries(
  ["anna", "bea", "cara", "outsider", "owner"].map((id) => [id, { id }]),
);
async function api(who, suffix, body, eventId = "event") {
  const path = `/api/competition/${eventId}${suffix}`;
  return (
    await competitionRoute(
      new Request(`https://example.test${path}`, {
        method: body ? "POST" : "GET",
      }),
      env,
      path,
      body ?? {},
      users[who],
    )
  ).json();
}
beforeEach(() => {
  env = { DB: database() };
  env.DB.sql.exec(`
    INSERT INTO users(id,email,name) VALUES ('owner','o@example.test','Owner'),('anna','a@example.test','Anna'),('bea','b@example.test','Bea'),('cara','c@example.test','Cara'),('outsider','x@example.test','Other');
    INSERT INTO groups(id,owner_id,name) VALUES('group','owner','Amici');
    INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES('event','owner','group','Natale',20,'','','','2099-12-20T00:00:00.000Z','invite','');
    INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('ma','event','anna','approved',''),('mb','event','bea','approved',''),('mc','event','cara','approved','');
  `);
});
async function duel() {
  return (await api("anna", "/tris-duels", { userId: "bea" })).duel;
}

describe("authoritative friendly snow duels", () => {
  it("keeps an older active duel reachable ahead of the completed history", async () => {
    const game = await duel();
    const insert = env.DB.sql.prepare(
      "INSERT INTO tris_duels(id,event_id,player_x,player_o,board,turn,status,winner,expires) VALUES(?,'event','anna','bea','[\"X\",\"X\",\"X\",\"O\",\"O\",null,null,null,null]',NULL,'won','X',?)",
    );
    for (let index = 0; index < 30; index++)
      insert.run(`history-${index}`, game.expires + index + 1);
    const list = (await api("anna", "/tris-duels")).duels;
    expect(list).toHaveLength(30);
    expect(list[0].id).toBe(game.id);
  });
  it("allows approved opponents only and limits duplicate active invitations", async () => {
    await expect(
      api("outsider", "/tris-duels", { userId: "anna" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      api("owner", "/tris-duels", { userId: "anna" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      api("anna", "/tris-duels", { userId: "anna" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      api("anna", "/tris-duels", { userId: "outsider" }),
    ).rejects.toMatchObject({ status: 403 });
    await duel();
    await expect(duel()).rejects.toMatchObject({ status: 409 });
    expect((await api("cara", "/tris-duels")).duels).toEqual([]);
  });
  it("enforces one shared board, turn, revision and terminal result", async () => {
    let game = await duel();
    expect(game).toMatchObject({ myMark: "X", myTurn: true, revision: 0 });
    await expect(
      api("bea", `/tris-duels/${game.id}`, { position: 4, revision: 0 }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      api("cara", `/tris-duels/${game.id}`, { position: 4, revision: 0 }),
    ).rejects.toMatchObject({ status: 403 });
    const stale = { position: 0, revision: 0 };
    game = (await api("anna", `/tris-duels/${game.id}`, stale)).duel;
    await expect(
      api("anna", `/tris-duels/${game.id}`, stale),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      api("bea", `/tris-duels/${game.id}`, { position: 0, revision: 1 }),
    ).rejects.toMatchObject({ status: 400 });
    for (const [who, position] of [
      ["bea", 3],
      ["anna", 1],
      ["bea", 4],
      ["anna", 2],
    ])
      game = (
        await api(who, `/tris-duels/${game.id}`, {
          position,
          revision: game.revision,
        })
      ).duel;
    expect(game).toMatchObject({
      status: "won",
      winner: "X",
      revision: 5,
      myTurn: false,
    });
    expect((await api("bea", "/tris-duels")).duels[0].board).toEqual([
      "X",
      "X",
      "X",
      "O",
      "O",
      null,
      null,
      null,
      null,
    ]);
    await expect(
      api("bea", `/tris-duels/${game.id}`, { position: 5, revision: 5 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      env.DB.sql
        .prepare("SELECT COUNT(*) AS count FROM competition_attempts")
        .get().count,
    ).toBe(0);
  });
  it("rejects removed opponents, archived events and expired games", async () => {
    const game = await duel();
    env.DB.sql.exec("UPDATE members SET status='removed' WHERE user_id='bea'");
    await expect(
      api("anna", `/tris-duels/${game.id}`, { position: 0, revision: 0 }),
    ).rejects.toMatchObject({ status: 403 });
    env.DB.sql.exec(
      "UPDATE members SET status='approved' WHERE user_id='bea'; UPDATE events SET status='archived'",
    );
    await expect(
      api("anna", `/tris-duels/${game.id}`, { position: 0, revision: 0 }),
    ).rejects.toMatchObject({ status: 409 });
    env.DB.sql.exec(
      "UPDATE events SET status='open'; UPDATE tris_duels SET expires=0",
    );
    await expect(
      api("anna", `/tris-duels/${game.id}`, { position: 0, revision: 0 }),
    ).rejects.toMatchObject({ status: 410 });
  });
  it("commits only one racing move and never shares a board with a different event", async () => {
    const game = await duel();
    const results = await Promise.allSettled(
      [0, 1].map((position) =>
        api("anna", `/tris-duels/${game.id}`, { position, revision: 0 }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected").reason.status,
    ).toBe(409);
    const stored = env.DB.sql
      .prepare("SELECT board,revision FROM tris_duels WHERE id=?")
      .get(game.id);
    expect(stored.revision).toBe(1);
    expect(JSON.parse(stored.board).filter(Boolean)).toEqual(["X"]);
    env.DB.sql
      .exec(`INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES('copy','owner','group','Altro',20,'','','','2099-12-20T00:00:00.000Z','copy-invite','');
      INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('copy-anna','copy','anna','approved','');`);
    expect((await api("anna", "/tris-duels", undefined, "copy")).duels).toEqual(
      [],
    );
    await expect(
      api(
        "anna",
        `/tris-duels/${game.id}`,
        { position: 2, revision: 1 },
        "copy",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("finishes a shared draw and caps active games without touching scores", async () => {
    let game = await duel();
    for (const [who, position] of [
      ["anna", 0],
      ["bea", 1],
      ["anna", 2],
      ["bea", 4],
      ["anna", 3],
      ["bea", 5],
      ["anna", 7],
      ["bea", 6],
      ["anna", 8],
    ])
      game = (
        await api(who, `/tris-duels/${game.id}`, {
          position,
          revision: game.revision,
        })
      ).duel;
    expect(game).toMatchObject({
      status: "draw",
      winner: null,
      turn: null,
      revision: 9,
    });
    const insert = env.DB.sql.prepare(
      "INSERT INTO tris_duels(id,event_id,player_x,player_o,board,turn,expires) VALUES(?,'event','anna','bea','[null,null,null,null,null,null,null,null,null]','X',?)",
    );
    for (let index = 0; index < 5; index++)
      insert.run(`active-${index}`, Date.now() + 60000);
    await expect(
      api("anna", "/tris-duels", { userId: "cara" }),
    ).rejects.toMatchObject({ status: 409 });
    env.DB.sql.exec("UPDATE members SET status='removed' WHERE user_id='bea'");
    expect(
      (await api("anna", "/tris-duels", { userId: "cara" })).duel.status,
    ).toBe("active");
    expect(
      env.DB.sql
        .prepare("SELECT COUNT(*) AS count FROM competition_attempts")
        .get().count,
    ).toBe(0);
  });
});

it("bot practice grades only the server board and tris cannot consume ranked attempts", async () => {
  const state = newInteractiveChallenge("tris");
  state.board = ["X", "X", null, "O", "O", null, null, null, null];
  expect(
    turnInteractiveChallenge(
      state,
      { position: 2, score: 0, winner: "O" },
      Date.now(),
      (v) => v,
    ),
  ).toBe(100);
  expect(evaluateBoard(state.board).winner).toBe("X");
  state.board = ["X", "O", "X", "X", "O", "O", "O", "X", null];
  expect(
    turnInteractiveChallenge(state, { position: 8 }, Date.now(), (v) => v),
  ).toBe(50);
  state.board = ["X", null, "X", "O", "O", null, null, null, null];
  expect(
    turnInteractiveChallenge(state, { position: 8 }, Date.now(), (v) => v),
  ).toBe(0);
  await expect(api("anna", "/start", { game: "tris" })).rejects.toMatchObject({
    status: 400,
  });
  expect(
    env.DB.sql
      .prepare("SELECT COUNT(*) AS count FROM competition_attempts")
      .get().count,
  ).toBe(0);
});
