import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { faceMask } from "./avatarFaceMask.js";

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
        outputConfidenceMasks: false,
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
  const model = await getSegmenter();
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const source = canvasAt(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  source.getContext("2d").drawImage(image, 0, 0, source.width, source.height);

  let result;
  model.segment(source, ({ categoryMask }) => {
    if (!categoryMask) return;
    const { width, height } = categoryMask;
    const face = faceMask(categoryMask.getAsUint8Array(), width, height, {
      includeHair: options.includeHair ?? true,
      includeNeck: options.includeNeck ?? true,
      feather: true,
    });
    if (!face) return;
    const { x, y, width: w, height: h } = face.bounds;
    const mask = canvasAt(w, h);
    const maskContext = mask.getContext("2d");
    const maskPixels = maskContext.createImageData(w, h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        maskPixels.data[(row * w + col) * 4 + 3] =
          face.alpha[(y + row) * width + x + col];
      }
    }
    maskContext.putImageData(maskPixels, 0, 0);

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
    ctx.filter = "blur(1.1px)";
    ctx.drawImage(mask, 0, 0, result.width, result.height);
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
  });
  return result ?? null;
}
