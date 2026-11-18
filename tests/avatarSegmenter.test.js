import { afterEach, expect, it, vi } from "vitest";

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
  faceMask: () => ({
    bounds: { x: 20, y: 10, width: 60, height: 80 },
    faceBounds: { x: 40, y: 20, width: 20, height: 40 },
    alpha: new Uint8Array(10000),
    landmarks: { eyeLineY: 30 },
  }),
}));
afterEach(() => vi.unstubAllGlobals());

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
