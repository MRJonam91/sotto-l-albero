import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stamps, isStampAvailable } from "../shared/stamps.js";
import { seasonalStamps } from "../shared/seasonalStamps.js";
import { treasureStories } from "../src/treasureStories.js";
import SeasonalStampIcon from "../src/SeasonalStampIcon.jsx";

const originalIds = [
  "star",
  "teapot",
  "gift",
  "bell",
  "quiz",
  "memory",
  "santa",
  "ice",
  "cookie",
  "hat",
  "reindeer",
  "sleigh",
];
const seasonalIds = [
  "office_ipod",
  "polar_bell",
  "grinch_ornament",
  "elf_snowglobe",
  "kevin_pizza",
  "klaus_letter",
  "charlie_tree",
  "frosty_hat",
  "arthur_slippers",
  "rudolph_nose",
];

describe("i dieci nuovi oggetti natalizi", () => {
  it("estende l’album senza rinominare i dodici timbri già salvati", () => {
    expect(Object.keys(stamps)).toEqual([...originalIds, ...seasonalIds]);
    expect(Object.keys(seasonalStamps)).toEqual(seasonalIds);
    for (const id of seasonalIds) {
      expect(stamps[id]).toBe(seasonalStamps[id]);
      expect(stamps[id].seasonal).toBe(true);
      expect(stamps[id].name.trim()).not.toBe("");
      expect(stamps[id].hint.trim()).not.toBe("");
      expect(stamps[id].story.trim()).not.toBe("");
      // The rollout controls the day; the objects add no unexplained hourly gate.
      expect(
        isStampAvailable(stamps[id], new Date("2026-12-15T23:00:00Z")),
      ).toBe(true);
    }
    expect(
      new Set(Object.values(seasonalStamps).map((stamp) => stamp.section)),
    ).toEqual(new Set(["events", "wishes", "archive", "games"]));
    expect(stamps.office_ipod.section).toBe("events");
  });

  it("offre per ogni scoperta una storia e una fonte diretta attribuita", () => {
    const allowedHosts = new Set([
      "www.earwolf.com",
      "www.youtube.com",
      "press.disneyplus.com",
      "www.peanuts.com",
      "www.universalpicturesathome.com",
      "www.aardman.com",
      "www.paramountpressexpress.com",
    ]);
    for (const id of seasonalIds) {
      const scene = treasureStories[id];
      for (const field of ["title", "source", "story", "linkLabel"])
        expect(scene[field]?.trim(), `${id}.${field}`).toBeTruthy();
      const url = new URL(scene.link);
      expect(url.protocol).toBe("https:");
      expect(allowedHosts.has(url.hostname), id).toBe(true);
      expect(url.pathname).not.toMatch(/search|results/);
      if (scene.quote) {
        expect(scene.quoteLang).toBe("en");
        expect(scene.quote.split(/\s+/).length).toBeLessThanOrEqual(25);
      }
    }
  });

  it("apre video YouTube diretti e distingue scene, raccolte e trailer", () => {
    for (const [id, scene] of Object.entries(treasureStories)) {
      const url = new URL(scene.link);
      expect(url.origin, id).toBe("https://www.youtube.com");
      expect(url.pathname, id).toBe("/watch");
      expect(url.searchParams.get("v"), id).toMatch(/^[\w-]{11}$/);
      expect(["scene", "collection", "trailer"], id).toContain(scene.linkType);
      if (scene.linkType === "trailer")
        expect(scene.linkLabel).toMatch(/trailer/i);
      if (scene.linkType === "collection")
        expect(scene.linkLabel).toMatch(/raccolta/i);
      expect(scene.linkLabel).not.toMatch(
        /ascolta|scheda|comunicato|intervista/i,
      );
    }
    // Two objects from the same episode should open their own relevant extract.
    expect(treasureStories.teapot.linkType).toBe("scene");
    expect(treasureStories.office_ipod.linkType).toBe("scene");
    expect(treasureStories.teapot.link).not.toBe(
      treasureStories.office_ipod.link,
    );
  });

  it("rende dieci icone vettoriali distinte, decorative e senza contenuti remoti", () => {
    const icons = seasonalIds.map((id) =>
      renderToStaticMarkup(createElement(SeasonalStampIcon, { id, size: 35 })),
    );
    expect(new Set(icons).size).toBe(10);
    for (const icon of icons) {
      expect(icon).toContain('viewBox="0 0 24 24"');
      expect(icon).toContain('width="35"');
      expect(icon).toContain('aria-hidden="true"');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).not.toMatch(/<image|<script|href=|https?:/);
    }
    expect(
      renderToStaticMarkup(createElement(SeasonalStampIcon, { id: "unknown" })),
    ).toBe("");
  });
});
