const apertureCache = new WeakMap();
const size = 256;
const contactRays = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function shadeContact(pixels, contact, column, row, at) {
  const reach = 7;
  let distance = reach + 1;
  let shadow = -1;
  let fromAbove = false;
  for (const [dx, dy] of contactRays) {
    for (let step = 1; step < distance; step++) {
      const x = column + dx * step;
      const y = row + dy * step;
      if (x < 0 || x >= size || y < 0 || y >= size) break;
      const edge = (y * size + x) * 4;
      if (pixels[edge + 3] < 235) continue;
      distance = step;
      shadow = edge;
      fromAbove = dy < 0;
      break;
    }
  }
  if (shadow < 0) return;
  const amount = (1 - (distance - 1) / reach) ** 1.7;
  for (let c = 0; c < 3; c++) contact[at + c] = pixels[shadow + c] * 0.59;
  contact[at + 3] = 255 * amount * (fromAbove ? 0.52 : 0.36);
}

// Use the central opening of the actual painting. The transparent corners have
// their own role and must never supply the colour behind the photographed head.
export function avatarAperture(overlay, { openingBounds, faceBounds }) {
  if (apertureCache.has(overlay)) return apertureCache.get(overlay);
  const underlay = document.createElement("canvas");
  underlay.width = underlay.height = size;
  const ctx = underlay.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(overlay, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  if (data.length !== size * size * 4) return null;

  const { x, y, width, height } = openingBounds;
  const top = Math.max(0, Math.floor(y));
  const bottom = Math.min(size, Math.ceil(y + height));
  const left = Math.max(0, Math.floor(x) - 1);
  const right = Math.min(size - 1, Math.ceil(x + width) + 1);
  const rows = new Array(size);
  const fill = ctx.createImageData(size, size);
  const glaze = ctx.createImageData(size, size);
  const ambient = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  let samples = 0;

  function edgePigment(column, row, outward) {
    const sum = [0, 0, 0];
    let count = 0;
    for (let offset = 2; offset <= 7; offset++) {
      const px = column + outward * offset;
      if (px < 0 || px >= size) continue;
      const at = (row * size + px) * 4;
      if (data[at + 3] < 220) continue;
      for (let c = 0; c < 3; c++) sum[c] += data[at + c];
      count++;
    }
    return count ? sum.map((channel) => channel / count) : [56, 39, 29];
  }

  for (let row = top; row < bottom; row++) {
    let start = left;
    let end = right;
    while (start <= end && data[(row * size + start) * 4 + 3] >= 180) start++;
    while (end >= start && data[(row * size + end) * 4 + 3] >= 180) end--;
    if (end < start) continue;
    rows[row] = [start, end];
    const a = edgePigment(start, row, -1);
    const b = edgePigment(end, row, 1);
    if (
      row >= faceBounds.y + faceBounds.height * 0.24 &&
      row <= faceBounds.y + faceBounds.height * 0.85
    ) {
      for (let c = 0; c < 3; c++) {
        ambient[0][c] += a[c];
        ambient[1][c] += b[c];
      }
      samples++;
    }
    for (
      let column = Math.max(0, start - 2);
      column <= Math.min(size - 1, end + 2);
      column++
    ) {
      const mix = Math.max(
        0,
        Math.min(1, (column - start) / Math.max(1, end - start)),
      );
      const shadow = 0.92 - 0.14 * (4 * mix * (1 - mix));
      const at = (row * size + column) * 4;
      for (let c = 0; c < 3; c++)
        fill.data[at + c] = (a[c] * (1 - mix) + b[c] * mix) * shadow;
      fill.data[at + 3] = 255;
      if (data[at + 3] < 180) shadeContact(data, glaze.data, column, row, at);
    }
  }
  ctx.putImageData(fill, 0, 0);
  const contact = document.createElement("canvas");
  contact.width = contact.height = size;
  contact.getContext("2d").putImageData(glaze, 0, 0);
  const collar = document.createElement("canvas");
  collar.width = size;
  collar.height = Math.max(0, Math.min(18, size - bottom - 1));
  if (collar.height) {
    const fabric = collar.getContext("2d");
    const scale = overlay.width / size;
    fabric.drawImage(
      overlay, 0, (bottom + 1) * scale, overlay.width, collar.height * scale,
      0, 0, size, collar.height,
    );
    fabric.globalCompositeOperation = "destination-in";
    const fade = fabric.createLinearGradient(0, 0, 0, collar.height);
    fade.addColorStop(0, "#0000");
    fade.addColorStop(0.30, "#000c");
    fade.addColorStop(1, "#000");
    fabric.fillStyle = fade;
    fabric.fillRect(0, 0, size, collar.height);
  }

  function clear([x, y], margin) {
    for (let dy = -margin; dy <= margin; dy++) {
      const row = Math.round(y) + dy;
      const span = rows[row];
      const column = Math.round(x);
      if (!span || column - margin < span[0] || column + margin > span[1])
        return false;
      for (let dx = -margin; dx <= margin; dx++)
        if (data[(row * size + column + dx) * 4 + 3] > 48) return false;
    }
    return true;
  }

  const aperture = {
    underlay,
    contact,
    collar,
    clear,
    ambient: samples
      ? ambient.map((side) => side.map((channel) => channel / samples))
      : undefined,
  };
  apertureCache.set(overlay, aperture);
  return aperture;
}
