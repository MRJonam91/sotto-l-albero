// Local colour and texture treatment. No fixed target skin colour is used.
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function applyOilBrushwork(data, width, height, mix = 0.28) {
  if (mix <= 0 || width < 6 || height < 6) return data;
  const source = new Uint8ClampedArray(data);
  const quads = [
    [-1, -1, 0, 0],
    [0, -1, 1, 0],
    [-1, 0, 0, 1],
    [0, 0, 1, 1],
  ];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      if (source[index + 3] < 48) continue;
      let bestVariance = Infinity,
        best = null;
      for (const [x0, y0, x1, y1] of quads) {
        let r = 0,
          g = 0,
          b = 0,
          luminance = 0,
          square = 0,
          weight = 0;
        for (let dy = y0; dy <= y1; dy++)
          for (let dx = x0; dx <= x1; dx++) {
            const at = ((y + dy) * width + x + dx) * 4;
            if (source[at + 3] < 96) continue;
            const alpha = source[at + 3] / 255;
            const light =
              source[at] * 0.299 +
              source[at + 1] * 0.587 +
              source[at + 2] * 0.114;
            r += source[at] * alpha;
            g += source[at + 1] * alpha;
            b += source[at + 2] * alpha;
            luminance += light * alpha;
            square += light * light * alpha;
            weight += alpha;
          }
        if (!weight) continue;
        const variance = square / weight - (luminance / weight) ** 2;
        if (variance < bestVariance) {
          bestVariance = variance;
          best = [r / weight, g / weight, b / weight];
        }
      }
      if (best)
        for (let channel = 0; channel < 3; channel++)
          data[index + channel] = clampByte(
            source[index + channel] * (1 - mix) + best[channel] * mix,
          );
    }
  return data;
}

export function applyVintagePortraitGrade(data, width, height, options = {}) {
  const {
    strength = 0.78,
    painterly = true,
    smoothing = true,
    hatShadow = 0,
  } = options;
  const box = options.faceBox ?? {
    cx: width / 2,
    cy: height / 2,
    w: width * 0.6,
    h: height * 0.7,
  };
  const lighting = options.lighting ?? {
    temperature: 0.35,
    direction: [-0.2, -0.3],
    strength: 0.2,
  };
  const temperature = clamp(Number(lighting.temperature) || 0, -1, 1);
  const lightStrength = clamp(Number(lighting.strength) || 0, 0, 1);
  const direction = lighting.direction ?? [0, 0];
  const skinWeight = (x, y) => {
    const distance = Math.hypot(
      (x - box.cx) / Math.max(1, box.w * 0.42),
      (y - box.cy) / Math.max(1, box.h * 0.43),
    );
    return clamp((1 - distance) / 0.2, 0, 1);
  };
  let red = 0,
    green = 0,
    blue = 0,
    count = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 220 || skinWeight(x, y) < 0.9) continue;
      const lum =
        data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      if (lum < 24 || lum > 242) continue;
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      count++;
    }
  const meanR = count ? red / count : 0;
  const meanG = count ? green / count : 0;
  const meanB = count ? blue / count : 0;
  // Remove a bounded excess of cool illumination; do not brighten dark skin or
  // normalize everyone to a tan swatch. Hair and neck never enter these means.
  const cool = count
    ? Math.max(0, (meanB - meanR * 0.98) / Math.max(40, meanR))
    : 0;
  const gainR = 1 + Math.min(0.12, cool * 0.4);
  const gainB = 1 - Math.min(0.14, cool * 0.45);
  const meanLum = meanR * 0.299 + meanG * 0.587 + meanB * 0.114;
  if (painterly) applyOilBrushwork(data, width, height, 0.28);
  const source = new Uint8ClampedArray(data);
  const eyeY = options.landmarks?.detected
    ? (options.landmarks.imageLeftEye[1] + options.landmarks.imageRightEye[1]) /
      2
    : box.cy - box.h * 0.16;
  const top = box.topY ?? box.cy - box.h / 2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (!source[index + 3]) continue;
      let colour = [source[index], source[index + 1], source[index + 2]];
      if (smoothing && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const sum = colour.map((value) => value * 4);
        let weight = 4;
        for (const neighbour of [
          index - 4,
          index + 4,
          index - width * 4,
          index + width * 4,
        ]) {
          if (source[neighbour + 3] < 160) continue;
          const difference = colour.reduce(
            (value, channel, c) =>
              value + Math.abs(channel - source[neighbour + c]),
            0,
          );
          if (difference > 28) continue;
          for (let c = 0; c < 3; c++) sum[c] += source[neighbour + c];
          weight++;
        }
        colour = sum.map((value) => value / weight);
      }
      const skin = skinWeight(x, y);
      const rx = (x - box.cx) / Math.max(1, box.w / 2),
        ry = (y - box.cy) / Math.max(1, box.h / 2);
      const directional =
        clamp(-(rx * direction[0] + ry * direction[1]), -1, 1) *
        lightStrength *
        0.055;
      const contact =
        y >= top - 2 && y < eyeY
          ? clamp((eyeY - y) / Math.max(1, eyeY - top), 0, 1) *
            Math.min(0.12, hatShadow * 0.35)
          : 0;
      for (let c = 0; c < 3; c++) {
        const balance = c === 0 ? gainR : c === 2 ? gainB : 1;
        const warm =
          c === 0
            ? 1 + temperature * 0.12
            : c === 2
              ? 1 - temperature * 0.12
              : 1;
        const texture = meanLum + (colour[c] - meanLum) * 0.98;
        const processed =
          texture *
          (1 + (balance - 1) * skin) *
          warm *
          (1 + directional - contact);
        data[index + c] = clampByte(
          colour[c] * (1 - strength) + processed * strength,
        );
      }
    }
  return data;
}

