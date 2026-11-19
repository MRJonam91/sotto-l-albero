import { afterEach, expect, it, vi } from "vitest";

const classic = vi.hoisted(() => vi.fn());
const grade = vi.hoisted(() => vi.fn());
vi.mock("../src/avatarCanvasClassic.js", () => ({
  avatarScenes: [{ id: "elf", face: [128, 120, 40, 50] }],
  drawAvatar: classic,
}));
vi.mock("../src/avatarVintageFilter.js", async (original) => ({
  ...(await original()),
  applyVintagePortraitGrade: grade,
}));
vi.mock("../src/avatarTemplateVariants.js", () => ({
  avatarVariantIds: ["front", "left", "right", "tilt-left", "tilt-right"],
  selectAvatarVariant: () => "front",
  getAvatarTemplate: (sceneId, variantId = "front") => ({
    id: `${sceneId}-${variantId}`,
    sceneId,
    variantId,
    overlay: `/avatar-templates/v2/${sceneId}-${variantId}.webp`,
    coordinateSize: 256,
    face: [128, 120, 40, 50],
    faceBounds: { x: 88, y: 70, width: 80, height: 100 },
    openingBounds: { x: 84, y: 65, width: 88, height: 125 },
    anchors: { imageLeftEye: [108, 110], imageRightEye: [148, 110] },
    lighting: { temperature: 0.2, direction: [-0.2, -0.3], strength: 0.2 },
    featherPx: 1.5,
    collarY: 190,
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
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
  const contexts = [];
  const createCanvas = () => {
    const functions = new Map();
    const ctx = new Proxy(
      {},
      {
        get: (_, key) => {
          if (!functions.has(key))
            functions.set(
              key,
              vi.fn(() =>
                key === "getImageData"
                  ? { data: new Uint8ClampedArray(64) }
                  : undefined,
              ),
            );
          return functions.get(key);
        },
      },
    );
    contexts.push(ctx);
    return {
      width: 300,
      height: 150,
      getContext: () => ctx,
      ctx,
      toDataURL: () => "data:image/png;base64,fixture",
    };
  };
  vi.stubGlobal("document", { createElement: () => createCanvas() });
  return { images, createCanvas, contexts };
}
const portrait = () => ({
  isolated: true,
  source: {
    width: 400,
    height: 600,
    faceBox: { cx: 170, cy: 260, w: 150, h: 210 },
    landmarks: {
      detected: true,
      imageLeftEye: [120, 210],
      imageRightEye: [210, 230],
    },
    pose: { yaw: 0, pitch: 0, roll: 12 },
  },
});

it("requests only the chosen genuine overlay and keeps the previous canvas intact while it loads", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const canvas = createCanvas();
  canvas.width = 90;
  canvas.height = 90;
  drawAvatar(
    canvas,
    portrait(),
    { scene: "elf", variant: "left", zoom: 1 },
    256,
  );
  expect(images.map((image) => image.src)).toEqual([
    "/avatar-templates/v2/elf-left.webp",
  ]);
  expect(canvas.width).toBe(90);
  expect(canvas.height).toBe(90);
  expect(classic).not.toHaveBeenCalled();
  const ready = preloadSelectedAvatarTemplate({
    scene: "elf",
    variant: "left",
  });
  images[0].onload();
  expect(await ready).toBe(true);
  expect(canvas.width).toBe(256);
});

it("reuses graded geometry across preview/export, and applies the eye rotation without a silhouette shadow", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const ready = preloadSelectedAvatarTemplate({
    scene: "elf",
    variant: "front",
  });
  images[0].onload();
  await ready;
  const input = portrait();
  for (const size of [256, 72, 1024]) {
    const canvas = createCanvas();
    drawAvatar(
      canvas,
      input,
      { scene: "elf", variant: "front", zoom: 1, offsetX: 10 },
      size,
    );
    const matrix = canvas.ctx.transform.mock.calls[0];
    expect(matrix).toHaveLength(6);
    expect(matrix[1]).not.toBe(0);
    expect(canvas.ctx.shadowBlur).not.toBe(6);
  }
  expect(grade).toHaveBeenCalledTimes(1);
  expect(grade.mock.calls[0][3].landmarks.detected).toBe(true);
  const [, width, height, { faceBox }] = grade.mock.calls[0];
  expect(height).toBe(512);
  expect(faceBox.cx / width).toBeCloseTo(170 / 400, 5);
  expect(faceBox.cy / height).toBeCloseTo(260 / 600, 5);
});

it("never lets a delayed illustrated request replace a newly selected classic result", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar } = await import("../src/avatarCanvas.js");
  const canvas = createCanvas();
  drawAvatar(canvas, portrait(), { scene: "elf", variant: "front" });
  drawAvatar(canvas, portrait(), { style: "classic", scene: "elf" }, 90);
  images[0].onload();
  expect(classic).toHaveBeenCalledTimes(1);
});

