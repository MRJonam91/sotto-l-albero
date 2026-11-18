import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HolidayProfileSummary from "../src/HolidayProfileSummary.jsx";
import {
  GroupMemberPortraitCard,
  MovieCharacterComparison,
  TasteRadarChart,
} from "../src/HolidayPortrait.jsx";
import { computeHolidayPortrait } from "../shared/holidayPortrait.js";

const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props));

it("shows initial traits and numeric character affinities without opening details", () => {
  const portrait = computeHolidayPortrait({}, { name: "Ada" });
  const html = render(HolidayProfileSummary, {
    user: { name: "Ada" },
    profile: { holidayProfile: {}, portrait },
  });

  expect(html).toContain("I tuoi tratti natalizi");
  expect(html).toContain("Valori iniziali");
  expect(html.match(/50\/100/g)).toHaveLength(5);
  expect(html).not.toContain("holiday-summary-details");
  expect(html.indexOf("portrait-tastes")).toBeLessThan(
    html.indexOf("character-comparison-grid"),
  );
  for (const character of portrait.characterMatches)
    expect(html).toContain(`<span>${character.affinity}%</span>`);
  expect(html).toContain("Affinità iniziali da tratti neutri");
  expect(html).not.toContain(">Provvisorio<");
  expect(html.match(/role="listitem"/g)).toHaveLength(8);
});

it("reuses the own profile context when a portrait payload is missing", () => {
  const context = { activity: { games: [{ game: "tris", count: 1 }] } };
  const computed = computeHolidayPortrait({}, context);
  const html = render(HolidayProfileSummary, {
    user: { name: "Ada" },
    profile: { holidayProfile: {}, context },
  });

  for (const taste of computed.tastes)
    expect(html).toContain(`${taste.value}/100`);
  expect(html).not.toContain("Valori iniziali");
});

it("uses a labelled 0–100 scale and keeps a zero trait at the radar centre", () => {
  const html = render(TasteRadarChart, {
    tastes: [
      { id: "first", label: "Entusiasmo", value: 0 },
      { id: "second", label: "Ingegno", value: 100 },
      { id: "third", label: "Tradizione", value: 50 },
    ],
  });

  expect(html).toContain("ciascuno su una scala da 0 a 100");
  expect(html).toContain("0/100");
  expect(html).toContain("100/100");
  expect(html).toContain('points="110.0,110.0');
  expect(html).toContain('style="width:0%"');
});

it("keeps numeric low-evidence affinities and limits the comparison to three cards", () => {
  const portrait = computeHolidayPortrait(
    {},
    { activity: { games: [{ game: "tris", count: 1 }] } },
  );
  const html = render(MovieCharacterComparison, {
    characterMatches: [
      ...portrait.characterMatches,
      { id: "extra", name: "Extra character", affinity: 25 },
    ],
    matchingExplanation: portrait.matchingExplanation,
  });

  expect(html).toContain("Prime affinità, ancora in aggiornamento");
  expect(html).toContain("non devono sommare 100%");
  expect(html).not.toContain("Extra character");
  expect(html).toContain(
    `<span>${portrait.characterMatches[0].affinity}%</span>`,
  );
});

it("shares the supplied public chart without exposing private matching sources", () => {
  const portrait = computeHolidayPortrait({}, { name: "Ada" });
  const html = render(GroupMemberPortraitCard, {
    currentUserId: "other",
    member: {
      userId: "ada",
      name: "Ada",
      holidayStatus: { portraitApproved: true },
      portrait: {
        ...portrait,
        tastes: [{ id: "ingegno", label: "Ingegno", value: 73 }],
        matchingExplanation: {
          ...portrait.matchingExplanation,
          signals: ["Private activity detail"],
        },
      },
    },
  });

  expect(html).toContain("73/100");
  expect(html).toContain(
    `<span>${portrait.characterMatches[0].affinity}%</span>`,
  );
  expect(html).not.toContain("Private activity detail");
  expect(html).not.toContain("Come nasce l’associazione?");
});

it("does not compute or display an unshared group portrait", () => {
  const html = render(GroupMemberPortraitCard, {
    currentUserId: "other",
    member: {
      userId: "ada",
      name: "Ada",
      holidayStatus: { portraitApproved: false },
      portrait: {
        ...computeHolidayPortrait({}),
        finalDescription: "Private portrait description",
      },
    },
  });

  expect(html).toContain("Il ritratto non è condiviso con il gruppo");
  expect(html).not.toContain("Private portrait description");
  expect(html).not.toContain("portrait-tastes");
  expect(html).not.toContain("character-comparison-grid");
});
