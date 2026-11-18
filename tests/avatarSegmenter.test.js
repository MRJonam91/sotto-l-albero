import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { faceMask } from "../src/avatarFaceMask.js";

const faceAnalysis = vi.hoisted(() => ({ detect: vi.fn() }));
const hairFixture = vi.hoisted(() => ({ alpha: null, headAlpha: null }));
vi.mock("../src/avatarFaceLandmarks.js", () => ({
  detectAvatarFace: faceAnalysis.detect,
}));
beforeEach(() => {
  faceAnalysis.detect.mockResolvedValue(null);
  hairFixture.alpha = null;
  hairFixture.headAlpha = null;
});

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { isSimdSupported: async () => false },
  ImageSegmenter: {
    createFromOptions: async () => ({
      segment: (_, callback) =>
        callback({
          categoryMask: {
            width: 100,
            height: 100,
            getAsUint8Array: () => new Uint8Array(10000),
          },
        }),
    }),
  },
}));
vi.mock("../src/avatarFaceMask.js", () => ({
  faceMask: vi.fn(() => ({
    bounds: { x: 20, y: 10, width: 60, height: 80 },
    faceBounds: { x: 40, y: 20, width: 20, height: 40 },
    alpha: new Uint8Array(10000),
    hairAlpha: hairFixture.alpha,
    headCapAlpha: hairFixture.headAlpha,
    landmarks: { eyeLineY: 30 },
  })),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("returns face geometry in cutout pixels without mislabelling estimated eyes as detected landmarks", async () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        putImageData() {},
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      }),
    }),
  });
  const { isolateAvatarFace } = await import("../src/avatarSegmenter.js");
  const result = await isolateAvatarFace({ width: 1000, height: 800 });
  expect(result.faceBox).toMatchObject({
    w: 200,
    h: 320,
    cx: 300,
    cy: 240,
    topY: 80,
    chinY: 400,
  });
  expect(result.landmarks).toBeUndefined();
  expect(result.faceBounds).toBeUndefined();
});

it("converts real source anchors into the cropped canvas and retains pose without guessed features", async () => {
  hairFixture.headAlpha = new Uint8Array(10000);
  hairFixture.headAlpha[20 * 100 + 50] = 255;
  faceAnalysis.detect.mockResolvedValue({
    landmarks: {
      detected: true,
      coordinateSpace: "source-pixels",
      imageLeftEye: [350, 320],
      imageRightEye: [650, 320],
      noseTip: [520, 440],
      mouthCenter: [500, 552],
      chin: [500, 680],
    },
    pose: { yaw: 10, pitch: 0, roll: 0 },
  });
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        putImageData() {},
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      }),
    }),
  });
  const { isolateAvatarFace } = await import("../src/avatarSegmenter.js");
  const image = { width: 1000, height: 800 };
  const result = await isolateAvatarFace(image);
  expect(faceMask.mock.lastCall[3].headCapLine).toBeCloseTo(41.5); // detected y320/800 in the 100px mask + overlap
  expect(result.headCapMask.width).toBe(result.width);
  expect(result.headCapMask.height).toBe(result.height);
  expect(result.landmarks).toMatchObject({
    detected: true,
    coordinateSpace: "cutout-pixels",
    imageLeftEye: [150, 240],
    imageRightEye: [450, 240],
  });
  expect(result.pose).toEqual({ yaw: 10, pitch: 0, roll: 0 });
  // An async analysis may finish after manual framing has cancelled it. Never
  // mutate the original object still being edited, or it would silently recenter.
  expect(image.landmarks).toBeUndefined();
  expect(image.pose).toBeUndefined();
});

it("refuses an automatic cutout when the real detector finds multiple people", async () => {
  faceAnalysis.detect.mockResolvedValue({ multipleFaces: true });
  vi.stubGlobal("document", {
    createElement: () => ({ getContext: () => ({ drawImage() {} }) }),
  });
  const { isolateAvatarFace } = await import("../src/avatarSegmenter.js");
  expect(await isolateAvatarFace({ width: 1000, height: 800 })).toBeNull();
});

it("retains a separate alpha-only hair mask in exactly the same cropped coordinates", async () => {
  hairFixture.alpha = new Uint8Array(10000);
  hairFixture.alpha[10 * 100 + 40] = 255;
  vi.stubGlobal("document", {
    createElement: () => {
      const context = {
        drawImage: vi.fn(),
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: vi.fn(),
      };
      return { getContext: () => context };
    },
  });
  const { isolateAvatarFace } = await import("../src/avatarSegmenter.js");
  const result = await isolateAvatarFace({ width: 1000, height: 800 });
  expect(result.hairMask.width).toBe(result.width);
  expect(result.hairMask.height).toBe(result.height);
  const croppedMask =
    result.hairMask.getContext("2d").drawImage.mock.calls[0][0];
  const pixels =
    croppedMask.getContext("2d").putImageData.mock.calls[0][0].data;
  expect(pixels[20 * 4 + 3]).toBe(255); // mask x40 maps to crop x20, y10 to crop y0
  expect(pixels[(20 * 60 + 20) * 4 + 3]).toBe(0); // surrounding skin/body is not hair
  expect(pixels[20 * 4]).toBe(0); // this is an alpha mask, not another photo copy
});
