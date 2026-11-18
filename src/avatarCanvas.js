import {
  applyAntiqueMedallionFinish,
  applyVintagePortraitGrade,
} from "./avatarVintageFilter.js";

export const avatarScenes = [
  {
    id: "elf",
    name: "Elfo di bottega",
    colors: ["#d8c6a5", "#9f8764"],
    face: [132, 127, 41, 49],
    templateAlign: { dx: 4, dy: 4, scale: 0.88 },
    hasTemplate: true,
    hatShadow: 0.26,
  },
  {
    id: "santa",
    name: "Babbo Natale",
    colors: ["#4a4134", "#27211a"],
    face: [123, 124, 42, 50],
    templateAlign: { dx: -5, dy: 1, scale: 0.92 },
    hasTemplate: true,
    hatShadow: 0.28,
  },
  {
    id: "sleigh",
    name: "Volo in slitta",
    colors: ["#14233c", "#2a384e"],
    face: [128, 108, 33, 40],
    templateAlign: { dx: 0, dy: -17, scale: 0.72 },
    hasTemplate: true,
    hatShadow: 0.3,
  },
  {
    id: "chimney",
    name: "Dentro il camino",
    colors: ["#17253a", "#324357"],
    face: [129, 132, 35, 42],
    templateAlign: { dx: 1, dy: 9, scale: 0.76 },
    hasTemplate: true,
    hatShadow: 0.28,
  },
  {
    id: "snowglobe",
    name: "Sfera di neve",
    colors: ["#1e3545", "#385e68"],
    face: [128, 118, 54, 62],
    hasTemplate: false,
    hatShadow: 0.22,
  },
  {
    id: "ornament",
    name: "Pallina di vetro",
    colors: ["#142e24", "#0a1914"],
    face: [126, 136, 39, 46],
    templateAlign: { dx: -2, dy: 13, scale: 0.84 },
    hasTemplate: true,
    hatShadow: 0.16,
  },
  {
    id: "gingerbread",
    name: "Pan di zenzero",
    colors: ["#44251c", "#211510"],
    face: [128, 108, 52, 59],
    hasTemplate: false,
    hatShadow: 0.24,
  },
];

const cream = "#f6ead3";
const gold = "#deb261";
const crimson = "#8f2224";
const brightRed = "#b33234";

// Cache for pre-rendered multi-layer illustrated templates (bg, fg, beard)
const templateCache = new Map();
const pendingRedraws = new WeakMap();

function getTemplateLayer(url, onReady) {
  if (typeof Image === "undefined") return null;
  let entry = templateCache.get(url);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, failed: false, callbacks: [] };
    if (onReady) entry.callbacks.push(onReady);
    img.onload = () => {
      entry.loaded = true;
      const cbs = entry.callbacks.splice(0);
      for (const cb of cbs) cb();
    };
    img.onerror = () => {
      entry.failed = true;
      entry.callbacks.length = 0;
    };
    img.src = url;
    templateCache.set(url, entry);
    return null;
  }
  if (entry.loaded) return entry.img;
  if (!entry.failed && onReady) entry.callbacks.push(onReady);
  return null;
}

export async function preloadAvatarTemplates() {
  if (typeof Image === "undefined") return;
  const urls = [];
  for (const s of avatarScenes) {
    if (!s.hasTemplate) continue;
    urls.push(
      `/avatar-templates/${s.id}-bg.webp`,
      `/avatar-templates/${s.id}-fg.webp`,
    );
    if (s.id === "santa") urls.push(`/avatar-templates/santa-beard.webp`);
  }
  await Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = getTemplateLayer(url, () => resolve());
          if (img) resolve();
        }),
    ),
  );
}

function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function polygon(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function stroke(ctx, color, width, draw) {
  ctx.beginPath();
  draw();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function star(ctx, x, y, size, color = "#ffdf96") {
  polygon(
    ctx,
    [
      [x, y - size],
      [x + size * 0.2, y - size * 0.22],
      [x + size, y],
      [x + size * 0.2, y + size * 0.22],
      [x, y + size],
      [x - size * 0.2, y + size * 0.22],
      [x - size, y],
      [x - size * 0.2, y - size * 0.22],
    ],
    color,
  );
}

function material(ctx, x, y, w, h, stops) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  stops.forEach((color, i) =>
    gradient.addColorStop(i / (stops.length - 1), color),
  );
  return gradient;
}

function glow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  ellipse(ctx, x, y, radius, radius, gradient);
}

function snow(ctx, count) {
  for (let i = 0; i < count; i += 1) {
    const x = (19 + i * 97) % 256;
    const y = (23 + i * 61) % 256;
    const r = 0.8 + (i % 5) * 0.42;
    ellipse(ctx, x, y, r, r, i % 3 ? "#fff4dc90" : "#f5d79ab0");
  }
}

