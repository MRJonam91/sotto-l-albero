import { afterEach, expect, it, vi } from "vitest";

const filters = vi.hoisted(() => ({
  grade: vi.fn(),
  finish: vi.fn(),
}));
vi.mock("../src/avatarVintageFilter.js", () => ({
  applyVintagePortraitGrade: filters.grade,
  applyAntiqueMedallionFinish: filters.finish,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

function canvas() {
  const operations = new Map();
  const ctx = new Proxy(
    {},
    {
      get: (_, key) => {
        if (!operations.has(key))
          operations.set(
            key,
            vi.fn(() =>
              key === "getImageData"
                ? { data: new Uint8ClampedArray(16) }
                : undefined,
            ),
          );
        return operations.get(key);
      },
    },
  );
  return { width: 256, height: 256, getContext: () => ctx, ctx };
}

it("reuses the graded photo for adjustments, miniature and high resolution export", async () => {
  const images = [];
  vi.stubGlobal(
    "Image",
    class {
      constructor() {
        images.push(this);
      }
    },
  );
  vi.stubGlobal("document", { createElement: () => canvas() });
  const { drawAvatar, preloadAvatarTemplates } =
    await import("../src/avatarCanvas.js");
  const loading = preloadAvatarTemplates();
  images.forEach((image) => image.onload());
  await loading;
  const source = {
    width: 400,
    height: 600,
    faceBox: { cx: 100, cy: 150, w: 80, h: 120 },
  };
  const portrait = { source, isolated: true };
  for (const size of [256, 72, 1024]) {
    drawAvatar(
      canvas(),
      portrait,
      { scene: "elf", zoom: 1, offsetX: size / 100 },
      size,
    );
  }
  expect(filters.grade).toHaveBeenCalledTimes(1);
  drawAvatar(canvas(), portrait, { scene: "santa", zoom: 1 });
  expect(filters.grade).toHaveBeenCalledTimes(2);
  drawAvatar(
    canvas(),
    { source: { ...source }, isolated: true },
    { scene: "elf", zoom: 1 },
  );
  expect(filters.grade).toHaveBeenCalledTimes(3);
});

it("places the snow globe face above the opaque lower foreground", async () => {
  const { avatarScenes } = await import("../src/avatarCanvas.js");
  const [, y, , ry] = avatarScenes.find(
    (scene) => scene.id === "snowglobe",
  ).face;
  expect(y + ry).toBeLessThanOrEqual(155);
  expect(y - ry).toBeGreaterThanOrEqual(52);
});
