import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const analysisCache = new WeakMap();
let landmarker;
const simdFileset = {
  wasmLoaderPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js",
    import.meta.url,
  ).href,
  wasmBinaryPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm",
    import.meta.url,
  ).href,
};
const scalarFileset = {
  wasmLoaderPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js",
    import.meta.url,
  ).href,
  wasmBinaryPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm",
    import.meta.url,
  ).href,
};

async function getLandmarker() {
  landmarker ??= (async () => {
    const simd = await FilesetResolver.isSimdSupported();
    return FaceLandmarker.createFromOptions(
      simd ? simdFileset : scalarFileset,
      {
        baseOptions: {
          modelAssetPath: "/avatar-models/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numFaces: 2,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      },
    );
  })().catch((failure) => {
    landmarker = undefined;
    throw failure;
  });
  return landmarker;
}

const degrees = (angle) => (angle * 180) / Math.PI;
const finitePoint = (point) =>
  point && Number.isFinite(point.x) && Number.isFinite(point.y);

function centreOf(mesh, connections, width, height) {
  const indices = [
    ...new Set(connections.flatMap(({ start, end }) => [start, end])),
  ];
  const points = indices.map((index) => mesh[index]).filter(finitePoint);
  if (points.length !== indices.length || !points.length) return null;
  return [
    (points.reduce((sum, point) => sum + point.x, 0) * width) / points.length,
    (points.reduce((sum, point) => sum + point.y, 0) * height) / points.length,
  ];
}

function poseFromMatrix(matrix, roll) {
  const data = matrix?.data;
  if (!data || data.length !== 16 || !data.every(Number.isFinite))
    return { roll };
  // MatrixData's packed storage is column-major. Accept an explicitly row-major
  // affine fixture too; translation distinguishes the two layouts unambiguously.
  const rowMajor =
    Math.abs(data[12]) + Math.abs(data[13]) + Math.abs(data[14]) < 1e-6 &&
    Math.abs(data[3]) + Math.abs(data[7]) + Math.abs(data[11]) > 1e-6;
  const at = (row, column) =>
    data[rowMajor ? row * 4 + column : column * 4 + row];
  const length = Math.hypot(at(0, 2), at(1, 2), at(2, 2));
  if (length < 1e-6) return { roll };
  // +yaw points the face normal towards image-right; +pitch towards image-down.
  return {
    yaw: degrees(Math.atan2(at(0, 2), at(2, 2))),
    pitch: degrees(Math.atan2(-at(1, 2), Math.hypot(at(0, 2), at(2, 2)))),
    roll,
  };
}

async function analyse(image, analysisImage) {
  try {
    const model = await getLandmarker();
    const result = model.detect(analysisImage);
    if (result.faceLandmarks.length > 1) return { multipleFaces: true };
    const mesh = result.faceLandmarks[0];
    if (!mesh) return null;
    const { width, height } = image;
    const eyes = [
      centreOf(mesh, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, width, height),
      centreOf(mesh, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, width, height),
    ];
    if (eyes.some((eye) => !eye)) return null;
    eyes.sort((a, b) => a[0] - b[0]);
    const [imageLeftEye, imageRightEye] = eyes;
    if (
      Math.hypot(
        imageRightEye[0] - imageLeftEye[0],
        imageRightEye[1] - imageLeftEye[1],
      ) <
      width * 0.025
    )
      return null;
    const point = (index) =>
      finitePoint(mesh[index])
        ? [mesh[index].x * width, mesh[index].y * height]
        : null;
    const noseTip = point(1),
      chin = point(152),
      upperLip = point(13),
      lowerLip = point(14);
    if (!noseTip || !chin || !upperLip || !lowerLip) return null;
    const ovalIndices = [
      ...new Set(
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL.flatMap(({ start, end }) => [
          start,
          end,
        ]),
      ),
    ];
    const faceOval = ovalIndices.map(point).filter(Boolean);
    const roll = degrees(
      Math.atan2(
        imageRightEye[1] - imageLeftEye[1],
        imageRightEye[0] - imageLeftEye[0],
      ),
    );
    return {
      landmarks: {
        detected: true,
        coordinateSpace: "source-pixels",
        imageLeftEye,
        imageRightEye,
        noseTip,
        chin,
        mouthCenter: [
          (upperLip[0] + lowerLip[0]) / 2,
          (upperLip[1] + lowerLip[1]) / 2,
        ],
        faceOval,
      },
      pose: poseFromMatrix(result.facialTransformationMatrixes?.[0], roll),
    };
  } catch {
    // Missing model, unsupported delegate, or a failed detection leaves manual
    // framing and the independently available segmentation model operational.
    return null;
  }
}

export function detectAvatarFace(image, analysisImage = image) {
  let analysis = analysisCache.get(image);
  if (!analysis) {
    analysis = analyse(image, analysisImage);
    analysisCache.set(image, analysis);
  }
  return analysis;
}
