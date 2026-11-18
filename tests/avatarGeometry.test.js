import { describe, expect, it, vi } from "vitest";
import {
  portraitOffsetLimits,
  portraitPlacement,
} from "../src/avatarGeometry.js";
import { drawAvatar } from "../src/avatarCanvasClassic.js";

describe("avatar face placement", () => {
  const face = [128, 120, 40, 50];
  const settings = { zoom: 1, offsetX: 0, offsetY: 0 };

  it("centres the face box independently of asymmetric hair and neck", () => {
    const portrait = {
      width: 400,
      height: 600,
      faceBox: { cx: 120, cy: 210, w: 100, h: 140 },
    };
    const placed = portraitPlacement(portrait, face, settings, true);
    expect(placed.x + 120 * placed.scale).toBeCloseTo(128);
    expect(placed.y + 210 * placed.scale).toBeCloseTo(120);
    expect(placed.width / placed.height).toBeCloseTo(400 / 600);
    expect((placed.height * 140) / 600).toBeLessThanOrEqual(100);
  });

  it("uses the same scene-space movement for cutouts and manual photos", () => {
    for (const isolated of [true, false]) {
      const image = { width: 900, height: 600 };
      const start = portraitPlacement(image, face, settings, isolated);
      const moved = portraitPlacement(
        image,
        face,
        {
          ...settings,
          offsetX: 20,
          offsetY: -30,
        },
        isolated,
      );
      expect(moved.x - start.x).toBeCloseTo(5.4);
      expect(moved.y - start.y).toBeCloseTo(-8.1);
      expect(moved.width).toBe(start.width);
      expect(moved.height).toBe(start.height);
    }
  });

  it("preserves cover and finite geometry when no valid face box exists", () => {
    for (const faceBox of [undefined, { cx: NaN, cy: 0, w: 0, h: 3 }]) {
      const placed = portraitPlacement(
        { width: 400, height: 200, faceBox },
        face,
        settings,
        false,
      );
      expect(placed.width).toBeGreaterThanOrEqual(80);
      expect(placed.height).toBeGreaterThanOrEqual(100);
      expect(Number.isFinite(placed.x)).toBe(true);
      expect(placed.width / placed.height).toBe(2);
    }
  });

  it("uses facial geometry in classic scenes too", () => {
    const drawImage = vi.fn();
    const ctx = new Proxy(
      { drawImage },
      {
        get: (target, key) => target[key] ?? (() => ({ addColorStop() {} })),
      },
    );
    const source = {
      width: 400,
      height: 600,
      faceBox: { cx: 120, cy: 210, w: 100, h: 140 },
    };
    drawAvatar(
      { getContext: () => ctx },
      { source, isolated: true },
      { scene: "elf", ...settings },
    );
    const [, x, y, width, height] = drawImage.mock.calls[0];
    expect(x + (source.faceBox.cx * width) / source.width).toBeCloseTo(129);
    expect(y + (source.faceBox.cy * height) / source.height).toBeCloseTo(121);
    expect(width / height).toBeCloseTo(source.width / source.height);
  });

  it("can reach an off-centre face in a wide manual photo without stretching or exposing edges", () => {
    const image = { width: 2000, height: 500 };
    const face = [128, 120, 40, 50];
    const settings = { zoom: 1.15 };
    const start = portraitPlacement(image, face, settings, false);
    const limits = portraitOffsetLimits(image, face, settings, false);
    const needed = (128 - (start.x + 200 * start.scale)) / 0.27;
    expect(limits.x).toBeGreaterThanOrEqual(needed);
    const centred = portraitPlacement(
      image,
      face,
      { ...settings, offsetX: needed },
      false,
    );
    expect(centred.x + 200 * centred.scale).toBeCloseTo(128);
    expect(centred.x).toBeLessThanOrEqual(88);
    expect(centred.x + centred.width).toBeGreaterThanOrEqual(168);
    expect(centred.width / centred.height).toBe(4);
  });
});
