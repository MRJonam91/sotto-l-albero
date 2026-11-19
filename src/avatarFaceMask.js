// The model labels: 0=background, 1=hair, 2=body-skin (neck/ears), 3=face-skin,
// 4=clothes, 5=others (glasses/accessories).
// Preserve enclosed features such as eyes, lips, and glasses, attach the
// person's own connected hair and neck. Anatomy comes from the separate face
// landmarker; a category rectangle is not an eye or mouth detector.
export function faceMask(categories, width, height, options = {}) {
  const { includeHair = false, includeNeck = false, feather = false } = options;
  const size = width * height;
  const groups = new Uint32Array(size);
  // Eyeglass frames can split one face into two large skin components. Only
  // bridge accessory pixels inside the measured face outline of a single face.
  const oval = options.faceOval;
  let facialAccessories;
  if (oval?.length >= 3) {
    facialAccessories = new Uint8Array(size);
    const minY = Math.max(0, Math.floor(Math.min(...oval.map((p) => p[1]))));
    const maxY = Math.min(
      height - 1,
      Math.ceil(Math.max(...oval.map((p) => p[1]))),
    );
    for (let y = minY; y <= maxY; y++) {
      const hits = [];
      for (let i = 0; i < oval.length; i++) {
        const [ax, ay] = oval[i],
          [bx, by] = oval[(i + 1) % oval.length];
        const scan = y + 0.5;
        if (ay > scan !== by > scan)
          hits.push(ax + ((scan - ay) * (bx - ax)) / (by - ay));
      }
      hits.sort((a, b) => a - b);
      for (let k = 1; k < hits.length; k += 2) {
        const right = Math.min(width - 1, Math.floor(hits[k] - 0.5));
        for (
          let x = Math.max(0, Math.ceil(hits[k - 1] - 0.5));
          x <= right;
          x++
        ) {
          const at = y * width + x;
          if (categories[at] === 5) facialAccessories[at] = 1;
        }
      }
    }
  }
  const facialSkin = (at) => categories[at] === 3 || facialAccessories?.[at];
  const queue = new Uint32Array(size);
  let group = 0;
  let largest = { count: 0 };
  let runnerUp = 0;

  function walk(start, visit) {
    let tail = 1;
    queue[0] = start;
    for (let head = 0; head < tail; head++) {
      const i = queue[head];
      const x = i % width;
      if (x > 0 && visit(i - 1)) queue[tail++] = i - 1;
      if (x < width - 1 && visit(i + 1)) queue[tail++] = i + 1;
      if (i >= width && visit(i - width)) queue[tail++] = i - width;
      if (i < size - width && visit(i + width)) queue[tail++] = i + width;
    }
    return tail;
  }

  for (let i = 0; i < size; i++) {
    if (!facialSkin(i) || groups[i]) continue;
    group++;
    let left = i % width;
    let right = left;
    const top = Math.floor(i / width);
    let bottom = top;
    groups[i] = group;
    const count = walk(i, (index) => {
      if (groups[index] || !facialSkin(index)) return false;
      groups[index] = group;
      const x = index % width;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, Math.floor(index / width));
      return true;
    });
    if (count > largest.count) {
      runnerUp = largest.count;
      largest = { count, group, left, right, top, bottom };
    } else runnerUp = Math.max(runnerUp, count);
  }

  if (largest.count < size * 0.007 || runnerUp > largest.count * 0.35)
    return null;

  const faceLeft = largest.left;
  const faceRight = largest.right;
  const faceTop = largest.top;
  const faceBottom = largest.bottom;
  const faceW = faceRight - faceLeft + 1;
  const faceH = faceBottom - faceTop + 1;
  const faceCx = (faceLeft + faceRight) * 0.5;
  const faceCy = (faceTop + faceBottom) * 0.5;
  // A scarf or high collar sometimes occupies the visible throat. Keep this
  // small connected area behind the illustrated costume, tapering below the chin.
  const chin = includeNeck && options.chin;

  let hairPixels = 0;
  let lowerHairPixels = 0;

  if (includeHair || includeNeck) {
    const visited = new Uint8Array(size);
    const start = groups.findIndex((value) => value === largest.group);
    visited[start] = 1;
    walk(start, (index) => {
      if (visited[index]) return false;
      visited[index] = 1;
      if (groups[index] === largest.group) return true;
      const x = index % width,
        y = Math.floor(index / width);
      const hair =
        includeHair &&
        categories[index] === 1 &&
        Math.abs(x - faceCx) <= faceW * 1.05 &&
        y >= faceTop - faceH * 0.6 &&
        y <= faceBottom + faceH * 0.9;
      const neck =
        includeNeck &&
        categories[index] === 2 &&
        Math.abs(x - faceCx) <= faceW * 0.65 &&
        y >= faceTop + faceH * 0.2 &&
        y <= faceBottom + faceH * 0.65;
      const headwear =
        includeHair &&
        Number.isFinite(options.headCapLine) &&
        categories[index] === 5 &&
        y <= options.headCapLine &&
        y >= faceTop - faceH * 1.15 &&
        Math.abs(x - faceCx) <= faceW * 0.9;
      const depth = chin ? (y - chin[1]) / faceH : -1;
      const collar =
        chin &&
        categories[index] === 4 &&
        depth >= -0.12 &&
        depth <= 0.42 &&
        Math.abs(x - chin[0]) <= faceW * (0.29 - 0.18 * Math.max(0, depth));
      if (!hair && !neck && !headwear && !collar) return false;
      groups[index] = largest.group;
      if (hair) {
        hairPixels++;
        if (y > faceCy + faceH * 0.25) lowerHairPixels++;
      }
      largest.left = Math.min(largest.left, x);
      largest.right = Math.max(largest.right, x);
      largest.top = Math.min(largest.top, y);
      largest.bottom = Math.max(largest.bottom, y);
      return true;
    });
  }

  const exterior = new Uint8Array(size);
  function markOutside(index) {
    if (exterior[index] || groups[index] === largest.group) return false;
    exterior[index] = 1;
    return true;
  }
  for (let i = 0; i < size; i++) {
    const x = i % width;
    if (
      (x === 0 || x === width - 1 || i < width || i >= size - width) &&
      markOutside(i)
    )
      walk(i, markOutside);
  }

  const { left, top, right, bottom } = largest;
  const alpha = new Uint8ClampedArray(size);
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const i = y * width + x;
      if (!exterior[i]) {
        alpha[i] = 255;
      }
    }
  }

  if (feather) {
    const copy = new Uint8ClampedArray(alpha);
    for (let y = Math.max(1, top); y <= Math.min(height - 2, bottom); y++) {
      for (let x = Math.max(1, left); x <= Math.min(width - 2, right); x++) {
        const i = y * width + x;
        const sum =
          copy[i] * 4 +
          copy[i - 1] * 2 +
          copy[i + 1] * 2 +
          copy[i - width] * 2 +
          copy[i + width] * 2 +
          copy[i - width - 1] +
          copy[i - width + 1] +
          copy[i + width - 1] +
          copy[i + width + 1];
        alpha[i] = Math.round(sum / 16);
      }
    }
  }

  const hairRatio = hairPixels / Math.max(1, largest.count);
  const longHair = lowerHairPixels > largest.count * 0.22;
  const hairAlpha = new Uint8ClampedArray(size);
  if (includeHair) {
    for (let i = 0; i < size; i++) {
      if (categories[i] === 1 && groups[i] === largest.group)
        hairAlpha[i] = alpha[i];
    }
  }
  const headCapAlpha = hairAlpha.slice();
  if (Number.isFinite(options.headCapLine)) {
    const eyeLine = options.headCapLine;
    const eyeToChin = Math.max(1, (options.chin?.[1] ?? faceBottom) - eyeLine);
    // At the sides the illustrated opening can be narrower than the head.
    // Carry the real temples and ears below the eyes, then taper towards the
    // jaw. A straight edge at eye height cuts a visible step into the temples.
    for (let y = top; y <= Math.min(bottom, eyeLine + eyeToChin * 0.8); y++) {
      for (let x = left; x <= right; x++) {
        const at = y * width + x;
        const category = categories[at];
        if (
          groups[at] !== largest.group ||
          (category !== 2 && category !== 3 && category !== 5)
        )
          continue;
        if (y <= eyeLine) {
          headCapAlpha[at] = alpha[at];
          continue;
        }
        const side = Math.min(1, (2 * Math.abs(x - faceCx)) / faceW);
        const edge = eyeLine + eyeToChin * 0.8 * side ** 3;
        const coverage = Math.min(
          1,
          Math.max(0, (edge - y) / Math.max(1, eyeToChin * 0.12)),
        );
        headCapAlpha[at] = Math.round(alpha[at] * coverage);
      }
    }
  }

  return {
    alpha,
    hairAlpha,
    headCapAlpha,
    bounds: {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    },
    faceBounds: {
      x: faceLeft,
      y: faceTop,
      width: faceW,
      height: faceH,
    },
    traits: {
      hairRatio,
      longHair,
    },
  };
}
