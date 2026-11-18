import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { faceMask } from "./avatarFaceMask.js";
import { detectAvatarFace } from "./avatarFaceLandmarks.js";
import { mapFaceLandmarks } from "./avatarGeometry.js";

const simd = {
  wasmLoaderPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js",
    import.meta.url,
  ).href,
  wasmBinaryPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm",
    import.meta.url,
  ).href,
};
const scalar = {
  wasmLoaderPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js",
    import.meta.url,
  ).href,
  wasmBinaryPath: new URL(
    "../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm",
    import.meta.url,
  ).href,
};

let segmenter;
function getSegmenter() {
  segmenter ??= FilesetResolver.isSimdSupported()
    .then((supported) =>
      ImageSegmenter.createFromOptions(supported ? simd : scalar, {
        baseOptions: {
          modelAssetPath: "/avatar-models/selfie-multiclass-v1.tflite",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: true,
      }),
    )
    .catch((error) => {
      segmenter = undefined;
      throw error;
    });
  return segmenter;
}

function canvasAt(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function isolateAvatarFace(image, options = {}) {
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const source = canvasAt(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  source.getContext("2d").drawImage(image, 0, 0, source.width, source.height);
  const [model, analysis] = await Promise.all([
    getSegmenter().catch(() => null),
    detectAvatarFace(image, source),
  ]);
  if (analysis?.multipleFaces) return null;
  if (!model) return null;

  let result;
  model.segment(source, ({ categoryMask, confidenceMasks }) => {
    if (!categoryMask) return;
    const { width, height } = categoryMask;
    const categories = categoryMask.getAsUint8Array();
    // Keep the forehead continuous with the hair when compositing a hatless
    // opening. This boundary comes from detected eyes, never box fractions.
    const headCapLine = analysis?.landmarks?.detected
      ? (Math.max(
          analysis.landmarks.imageLeftEye[1],
          analysis.landmarks.imageRightEye[1],
        ) *
          height) /
          image.height +
        1.5
      : undefined;
    const face = faceMask(categories, width, height, {
      includeHair: options.includeHair ?? true,
      includeNeck: options.includeNeck ?? true,
      feather: true,
      headCapLine,
    });
    if (!face) return;
    const confidence = confidenceMasks?.map((mask) => mask.getAsFloat32Array());
    const { x, y, width: w, height: h } = face.bounds;
    const mask = canvasAt(w, h);
    const maskContext = mask.getContext("2d");
    const maskPixels = maskContext.createImageData(w, h);
    const hairMask = face.hairAlpha?.some(Boolean) ? canvasAt(w, h) : null;
    const hairContext = hairMask?.getContext("2d");
    const hairPixels = hairContext?.createImageData(w, h);
    const headCapMask = face.headCapAlpha?.some(Boolean)
      ? canvasAt(w, h)
      : null;
    const headCapContext = headCapMask?.getContext("2d");
    const headCapPixels = headCapContext?.createImageData(w, h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const at = (y + row) * width + x + col;
        const alpha = face.alpha[at];
        const probability = confidence?.[categories[at]]?.[at];
        maskPixels.data[(row * w + col) * 4 + 3] =
          alpha > 0 && alpha < 255 && Number.isFinite(probability)
            ? Math.min(alpha, Math.round(probability * 255))
            : alpha;
        if (hairPixels) {
          // Category 1 only: no skin, neck or costume may be redrawn above art.
          hairPixels.data[(row * w + col) * 4 + 3] = face.hairAlpha[at];
        }
        if (headCapPixels)
          headCapPixels.data[(row * w + col) * 4 + 3] = face.headCapAlpha[at];
      }
    }
    maskContext.putImageData(maskPixels, 0, 0);
    if (hairPixels) hairContext.putImageData(hairPixels, 0, 0);
    if (headCapPixels) headCapContext.putImageData(headCapPixels, 0, 0);

    const sx = image.width / width;
    const sy = image.height / height;
    const resolution = Math.min(1, 640 / Math.max(w * sx, h * sy));
    result = canvasAt(
      Math.max(1, Math.round(w * sx * resolution)),
      Math.max(1, Math.round(h * sy * resolution)),
    );
    const ctx = result.getContext("2d");
    ctx.drawImage(
      image,
      x * sx,
      y * sy,
      w * sx,
      h * sy,
      0,
      0,
      result.width,
      result.height,
    );
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0, result.width, result.height);
    if (hairMask) {
      result.hairMask = canvasAt(result.width, result.height);
      result.hairMask
        .getContext("2d")
        .drawImage(hairMask, 0, 0, result.width, result.height);
    }
    if (headCapMask) {
      result.headCapMask = canvasAt(result.width, result.height);
      result.headCapMask
        .getContext("2d")
        .drawImage(headCapMask, 0, 0, result.width, result.height);
    }
    // The category mask provides a facial bounding box, not detected eyes or lips.
    // Publish only geometry converted from mask pixels into this cutout's pixels.
    result.traits = face.traits;
    const fb = face.faceBounds || face.bounds;
    result.faceBox = {
      w: result.width * (fb.width / w),
      h: result.height * (fb.height / h),
      cx: result.width * ((fb.x + fb.width * 0.5 - x) / w),
      cy: result.height * ((fb.y + fb.height * 0.5 - y) / h),
      topY: result.height * ((fb.y - y) / h),
      chinY: result.height * ((fb.y + fb.height - y) / h),
    };
    if (analysis?.landmarks) {
      result.landmarks = mapFaceLandmarks(
        analysis.landmarks,
        {
          scaleX: result.width / (w * sx),
          scaleY: result.height / (h * sy),
          offsetX: (-x * sx * result.width) / (w * sx),
          offsetY: (-y * sy * result.height) / (h * sy),
        },
        "cutout-pixels",
      );
      result.pose = { ...analysis.pose };
    }
  });
  return result ?? null;
}
