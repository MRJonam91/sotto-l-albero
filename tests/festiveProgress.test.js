import { describe, expect, it } from "vitest";
import * as progress from "../shared/festiveProgress.js";
import { computeHolidayPortrait } from "../shared/holidayPortrait.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HolidayProfileSummary from "../src/HolidayProfileSummary.jsx";
import { GroupMemberPortraitCard } from "../src/HolidayPortrait.jsx";

const gameIds = [
  "quiz",
  "memory",
  "film",
  "pacchi",
  "slitta",
  "cartolina",
  "addobbi",
  "tris",
  "curling",
];
describe("coinvolgimento natalizio", () => {
  it("parte dagli scettici senza inventare tratti personali o partecipazione dall’iscrizione", () => {
    const first = computeHolidayPortrait(
      {},
      { activity: { tools: { participatingEventsCount: 100 } } },
    );
    expect(first.matchingExplanation.festiveProgress.score).toBe(0);
    expect(first.tastes.map((axis) => axis.value)).toEqual([
      50, 50, 50, 50, 50,
    ]);
    expect(first.characterMatches.map((character) => character.id)).toEqual([
      "grinch",
      "scrooge",
      "marv",
    ]);
    expect(
      first.characterMatches.every((character) => character.affinity < 95),
    ).toBe(true);
  });
  it("raggiunge il livello finale e cento punti anche senza rispondere a domande", () => {
    const result = progress.computeFestiveProgress({
      games: gameIds.map((game) => ({ game, count: 3 })),
      stampsCount: 12,
      interactionsCount: 5,
      tools: { wishlistItemsCount: 5 },
    });
    expect(result.score).toBe(100);
    expect(result.level.id).toBe("spirit");
    expect(result.nextLevel).toBeNull();
  });
  it("premia la varietà più delle ripetizioni, ignora giochi sconosciuti e satura i contributi", () => {
    const repeated = progress.computeFestiveProgress({
      games: [{ game: "quiz", count: 3 }],
    });
    expect(repeated.score).toBeLessThan(
      progress.computeFestiveProgress({
        games: [
          { game: "quiz", count: 1 },
          { game: "film", count: 1 },
        ],
      }).score,
    );
    expect(repeated.score).toBe(
      progress.computeFestiveProgress({
        games: [
          { game: "quiz", count: 3000 },
          { game: "invented", count: 3000 },
        ],
      }).score,
    );
    expect(repeated.score).toBe(
      progress.computeFestiveProgress({
        games: [
          { game: "quiz", count: 2 },
          { game: "quiz", count: 1 },
        ],
      }).score,
    );
  });
  it("mantiene il massimo acquisito e non penalizza umore Grinch, salti o domande assenti", () => {
    const activity = { festiveProgressScore: 80 };
    expect(progress.computeFestiveProgress(activity).score).toBe(80);
    const grinch = progress.computeFestiveProgress(activity, {
      dailyMood: { id: "grinch", date: "2026-11-18" },
      skippedDates: ["2026-11-19"],
    });
    expect(grinch.score).toBe(80);
    expect(
      progress.computeFestiveProgress(
        {},
        {
          answers: { a: "x", b: "x", c: "x", d: "x", e: "x", f: "x", g: "x" },
          dailyMood: { id: "buddy" },
        },
      ).score,
    ).toBeLessThan(5);
  });
  it("a partecipazione matura conserva personaggi diversi per gusti diversi", () => {
    const activity = { festiveProgressScore: 100 };
    const planner = computeHolidayPortrait(
      { dailyMood: { id: "kevin", date: "2026-11-19" } },
      { activity },
    );
    const sparkling = computeHolidayPortrait(
      { dailyMood: { id: "star", date: "2026-11-19" } },
      { activity },
    );
    expect(planner.topCharacter.id).not.toBe(sparkling.topCharacter.id);
    expect(sparkling.topCharacter.festiveReadiness).toBeGreaterThanOrEqual(75);
  });
  it("mostra una barra compatta al proprietario e soltanto il livello condiviso nel gruppo", () => {
    const portrait = computeHolidayPortrait(
      {},
      { activity: { festiveProgressScore: 48 } },
    );
    const own = renderToStaticMarkup(
      createElement(HolidayProfileSummary, {
        user: { name: "Ada" },
        profile: { holidayProfile: {}, portrait },
      }),
    );
    expect(own).toContain('aria-label="Coinvolgimento natalizio"');
    expect(own).toContain('value="48"');
    expect(own).toContain("Nel vivo delle feste");
    expect(own).toContain("65% tratti e 35% coinvolgimento");
    const group = renderToStaticMarkup(
      createElement(GroupMemberPortraitCard, {
        currentUserId: "other",
        member: {
          userId: "ada",
          name: "Ada",
          holidayStatus: { portraitApproved: true },
          portrait,
        },
      }),
    );
    expect(group).toContain("Nel vivo delle feste");
    expect(group).not.toContain('aria-label="Coinvolgimento natalizio"');
  });
});
