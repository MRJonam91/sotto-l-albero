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
