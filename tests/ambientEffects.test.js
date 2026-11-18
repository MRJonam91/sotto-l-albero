import { describe, expect, it } from "vitest";
import {
  AMBIENT_STORAGE_KEY,
  DEFAULT_AMBIENT_EFFECTS,
  EXTRA_EFFECTS,
  LEGACY_SNOW_STORAGE_KEY,
  SNOW_LEVELS,
  countActiveEffects,
  loadAmbientEffects,
  normalizeAmbientEffects,
  saveAmbientEffects,
} from "../src/ambientEffects.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

describe("ambient christmas effects preferences", () => {
  it("exposes all four snow levels and Christmas extra effects", () => {
    expect(SNOW_LEVELS.map((l) => l.id)).toEqual([
      "off",
      "low",
      "medium",
      "blizzard",
    ]);
    expect(EXTRA_EFFECTS.map((e) => e.id)).toEqual([
      "sparkles",
      "fireworks",
      "fireplace",
      "candies",
      "lights",
      "meteors",
    ]);
  });

  it("defaults to low snow and no extra effects", () => {
    expect(loadAmbientEffects(memoryStorage())).toEqual(
      DEFAULT_AMBIENT_EFFECTS,
    );
    expect(DEFAULT_AMBIENT_EFFECTS.snow).toBe("low");
  });

  it("migrates legacy sla-snow=off and ignores unknown values", () => {
    expect(
      loadAmbientEffects(memoryStorage({ [LEGACY_SNOW_STORAGE_KEY]: "off" })),
    ).toEqual({ snow: "off", extras: [] });

    expect(
      normalizeAmbientEffects({
        snow: "hurricane",
        extras: ["sparkles", "unknown", "candies", "sparkles"],
      }),
    ).toEqual({
      snow: "low",
      extras: ["sparkles", "candies"],
    });
  });

  it("persists preferences and keeps legacy sla-snow synchronized", () => {
    const storage = memoryStorage();
    saveAmbientEffects(
      { snow: "blizzard", extras: ["fireworks", "fireplace"] },
      storage,
    );
    expect(JSON.parse(storage.getItem(AMBIENT_STORAGE_KEY))).toEqual({
      snow: "blizzard",
      extras: ["fireworks", "fireplace"],
    });
    expect(storage.getItem(LEGACY_SNOW_STORAGE_KEY)).toBe("on");
    expect(loadAmbientEffects(storage)).toEqual({
      snow: "blizzard",
      extras: ["fireworks", "fireplace"],
    });

    saveAmbientEffects({ snow: "off", extras: ["candies"] }, storage);
    expect(storage.getItem(LEGACY_SNOW_STORAGE_KEY)).toBe("off");
    expect(countActiveEffects({ snow: "off", extras: ["candies"] })).toBe(1);
    expect(countActiveEffects({ snow: "off", extras: [] })).toBe(0);
  });
});
