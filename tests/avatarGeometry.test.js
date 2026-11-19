import { describe, expect, it, vi } from "vitest";
import {
  portraitOffsetLimits,
  portraitPlacement,
  portraitScenePlacement,
  transformPortraitPoint,
  mapFaceLandmarks,
} from "../src/avatarGeometry.js";
import { drawAvatar } from "../src/avatarCanvasClassic.js";
import { avatarTemplates } from "../src/avatarTemplateVariants.js";

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

describe("illustrated anatomical alignment", () => {
  const source = {
    width: 400,
    height: 600,
    faceBox: { cx: 170, cy: 260, w: 150, h: 210 },
    landmarks: {
      detected: true,
      coordinateSpace: "cutout-pixels",
      imageLeftEye: [120, 210],
      imageRightEye: [210, 230],
      noseTip: [169, 265],
      mouthCenter: [165, 300],
      chin: [170, 360],
    },
  };
  const scene = {
    overlay: "/art.webp",
    face: [128, 130, 40, 50],
    faceBounds: { x: 88, y: 80, width: 80, height: 100 },
    anchors: { imageLeftEye: [108, 112], imageRightEye: [148, 106] },
  };
  it("fits the same face silhouette consistently for different eye spacings across the painted openings", () => {
    const faceOval = Array.from({ length: 36 }, (_, index) => {
      const angle = (index * Math.PI) / 18;
      return [100 + 50 * Math.cos(angle), 90 + 64 * Math.sin(angle)];
    });
    for (const template of avatarTemplates) {
      const placements = [36, 50].map((spacing) =>
        portraitScenePlacement(
          {
            width: 200,
            height: 220,
            landmarks: {
              detected: true,
              imageLeftEye: [100 - spacing / 2, 64],
              imageRightEye: [100 + spacing / 2, 64],
              chin: [100, 154],
              faceOval,
            },
          },
          template,
        ),
      );
      expect(placements[0].scale, template.id).toBeCloseTo(
        placements[1].scale,
        5,
      );
      const mapped = faceOval.map((point) =>
        transformPortraitPoint(placements[0], point),
      );
      const brow = Math.min(...mapped.map(([, y]) => y));
      const jaw = transformPortraitPoint(placements[0], [100, 154])[1];
      expect(brow, template.id).toBeGreaterThanOrEqual(
        template.openingBounds.y - 6,
      );
      expect(jaw, template.id).toBeLessThan(template.collarY);
      expect(placements[0].width / placements[0].height).toBeCloseTo(200 / 220);
    }
  });
  it("matches the actual two eyes with one uniform scale and a roll correction", () => {
    const placed = portraitScenePlacement(source, scene, { zoom: 1 }, true);
    const left = transformPortraitPoint(placed, source.landmarks.imageLeftEye);
    const right = transformPortraitPoint(
      placed,
      source.landmarks.imageRightEye,
    );
    expect(left[0]).toBeCloseTo(108);
    expect(left[1]).toBeCloseTo(112);
    expect(right[0]).toBeCloseTo(148);
    expect(right[1]).toBeCloseTo(106);
    expect(placed.width / placed.height).toBeCloseTo(400 / 600);
    expect(placed.rotation).toBeLessThan(0);
  });
  it("applies manual movement in scene pixels and zoom around the eye midpoint", () => {
    const placed = portraitScenePlacement(
      source,
      scene,
      { zoom: 1.3, offsetX: 20, offsetY: -30 },
      true,
    );
    const middle = transformPortraitPoint(placed, [165, 220]);
    expect(middle[0]).toBeCloseTo(128 + 5.4);
    expect(middle[1]).toBeCloseTo(109 - 8.1);
  });
  it("uses proportional cover for the annotated face opening when landmarks are missing", () => {
    const placed = portraitScenePlacement(
      { width: 400, height: 600, faceBox: source.faceBox },
      scene,
      { zoom: 1 },
      true,
    );
    expect(placed.scale * source.faceBox.w).toBeGreaterThanOrEqual(80);
    expect(placed.scale * source.faceBox.h).toBeGreaterThanOrEqual(100);
    expect(placed.alignment).toBe("box");
  });
  it("keeps a tall detected skin box inside a painted collar when the mesh is unavailable", () => {
    const template = avatarTemplates.find(({ id }) => id === "elf-front");
    const image = {
      width: 200,
      height: 300,
      faceBox: { cx: 100, cy: 150, w: 88, h: 174 },
    };
    const placed = portraitScenePlacement(image, template);
    const forehead = transformPortraitPoint(placed, [100, 63]);
    const chin = transformPortraitPoint(placed, [100, 237]);
    expect(forehead[1]).toBeGreaterThan(template.openingBounds.y - 5);
    expect(chin[1]).toBeLessThan(template.collarY);
    const invalid = portraitScenePlacement(
      { width: 200, height: 300, faceBox: { w: 10, h: 30, cx: NaN, cy: 20 } },
      template,
    );
    expect(invalid.transform.every(Number.isFinite)).toBe(true);
  });
  it("maps detected points into crop or graded coordinates without mutating source data", () => {
    const mapped = mapFaceLandmarks(
      source.landmarks,
      { scaleX: 0.5, scaleY: 0.5, offsetX: -10, offsetY: -20 },
      "graded-pixels",
    );
    expect(mapped.imageLeftEye).toEqual([50, 85]);
    expect(mapped.imageRightEye).toEqual([95, 95]);
    expect(mapped.detected).toBe(true);
    expect(source.landmarks.imageLeftEye).toEqual([120, 210]);
  });
});
