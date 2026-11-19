// Local colour and texture treatment. No fixed target skin colour is used.
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// A local Kuwahara brush chooses the most even patch adjacent to each pixel.
// Summed areas make large, face-sized strokes cost the same as small ones.
export function applyOilBrushwork(data, width, height, mix = 0.65, radius = 3) {
  if (mix <= 0 || width < 6 || height < 6) return data;
  const stride = width + 1;
  const length = stride * (height + 1);
  const alpha = new Float64Array(length);
  const red = new Float64Array(length);
  const green = new Float64Array(length);
  const blue = new Float64Array(length);
  const square = new Float64Array(length);
  for (let y = 0; y < height; y++) {
    let a = 0,
      r = 0,
      g = 0,
      b = 0,
      l2 = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const at = (y + 1) * stride + x + 1;
      const coverage = data[i + 3] / 255;
      const light = luma(data[i], data[i + 1], data[i + 2]);
      a += coverage;
      r += data[i] * coverage;
      g += data[i + 1] * coverage;
      b += data[i + 2] * coverage;
      l2 += light * light * coverage;
      alpha[at] = alpha[at - stride] + a;
      red[at] = red[at - stride] + r;
      green[at] = green[at - stride] + g;
      blue[at] = blue[at - stride] + b;
      square[at] = square[at - stride] + l2;
    }
  }
  const reach = clamp(Math.round(radius), 1, 20);
  const rise = Math.max(1, Math.round(reach * 0.75));
  const area = (table, a, b, c, d) => table[d] - table[b] - table[c] + table[a];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const light = luma(data[i], data[i + 1], data[i + 2]);
      let votes = 0,
        paintR = 0,
        paintG = 0,
        paintB = 0;
      for (let corner = 0; corner < 4; corner++) {
        const left = corner & 1 ? x : Math.max(0, x - reach);
        const right = corner & 1 ? Math.min(width, x + reach + 1) : x + 1;
        const top = corner & 2 ? y : Math.max(0, y - rise);
        const bottom = corner & 2 ? Math.min(height, y + rise + 1) : y + 1;
        const a = top * stride + left,
          b = top * stride + right;
        const c = bottom * stride + left,
          d = bottom * stride + right;
        const weight = area(alpha, a, b, c, d);
        if (weight < 0.5) continue;
        const r = area(red, a, b, c, d) / weight;
        const g = area(green, a, b, c, d) / weight;
        const blueMean = area(blue, a, b, c, d) / weight;
        const mean = luma(r, g, blueMean);
        // Favour a patch on the same side of a strong contour (lashes, lips, glasses).
        const score =
          Math.max(0, area(square, a, b, c, d) / weight - mean * mean) +
          0.6 * (mean - light) ** 2;
        // Neighbouring patches with similar texture share the stroke. Switching
        // abruptly between equal patches would leave jagged blocks on cheeks.
        const vote = 1 / ((18 + score) * (18 + score));
        votes += vote;
        paintR += r * vote;
        paintG += g * vote;
        paintB += blueMean * vote;
      }
      if (!votes) continue;
      paintR /= votes;
      paintG /= votes;
      paintB /= votes;
      const difference = Math.abs(luma(paintR, paintG, paintB) - light);
      const amount = mix / (1 + (difference / 23) ** 3);
      data[i] = clampByte(data[i] + (paintR - data[i]) * amount);
      data[i + 1] = clampByte(data[i + 1] + (paintG - data[i + 1]) * amount);
      data[i + 2] = clampByte(data[i + 2] + (paintB - data[i + 2]) * amount);
    }
  }
  return data;
}

function strokeSeed(x, y, layer) {
  let seed =
    Math.imul(x + 19, 374761393) ^ Math.imul(y + 37, 668265263) ^ layer;
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((seed ^ (seed >>> 16)) >>> 0) / 0x100000000;
}

