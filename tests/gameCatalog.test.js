import { describe, expect, it } from "vitest";
import { gameCatalog, gameDefinitions } from "../shared/gameCatalog.js";

describe("catalogo unico dei giochi", () => {
  it("offre nove giochi ordinati e mantiene solo sette giochi nelle sfide a punti", () => {
    expect(gameCatalog.map(({ id }) => id)).toEqual([
      "quiz",
      "memory",
      "film",
      "pacchi",
      "slitta",
      "cartolina",
      "addobbi",
      "tris",
      "curling",
    ]);
    expect(Object.keys(gameDefinitions)).toEqual([
      "quiz",
      "memory",
      "film",
      "pacchi",
      "slitta",
      "cartolina",
      "addobbi",
    ]);
    expect(gameDefinitions).not.toHaveProperty("tris");
    expect(gameDefinitions).not.toHaveProperty("curling");
  });
  it("distingue il computer locale dal server e non offre sfide a punti per Tris o Curling", () => {
    const byId = Object.fromEntries(gameCatalog.map((game) => [game.id, game]));
    expect(byId.curling).toMatchObject({
      ranked: false,
      practiceEngine: "local",
      modes: ["computer"],
    });
    expect(byId.tris).toMatchObject({
      ranked: false,
      practiceEngine: "server",
      modes: ["computer", "friends"],
    });
    expect(byId.quiz.modes).toEqual(["practice", "ranked", "friends"]);
    expect(
      gameCatalog.filter((game) => game.practiceEngine === "server"),
    ).toHaveLength(8);
    for (const game of gameCatalog) {
      expect(game.modes.includes("ranked")).toBe(
        Boolean(gameDefinitions[game.id]),
      );
      if (game.ranked === false) expect(game.points).toBe(0);
    }
  });
});
