import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HolidayProfileSummary from "../src/HolidayProfileSummary.jsx";
import { GroupMemberPortraitCard } from "../src/HolidayPortrait.jsx";

it("shows a saved custom description when every optional question is skipped", () => {
  const html = renderToStaticMarkup(
    createElement(HolidayProfileSummary, {
      user: { name: "Ada" },
      profile: {
        holidayProfile: {
          customDescription: "Mi piace preparare sorprese tranquille.",
          portraitApproved: false,
        },
        portrait: {
          finalDescription: "Mi piace preparare sorprese tranquille.",
        },
      },
    }),
  );
  expect(html).toContain("Mi piace preparare sorprese tranquille.");
  expect(html).toContain("Ritratto visibile solo a te");
  expect(html).not.toContain("Il ritratto prende forma");
});

it("shows a riddle-only status without exposing its saved solution", () => {
  const html = renderToStaticMarkup(
    createElement(HolidayProfileSummary, {
      user: { name: "Ada" },
      profile: {
        holidayProfile: {
          riddle: "Ho cinque punte e brillo sull’albero.",
          riddleAnswer: "Risposta privata di Ada",
        },
        portrait: { finalDescription: "Un Natale pieno di enigmi." },
      },
    }),
  );
  expect(html).toContain("Ho cinque punte e brillo sull’albero.");
  expect(html).not.toContain("Risposta privata di Ada");
});

it("shows an automatic portrait based only on completed friendly games", () => {
  const html = renderToStaticMarkup(
    createElement(HolidayProfileSummary, {
      user: { name: "Ada" },
      profile: {
        holidayProfile: {},
        gamesPlayed: 0,
        stampsCount: 0,
        context: {
          activity: {
            games: [{ game: "tris", count: 1 }],
            interactionsCount: 0,
          },
        },
        portrait: {
          finalDescription: "Ada ha giocato insieme al gruppo.",
          characterMatches: [],
        },
      },
    }),
  );
  expect(html).toContain("Ada ha giocato insieme al gruppo.");
  expect(html).not.toContain("Le domande servono soltanto");
});

it("labels an older group mood as the last state rather than today's", () => {
  const html = renderToStaticMarkup(
    createElement(GroupMemberPortraitCard, {
      currentUserId: "ada",
      member: {
        userId: "ada",
        name: "Ada",
        holidayStatus: { dailyMood: { id: "cocoa", date: "2020-12-01" } },
      },
    }),
  );
  expect(html).toContain("Ultimo stato");
  expect(html).not.toContain("Oggi mi sento come");
});
