import { afterEach, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({ detect: vi.fn(), create: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { isSimdSupported: async () => false },
  FaceLandmarker: {
    createFromOptions: fixtures.create,
    FACE_LANDMARKS_LEFT_EYE: [{ start: 263, end: 362 }],
    FACE_LANDMARKS_RIGHT_EYE: [{ start: 33, end: 133 }],
    FACE_LANDMARKS_FACE_OVAL: [
      { start: 10, end: 152 },
      { start: 234, end: 454 },
    ],
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

function result() {
  const mesh = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  mesh[33] = { x: 0.3, y: 0.4 };
  mesh[133] = { x: 0.4, y: 0.4 };
  mesh[263] = { x: 0.7, y: 0.4 };
  mesh[362] = { x: 0.6, y: 0.4 };
  mesh[1] = { x: 0.52, y: 0.55 };
  mesh[13] = { x: 0.5, y: 0.68 };
  mesh[14] = { x: 0.5, y: 0.7 };
  mesh[152] = { x: 0.5, y: 0.85 };
  mesh[10] = { x: 0.5, y: 0.18 };
  mesh[234] = { x: 0.24, y: 0.5 };
  mesh[454] = { x: 0.76, y: 0.5 };
  const yaw = (10 * Math.PI) / 180;
  return {
    faceLandmarks: [mesh],
    facialTransformationMatrixes: [
      {
        rows: 4,
        columns: 4,
        data: [
          Math.cos(yaw),
          0,
          -Math.sin(yaw),
          0,
          0,
          1,
          0,
          0,
          Math.sin(yaw),
          0,
          Math.cos(yaw),
          0,
          0,
          0,
          -50,
          1,
        ],
      },
    ],
  };
}

it("detects true eye anchors once per photo and returns unmirrored source pixel coordinates", async () => {
  fixtures.create.mockResolvedValue({ detect: fixtures.detect });
  fixtures.detect.mockReturnValue(result());
  const { detectAvatarFace } = await import("../src/avatarFaceLandmarks.js");
  const image = { width: 1000, height: 800 };
  const [first, second] = await Promise.all([
    detectAvatarFace(image),
    detectAvatarFace(image),
  ]);
  expect(fixtures.detect).toHaveBeenCalledTimes(1);
  expect(first).toBe(second);
  expect(first.landmarks).toMatchObject({
    detected: true,
    coordinateSpace: "source-pixels",
  });
  for (const [key, point] of Object.entries({
    imageLeftEye: [350, 320],
    imageRightEye: [650, 320],
    noseTip: [520, 440],
    mouthCenter: [500, 552],
    chin: [500, 680],
  })) {
    expect(first.landmarks[key][0]).toBeCloseTo(point[0]);
    expect(first.landmarks[key][1]).toBeCloseTo(point[1]);
  }
  expect(first.pose.yaw).toBeCloseTo(10);
  expect(first.pose.roll).toBe(0);
  expect(fixtures.create.mock.calls[0][1]).toMatchObject({
    runningMode: "IMAGE",
    numFaces: 2,
    baseOptions: {
      modelAssetPath: "/avatar-models/face_landmarker.task",
      delegate: "CPU",
    },
  });
});

it("rejects multiple detected faces and does not invent eyes when the model is unavailable", async () => {
  fixtures.create.mockResolvedValue({ detect: fixtures.detect });
  const { detectAvatarFace } = await import("../src/avatarFaceLandmarks.js");
  const face = result();
  face.faceLandmarks.push(face.faceLandmarks[0]);
  fixtures.detect.mockReturnValue(face);
  expect(await detectAvatarFace({ width: 1000, height: 800 })).toEqual({
    multipleFaces: true,
  });
  fixtures.detect.mockImplementation(() => {
    throw new Error("Unavailable CPU delegate");
  });
  expect(await detectAvatarFace({ width: 1000, height: 800 })).toBeNull();
});
