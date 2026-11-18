// Pure CPU image processing for turning any raw selfie (any gender, hair,
// beard, lighting) into an AI-style oil-painted vintage storybook portrait.

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function vintageCurve(v) {
  const n = v / 255;
  const s = n * n * (3 - 2 * n);
  const blended = n * 0.35 + s * 0.65;
  return 16 + blended * 228;
}

const sceneLighting = {
  elf: { dir: [-0.25, -0.3, 0.92], tint: [1.06, 1.0, 0.88], rim: [232, 189, 112], rimAmt: 0.18 },
  santa: { dir: [0.22, -0.28, 0.93], tint: [1.07, 0.99, 0.88], rim: [245, 214, 158], rimAmt: 0.2 },
  sleigh: { dir: [0.4, -0.35, 0.84], tint: [1.05, 0.98, 0.91], rim: [255, 219, 142], rimAmt: 0.28 },
  cozy: { dir: [0.32, 0.08, 0.94], tint: [1.1, 0.98, 0.84], rim: [255, 178, 92], rimAmt: 0.3 },
  nutcracker: { dir: [-0.24, -0.32, 0.91], tint: [1.06, 0.99, 0.89], rim: [242, 204, 128], rimAmt: 0.22 },
  victorian: { dir: [-0.36, -0.26, 0.89], tint: [1.04, 1.0, 0.92], rim: [255, 224, 150], rimAmt: 0.24 },
  reindeer: { dir: [0.24, -0.34, 0.91], tint: [1.04, 1.01, 0.93], rim: [235, 242, 250], rimAmt: 0.2 },
  chimney: { dir: [0.34, -0.25, 0.9], tint: [1.07, 0.99, 0.9], rim: [245, 205, 138], rimAmt: 0.24 },
  ornament: { dir: [-0.32, -0.34, 0.88], tint: [1.06, 1.01, 0.9], rim: [255, 236, 188], rimAmt: 0.28 },
  snowglobe: { dir: [-0.24, -0.34, 0.91], tint: [1.03, 1.01, 0.95], rim: [224, 245, 250], rimAmt: 0.24 },
};

// Lightweight 4-quadrant Kuwahara pass that gives skin & hair subtle oil brushwork
// while keeping eyes, smile, beard texture, and glasses crisp.
export function applyOilBrushwork(data, width, height, mix = 0.34) {
  if (mix <= 0 || width < 6 || height < 6) return data;
  const src = new Uint8ClampedArray(data);
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    lum[i] =
      src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114;
  }

  const quads = [
    [-1, -1, 0, 0],
    [0, -1, 1, 0],
    [-1, 0, 0, 1],
    [0, 0, 1, 1],
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] < 48) continue;

      let bestVar = Infinity;
      let bestR = src[idx];
      let bestG = src[idx + 1];
      let bestB = src[idx + 2];

      for (let q = 0; q < 4; q++) {
        const [x0, y0, x1, y1] = quads[q];
        let sumR = 0,
          sumG = 0,
          sumB = 0,
          sumL = 0,
          sumL2 = 0;
        for (let dy = y0; dy <= y1; dy++) {
          for (let dx = x0; dx <= x1; dx++) {
            const p = (y + dy) * width + (x + dx);
            const l = lum[p];
            sumL += l;
            sumL2 += l * l;
            sumR += src[p * 4];
            sumG += src[p * 4 + 1];
            sumB += src[p * 4 + 2];
          }
        }
        const meanL = sumL * 0.25;
        const variance = sumL2 * 0.25 - meanL * meanL;
        if (variance < bestVar) {
          bestVar = variance;
          bestR = sumR * 0.25;
          bestG = sumG * 0.25;
          bestB = sumB * 0.25;
        }
      }

      data[idx] = clampByte(src[idx] * (1 - mix) + bestR * mix);
      data[idx + 1] = clampByte(src[idx + 1] * (1 - mix) + bestG * mix);
      data[idx + 2] = clampByte(src[idx + 2] * (1 - mix) + bestB * mix);
    }
  }
  return data;
}