function pineTree(ctx, x, y, scale, darkColor = "#1d332c") {
  const w = 20 * scale;
  const h = 56 * scale;
  polygon(
    ctx,
    [
      [x, y - h],
      [x + w * 0.65, y - h * 0.55],
      [x + w * 0.35, y - h * 0.55],
      [x + w, y - h * 0.18],
      [x + w * 0.55, y - h * 0.18],
      [x + w * 1.15, y],
      [x - w * 1.15, y],
      [x - w * 0.55, y - h * 0.18],
      [x - w, y - h * 0.18],
      [x - w * 0.35, y - h * 0.55],
      [x - w * 0.65, y - h * 0.55],
    ],
    darkColor,
  );
}

function makeGradedPortraitCanvas(image, isIsolated, hatShadow) {
  if (typeof document === "undefined") return image;
  const maxDim = 256;
  const scale = Math.min(
    1,
    maxDim / Math.max(image.width || 256, image.height || 256),
  );
  const w = Math.max(1, Math.round((image.width || 256) * scale));
  const h = Math.max(1, Math.round((image.height || 256) * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  octx.drawImage(image, 0, 0, w, h);
  try {
    const imgData = octx.getImageData(0, 0, w, h);
    applyVintagePortraitGrade(imgData.data, w, h, {
      strength: 0.76,
      smoothing: true,
      hatShadow: isIsolated ? hatShadow : hatShadow * 0.85,
    });
    octx.putImageData(imgData, 0, 0);
  } catch {
    // Tainted canvas fallback
  }
  if (image.faceBox) {
    off.faceBox = {
      w: image.faceBox.w * scale,
      h: image.faceBox.h * scale,
      cx: image.faceBox.cx * scale,
      cy: image.faceBox.cy * scale,
    };
  }
  return off;
}

function drawFaceInTemplate(
  ctx,
  { source: image, isolated },
  scene,
  { zoom, offsetX, offsetY },
) {
  const graded = makeGradedPortraitCanvas(image, isolated, scene.hatShadow);
  const [x, y, rx, ry] = scene.face;
  ctx.save();

  if (isolated) {
    const fb = graded.faceBox || {
      w: graded.width,
      h: graded.height,
      cx: graded.width * 0.5,
      cy: graded.height * 0.5,
    };
    const scale =
      Math.min((rx * 2.16) / fb.w, (ry * 2.04) / fb.h) * zoom;
    const w = graded.width * scale;
    const h = graded.height * scale;
    ctx.shadowColor = "#1a100b88";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(
      graded,
      x - fb.cx * scale + offsetX * 0.27,
      y - fb.cy * scale + offsetY * 0.27,
      w,
      h,
    );
    ctx.restore();
    return;
  }

  // Non-isolated photo: align with template opening and feather outer boundary
  ellipse(ctx, x, y, rx * 1.38, ry * 1.32);
  ctx.clip();
  const align = scene.templateAlign || { dx: 0, dy: 0, scale: 0.85 };
  const baseScale =
    Math.max(256 / graded.width, 256 / graded.height) *
    align.scale *
    (zoom / 1.05);
  const w = graded.width * baseScale;
  const h = graded.height * baseScale;
  const dx = align.dx + ((w / 2 - rx) * offsetX) / 100;
  const dy = align.dy + ((h / 2 - ry) * offsetY) / 100;
  ctx.drawImage(graded, 128 - w / 2 + dx, 128 - h / 2 + dy, w, h);
  ctx.restore();
}

function drawFallbackScene(ctx, scene, portrait, settings) {
  const [top, bottom] = scene.colors;
  const gradient = ctx.createLinearGradient(25, 10, 225, 246);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  fillRect(ctx, 0, 0, 256, 256, gradient);

  if (scene.id === "snowglobe") {
    snow(ctx, 36);
    pineTree(ctx, 52, 204, 1.25, "#5f8588");
    pineTree(ctx, 204, 204, 1.5, "#6b9396");
    ellipse(ctx, 128, 202, 78, 46, "#b9cfcd");
  } else if (scene.id === "gingerbread") {
    glow(ctx, 128, 115, 95, "#c57c4644");
    ellipse(ctx, 128, 108, 74, 76, "#9c5633");
    ellipse(ctx, 128, 214, 88, 80, "#ab623c");
  }

  if (portrait) drawFaceInTemplate(ctx, portrait, scene, settings);

  if (scene.id === "snowglobe") {
    stroke(ctx, "#c9ebedb8", 3, () => ctx.arc(128, 114, 96, 0, Math.PI * 2));
    stroke(ctx, "#e7fcffe0", 7, () =>
      ctx.arc(128, 113, 82, Math.PI * 1.09, Math.PI * 1.33),
    );
    ellipse(ctx, 128, 201, 88, 17, "#eff3ed");
    ellipse(ctx, 128, 224, 86, 24, "#7a4d3b");
    ellipse(ctx, 128, 212, 84, 12, "#b37b56");
    star(ctx, 128, 229, 9, cream);
  } else if (scene.id === "gingerbread") {
    stroke(ctx, cream, 5, () =>
      ctx.ellipse(128, 108, 65, 67, 0, 0, Math.PI * 2),
    );
    polygon(
      ctx,
      [
        [128, 184],
        [101, 173],
        [101, 197],
        [128, 188],
        [154, 197],
        [154, 173],
      ],
      crimson,
    );
    ellipse(ctx, 128, 184, 7, 7, brightRed);
    for (const y of [210, 232]) ellipse(ctx, 128, y, 6.5, 6.5, cream);
  }

  // Golden medallion ring
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 256, 256);
  ctx.arc(128, 128, 121, 0, Math.PI * 2, true);
  ctx.fillStyle = "#0b2822";
  ctx.fill();
  const goldRing = material(ctx, 20, 20, 216, 216, [
    "#f3d48b",
    "#b8893d",
    "#f7dfa4",
    "#7c5720",
    "#dfb464",
  ]);
  stroke(ctx, goldRing, 5.5, () => ctx.arc(128, 128, 121.5, 0, Math.PI * 2));
  ctx.restore();
}

export function drawAvatar(
  canvas,
  portrait,
  { scene, zoom = 1.15, offsetX = 0, offsetY = 0, beard = true },
  size = 256,
) {
  const chosen =
    avatarScenes.find((item) => item.id === scene) ?? avatarScenes[0];
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });

  const settings = { scene, zoom, offsetX, offsetY, beard };
  pendingRedraws.set(canvas, { portrait, settings, size });
  const triggerRedraw = () => {
    const latest = pendingRedraws.get(canvas);
    if (latest) {
      drawAvatar(canvas, latest.portrait, latest.settings, latest.size);
    }
  };

  ctx.save();
  ctx.scale(size / 256, size / 256);
  ctx.imageSmoothingQuality = "high";

  if (chosen.hasTemplate) {
    const bgImg = getTemplateLayer(
      `/avatar-templates/${chosen.id}-bg.webp`,
      triggerRedraw,
    );
    const fgImg = getTemplateLayer(
      `/avatar-templates/${chosen.id}-fg.webp`,
      triggerRedraw,
    );
    const beardImg =
      chosen.id === "santa" && beard
        ? getTemplateLayer(`/avatar-templates/santa-beard.webp`, triggerRedraw)
        : null;

    if (bgImg && fgImg) {
      ctx.drawImage(bgImg, 0, 0, 256, 256);
      if (portrait) {
        drawFaceInTemplate(ctx, portrait, chosen, { zoom, offsetX, offsetY });
      }
      ctx.drawImage(fgImg, 0, 0, 256, 256);
      if (chosen.id === "santa" && beard && beardImg) {
        ctx.drawImage(beardImg, 0, 0, 256, 256);
      }
    } else {
      drawFallbackScene(ctx, chosen, portrait, { zoom, offsetX, offsetY });
    }
  } else {
    drawFallbackScene(ctx, chosen, portrait, { zoom, offsetX, offsetY });
  }

  ctx.restore();

  try {
    const frameData = ctx.getImageData(0, 0, size, size);
    applyAntiqueMedallionFinish(frameData.data, size, size, 4);
    ctx.putImageData(frameData, 0, 0);
  } catch {
    // Skip grain if canvas readback is restricted
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Non siamo riusciti a preparare l’immagine."));
      },
      type,
      quality,
    ),
  );
}

export async function makeAvatarThumbnail(image, settings) {
  await preloadAvatarTemplates();
  const canvas = document.createElement("canvas");
  drawAvatar(canvas, image, settings);
  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of [0.86, 0.72, 0.58, 0.44]) {
      const blob = await toBlob(canvas, type, quality);
      if (blob.type !== type) break;
      if (blob.size <= 64 * 1024) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(new Error("Non siamo riusciti a leggere l’immagine."));
          reader.readAsDataURL(blob);
        });
      }
    }
  }
  throw new Error(
    "Questa foto è troppo grande anche dopo il ritaglio. Prova con un’altra.",
  );
}

export async function downloadAvatar(image, settings) {
  await preloadAvatarTemplates();
  const canvas = document.createElement("canvas");
  drawAvatar(canvas, image, settings, 1024);
  const blob = await toBlob(canvas, "image/png");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sotto-l-albero-avatar.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
