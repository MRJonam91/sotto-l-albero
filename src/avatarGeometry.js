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
  const hasFace = validBox(box);
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
const validBox = (box) =>
  box &&
  [box.w, box.h, box.cx, box.cy].every(Number.isFinite) &&
  box.w > 0 &&
  box.h > 0;
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

function measuredFaceOpening(scene) {
  const bounds = scene.faceBounds;
  if (
    !bounds ||
    ![bounds.y, bounds.width, bounds.height, scene.collarY].every(
      Number.isFinite,
    ) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  )
    return null;
  // The measured face ends where the painted sides narrow to 65% of their
  // widest span. A rounded chin continues below this cheek/neck join.
  const jaw = bounds.y + bounds.height;
  const chinRoom = Math.max(
    0,
    Math.min(bounds.height * 0.14, (scene.collarY - jaw) / 2),
  );
  return {
    width: bounds.width,
    height: bounds.height + chinRoom,
    top: bounds.y,
  };
}

function outlineScale(opening, width, height) {
  const heightScale = opening.height / height;
  const widthScale = opening.width / width;
  // Balance the two measured spans without changing the subject's aspect ratio.
  // The upper bound keeps a particularly long face clear of the collar.
  return Math.min(Math.sqrt(widthScale * heightScale), heightScale * 1.06);
}

// Ratios are relative to the measured face opening of each illustrated variant.
// Keep the sleigh's close-fitting hood and scarf at the reference proportions.
const illustratedFaceScales = {
  elf: { medium: 0.94, intenseMin: 0.89 },
  santa: { medium: 0.94, intenseMin: 0.91 },
  sleigh: { medium: 0.96, intenseMin: 0.82 },
  cozy: { medium: 0.93, intenseMin: 0.89 },
  nutcracker: { medium: 0.96, intenseMin: 0.92 },
  victorian: { medium: 0.94, intenseMin: 0.88 },
  reindeer: { medium: 0.95, intenseMin: 0.88 },
  chimney: { medium: 0.94, intenseMin: 0.91 },
  ornament: { medium: 0.92, intenseMin: 0.88 },
  snowglobe: { medium: 0.93, intenseMin: 0.90 },
};

function fitFaceOutline(source, opening, eyeCentre, roll, scene, targetCentre, framingStrength) {
  const oval = source.faceOval;
  if (
    !opening ||
    !validPoint(source.chin) ||
    !Array.isArray(oval) ||
    oval.length < 12 ||
    !oval.every(validPoint)
  )
    return null;
  // Measure the photographed head in the same orientation as the artwork.
  const cos = Math.cos(roll),
    sin = Math.sin(roll);
  const rotate = ([x, y]) => [
    cos * (x - eyeCentre[0]) - sin * (y - eyeCentre[1]),
    sin * (x - eyeCentre[0]) + cos * (y - eyeCentre[1]),
  ];
  const outline = oval.map(rotate);
  const xs = outline.map(([x]) => x);
  const width = Math.max(...xs) - Math.min(...xs);
  const forehead = Math.min(...outline.map(([, y]) => y));
  const [chinX, chin] = rotate(source.chin);
  if (!(width > 1 && forehead < 0 && chin > 0)) return null;

  const silhouetteScale = outlineScale(opening, width, chin - forehead);
  const scales = illustratedFaceScales[scene.sceneId];
  const { anchors, collarY } = scene;
  const targetSpan = validPoint(anchors.chin) ? anchors.chin[1] - targetCentre[1] : 0;
  const mediumFraming = scales && framingStrength <= 0.75;
  if (mediumFraming || targetSpan <= 0) {
    const scale = silhouetteScale * (mediumFraming ? scales.medium : 1);
    const eyeY = opening.top + (opening.height - (chin + forehead) * scale) / 2;
    return { scale, centre: [targetCentre[0], eyeY] };
  }
  // Respect the eye-to-jaw span of the painted character while keeping the
  // photographed head proportional. The cutout can have a taller neck opening.
  const scale = Math.min(
    silhouetteScale,
    Math.max(
      silhouetteScale * (framingStrength === undefined ? 0.82 : (scales?.intenseMin ?? 0.82)),
      (targetSpan * 1.04) / chin,
    ),
  );
  const eyeY = targetCentre[1] + (targetSpan - chin * scale) * 0.46;
  const neckRoom = collarY - (eyeY + chin * scale);
  const collarOffset = Math.max(0, Math.min(4, (neckRoom - 24) * 0.22));
  const minY = opening.top - 4 - forehead * scale;
  const maxY = opening.top + opening.height - chin * scale;
  const chinDrift = anchors.chin[0] - (targetCentre[0] + chinX * scale);
  const eyeX = targetCentre[0] + Math.max(-3, Math.min(3, chinDrift * 0.3));
  return {
    scale,
    centre: [eyeX, Math.max(minY, Math.min(maxY, eyeY + collarOffset))],
  };
}

