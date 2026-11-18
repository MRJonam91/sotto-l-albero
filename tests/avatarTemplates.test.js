import { afterEach, expect, it, vi } from "vitest";

const classic = vi.hoisted(() =>
  vi.fn((canvas, image, settings, size) => {
    canvas.width = canvas.height = size;
  }),
);
vi.mock("../src/avatarCanvasClassic.js", () => ({
  avatarScenes: [{ id: "elf" }],
  drawAvatar: classic,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  classic.mockClear();
});

function setup() {
  const images = [];
  vi.stubGlobal(
    "Image",
    class {
      constructor() {
        images.push(this);
      }
    },
  );
  const ctx = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "getImageData"
          ? () => {
              throw new Error("No pixel readback in fixture");
            }
          : vi.fn(),
    },
  );
  return { images, canvas: { getContext: () => ctx } };
}

it("settles template preload after failed requests, including cached failures", async () => {
  const { images } = setup();
  const { preloadAvatarTemplates } = await import("../src/avatarCanvas.js");
  const first = preloadAvatarTemplates();
  images.forEach((image) => image.onerror());
  const timeout = () =>
    new Promise((resolve) => setTimeout(() => resolve("hung"), 50));
  expect(await Promise.race([first.then(() => "settled"), timeout()])).toBe(
    "settled",
  );
  expect(
    await Promise.race([
      preloadAvatarTemplates().then(() => "settled"),
      timeout(),
    ]),
  ).toBe("settled");
});

it("preserves requested fallback dimensions", async () => {
  const { canvas } = setup();
  const { drawAvatar } = await import("../src/avatarCanvas.js");
  for (const size of [72, 1024]) {
    drawAvatar(canvas, null, { style: "illustrated", scene: "elf" }, size);
    expect(canvas.width).toBe(size);
    expect(canvas.height).toBe(size);
  }
});

it("does not redraw an obsolete illustrated preview after switching to classic", async () => {
  const { canvas, images } = setup();
  const { drawAvatar } = await import("../src/avatarCanvas.js");
  drawAvatar(canvas, null, { style: "illustrated", scene: "elf" }, 72);
  drawAvatar(canvas, null, { style: "classic", scene: "elf" }, 90);
  images.forEach((image) => image.onload());
  expect(canvas.width).toBe(90);
  expect(canvas.height).toBe(90);
});