// Colour-aware dilation repairs only a narrow matte seam. The four-pixel cap
// deliberately cannot invent skin across a poorly fitted or missing face.
export function extendPortraitEdges(data, width, height, radius = 2) {
  const steps = clamp(Math.round(radius), 0, 4);
  for (let step = 0; step < steps; step++) {
    const source = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4;
        if (source[index + 3] > 0) continue;
        let sum = [0, 0, 0],
          weight = 0,
          alpha = 0;
        for (const at of [
          index - 4,
          index + 4,
          index - width * 4,
          index + width * 4,
        ]) {
          const a = source[at + 3];
          if (a < 32) continue;
          for (let c = 0; c < 3; c++) sum[c] += source[at + c] * a;
          weight += a;
          alpha = Math.max(alpha, a);
        }
        if (!weight) continue;
        for (let c = 0; c < 3; c++)
          data[index + c] = clampByte(sum[c] / weight);
        data[index + 3] = Math.round(alpha * 0.82);
      }
  }
  return data;
}

export function applyAntiqueMedallionFinish(
  data,
  width,
  height,
  intensity = 5,
) {
  const cx = width * 0.5;
  const cy = height * 0.5;
  const radius = Math.min(cx, cy);

  for (let y = 0; y < height; y++) {
    const dy = (y - cy) / radius;
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / radius;
      const r2 = dx * dx + dy * dy;
      const idx = (y * width + x) * 4;
      if (r2 > 0.96) continue;

      const seed = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
      const grain = ((seed & 0xff) / 255 - 0.5) * intensity;
      const vignette = r2 > 0.56 ? 1 - (r2 - 0.56) * 0.34 : 1;

      data[idx] = clampByte((data[idx] + grain) * vignette);
      data[idx + 1] = clampByte((data[idx + 1] + grain * 0.88) * vignette);
      data[idx + 2] = clampByte((data[idx + 2] + grain * 0.65) * vignette);
    }
  }
  return data;
}
