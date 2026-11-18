// The model labels face skin as class 3 and hair as class 1. Preserve enclosed
// features such as eyes, lips and glasses, while rejecting isolated patches and
// extra faces. When includeHair is enabled, side hair framing the cheeks and
// temples is preserved with a soft feathered alpha transition.
export function faceMask(categories, width, height, options = {}) {
  const { includeHair = false, feather = false } = options;
  const size = width * height;
  const groups = new Uint32Array(size);
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
    if (categories[i] !== 3 || groups[i]) continue;
    group++;
    let left = i % width;
    let right = left;
    const top = Math.floor(i / width);
    let bottom = top;
    groups[i] = group;
    const count = walk(i, (index) => {
      if (groups[index] || categories[index] !== 3) return false;
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

  if (includeHair) {
    const maxRx = faceW * 0.84;
    const maxRyTop = faceH * 0.72;
    const maxRyBottom = faceH * 0.68;
    const hairMinX = Math.max(0, Math.floor(faceCx - maxRx));
    const hairMaxX = Math.min(width - 1, Math.ceil(faceCx + maxRx));
    const hairMinY = Math.max(0, Math.floor(faceCy - maxRyTop));
    const hairMaxY = Math.min(height - 1, Math.ceil(faceCy + maxRyBottom));

    for (let y = hairMinY; y <= hairMaxY; y++) {
      const dy =
        y < faceCy ? (y - faceCy) / maxRyTop : (y - faceCy) / maxRyBottom;
      for (let x = hairMinX; x <= hairMaxX; x++) {
        const dx = (x - faceCx) / maxRx;
        if (dx * dx + dy * dy > 1) continue;
        const idx = y * width + x;
        if (categories[idx] === 1) {
          groups[idx] = largest.group;
          if (x < largest.left) largest.left = x;
          if (x > largest.right) largest.right = x;
          if (y < largest.top) largest.top = y;
          if (y > largest.bottom) largest.bottom = y;
        }
      }
    }
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
        if (includeHair && categories[i] === 1) {
          const dx = (x - faceCx) / (faceW * 0.84);
          const dy =
            y < faceCy
              ? (y - faceCy) / (faceH * 0.72)
              : (y - faceCy) / (faceH * 0.68);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const fade =
            dist > 0.72 ? Math.max(0.18, 1 - (dist - 0.72) / 0.3) : 1;
          alpha[i] = Math.round(255 * fade);
        } else {
          alpha[i] = 255;
        }
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

  return {
    alpha,
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
    landmarks: {
      eyeLineY: faceTop + faceH * 0.39,
      noseBaseY: faceTop + faceH * 0.58,
      mouthCenterY: faceTop + faceH * 0.72,
      centerX: faceCx,
      templeLeftX: faceLeft,
      templeRightX: faceRight,
    },
  };
}