it("uses the selected brush strength for both preview and export, caching each grade separately", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const base = { scene: "elf", variant: "front" };
  const ready = preloadSelectedAvatarTemplate(base);
  images[0].onload();
  await ready;
  const input = portrait();
  for (const paintStrength of [0.35, 1, 0.35]) {
    for (const size of [256, 1024])
      drawAvatar(createCanvas(), input, { ...base, paintStrength }, size);
  }
  expect(grade.mock.calls.map((call) => call[3].paintStrength)).toEqual([
    0.35, 1,
  ]);
});

it("leaves the previous preview untouched on a failed brush pass and can retry", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatarPreview, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const settings = { scene: "elf", variant: "front" };
  const loaded = preloadSelectedAvatarTemplate(settings);
  images[0].onload();
  await loaded;
  const canvas = createCanvas();
  const mini = createCanvas();
  const report = vi.fn();
  const input = portrait();
  drawAvatarPreview(canvas, input, settings, mini, report);
  expect(report).toHaveBeenLastCalledWith(true);
  const firstDrawCount = canvas.ctx.drawImage.mock.calls.length;
  const firstMiniCount = mini.ctx.drawImage.mock.calls.length;
  grade.mockImplementationOnce(() => { throw new Error("readback failure"); });
  drawAvatarPreview(canvas, input, { ...settings, paintStrength: 1 }, mini, report);
  expect(report).toHaveBeenLastCalledWith(false);
  expect(canvas.ctx.drawImage).toHaveBeenCalledTimes(firstDrawCount);
  expect(mini.ctx.drawImage).toHaveBeenCalledTimes(firstMiniCount);
  drawAvatarPreview(canvas, input, { ...settings, paintStrength: 1 }, mini, report);
  expect(report).toHaveBeenLastCalledWith(true);
  expect(canvas.ctx.drawImage).toHaveBeenCalledTimes(firstDrawCount + 1);
  expect(mini.ctx.drawImage).toHaveBeenCalledTimes(firstMiniCount + 1);
});

it("ignores the cancelled preview when a different variant finishes loading first", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatarPreview } = await import("../src/avatarCanvas.js");
  const canvas = createCanvas();
  const input = portrait();
  const report = vi.fn();
  const cancel = drawAvatarPreview(canvas, input, { scene: "elf", variant: "left" }, null, report);
  cancel();
  drawAvatarPreview(canvas, input, { scene: "elf", variant: "right" }, null, report);
  images[1].onload();
  images[0].onload();
  expect(report.mock.calls).toEqual([[true]]);
  expect(canvas.ctx.drawImage).toHaveBeenCalledTimes(1);
});

it("waits for the selected overlay before thumbnail encoding, without preloading other variants", async () => {
  const { images, createCanvas } = setup();
  const encoded = vi.fn();
  vi.stubGlobal(
    "FileReader",
    class {
      readAsDataURL() {
        this.result = "data:image/webp;base64,fixture";
        this.onload();
      }
    },
  );
  vi.stubGlobal("document", {
    createElement: () => ({
      ...createCanvas(),
      toBlob: (callback, type) => {
        encoded();
        callback({ type, size: 100 });
      },
    }),
  });
  const { makeAvatarThumbnail } = await import("../src/avatarCanvas.js");
  const result = makeAvatarThumbnail(portrait(), {
    scene: "santa",
    variant: "right",
  });
  expect(encoded).not.toHaveBeenCalled();
  expect(images.map((image) => image.src)).toEqual([
    "/avatar-templates/v2/santa-right.webp",
  ]);
  images[0].onload();
  expect(await result).toBe("data:image/webp;base64,fixture");
  expect(encoded).toHaveBeenCalledTimes(1);
});

