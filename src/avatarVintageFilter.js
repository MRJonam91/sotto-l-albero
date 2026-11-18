// Pure CPU image processing for turning a raw camera selfie into a warm
// vintage storybook portrait that blends seamlessly with holiday medallions.

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function vintageCurve(v) {
  const n = v / 255;
  const s = n * n * (3 - 2 * n);
  const blended = n * 0.35 + s * 0.65;
  return 16 + blended * 228;
}

export function applyVintagePortraitGrade(data, width, height, options = {}) {
  const {
    strength = 0.85,
    smoothing = true,
    hatShadow = 0.28,
  } = options;
  const size = width * height;

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
  const targetG = 120;
  const targetB = 86;
  const meanR = count > 20 ? sumR / count : targetR;
  const meanG = count > 20 ? sumG / count : targetG;
  const meanB = count > 20 ? sumB / count : targetB;

  const gainR = Math.min(1.24, Math.max(0.84, targetR / Math.max(40, meanR)));
  const gainG = Math.min(1.16, Math.max(0.84, targetG / Math.max(40, meanG)));
  const gainB = Math.min(1.06, Math.max(0.7, targetB / Math.max(40, meanB)));

  const source = smoothing ? new Uint8ClampedArray(data) : data;
  const edgeThreshold = 34;

  for (let y = 0; y < height; y++) {
    const ny = y / Math.max(1, height - 1);
    const topOcclusion =
      ny < 0.26 ? 1 - hatShadow * Math.pow((0.26 - ny) / 0.26, 1.5) : 1;

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

      const balancedR = r * (1 + (gainR - 1) * 0.55) + 11;
      const balancedG = g * (1 + (gainG - 1) * 0.45) + 2;
      const balancedB = b * (1 + (gainB - 1) * 0.55) - 10;

      const curvedR = vintageCurve(clampByte(balancedR));
      const curvedG = vintageCurve(clampByte(balancedG));
      const curvedB = vintageCurve(clampByte(balancedB)) * 0.9;

      const lum = (curvedR * 0.3 + curvedG * 0.59 + curvedB * 0.11) / 255;
      const midtoneWarmth = Math.sin(lum * Math.PI);

      const finalR = (curvedR + midtoneWarmth * 12) * topOcclusion;
      const finalG = (curvedG + midtoneWarmth * 5) * topOcclusion;
      const finalB = (curvedB - midtoneWarmth * 6) * topOcclusion;

      data[idx] = clampByte(r * (1 - strength) + finalR * strength);
      data[idx + 1] = clampByte(g * (1 - strength) + finalG * strength);
      data[idx + 2] = clampByte(b * (1 - strength) + finalB * strength);
    }
  }
  return data;
}

export function applyAntiqueMedallionFinish(data, width, height, intensity = 7) {
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
      const vignette = r2 > 0.52 ? 1 - (r2 - 0.52) * 0.38 : 1;

      data[idx] = clampByte((data[idx] + grain) * vignette);
      data[idx + 1] = clampByte((data[idx + 1] + grain * 0.88) * vignette);
      data[idx + 2] = clampByte((data[idx + 2] + grain * 0.65) * vignette);
    }
  }
  return data;
}
