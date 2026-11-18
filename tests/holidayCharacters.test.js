import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeHolidayPortrait,
  holidayCharacters,
  holidayMoods,
  holidayQuestions,
  tasteAxes,
} from "../shared/holidayPortrait.js";

const films = {
  elf: 2,
  rudolph: 3,
  frosty: 2,
  grinch: 3,
  christmas_carol: 3,
  santa_clause: 3,
  nightmare: 3,
  home_alone: 3,
  charlie_brown: 3,
  christmas_vacation: 3,
  die_hard: 3,
  miracle_34th: 2,
  the_holiday: 3,
  klaus: 3,
  polar_express: 3,
  love_actually: 3,
  jingle_all_the_way: 2,
  arthur_christmas: 3,
  wonderful_life: 2,
};

describe("catalogo dei personaggi delle feste", () => {
  it("comprende 52 personaggi di 19 film, con al massimo tre per film canonico", () => {
    expect(holidayCharacters).toHaveLength(52);
    const counts = {};
    for (const character of holidayCharacters) {
      counts[character.filmId] = (counts[character.filmId] || 0) + 1;
    }
    expect(counts).toEqual(films);
    expect(Object.values(counts).every((count) => count <= 3)).toBe(true);
    expect(new Set(holidayCharacters.map(({ id }) => id)).size).toBe(52);
  });

  it("conserva gli ID esistenti senza includere incarnazioni di Babbo o Mamma Natale", () => {
    const ids = holidayCharacters.map(({ id }) => id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "grinch",
        "kevin",
        "scrooge",
        "buddy",
        "jack",
        "clark",
        "jovie",
        "sally",
        "george",
      ]),
    );
    for (const id of [
      "klaus",
      "santa",
      "mrs_claus",
      "scott_calvin",
      "kris_kringle",
      "grandsanta",
    ]) {
      expect(ids).not.toContain(id);
    }
    expect(holidayCharacters.map(({ name }) => name).join(" ")).not.toMatch(
      /Babbo Natale|Mamma Natale|Santa Claus|Mrs\.? Claus|Scott Calvin|Kris Kringle|Grandsanta/i,
    );
    expect(holidayCharacters.find(({ id }) => id === "jesper")?.name).toBe(
      "Jesper",
    );
    expect(ids).toEqual(expect.arrayContaining(["arthur", "steve"]));
  });

  it("fornisce profili finiti distinti e immagini locali o un simbolo di ripiego", () => {
    const vectors = new Set();
    const images = [];
    for (const character of holidayCharacters) {
      expect(character.name.trim()).not.toBe("");
      expect(character.movie.trim()).not.toBe("");
      expect(character.tagline.trim()).not.toBe("");
      expect(character.description.trim()).not.toBe("");
      expect(Object.keys(character.profile).sort()).toEqual(
        tasteAxes.map(({ id }) => id).sort(),
      );
      const vector = tasteAxes.map(({ id }) => character.profile[id]);
      for (const value of vector) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      vectors.add(JSON.stringify(vector));
      if (character.image) {
        expect(character.image).toMatch(/^\/characters\/[a-z]+\.webp$/);
        expect(
          existsSync(new URL(`../public${character.image}`, import.meta.url)),
        ).toBe(true);
        images.push(character.id);
      } else {
        expect(character.image).toBeNull();
        expect(character.symbol.trim()).not.toBe("");
      }
    }
    expect(vectors.size).toBe(52);
    expect(images.sort()).toEqual([
      "buddy",
      "clark",
      "grinch",
      "jack",
      "kevin",
      "scrooge",
    ]);
  });

  it("mantiene tre risultati con percentuali indipendenti anche nel catalogo ampliato", () => {
    const portrait = computeHolidayPortrait(
      {
        dailyMood: { id: "buddy", date: "2026-11-18" },
        answers: { tree_style: "colorful_fun" },
      },
      { activity: { games: [{ game: "addobbi", count: 3 }] } },
    );
    expect(portrait.characterMatches).toHaveLength(3);
    expect(
      portrait.matchingExplanation.weights.map(
        ({ effectiveWeight }) => effectiveWeight,
      ),
    ).toEqual([60, 25, 15]);
    expect(
      portrait.characterMatches.reduce(
        (sum, { affinity }) => sum + affinity,
        0,
      ),
    ).toBeGreaterThan(100);
    for (const { affinity } of portrait.characterMatches) {
      expect(affinity).toBeGreaterThanOrEqual(0);
      expect(affinity).toBeLessThanOrEqual(100);
    }
  });

  it("dà spazio a personaggi diversi combinando giochi, stati e risposte reali", () => {
    // This grid checks coverage, not the distribution of actual users.
    const games = [
      null,
      "quiz",
      "memory",
      "film",
      "pacchi",
      "slitta",
      "cartolina",
      "addobbi",
      "tris",
      "duel",
    ];
    const winners = new Map();
    const appearances = new Set();
    let count = 0;
    for (const game of games) {
      for (const mood of [null, ...holidayMoods]) {
        for (const optionIndex of [null, 0, 1, 2, 3]) {
          const portrait = computeHolidayPortrait(
            {
              dailyMood: mood ? { id: mood.id, date: "2026-11-18" } : null,
              answers:
                optionIndex === null
                  ? {}
                  : Object.fromEntries(
                      holidayQuestions.map((question) => [
                        question.id,
                        question.options[optionIndex].id,
                      ]),
                    ),
            },
            {
              today: "2026-11-18",
              activity: game
                ? { games: [{ game, count: 3, averageResult: 0.8 }] }
                : {},
            },
          );
          expect(portrait.characterMatches).toHaveLength(3);
          winners.set(
            portrait.topCharacter.id,
            (winners.get(portrait.topCharacter.id) || 0) + 1,
          );
          portrait.characterMatches.forEach(({ id }) => appearances.add(id));
          count++;
        }
      }
    }
    expect(winners.size).toBeGreaterThanOrEqual(20);
    expect(appearances.size).toBeGreaterThanOrEqual(38);
    expect(Math.max(...winners.values()) / count).toBeLessThanOrEqual(0.25);
  });
});