it("bounds decoded paintings and per-photo grades while browsing many variants", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const input = portrait();
  const scenes = [
    "elf",
    "santa",
    "sleigh",
    "cozy",
    "nutcracker",
    "victorian",
    "reindeer",
    "chimney",
    "ornament",
    "snowglobe",
  ];
  const settings = [
    ...scenes.map((scene) => ({ scene, variant: "front" })),
    ...scenes.slice(0, 3).map((scene) => ({ scene, variant: "left" })),
  ];
  for (const current of settings) {
    const ready = preloadSelectedAvatarTemplate(current);
    images.at(-1).onload();
    await ready;
    drawAvatar(createCanvas(), input, current);
  }
  expect(grade).toHaveBeenCalledTimes(13);
  const retry = preloadSelectedAvatarTemplate(settings[0]);
  expect(images).toHaveLength(14); // the oldest decoded painting was released
  images.at(-1).onload();
  await retry;
  drawAvatar(createCanvas(), input, settings[0]);
  expect(grade).toHaveBeenCalledTimes(14); // oldest CPU grade was also released
});

it("restores only segmented hair above hatless glass artwork while hats retain their occlusion", async () => {
  const { images, createCanvas } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const input = portrait();
  input.source.hairMask = { width: 400, height: 600 };
  const ready = preloadSelectedAvatarTemplate({
    scene: "snowglobe",
    variant: "front",
  });
  images.at(-1).onload();
  await ready;
  const canvas = createCanvas();
  drawAvatar(canvas, input, { scene: "snowglobe", variant: "front", zoom: 1 });
  expect(canvas.ctx.drawImage).toHaveBeenCalledTimes(3);
  expect(canvas.ctx.drawImage.mock.calls[1][0]).toBe(images[0]); // complete painting first
  expect(canvas.ctx.drawImage.mock.calls[2][0]).not.toBe(input.source); // never repaint the full face/body over it
  expect(canvas.ctx.ellipse).toHaveBeenCalled(); // inside the glass, never outside the frame
  const guard = canvas.ctx.rect.mock.calls.at(-1);
  expect(guard[1] + guard[3]).toBeLessThanOrEqual(170); // bottom of face, above the collar

  for (const scene of ["cozy", "ornament"]) {
    const loaded = preloadSelectedAvatarTemplate({ scene, variant: "front" });
    images.at(-1).onload();
    await loaded;
    const hatless = createCanvas();
    drawAvatar(hatless, input, { scene, variant: "front", zoom: 1 });
    expect(hatless.ctx.drawImage, scene).toHaveBeenCalledTimes(3);
    expect(hatless.ctx.ellipse, scene).toHaveBeenCalled();
  }
  const hatReady = preloadSelectedAvatarTemplate({
    scene: "elf",
    variant: "front",
  });
  images.at(-1).onload();
  await hatReady;
  const hatCanvas = createCanvas();
  drawAvatar(hatCanvas, input, { scene: "elf", variant: "front", zoom: 1 });
  expect(hatCanvas.ctx.drawImage).toHaveBeenCalledTimes(2);
});

it("uses the continuous forehead-and-hair cap instead of leaving a sky band between separate layers", async () => {
  const { images, createCanvas, contexts } = setup();
  const { drawAvatar, preloadSelectedAvatarTemplate } =
    await import("../src/avatarCanvas.js");
  const input = portrait();
  input.source.hairMask = { width: 400, height: 600, id: "hair-only" };
  input.source.headCapMask = {
    width: 400,
    height: 600,
    id: "hair-and-real-forehead",
  };
  const ready = preloadSelectedAvatarTemplate({
    scene: "snowglobe",
    variant: "front",
  });
  images[0].onload();
  await ready;
  drawAvatar(createCanvas(), input, {
    scene: "snowglobe",
    variant: "front",
    zoom: 1,
    paintStrength: 1,
  });
  expect(grade).toHaveBeenCalledTimes(1);
  expect(grade.mock.calls[0][3].paintStrength).toBe(1);
  const allDraws = contexts.flatMap((context) => context.drawImage.mock.calls);
  expect(
    allDraws.filter((call) => call[0] === input.source.headCapMask),
  ).toHaveLength(1);
  expect(
    allDraws.filter((call) => call[0] === input.source.hairMask),
  ).toHaveLength(0);
});
