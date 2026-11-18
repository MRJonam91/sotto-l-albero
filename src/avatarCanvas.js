import {
  applyAntiqueMedallionFinish,
  applyVintagePortraitGrade,
} from "./avatarVintageFilter.js";
import {
  avatarScenes as classicAvatarScenes,
  drawAvatar as drawAvatarClassic,
} from "./avatarCanvasClassic.js";
import { portraitPlacement } from "./avatarGeometry.js";

export const avatarStyles = [
  { id: "illustrated", name: "Ritratti illustrati" },
  { id: "classic", name: "Scene classiche" },
];

export { classicAvatarScenes };

// 10 diverse, gender-neutral & hair-free vintage oil-painted bases (256x256 space)
export const avatarScenes = [
  {
    id: "elf",
    name: "Elfo di bottega",
    face: [128, 139, 43, 42],
    hatShadow: 0.3,
    hasHat: true,
    topClipY: 96,
  },
  {
    id: "santa",
    name: "Babbo Natale",
    face: [129, 135, 44, 42],
    hatShadow: 0.32,
    hasHat: true,
    topClipY: 92,
  },
  {
    id: "sleigh",
    name: "Pilota di slitta",
    face: [128, 128, 41, 42],
    hatShadow: 0.32,
    hasHat: true,
    topClipY: 82,
  },
  {
    id: "cozy",
    name: "Maglione & Camino",
    face: [128, 120, 46, 52],
    hatShadow: 0.12,
    hasHat: false,
    topClipY: 22,
  },
  {
    id: "nutcracker",
    name: "Guardia Schiaccianoci",
    face: [128, 146, 33, 34],
    hatShadow: 0.32,
    hasHat: true,
    topClipY: 102,
  },
  {
    id: "victorian",
    name: "Canto di Natale",
    face: [129, 143, 37, 38],
    hatShadow: 0.3,
    hasHat: true,
    topClipY: 100,
  },
  {
    id: "reindeer",
    name: "Renna del Bosco",
    face: [129, 134, 36, 44],
    hatShadow: 0.2,
    hasHat: true,
    topClipY: 96,
  },
  {
    id: "chimney",
    name: "Dentro il camino",
    face: [131, 127, 36, 39],
    hatShadow: 0.3,
    hasHat: true,
    topClipY: 84,
  },
  {
    id: "ornament",
    name: "Pallina di vetro",
    face: [128, 142, 44, 48],
    glassClip: [128, 143, 66],
    hatShadow: 0.14,
    hasHat: false,
    topClipY: 68,
  },
  {
    id: "snowglobe",
    name: "Sfera di neve",
    face: [128, 106, 43, 43],
    glassClip: [128, 128, 72],
    hatShadow: 0.14,
    hasHat: false,
    topClipY: 50,
  },
];

export function scenesForStyle(style = "illustrated") {
  return style === "classic" ? classicAvatarScenes : avatarScenes;
}

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
      for (const cb of entry.callbacks.splice(0)) cb();
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
    urls.push(
      `/avatar-templates/${s.id}-bg.webp`,
      `/avatar-templates/${s.id}-fg.webp`,
    );
  }
  await Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = getTemplateLayer(url, () => resolve());
          if (img || templateCache.get(url)?.failed) resolve();
        }),
    ),
  );
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
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

function furPuff(ctx, x, y, rx, ry, base = "#e6d8c0", hi = "#fcf5e8") {
  ellipse(ctx, x, y + 1.4, rx * 1.04, ry * 1.02, "#24160e33");
  ellipse(ctx, x, y, rx, ry, base);
  ellipse(ctx, x - rx * 0.16, y - ry * 0.18, rx * 0.72, ry * 0.68, hi);
}

// Adaptive Santa beard anchored cleanly around the person's actual mouth/chin
function drawAdaptiveSantaBeard(ctx, x, y, rx, ry) {
  ctx.save();
  const mouthY = y + ry * 0.34;
  const chinY = y + ry * 0.85;
  const w = rx * 0.96;

  // Cheek & jaw beard curls framing the lower face without covering eyes/nose
  const puffs = [
    [x - w * 0.88, mouthY - 3, 9, 11],
    [x - w * 0.92, mouthY + 12, 11, 13],
    [x + w * 0.88, mouthY - 3, 9, 11],
    [x + w * 0.92, mouthY + 12, 11, 13],
    // Under-lip & chin volume (below mouthY + 8)
    [x - w * 0.66, chinY - 12, 12, 11],
    [x - w * 0.34, chinY - 10, 12, 11],
    [x, chinY - 9, 13, 11],
    [x + w * 0.34, chinY - 10, 12, 11],
    [x + w * 0.66, chinY - 12, 12, 11],
    // Flowing lower beard
    [x - w * 0.56, chinY + 4, 13, 13],
    [x - w * 0.24, chinY + 8, 14, 14],
    [x + w * 0.04, chinY + 10, 14, 14],
    [x + w * 0.32, chinY + 8, 14, 14],
    [x + w * 0.58, chinY + 4, 13, 13],
    [x - w * 0.22, chinY + 22, 12, 12],
    [x + w * 0.14, chinY + 22, 12, 12],
  ];
  for (const [px, py, prx, pry] of puffs) {
    furPuff(ctx, px, py, prx, pry);
  }

  // Handlebar moustache right above upper lip
  const mTop = mouthY - 10;
  ctx.beginPath();
  ctx.moveTo(x, mTop);
  ctx.bezierCurveTo(x - 13, mTop - 5, x - 30, mTop + 1, x - 38, mTop + 11);
  ctx.bezierCurveTo(x - 26, mTop + 13, x - 12, mTop + 6, x, mTop + 4);
  ctx.bezierCurveTo(x + 12, mTop + 6, x + 26, mTop + 13, x + 38, mTop + 11);
  ctx.bezierCurveTo(x + 30, mTop + 1, x + 13, mTop - 5, x, mTop);
  ctx.fillStyle = "#faf2e2";
  ctx.fill();
  stroke(ctx, "#d2c0a3", 1.2, () => {
    ctx.moveTo(x - 32, mTop + 9);
    ctx.quadraticCurveTo(x - 14, mTop + 1, x, mTop + 3);
    ctx.quadraticCurveTo(x + 14, mTop + 1, x + 32, mTop + 9);
  });
  ctx.restore();
}

