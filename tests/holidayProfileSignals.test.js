import { afterEach, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  computeHolidayPortrait,
  formatPortraitSignals,
  holidayActivities,
  parseHolidayProfile,
} from "../shared/holidayPortrait.js";
import { setLocale, t } from "../src/i18n.js";
import HolidayProfileSummary from "../src/HolidayProfileSummary.jsx";
import { GroupMemberPortraitCard } from "../src/HolidayPortrait.jsx";

afterEach(() => setLocale("it"));

const today = "2026-11-19";
const preset = holidayActivities[0];
const profile = {
  iconMessage: ["gift", "cocoa"],
  answers: { sweater: "reindeer_lights" },
  dailyMood: { id: "cocoa", date: today },
};
const context = {
  today,
  name: "Ada",
  activity: {
    games: [
      { game: "quiz", count: 4, averageResult: 0.8 },
      { game: "curling", count: 1 },
      { game: "memory", count: 2 },
    ],
    stampsCount: 2,
    interactionsCount: 1,
    tools: { wishlistItemsCount: 1, organizedEventsCount: 2 },
  },
};

const stampText = {
  it: "Timbri raccolti: 2 (massimo 12 nel calcolo).",
  en: "Stamps collected: 2 (up to 12 are counted).",
  fr: "Timbres collectionnés : 2 (12 pris en compte au maximum).",
  de: "Gesammelte Briefmarken: 2 (höchstens 12 zählen).",
  es: "Sellos coleccionados: 2 (cuentan hasta 12).",
  pt: "Selos colecionados: 2 (contam até 12).",
};

it.each(Object.entries(stampText))(
  "renders private evidence in %s and scores translated activity presets like the original",
  async (locale, stamp) => {
    await setLocale(locale);
    const localizedActivity = t(preset);
    const selected = { ...profile, activity: localizedActivity, activityPreset: preset };
    const portrait = computeHolidayPortrait(selected, context);
    const legacy = computeHolidayPortrait({ ...profile, activity: preset }, context);

    expect(parseHolidayProfile(selected)).toMatchObject({
      activity: localizedActivity, activityPreset: preset,
    });
    expect(portrait.tastes).toEqual(legacy.tastes);
    expect(portrait.characterMatches).toEqual(legacy.characterMatches);
    expect(portrait.festiveProgress).toEqual(legacy.festiveProgress);
    expect(portrait.matchingExplanation).toEqual(legacy.matchingExplanation);
    expect(portrait.privateSignalParts).toEqual(legacy.privateSignalParts);

    const signals = formatPortraitSignals(portrait.privateSignalParts, t);
    expect(signals).toContain(stamp);
    expect(signals.join(" ")).not.toMatch(/\{\w+\}/);
    for (const authored of [
      preset, "desideri salvati", "eventi organizzati", "Pacchetto regalo",
      "Cioccolata fumante", "Una cioccolata calda", "Maglione natalizio",
      "Con renna luminosa e campanellini veri",
    ]) {
      const expected = t(authored);
      expect(signals.some((line) => line.includes(expected))).toBe(true);
      if (locale !== "it") expect(expected).not.toBe(authored);
    }
    expect(signals.find((line) => line.includes(t("Quiz di Natale")))).toMatch(/80\s*%/);
    expect(signals.find((line) => line.includes(t("Curling dei regali")))).not.toMatch(/%/);
    expect(signals.find((line) => line.includes(today))).toContain(t("Una cioccolata calda"));
    const own = renderToStaticMarkup(createElement(HolidayProfileSummary, {
      profile: { holidayProfile: selected, portrait }, user: { name: context.name },
    }));
    expect(own).toContain(stamp);
    const group = renderToStaticMarkup(createElement(GroupMemberPortraitCard, {
      currentUserId: "another",
      member: { userId: "ada", name: context.name, holidayStatus: { portraitApproved: true }, portrait },
    }));
    expect(group).not.toContain(stamp);
    expect(group).not.toContain("portrait-matching-explanation");
  },
);

it("preserves free text even when it matches app copy, and ignores empty or unknown presets", async () => {
  await setLocale("en");
  const custom = {
    activity: "Chiudi", quote: "Non tradurre {name}", activityPreset: "not-in-catalogue",
  };
  expect(parseHolidayProfile(custom)).not.toHaveProperty("activityPreset");
  expect(parseHolidayProfile({ activity: "   ", activityPreset: preset }))
    .not.toHaveProperty("activityPreset");
  const portrait = computeHolidayPortrait(custom);
  expect(portrait.privateSignalParts).toEqual([]);
  expect(portrait.tastes).toEqual(computeHolidayPortrait({}).tastes);
  const html = renderToStaticMarkup(createElement(HolidayProfileSummary, {
    profile: { holidayProfile: parseHolidayProfile(custom), portrait }, user: { name: "Ada" },
  }));
  expect(html).toContain("<p>Chiudi</p>");
  expect(html).toContain("Non tradurre {name}");
  expect(html).not.toContain("Activity selected:");
});
