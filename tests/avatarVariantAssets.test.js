import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";
import { analyzeOpening } from "../scripts/prepare-avatar-variants.mjs";
import { avatarTemplates } from "../src/avatarTemplateVariants.js";
import { portraitScenePlacement } from "../src/avatarGeometry.js";

it("rejects empty transparency and external transparency as face openings", async () => {
  const empty = await sharp({
    create: { width: 256, height: 256, channels: 4, background: "transparent" },
  })
    .raw()
    .toBuffer();
  expect(() => analyzeOpening(empty, 256, 256)).toThrow(/opening/i);
});

it("isolates the central head and neck opening from transparent exterior pixels", () => {
  const width = 256,
    height = 256;
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const outer = x < 16 || x > 239 || y < 16 || y > 239;
      const head = ((x - 128) / 37) ** 2 + ((y - 111) / 47) ** 2 < 1;
      const neck = x >= 110 && x <= 146 && y >= 145 && y <= 176;
      if (outer || head || neck) pixels[(y * width + x) * 4 + 3] = 0;
    }
  const opening = analyzeOpening(pixels, width, height);
  expect(opening.minX).toBe(92);
  expect(opening.maxX).toBe(164);
  expect(opening.minY).toBe(65);
  expect(opening.maxY).toBe(176);
  expect(opening.mask[111 * width + 128]).toBe(1);
  expect(opening.mask[170 * width + 128]).toBe(1);
  expect(opening.mask[0]).toBe(0);
});

it("keeps every calibrated feature inside a real transparent opening", async () => {
  expect(avatarTemplates).toHaveLength(50);
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/avatar-templates/v2/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  expect(
    new Set(manifest.templates.map((template) => template.sourceSha256)).size,
  ).toBe(50);
  for (const template of avatarTemplates) {
    const file = path.resolve("public", template.overlay.slice(1));
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([512, 512, 4]);
    for (const corner of [0, 511, 511 * 512, 512 * 512 - 1]) {
      expect(
        data[corner * 4 + 3],
        `${template.id} transparent outer corner`,
      ).toBeLessThan(32);
    }
    const opening = analyzeOpening(data, info.width, info.height);
    expect(opening.area).toBeGreaterThan(1500);
    for (const point of Object.values(template.anchors)) {
      const x = Math.round(point[0] * 2);
      const y = Math.round(point[1] * 2);
      expect(
        opening.mask[y * info.width + x],
        `${template.id} feature ${point}`,
      ).toBe(1);
      expect(data[(y * info.width + x) * 4 + 3]).toBeLessThan(40);
    }
    expect(template.faceBounds.height).toBeLessThanOrEqual(
      template.openingBounds.height,
    );
    expect(template.collarY).toBeGreaterThan(template.anchors.mouthCenter[1]);
  }
}, 30000);

it("covers the head opening when uniformly aligning the oval face fixture by its eyes", async () => {
  const source = {
    width: 100,
    height: 140,
    landmarks: {
      detected: true,
      imageLeftEye: [28, 56],
      imageRightEye: [72, 56],
    },
  };
  for (const template of avatarTemplates) {
    const { data, info } = await sharp(
      path.resolve("public", template.overlay.slice(1)),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const opening = analyzeOpening(data, info.width, info.height);
    const {
      transform: [a, b, c, d, e, f],
    } = portraitScenePlacement(source, template);
    const determinant = a * d - b * c;
    let total = 0,
      covered = 0;
    for (
      let y = Math.ceil(template.faceBounds.y * 2);
      y < (template.faceBounds.y + template.faceBounds.height) * 2;
      y++
    ) {
      for (let x = opening.minX; x <= opening.maxX; x++) {
        if (!opening.mask[y * info.width + x]) continue;
        const dx = x / 2 - e,
          dy = y / 2 - f;
        const sourceX = (d * dx - c * dy) / determinant;
        const sourceY = (-b * dx + a * dy) / determinant;
        total++;
        if (((sourceX - 50) / 50) ** 2 + ((sourceY - 70) / 70) ** 2 <= 1)
          covered++;
      }
    }
    expect(
      covered / total,
      `${template.id} oval face coverage`,
    ).toBeGreaterThan(0.94);
  }
}, 30000);