export function applyVintagePortraitGrade(data, width, height, options = {}) {
  const {
    strength = 0.78,
    smoothing = true,
    painterly = true,
    hatShadow = 0.28,
    sceneId = "elf",
  } = options;
  const size = width * height;

  if (painterly) {
    applyOilBrushwork(data, width, height, 0.34);
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let i = 0; i < size; i++) {
    const a = data[i * 4 + 3];
    if (a < 96) continue;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (lum > 30 && lum < 235) {
      sumR += r;
      sumG += g;
      sumB += b;
      count++;
    }
  }

  const targetR = 166;
  const targetG = 122;
  const targetB = 90;
  const meanR = count > 20 ? sumR / count : targetR;
  const meanG = count > 20 ? sumG / count : targetG;
  const meanB = count > 20 ? sumB / count : targetB;

  const gainR = Math.min(1.22, Math.max(0.84, targetR / Math.max(40, meanR)));
  const gainG = Math.min(1.15, Math.max(0.84, targetG / Math.max(40, meanG)));
  const gainB = Math.min(1.06, Math.max(0.72, targetB / Math.max(40, meanB)));

  const source = smoothing ? new Uint8ClampedArray(data) : data;
  const edgeThreshold = 34;

  const light = sceneLighting[sceneId] ?? sceneLighting.elf;
  const [lx, ly, lz] = light.dir;
  const [tr, tg, tb] = light.tint;
  const [rr, rg, rb] = light.rim;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const rx = Math.max(1, width * 0.48);
  const ry = Math.max(1, height * 0.48);

  for (let y = 0; y < height; y++) {
    const ny = y / Math.max(1, height - 1);
    const topOcclusion =
      ny < 0.24 ? 1 - hatShadow * Math.pow((0.24 - ny) / 0.24, 1.5) : 1;
    const relY = (y - cy) / ry;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = source[idx + 3];
      if (a === 0) continue;

      let r = source[idx];
      let g = source[idx + 1];
      let b = source[idx + 2];

      if (smoothing && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        let accR = r * 4;
        let accG = g * 4;
        let accB = b * 4;
        let weight = 4;
        const neighbors = [
          idx - 4,
          idx + 4,
          idx - width * 4,
          idx + width * 4,
        ];
        for (const nIdx of neighbors) {
          if (source[nIdx + 3] < 64) continue;
          const nr = source[nIdx];
          const ng = source[nIdx + 1];
          const nb = source[nIdx + 2];
          const diff =
            Math.abs(nr - r) + Math.abs(ng - g) + Math.abs(nb - b);
          if (diff < edgeThreshold) {
            accR += nr;
            accG += ng;
            accB += nb;
            weight += 1;
          }
        }
        r = accR / weight;
        g = accG / weight;
        b = accB / weight;
      }

      const balancedR = r * (1 + (gainR - 1) * 0.55) + 9;
      const balancedG = g * (1 + (gainG - 1) * 0.45) + 2;
      const balancedB = b * (1 + (gainB - 1) * 0.55) - 8;

      const curvedR = vintageCurve(clampByte(balancedR));
      const curvedG = vintageCurve(clampByte(balancedG));
      const curvedB = vintageCurve(clampByte(balancedB)) * 0.92;

      const relX = (x - cx) / rx;
      const r2 = relX * relX + relY * relY;
      const nz = Math.sqrt(Math.max(0.1, 1 - Math.min(0.9, r2 * 0.72)));
      const dot = Math.max(0, relX * lx + relY * ly + nz * lz);
      const shading = 0.84 + 0.24 * dot;
      const rim =
        Math.pow(1 - nz, 2.0) *
        Math.max(0, relX * lx + relY * ly + 0.3) *
        light.rimAmt;

      const finalR = curvedR * shading * tr * topOcclusion + rr * rim;
      const finalG = curvedG * shading * tg * topOcclusion + rg * rim;
      const finalB = curvedB * shading * tb * topOcclusion + rb * rim;

      data[idx] = clampByte(r * (1 - strength) + finalR * strength);
      data[idx + 1] = clampByte(g * (1 - strength) + finalG * strength);
      data[idx + 2] = clampByte(b * (1 - strength) + finalB * strength);
    }
  }
  return data;
}

export function applyAntiqueMedallionFinish(data, width, height, intensity = 5) {
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
