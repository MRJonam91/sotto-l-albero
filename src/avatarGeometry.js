// All renderers and pointer movement use the same 256px scene coordinate system.
export const avatarOffsetUnit = 0.27;

export function portraitOffsetLimits(image, face, settings, isolated = false) {
  if (!image || isolated) return { x: 100, y: 100 };
  const placement = portraitPlacement(image, face, settings, false);
  return {
    x: Math.max(
      100,
      Math.ceil((placement.width / 2 - face[2]) / avatarOffsetUnit),
    ),
    y: Math.max(
      100,
      Math.ceil((placement.height / 2 - face[3]) / avatarOffsetUnit),
    ),
  };
}

export function portraitPlacement(
  image,
  [x, y, rx, ry],
  { zoom = 1, offsetX = 0, offsetY = 0 } = {},
  isolated = false,
) {
  const box = image.faceBox;
  const hasFace =
    box &&
    [box.w, box.h, box.cx, box.cy].every(Number.isFinite) &&
    box.w > 0 &&
    box.h > 0;
  const face = hasFace
    ? box
    : {
        w: image.width,
        h: image.height,
        cx: image.width / 2,
        cy: image.height / 2,
      };
  const fit =
    isolated || hasFace
      ? Math.min((rx * 1.92) / face.w, (ry * 1.92) / face.h)
      : Math.max((rx * 2) / image.width, (ry * 2) / image.height);
  const scale = fit * zoom;
  return {
    x: x - face.cx * scale + offsetX * avatarOffsetUnit,
    y: y - face.cy * scale + offsetY * avatarOffsetUnit,
    width: image.width * scale,
    height: image.height * scale,
    scale,
  };
}

const validPoint = (point) =>
  Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
const validEyes = (anchors) =>
  anchors &&
  validPoint(anchors.imageLeftEye) &&
  validPoint(anchors.imageRightEye) &&
  Math.hypot(
    anchors.imageRightEye[0] - anchors.imageLeftEye[0],
    anchors.imageRightEye[1] - anchors.imageLeftEye[1],
  ) > 1;

export function mapFaceLandmarks(
  landmarks,
  { scaleX = 1, scaleY = scaleX, offsetX = 0, offsetY = 0 },
  coordinateSpace,
) {
  if (!landmarks?.detected) return undefined;
  const map = ([x, y]) => [x * scaleX + offsetX, y * scaleY + offsetY];
  const result = { ...landmarks, coordinateSpace };
  for (const key of [
    "imageLeftEye",
    "imageRightEye",
    "noseTip",
    "mouthCenter",
    "chin",
  ])
    if (validPoint(landmarks[key])) result[key] = map(landmarks[key]);
  if (landmarks.faceOval)
    result.faceOval = landmarks.faceOval.filter(validPoint).map(map);
  return result;
}

export function transformPortraitPoint(placement, [x, y]) {
  const [a, b, c, d, e, f] = placement.transform ?? [
    placement.scale,
    0,
    0,
    placement.scale,
    placement.x,
    placement.y,
  ];
  return [a * x + c * y + e, b * x + d * y + f];
}

export function portraitScenePlacement(
  image,
  scene,
  settings = {},
  isolated = false,
) {
  const { zoom = 1, offsetX = 0, offsetY = 0, rotation = 0 } = settings;
  const source = image.landmarks;
  const target = scene.anchors;
  let scale,
    angle = 0,
    sourceCentre,
    targetCentre,
    alignment;
  if (source?.detected && validEyes(source) && validEyes(target)) {
    const from = [
      source.imageRightEye[0] - source.imageLeftEye[0],
      source.imageRightEye[1] - source.imageLeftEye[1],
    ];
    const to = [
      target.imageRightEye[0] - target.imageLeftEye[0],
      target.imageRightEye[1] - target.imageLeftEye[1],
    ];
    scale = (Math.hypot(...to) / Math.hypot(...from)) * zoom;
    angle = Math.atan2(to[1], to[0]) - Math.atan2(from[1], from[0]);
    sourceCentre = [
      (source.imageLeftEye[0] + source.imageRightEye[0]) / 2,
      (source.imageLeftEye[1] + source.imageRightEye[1]) / 2,
    ];
    targetCentre = [
      (target.imageLeftEye[0] + target.imageRightEye[0]) / 2,
      (target.imageLeftEye[1] + target.imageRightEye[1]) / 2,
    ];
    alignment = "eyes";
  } else {
    const legacy = portraitPlacement(image, scene.face, settings, isolated);
    const box = image.faceBox;
    scale = legacy.scale;
    sourceCentre = [box?.cx ?? image.width / 2, box?.cy ?? image.height / 2];
    targetCentre = scene.face.slice(0, 2);
    if (scene.overlay && box && box.w > 0 && box.h > 0) {
      // Cover the annotated facial opening uniformly; the foreground handles
      // occlusion at hat and collar. This never stretches width independently.
      scale =
        Math.max((scene.face[2] * 2) / box.w, (scene.face[3] * 2) / box.h) *
        zoom;
    }
    alignment = "box";
  }
  angle += (Math.max(-30, Math.min(30, Number(rotation) || 0)) * Math.PI) / 180;
  const a = scale * Math.cos(angle),
    b = scale * Math.sin(angle),
    c = -b,
    d = a;
  const e =
    targetCentre[0] +
    offsetX * avatarOffsetUnit -
    a * sourceCentre[0] -
    c * sourceCentre[1];
  const f =
    targetCentre[1] +
    offsetY * avatarOffsetUnit -
    b * sourceCentre[0] -
    d * sourceCentre[1];
  return {
    x: e,
    y: f,
    width: image.width * scale,
    height: image.height * scale,
    scale,
    rotation: angle,
    alignment,
    transform: [a, b, c, d, e, f],
  };
}