// Weak photo keys release old selfies; each entry holds at most the ten scene grades.
const gradedPortraits = new WeakMap();

function makeGradedPortraitCanvas(image, isIsolated, hatShadow, sceneId) {
  if (typeof document === "undefined") return image;
  let versions = gradedPortraits.get(image);
  if (!versions) {
    versions = new Map();
    gradedPortraits.set(image, versions);
  }
  const key = `${sceneId}:${isIsolated ? 1 : 0}:${hatShadow}`;
  if (versions.has(key)) return versions.get(key);
  const maxDim = 320;
  const scale = Math.min(
    1,
    maxDim / Math.max(image.width || 320, image.height || 320),
  );
  const w = Math.max(1, Math.round((image.width || 320) * scale));
  const h = Math.max(1, Math.round((image.height || 320) * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  octx.drawImage(image, 0, 0, w, h);
  try {
    const imgData = octx.getImageData(0, 0, w, h);
    applyVintagePortraitGrade(imgData.data, w, h, {
      strength: 0.78,
      smoothing: true,
      painterly: true,
      hatShadow: isIsolated ? hatShadow : hatShadow * 0.85,
      sceneId,
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
  versions.set(key, off);
  return off;
}

function drawFaceInTemplate(
  ctx,
  { source: image, isolated },
  scene,
  { zoom, offsetX, offsetY },
) {
  const graded = makeGradedPortraitCanvas(
    image,
    isolated,
    scene.hatShadow,
    scene.id,
  );
  const [x, y, rx, ry] = scene.face;
  const placement = portraitPlacement(
    graded,
    scene.face,
    { zoom, offsetX, offsetY },
    isolated,
  );
  ctx.save();

  // Keep portrait strictly inside the medallion (or glass sphere) & below hat crown where appropriate
  ctx.beginPath();
  if (scene.glassClip) {
    ctx.arc(
      scene.glassClip[0],
      scene.glassClip[1],
      scene.glassClip[2],
      0,
      Math.PI * 2,
    );
  } else {
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
  }
  ctx.clip();

  if (scene.hasHat && scene.topClipY) {
    ctx.beginPath();
    ctx.rect(0, scene.topClipY - 22, 256, 256);
    ctx.clip();
  }

  if (isolated) {
    ctx.shadowColor = "#140c0788";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(
      graded,
      placement.x,
      placement.y,
      placement.width,
      placement.height,
    );
    ctx.restore();
    return;
  }

  // Non-isolated fallback photo: proportional aspect-preserving cover inside opening
  ellipse(ctx, x, y, rx, ry);
  ctx.clip();
  ctx.drawImage(
    graded,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  );
  ctx.restore();
}

export function drawAvatar(
  canvas,
  portrait,
  {
    style = "illustrated",
    scene,
    zoom = 1.15,
    offsetX = 0,
    offsetY = 0,
    beard = true,
  },
  size = 256,
) {
  if (style === "classic") {
    pendingRedraws.delete(canvas);
    return drawAvatarClassic(
      canvas,
      portrait,
      { scene, zoom, offsetX, offsetY, beard },
      size,
    );
  }

  const chosen =
    avatarScenes.find((item) => item.id === scene) ?? avatarScenes[0];
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });

  const settings = { style, scene, zoom, offsetX, offsetY, beard };
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

  const bgImg = getTemplateLayer(
    `/avatar-templates/${chosen.id}-bg.webp`,
    triggerRedraw,
  );
  const fgImg = getTemplateLayer(
    `/avatar-templates/${chosen.id}-fg.webp`,
    triggerRedraw,
  );

  if (bgImg && fgImg) {
    ctx.drawImage(bgImg, 0, 0, 256, 256);
    if (portrait) {
      drawFaceInTemplate(ctx, portrait, chosen, { zoom, offsetX, offsetY });
    }
    ctx.drawImage(fgImg, 0, 0, 256, 256);
    if (chosen.id === "santa" && beard && portrait) {
      const [fx, fy, frx, fry] = chosen.face;
      drawAdaptiveSantaBeard(
        ctx,
        fx + offsetX * 0.27,
        fy + offsetY * 0.27,
        frx * Math.min(1.25, Math.max(0.85, zoom)),
        fry * Math.min(1.25, Math.max(0.85, zoom)),
      );
    }
  } else {
    ctx.restore();
    return drawAvatarClassic(
      canvas,
      portrait,
      { scene: chosen.id, zoom, offsetX, offsetY, beard },
      size,
    );
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
  if (settings.style !== "classic") await preloadAvatarTemplates();
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
  if (settings.style !== "classic") await preloadAvatarTemplates();
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
