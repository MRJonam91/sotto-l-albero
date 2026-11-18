import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import * as activityModule from "../worker/holidayActivity.js";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE competition_attempts(id TEXT,user_id TEXT,game TEXT,raw_score INTEGER,state TEXT);
    CREATE TABLE practice_games(user_id TEXT,game TEXT,done INTEGER,state TEXT);
    CREATE TABLE user_stamps(user_id TEXT,stamp TEXT);
    CREATE TABLE portrait_interactions(sender_id TEXT,receiver_id TEXT);
    CREATE TABLE tris_duels(player_x TEXT,player_o TEXT,status TEXT,winner TEXT);`);
  return {
    sql,
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
      };
      return statement;
    },
  };
}

describe("attività natalizia verificata", () => {
  it("aggrega più utenti e normalizza ogni punteggio sulla propria scala", async () => {
    const db = database();
    db.sql
      .exec(`INSERT INTO competition_attempts VALUES('a','one','quiz',150,'{}'),('b','one','film',100,'{}'),('c','one','quiz',NULL,'{}'),('d','two','quiz',300,'{}');
      INSERT INTO practice_games VALUES('one','quiz',1,'{"score":5}'),('one','film',1,'{"score":10,"questions":[1,2,3,4,5,6,7,8,9,10]}'),('one','memory',0,'{}');
      INSERT INTO user_stamps VALUES('one','tree'),('one','gift');
      INSERT INTO portrait_interactions VALUES('one','two'),('two','one');`);
    const result = await activityModule.loadHolidayActivities(db, [
      "one",
      "two",
    ]);
    expect(result.get("one")).toMatchObject({
      stampsCount: 2,
      interactionsCount: 1,
      games: [
        { game: "film", count: 2, averageResult: 0.75 },
        { game: "quiz", count: 2, averageResult: 0.75 },
      ],
    });
    expect(result.get("two")).toMatchObject({
      games: [{ game: "quiz", count: 1, averageResult: 1 }],
      stampsCount: 0,
      interactionsCount: 1,
    });
  });
  it("ignora risultati incompleti e dati malformati senza inventare punteggi", async () => {
    const db = database();
    db.sql
      .exec(`INSERT INTO practice_games VALUES('one','film',1,'not-json'),('one','pacchi',1,'{}');
      INSERT INTO tris_duels VALUES('one','two','won','X'),('one','two','active',NULL);`);
    const result = await activityModule.loadHolidayActivities(db, [
      "one",
      "two",
    ]);
    expect(result.get("one").games).toEqual([
      { game: "film", count: 1, averageResult: null },
      { game: "pacchi", count: 1, averageResult: null },
      { game: "tris", count: 1, averageResult: 1 },
    ]);
    expect(result.get("two").games).toEqual([
      { game: "tris", count: 1, averageResult: 0 },
    ]);
  });
});
