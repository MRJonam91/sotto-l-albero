import { describe, expect, it } from "vitest";
import { faceMask } from "../src/avatarFaceMask.js";
import {
  applyAntiqueMedallionFinish,
  applyVintagePortraitGrade,
} from "../src/avatarVintageFilter.js";

function scene() {
  const width = 40;
  const height = 36;
  const categories = new Uint8Array(width * height);
  function paint(x, y, w, h, label) {
    for (let row = y; row < y + h; row++) {
      categories.fill(label, row * width + x, row * width + x + w);
    }
  }
  return { width, height, categories, paint };
}

describe("avatar face mask", () => {
  it("isolates the face and restores features surrounded by face pixels", () => {
    const { width, height, categories, paint } = scene();
    paint(10, 5, 16, 19, 3);
    paint(12, 10, 10, 2, 5); // glasses inside the face
    paint(5, 24, 28, 12, 4); // shirt
    paint(31, 3, 2, 2, 3); // isolated prediction noise

    const result = faceMask(categories, width, height);
    expect(result.bounds).toEqual({ x: 10, y: 5, width: 16, height: 19 });
    expect(result.alpha[10 * width + 15]).toBe(255);
    expect(result.alpha[25 * width + 15]).toBe(0);
    expect(result.alpha[3 * width + 31]).toBe(0);
  });

  it("includes side hair halo and soft feathering when includeHair is enabled", () => {
    const { width, height, categories, paint } = scene();
    paint(10, 7, 16, 18, 3); // face skin
    paint(7, 9, 3, 12, 1); // left hair locks framing cheek
    paint(26, 9, 3, 12, 1); // right hair locks framing cheek

    const result = faceMask(categories, width, height, {
      includeHair: true,
      feather: true,
    });
    expect(result).not.toBeNull();
    expect(result.bounds.x).toBeLessThan(10);
    expect(result.bounds.width).toBeGreaterThan(16);
    expect(result.alpha[12 * width + 8]).toBeGreaterThan(100);
    expect(result.landmarks.mouthCenterY).toBeGreaterThan(
      result.landmarks.eyeLineY,
    );
  });

  it("does not use a missing or ambiguous face as a cutout", () => {
    const { width, height, categories, paint } = scene();
    paint(7, 16, 27, 20, 4);
    expect(faceMask(categories, width, height)).toBeNull();
    paint(3, 4, 12, 13, 3);
    paint(23, 5, 12, 13, 3);
    expect(faceMask(categories, width, height)).toBeNull();
  });

  it("applies warm vintage portrait grading and antique medallion grain on CPU", () => {
    const w = 16;
    const h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 135;
      data[i * 4 + 1] = 140;
      data[i * 4 + 2] = 155;
      data[i * 4 + 3] = 255;
    }
    applyVintagePortraitGrade(data, w, h, { strength: 0.9, smoothing: true });
    const mid = (8 * w + 8) * 4;
    expect(data[mid]).toBeGreaterThan(data[mid + 2]);

    applyAntiqueMedallionFinish(data, w, h, 6);
    expect(data[mid + 3]).toBe(255);
  });
});
