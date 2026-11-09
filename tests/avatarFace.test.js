import { describe, expect, it } from "vitest";
import { faceMask } from "../src/avatarFaceMask.js";

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

  it("does not use a missing or ambiguous face as a cutout", () => {
    const { width, height, categories, paint } = scene();
    paint(7, 16, 27, 20, 4);
    expect(faceMask(categories, width, height)).toBeNull();
    paint(3, 4, 12, 13, 3);
    paint(23, 5, 12, 13, 3);
    expect(faceMask(categories, width, height)).toBeNull();
  });
});