// Repaint the smoothed reference with overlapping strokes. The broad pass
// builds the shapes, then a narrower pass follows the smaller value edges.
function paintPortraitStrokes(data, width, height, box, landmarks, paint) {
  const reference = data.slice();
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const at = i * 4;
    values[i] = luma(reference[at], reference[at + 1], reference[at + 2]);
  }
  const details = new Uint8Array(values.length);
  for (const [point, spread] of [
    [landmarks?.imageLeftEye, 0.12],
    [landmarks?.imageRightEye, 0.12],
    [landmarks?.noseTip, 0.075],
    [landmarks?.mouthCenter, 0.16],
  ]) {
    if (!point?.every(Number.isFinite)) continue;
    const [cx, cy] = point;
    const rx = Math.max(1, box.w * spread);
    const ry = Math.max(1, box.h * (spread * 0.48));
    for (
      let y = Math.max(0, Math.ceil(cy - ry));
      y <= Math.min(height - 1, cy + ry);
      y++
    )
      for (
        let x = Math.max(0, Math.ceil(cx - rx));
        x <= Math.min(width - 1, cx + rx);
        x++
      ) {
        const shape = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (shape < 1) details[y * width + x] = Math.round((1 - shape) * 230);
      }
  }
  const opacity = 0.28 + paint * 0.67;
  for (const [layer, pass] of [1, 0.52].entries()) {
    const step = Math.max(
      3,
      Math.round(box.w * (0.034 + 0.048 * paint) * pass),
    );
    const delta = Math.max(1, Math.round(step * 0.5));
    for (let gy = 0; gy < height; gy += step) {
      for (let gx = 0; gx < width; gx += step) {
        const seed = strokeSeed(gx, gy, layer);
        const x = Math.min(
          width - 1,
          gx + Math.floor(step * (0.15 + seed * 0.7)),
        );
        const y = Math.min(
          height - 1,
          gy + Math.floor(step * (0.15 + strokeSeed(gy, gx, layer + 8) * 0.7)),
        );
        const center = y * width + x;
        const source = center * 4;
        if (reference[source + 3] < 128) continue;
        const left = values[y * width + Math.max(0, x - delta)];
        const right = values[y * width + Math.min(width - 1, x + delta)];
        const top = values[Math.max(0, y - delta) * width + x];
        const bottom = values[Math.min(height - 1, y + delta) * width + x];
        const gradient = Math.abs(right - left) + Math.abs(bottom - top);
        const angle =
          gradient > 3
            ? Math.atan2(bottom - top, right - left) + Math.PI / 2
            : (seed - 0.5) * 1.9;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const length = step * (1.15 + 0.54 * seed);
        const breadth = step * (0.66 + 0.22 * seed);
        const variation = (seed - 0.5) * Math.min(9, gradient * 0.85);
        const fromX = Math.max(0, Math.ceil(x - length));
        const fromY = Math.max(0, Math.ceil(y - length));
        const toX = Math.min(width - 1, x + length);
        const toY = Math.min(height - 1, y + length);
        const alongX = cos / length;
        const alongY = sin / length;
        const acrossX = -sin / breadth;
        const acrossY = cos / breadth;
        const inverseContrast = 1 / (layer ? 13 : 24);
        const centreValue = values[center];
        const red = reference[source];
        const green = reference[source + 1];
        const blue = reference[source + 2];
        for (let py = fromY; py <= toY; py++) {
          const alongRow = (py - y) * alongY;
          const acrossRow = (py - y) * acrossY;
          for (let px = fromX; px <= toX; px++) {
            const cell = py * width + px;
            const at = cell * 4;
            if (data[at + 3] < 24) continue;
            const dx = px - x;
            const along = dx * alongX + alongRow;
            const across = dx * acrossX + acrossRow;
            const coverage = 1 - along * along - across * across;
            if (coverage <= 0) continue;
            const gap = Math.abs(values[cell] - centreValue) * inverseContrast;
            const amount =
              (Math.min(1, coverage * 2.2) *
                opacity *
                (1 - details[cell] / 310)) /
              (1 + gap * gap * gap);
            const bristle = variation * (1 - Math.abs(across) * 0.6);
            data[at] = clampByte(
              data[at] + (red + bristle - data[at]) * amount,
            );
            data[at + 1] = clampByte(
              data[at + 1] + (green + bristle - data[at + 1]) * amount,
            );
            data[at + 2] = clampByte(
              data[at + 2] + (blue + bristle - data[at + 2]) * amount,
            );
          }
        }
      }
    }
  }
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
  const reflection = lighting.ambient?.map((rgb) => {
    const light = luma(...rgb);
    return rgb.map((channel) => clamp(channel - light, -55, 55));
  });
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
  const paint = painterly ? clamp(options.paintStrength ?? 0.75, 0, 1) : 0;
  const glazeStrength = paint ** 1.8;
  const stroke = clamp(box.w * (0.008 + 0.041 * paint), 1, 20);
  if (paint) {
    applyOilBrushwork(
      data,
      width,
      height,
      Math.min(0.98, 0.325 + 0.76 * paint),
      stroke,
    );
    paintPortraitStrokes(data, width, height, box, options.landmarks, paint);
  }
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
      if (
        !paint &&
        smoothing &&
        x > 0 &&
        x < width - 1 &&
        y > 0 &&
        y < height - 1
      ) {
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
      // The template vector points towards its light source in image space.
      const directional =
        clamp(rx * direction[0] + ry * direction[1], -1, 1) *
        lightStrength *
        (0.085 + paint * 0.86);
      const contact =
        y >= top - 2 && y < eyeY
          ? clamp((eyeY - y) / Math.max(1, eyeY - top), 0, 1) *
            Math.min(0.18, hatShadow * (0.35 + paint * 0.2))
          : 0;
      const light = luma(colour[0], colour[1], colour[2]);
      const value = light / 255;
      // Blend soft value bands and a short print-like highlight range. Apply the
      // curve to luminance once, so the hue of the photographed skin survives.
      const step = 17 + 32 * paint;
      const band =
        (-Math.sin((light * Math.PI * 2) / step) * step) / (2 * Math.PI);
      const curve = value * value * (3 - 2 * value);
      const paintedLight =
        light +
        paint *
          (band * 1.48 +
            (curve - value) * 103 +
            8 * (1 - value) ** 3 -
            24 * value ** 3);
      const side = clamp((rx + 1) / 2, 0, 1);
      for (let c = 0; c < 3; c++) {
        const balance = c === 0 ? gainR : c === 2 ? gainB : 1;
        const warm =
          c === 0
            ? 1 + temperature * (0.12 + 0.25 * paint)
            : c === 2
              ? 1 - temperature * (0.12 + 0.25 * paint)
              : 1;
        const base = meanLum + (colour[c] - meanLum) * 0.98;
        const pigment =
          paintedLight -
          light +
          (light - colour[c]) * paint * (0.13 + 0.15 * value);
        const glaze =
          glazeStrength *
          (c === 0
            ? 10.5 * value + temperature * 17 + skin * 7
            : c === 2
              ? -16 * value - temperature * 23 - skin * 9
              : 0);
        const bounce = reflection
          ? (reflection[0][c] * (1 - side) + reflection[1][c] * side) *
            (0.06 + 0.24 * paint)
          : 0;
        const texture = base + pigment + glaze + bounce;
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

      const gx = Math.floor((x * 256) / width);
      const gy = Math.floor((y * 256) / height);
      const seed = ((gx * 374761393 + gy * 668265263) ^ 0x5bf03635) >>> 0;
      const grain = ((seed & 0xff) / 255 - 0.5) * intensity;
      const vignette = r2 > 0.56 ? 1 - (r2 - 0.56) * 0.34 : 1;

      data[idx] = clampByte((data[idx] + grain) * vignette);
      data[idx + 1] = clampByte((data[idx + 1] + grain * 0.88) * vignette);
      data[idx + 2] = clampByte((data[idx + 2] + grain * 0.65) * vignette);
    }
  }
  return data;
}
