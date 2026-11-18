import { describe, expect, it } from "vitest";
import {
  computeHolidayPortrait,
  holidayCharacters,
  parseHolidayProfile,
} from "../shared/holidayPortrait.js";

const activity = (game, count = 3, averageResult = 0.8) => ({
  games: [{ game, count, averageResult }],
  stampsCount: 0,
  interactionsCount: 0,
});
const essentials = (portrait) => ({
  tastes: portrait.tastes,
  matches: portrait.characterMatches,
  confidence: portrait.confidencePct,
  explanation: portrait.matchingExplanation,
});

describe("ritratto automatico", () => {
  it("ignora salti, completamenti e targhettine nelle affinità e negli indizi", () => {
    const base = { answers: { wrapping: "puzzle_box" } };
    const context = { activity: activity("quiz") };
    expect(
      essentials(
        computeHolidayPortrait(
          {
            ...base,
            skippedDates: ["2026-11-18"],
            completedDates: ["2026-11-17"],
            lastPromptDate: "2026-11-18",
            lastPromptStatus: "skipped",
          },
          { ...context, today: "2026-11-18", badge: "starlight" },
        ),
      ),
    ).toEqual(essentials(computeHolidayPortrait(base, context)));
  });
  it("usa tutta l’attività disponibile senza richiedere domande e satura le ripetizioni", () => {
    const portrait = computeHolidayPortrait({}, { activity: activity("quiz") });
    expect(portrait.matchingExplanation.weights).toMatchObject([
      { id: "activity", effectiveWeight: 100 },
      { id: "expressed", effectiveWeight: 0 },
      { id: "questions", effectiveWeight: 0 },
    ]);
    expect(portrait.topCharacter.affinity).toBeGreaterThan(75);
    expect(portrait.characterMatches).toEqual(
      computeHolidayPortrait({}, { activity: activity("quiz", 3000) })
        .characterMatches,
    );
    expect(portrait.generatedDescription).not.toMatch(
      /ignor|salt|mistero|rispondendo/,
    );
  });
  it("ridistribuisce i pesi disponibili e mostra tre affinità indipendenti su 52 personaggi", () => {
    const portrait = computeHolidayPortrait(
      {
        dailyMood: { id: "cocoa", date: "2026-11-18" },
        answers: { wrapping: "puzzle_box" },
      },
      { activity: activity("memory") },
    );
    expect(
      portrait.matchingExplanation.weights.map((w) => w.effectiveWeight),
    ).toEqual([60, 25, 15]);
    expect(holidayCharacters).toHaveLength(52);
    expect(portrait.characterMatches).toHaveLength(3);
    expect(portrait.topCharacter).toEqual(portrait.characterMatches[0]);
    expect(
      portrait.characterMatches.reduce((sum, item) => sum + item.affinity, 0),
    ).toBeGreaterThan(100);
  });
  it("distingue attività diverse senza dedurre gusti dalle risposte di conoscenza", () => {
    const quiz = computeHolidayPortrait({}, { activity: activity("quiz") });
    const lights = computeHolidayPortrait(
      {},
      { activity: activity("addobbi") },
    );
    expect(quiz.topCharacter.id).not.toBe(lights.topCharacter.id);
    expect(quiz.matchingExplanation.signals.join(" ")).toContain("Quiz");
    expect(quiz.generatedDescription).not.toMatch(/preferisce|ama|adora/);
  });
  it("segnala un punto di partenza provvisorio senza assegnare tratti da nome o id", () => {
    const first = computeHolidayPortrait({}, { name: "Marta", userId: "a" });
    const second = computeHolidayPortrait({}, { name: "Kevin", userId: "b" });
    expect(first.matchingExplanation.provisional).toBe(true);
    expect(first.matchingExplanation.signals).toEqual([]);
    expect(first.characterMatches).toEqual(second.characterMatches);
    expect(first.generatedDescription).toContain("provvisorio");
  });
  it("valida lo stato del giorno conservando i vecchi campi", () => {
    expect(
      parseHolidayProfile({
        dailyMood: { id: "buddy", date: "2026-11-18" },
        answers: { sweater: "kevin_red" },
        quote: "Ciao",
      }),
    ).toMatchObject({
      dailyMood: { id: "buddy", date: "2026-11-18" },
      answers: { sweater: "kevin_red" },
      quote: "Ciao",
    });
    expect(
      parseHolidayProfile({ dailyMood: { id: "unknown", date: "2026-11-18" } })
        .dailyMood,
    ).toBeNull();
  });
  it("considera anche le icone senza un personaggio associato come scelte espresse", () => {
    const portrait = computeHolidayPortrait({
      iconMessage: ["bell", "scarf", "candle", "reindeer"],
    });
    expect(
      portrait.matchingExplanation.weights.map(
        (weight) => weight.effectiveWeight,
      ),
    ).toEqual([0, 100, 0]);
  });
  it("considera curling e usi salvati con contributi saturati e senza inventare gusti", () => {
    const curling = computeHolidayPortrait(
      {},
      { activity: activity("curling", 1, null) },
    );
    expect(curling.matchingExplanation.weights[0].effectiveWeight).toBe(100);
    expect(curling.matchingExplanation.signals.join(" ")).toContain("Curling");
    expect(curling.matchingExplanation.signals.join(" ")).not.toContain(
      "risultato medio",
    );
    const tools = {
      wishlistItemsCount: 1,
      participatingEventsCount: 1,
      organizedEventsCount: 1,
    };
    const minimal = computeHolidayPortrait({}, { activity: { tools } });
    expect(minimal.matchingExplanation.weights[0].effectiveWeight).toBe(100);
    expect(minimal.matchingExplanation.signals.join(" ")).toMatch(
      /desideri|eventi/,
    );
    expect(minimal.generatedDescription).not.toMatch(/preferisce|ama|adora/);
    expect(
      computeHolidayPortrait(
        {},
        {
          activity: {
            tools: {
              wishlistItemsCount: 1000,
              participatingEventsCount: 1000,
              organizedEventsCount: 1000,
            },
          },
        },
      ).tastes,
    ).toEqual(
      computeHolidayPortrait(
        {},
        {
          activity: {
            tools: {
              wishlistItemsCount: 5,
              participatingEventsCount: 3,
              organizedEventsCount: 3,
            },
          },
        },
      ).tastes,
    );
    const combined = computeHolidayPortrait(
      {},
      { activity: { ...activity("quiz", 3), tools } },
    );
    expect(combined.topCharacter.id).toBe(
      computeHolidayPortrait({}, { activity: activity("quiz", 3) }).topCharacter
        .id,
    );
  });
});
