import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { practiceRoute } from "../worker/practice.js";

function database(beforeCatalog = false) {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../migrations/", import.meta.url))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    if (beforeCatalog && file.startsWith("0013_")) break;
    sql.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  const db = {
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
  sql.exec(
    "INSERT INTO users(id,email,name) VALUES('learner','learner@example.test','Ada'); INSERT INTO groups(id,owner_id,name) VALUES('group','learner','Amici'); INSERT INTO events(id,owner_id,group_id,name,budget,description,close_at,draw_at,gift_at,invite_token,created_at) VALUES('event','learner','group','Natale',20,'','','','2099-12-24','invite',''); INSERT INTO members(id,event_id,user_id,status,updated_at) VALUES('member','event','learner','approved',''); INSERT INTO competition_entries(user_id,adjustment,event_id) VALUES('learner',17,'event'); INSERT INTO user_stamps(user_id,stamp) VALUES('learner','quiz');",
  );
  return { db, sql };
}
let db, sql;
const user = { id: "learner", email: "learner@example.test" };
async function api(game, action = "start", body = {}) {
  const path =
    game === "catalog"
      ? "/api/practice/catalog"
      : `/api/practice/${game}/${action}`;
  try {
    const response = await practiceRoute(
      new Request(`http://localhost${path}`, {
        method: game === "catalog" ? "GET" : "POST",
      }),
      { DB: db },
      path,
      body,
      user,
    );
    return { status: response.status, data: await response.json() };
  } catch (error) {
    return { status: error.status ?? 500, data: { error: error.message } };
  }
}
function rankedSnapshot() {
  return {
    attempts: sql.prepare("SELECT * FROM competition_attempts").all(),
    entries: sql.prepare("SELECT * FROM competition_entries").all(),
    stamps: sql.prepare("SELECT * FROM user_stamps").all(),
  };
}
beforeEach(() => ({ db, sql } = database()));
afterEach(() => {
  vi.restoreAllMocks();
  sql?.close();
});

describe("Catalogo allenamento", () => {
  it("offre gli stessi sei giochi ufficiali e il tris senza assegnare punti", async () => {
    const before = rankedSnapshot();
    const catalog = await api("catalog");
    expect(catalog.status).toBe(200);
    expect(catalog.data.allowed).toBe(true);
    expect(catalog.data.games.map((game) => game.id).sort()).toEqual([
      "addobbi",
      "cartolina",
      "film",
      "memory",
      "pacchi",
      "quiz",
      "slitta",
      "tris",
    ]);
    expect(rankedSnapshot()).toEqual(before);
  });

  it("allena Indovina il film con 10 film a icone, 4 opzioni e timer da 20 secondi senza cambiare la classifica", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const before = rankedSnapshot();
    let result = await api("film");
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      done: false,
      index: 0,
      total: 10,
      timeLimit: 20,
      timeRemaining: 20_000,
    });
    expect(result.data.question.icons).toHaveLength(5);
    expect(result.data.question.options).toHaveLength(4);
    expect(new Set(result.data.question.options).size).toBe(4);
    expect(result.data.question).not.toHaveProperty("answer");

    for (let i = 0; i < 10; i++) {
      const stored = JSON.parse(
        sql
          .prepare(
            "SELECT state FROM practice_games WHERE user_id='learner' AND game='film'",
          )
          .get().state,
      );
      const question = stored.questions[i];
      if (i === 9) {
        now += 21_000;
        result = await api("film", "step", {
          revision: result.data.revision,
          timeout: true,
        });
        expect(result.status).toBe(200);
        expect(result.data.feedback.choice).toBe(-1);
        expect(result.data.feedback.text).toContain("Tempo scaduto!");
      } else {
        result = await api("film", "step", {
          revision: result.data.revision,
          choice: question.answer,
        });
        expect(result.status).toBe(200);
        expect(result.data.feedback).toMatchObject({
          choice: question.answer,
          answer: question.answer,
        });
        expect(result.data.feedback.text).toContain("Esatto!");
        expect(result.data.feedback.text).toContain(question.note);
        result = await api("film", "start");
        expect(result.status).toBe(200);
        expect(result.data.timeRemaining).toBe(20_000);
      }
    }
    expect(result.data).toMatchObject({
      done: true,
      index: 10,
      total: 10,
      score: 9,
    });
    expect(rankedSnapshot()).toEqual(before);
  });

  it.each([
    [
      "pacchi",
      {
        nina: "biscotti",
        teo: "lanterna",
        lea: "tazza",
        omar: "libro",
        ada: "sciarpa",
        milo: "puzzle",
      },
      "match",
    ],
    ["slitta", ["lanterna", "libro", "biscotti", "sciarpa"], "pack"],
  ])(
    "valida %s sul server, nasconde la risposta e rifiuta revisioni obsolete",
    async (game, solution, type) => {
      const before = rankedSnapshot();
      const start = await api(game);
      expect(start.status).toBe(200);
      expect(start.data).toMatchObject({ done: false, challenge: { type } });
      expect(start.data.challenge).not.toHaveProperty("answer");
      expect(start.data).not.toHaveProperty("score");
      expect(
        (
          await api(game, "step", {
            revision: start.data.revision,
            solution: game === "pacchi" ? {} : ["inventato"],
          })
        ).status,
      ).toBe(400);
      const reset = await api(game, "start", {
        reset: true,
        revision: start.data.revision,
      });
      expect(reset.data.revision).not.toBe(start.data.revision);
      expect(
        (await api(game, "step", { revision: start.data.revision, solution }))
          .status,
      ).toBe(409);
      const finish = await api(game, "step", {
        revision: reset.data.revision,
        solution,
        score: 999999,
      });
      expect(finish.data).toMatchObject({
        done: true,
        challenge: null,
        score: 100,
      });
      expect(
        (await api(game, "step", { revision: finish.data.revision, solution }))
          .status,
      ).toBe(409);
      expect((await api(game)).data).toEqual(finish.data);
      expect(rankedSnapshot()).toEqual(before);
    },
  );

  it("allena la cartolina con gli stessi oggetti, la lamina e gli sblocchi ufficiali", async () => {
    const before = rankedSnapshot();
    let result = await api("cartolina");
    expect(result.data.challenge.type).toBe("escape");
    expect(JSON.stringify(result.data)).not.toContain('"answer"');
    const turn = async (move, choice) => {
      result = await api("cartolina", "step", {
        revision: result.data.revision,
        move,
        choice,
      });
      expect(result.status).toBe(200);
    };
    expect(
      (
        await api("cartolina", "step", {
          revision: result.data.revision,
          move: "unlock",
          choice: "374",
        })
      ).status,
    ).toBe(400);
    for (const object of ["registro", "cartolina", "finestra", "scaffale"])
      await turn("inspect", object);
    await turn("unlock", "374");
    expect(result.data.challenge).toMatchObject({ room: 2, hasPlate: true });
    for (const object of ["mappa", "lampada"]) await turn("inspect", object);
    await turn("use", "lampada");
    await turn("inspect", "cartolina");
    expect(result.data.challenge.revealed).toBe(true);
    await turn("unlock", "renna");
    expect(result.data).toMatchObject({
      done: true,
      score: 100,
      challenge: null,
    });
    expect(rankedSnapshot()).toEqual(before);
  });

  it("allena il nastro con tempo server e punteggio originale senza incidere in classifica", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const before = rankedSnapshot();
    let result = await api("addobbi");
    expect(result.data.challenge).toMatchObject({ type: "catch", wave: 1 });
    result = await api("addobbi", "step", {
      revision: result.data.revision,
      move: "begin",
    });
    expect(
      (
        await api("addobbi", "step", {
          revision: result.data.revision,
          move: "timeout",
        })
      ).status,
    ).toBe(409);
    for (let wave = 0; wave < 8; wave++) {
      const stale = result.data.revision;
      result = await api("addobbi", "step", {
        revision: stale,
        move: "catch",
        choice: result.data.challenge.target,
      });
      expect(result.status).toBe(200);
      expect(
        (
          await api("addobbi", "step", {
            revision: stale,
            move: "catch",
            choice: "stella",
          })
        ).status,
      ).toBe(409);
    }
    expect(result.data).toMatchObject({ done: true, score: 100 });
    let reset = await api("addobbi", "start", {
      reset: true,
      revision: result.data.revision,
    });
    reset = await api("addobbi", "step", {
      revision: reset.data.revision,
      move: "begin",
    });
    now += 7000;
    const missed = await api("addobbi", "step", {
      revision: reset.data.revision,
      move: "catch",
      choice: reset.data.challenge.target,
    });
    expect(missed.data.challenge).toMatchObject({
      lost: 1,
      caught: 0,
      last: "missed",
    });
    expect(rankedSnapshot()).toEqual(before);
  });

  it("preserva gli allenamenti quiz e memory durante la migrazione del catalogo", () => {
    const old = database(true);
    old.sql.exec(
      "INSERT INTO practice_games(user_id,game,revision,state,done) VALUES('learner','quiz','old-quiz','{\"index\":5,\"score\":3}',1),('learner','memory','old-memory','{\"deck\":[\"A\",\"A\"],\"open\":[],\"paired\":[]}',0)",
    );
    const before = old.sql
      .prepare("SELECT * FROM practice_games ORDER BY game")
      .all();
    old.sql.exec(
      readFileSync(
        new URL("../migrations/0013_practice_catalog.sql", import.meta.url),
        "utf8",
      ),
    );
    expect(
      old.sql.prepare("SELECT * FROM practice_games ORDER BY game").all(),
    ).toEqual(before);
    expect(() =>
      old.sql.exec(
        "INSERT INTO practice_games(user_id,game,revision,state) VALUES('learner','tris','new','{}')",
      ),
    ).not.toThrow();
    old.sql.close();
  });
});