function keepFeaturesVisible(source, origin, centre, scale, angle, clear, collarY) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const features = [
    { point: source.imageLeftEye, margin: 2 },
    { point: source.imageRightEye, margin: 2 },
  ];
  if (validPoint(source.chin)) features.push({ point: source.chin, margin: 0 });
  const offsets = features.map(({ point: [x, y], margin }) => {
    x -= origin[0];
    y -= origin[1];
    return { x: x * cos - y * sin, y: x * sin + y * cos, margin };
  });
  const fits = (x, y, s) =>
    offsets.every(({ x: dx, y: dy, margin }) => {
      const point = [x + dx * s, y + dy * s];
      return (margin || point[1] < collarY - 2) && clear(point, margin);
    });
  if (fits(...centre, scale)) return { centre, scale };

  let best = { centre, scale, cost: Infinity };
  for (const ratio of [1, 0.96, 0.91, 0.85, 0.78, 0.7]) {
    const nextScale = scale * ratio;
    const sizeCost = ((1 - ratio) * 48) ** 2;
    for (let dy = -22; dy <= 22; dy += 2) {
      for (let dx = -14; dx <= 14; dx += 2) {
        const cost = sizeCost + dx ** 2 + dy ** 2;
        if (cost >= best.cost) continue;
        const x = centre[0] + dx;
        const y = centre[1] + dy;
        if (fits(x, y, nextScale)) best = { centre: [x, y], scale: nextScale, cost };
      }
    }
  }
  return best;
}

export function portraitScenePlacement(
  image,
  scene,
  settings = {},
  isolated = false,
  clear,
) {
  const { zoom = 1, offsetX = 0, offsetY = 0, rotation = 0 } = settings;
  const source = image.landmarks;
  const target = scene.anchors;
  const opening = measuredFaceOpening(scene);
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
    scale = Math.hypot(...to) / Math.hypot(...from);
    angle = Math.atan2(to[1], to[0]) - Math.atan2(from[1], from[0]);
    sourceCentre = [
      (source.imageLeftEye[0] + source.imageRightEye[0]) / 2,
      (source.imageLeftEye[1] + source.imageRightEye[1]) / 2,
    ];
    targetCentre = [
      (target.imageLeftEye[0] + target.imageRightEye[0]) / 2,
      (target.imageLeftEye[1] + target.imageRightEye[1]) / 2,
    ];
    const outline = fitFaceOutline(
      source,
      opening,
      sourceCentre,
      angle,
      scene,
      targetCentre,
      settings.framingPaintStrength ?? settings.paintStrength,
    );
    if (outline) {
      scale = outline.scale;
      targetCentre = outline.centre;
    }
    if (clear) {
      const fitted = keepFeaturesVisible(
        source, sourceCentre, targetCentre, scale, angle, clear, scene.collarY,
      );
      scale = fitted.scale;
      targetCentre = fitted.centre;
    }
    scale *= zoom;
    alignment = "eyes";
  } else {
    const legacy = portraitPlacement(image, scene.face, settings, isolated);
    const box = validBox(image.faceBox) ? image.faceBox : null;
    scale = legacy.scale;
    sourceCentre = [box?.cx ?? image.width / 2, box?.cy ?? image.height / 2];
    targetCentre = scene.face.slice(0, 2);
    if (opening && box) {
      scale = outlineScale(opening, box.w, box.h) * zoom;
      targetCentre[1] = opening.top + opening.height / 2;
    } else if (scene.overlay && box) {
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
