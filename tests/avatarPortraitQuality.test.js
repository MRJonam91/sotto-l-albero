import { expect, it } from "vitest";
import {
  applyOilBrushwork,
  applyVintagePortraitGrade,
  extendPortraitEdges,
} from "../src/avatarVintageFilter.js";

function patch(width, height, colour, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...colour, alpha], i * 4);
  return data;
}

it("preserves complexion rather than mapping different skin tones to a fixed tan target", () => {
  for (const colour of [
    [70, 45, 32],
    [170, 115, 80],
    [230, 185, 155],
  ]) {
    const data = patch(20, 20, colour);
    applyVintagePortraitGrade(data, 20, 20, {
      strength: 0.8,
      painterly: false,
      smoothing: false,
      faceBox: { cx: 10, cy: 10, w: 16, h: 18 },
      lighting: { temperature: 0, strength: 0, direction: [0, 0] },
      hatShadow: 0,
    });
    const centre = (10 * 20 + 10) * 4;
    expect(Math.abs(data[centre] - colour[0])).toBeLessThanOrEqual(6);
    expect(Math.abs(data[centre + 1] - colour[1])).toBeLessThanOrEqual(6);
    expect(Math.abs(data[centre + 2] - colour[2])).toBeLessThanOrEqual(6);
  }
});

it("does not let surrounding hair change facial colour statistics", () => {
  const faceBox = { cx: 20, cy: 20, w: 12, h: 18 };
  const outputs = [];
  for (const hair of [
    [8, 8, 8],
    [240, 220, 160],
  ]) {
    const data = patch(40, 40, hair);
    for (let y = 11; y < 29; y++)
      for (let x = 14; x < 26; x++)
        data.set([145, 102, 78, 255], (y * 40 + x) * 4);
    applyVintagePortraitGrade(data, 40, 40, {
      faceBox,
      painterly: false,
      smoothing: false,
      hatShadow: 0,
      lighting: { temperature: 0.15, strength: 0.2, direction: [-0.2, -0.3] },
    });
    outputs.push([...data.slice((20 * 40 + 20) * 4, (20 * 40 + 20) * 4 + 3)]);
  }
  expect(outputs[0]).toEqual(outputs[1]);
});

it("keeps transparent RGB from darkening fine opaque hair during brushwork", () => {
  const data = patch(9, 9, [0, 0, 0], 0);
  for (let y = 2; y < 7; y++) data.set([170, 110, 70, 255], (y * 9 + 4) * 4);
  applyOilBrushwork(data, 9, 9, 0.6);
  expect([...data.slice((4 * 9 + 4) * 4, (4 * 9 + 4) * 4 + 3)]).toEqual([
    170, 110, 70,
  ]);
});

it("reduces photographic grain as brush strength rises while keeping a fine dark feature", () => {
  const size = 144;
  const faceBox = { cx: 70, cy: 70, w: 103, h: 128 };
  const photo = patch(size, size, [139, 98, 79]);
  const index = (x, y) => (y * size + x) * 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = ((x * 971 + y * 619) % 17) - 8;
      if (x >= 68 && x < 74 && y >= 68 && y < 76)
        photo.set([42, 28, 23, 255], index(x, y));
      else for (let c = 0; c < 3; c++) photo[index(x, y) + c] += grain;
    }
  }
  const roughness = (data) => {
    let total = 0;
    for (let y = 22; y < 46; y++)
      for (let x = 22; x < 46; x++)
        total += Math.abs(data[index(x, y)] - data[index(x + 1, y)]);
    return total;
  };
  const rendered = [0.35, 0.75, 1].map((paintStrength) =>
    applyVintagePortraitGrade(photo.slice(), size, size, {
      faceBox,
      paintStrength,
    }),
  );
  expect(roughness(rendered[1])).toBeLessThan(roughness(rendered[0]) * 0.7);
  for (const result of rendered) {
    expect(roughness(result)).toBeLessThan(roughness(photo) * 0.65);
    expect(result[index(65, 72)] - result[index(71, 72)]).toBeGreaterThan(75);
  }
});

it("follows the light direction in the painting and retains the original matte", () => {
  const w = 80;
  const original = patch(w, w, [125, 82, 65]);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < 4; x++) original[(y * w + x) * 4 + 3] = x * 60;
  const grade = (direction) =>
    applyVintagePortraitGrade(original.slice(), w, w, {
      paintStrength: 1,
      faceBox: { cx: 40, cy: 40, w: 60, h: 70 },
      lighting: { strength: 0.35, temperature: 0.15, direction },
    });
  const left = grade([-1, 0]),
    right = grade([1, 0]);
  const sample = (data, x) => data[(40 * w + x) * 4];
  expect(sample(left, 20) - sample(right, 20)).toBeGreaterThan(10);
  expect(sample(right, 60) - sample(left, 60)).toBeGreaterThan(10);
  expect(left.filter((_, i) => i % 4 === 3)).toEqual(
    original.filter((_, i) => i % 4 === 3),
  );
});

it("extends edge colour only a few pixels and never fills a large missing face area", () => {
  const data = patch(17, 17, [0, 0, 0], 0);
  for (let y = 5; y < 12; y++)
    for (let x = 5; x < 12; x++)
      data.set([170, 110, 70, 255], (y * 17 + x) * 4);
  extendPortraitEdges(data, 17, 17, 2);
  expect([...data.slice((8 * 17 + 4) * 4, (8 * 17 + 4) * 4 + 3)]).toEqual([
    170, 110, 70,
  ]);
  expect(data[(8 * 17 + 4) * 4 + 3]).toBeGreaterThan(0);
  expect(data[(8 * 17 + 1) * 4 + 3]).toBe(0);
  expect(data[(8 * 17 + 8) * 4 + 3]).toBe(255);
});
