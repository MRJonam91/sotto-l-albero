// The model labels face skin as class 3. Preserve enclosed features such as
// eyes, lips and glasses, while rejecting isolated patches and extra faces.
export function faceMask(categories, width, height) {
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
      if (!exterior[i]) alpha[i] = 255;
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
  };
}
