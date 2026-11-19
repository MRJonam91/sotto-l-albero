import {
  applyAntiqueMedallionFinish,
  applyVintagePortraitGrade,
  extendPortraitEdges,
} from "./avatarVintageFilter.js";
import {
  avatarScenes as classicAvatarScenes,
  drawAvatar as drawAvatarClassic,
} from "./avatarCanvasClassic.js";
import {
  portraitPlacement,
  portraitScenePlacement,
  mapFaceLandmarks,
} from "./avatarGeometry.js";
import { getAvatarTemplate } from "./avatarTemplateVariants.js";
export {
  avatarVariantIds,
  selectAvatarVariant,
} from "./avatarTemplateVariants.js";

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
    hairWindow: [128, 128, 123, 123],
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
    // Inside the glass, below the painted ribbon and brass cap.
    hairWindow: [128, 142, 73, 89],
    topClipY: 68,
  },
  {
    id: "snowglobe",
    name: "Sfera di neve",
    face: [128, 106, 43, 43],
    glassClip: [128, 128, 72],
    hatShadow: 0.14,
    hasHat: false,
    hairWindow: [128, 112, 112, 106],
    topClipY: 50,
  },
];

export function scenesForStyle(style = "illustrated") {
  return style === "classic" ? classicAvatarScenes : avatarScenes;
}

export function sceneForSettings({
  style = "illustrated",
  scene = "elf",
  variant = "front",
} = {}) {
  const list = scenesForStyle(style);
  const base = list.find((item) => item.id === scene) ?? list[0];
  if (style === "classic") return base;
  const template = getAvatarTemplate(base.id, variant);
  return template ? { ...base, ...template } : base;
}

const templateCache = new Map();
const pendingRedraws = new WeakMap();
const redrawCallbacks = new WeakMap();

function getTemplateLayer(url, onReady) {
  if (typeof Image === "undefined") return null;
  let entry = templateCache.get(url);
  if (!entry) {
    const img = new Image();
    let settle;
    entry = {
      img,
      loaded: false,
      failed: false,
      callbacks: new Set(),
      promise: new Promise((resolve) => {
        settle = resolve;
      }),
    };
    templateCache.set(url, entry);
    const complete = (success) => {
      entry.loaded = success;
      entry.failed = !success;
      settle(success);
      const callbacks = [...entry.callbacks];
      entry.callbacks.clear();
      for (const callback of callbacks) callback();
      // Browsing fifty variants must not retain fifty decoded 512px paintings.
      let loaded = [...templateCache.values()].filter(
        (item) => item.loaded,
      ).length;
      for (const [key, candidate] of templateCache) {
        if (loaded <= 12) break;
        if (key !== url && candidate.loaded && !candidate.callbacks.size) {
          templateCache.delete(key);
          loaded--;
        }
      }
    };
    img.onload = () => complete(true);
    img.onerror = () => complete(false);
    if (onReady) entry.callbacks.add(onReady);
    img.src = url;
  } else if (!entry.loaded && !entry.failed && onReady)
    entry.callbacks.add(onReady);
  if (entry.loaded) {
    templateCache.delete(url);
    templateCache.set(url, entry);
    return entry.img;
  }
  return null;
}

async function preloadUrls(urls) {
  const requests = urls.map((url) => {
    getTemplateLayer(url);
    return templateCache.get(url)?.promise ?? Promise.resolve(false);
  });
  return (await Promise.all(requests)).every(Boolean);
}

export async function preloadSelectedAvatarTemplate(settings = {}) {
  if (settings.style === "classic") return true;
  const chosen = sceneForSettings(settings);
  if (chosen.overlay && (await preloadUrls([chosen.overlay]))) return true;
  const id = chosen.sceneId ?? chosen.id;
  await preloadUrls([
    `/avatar-templates/${id}-bg.webp`,
    `/avatar-templates/${id}-fg.webp`,
  ]);
  return false;
}

// Backwards-compatible entry point; deliberately loads only the selected scene.
export function preloadAvatarTemplates(settings = {}) {
  return preloadSelectedAvatarTemplate(settings);
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

// Weak photo keys release old selfies; each entry holds at most six scene grades.
const gradedPortraits = new WeakMap();

function makeGradedPortraitCanvas(
  image,
  isIsolated,
  hatShadow,
  sceneId,
  scene,
  paintStrength = 0.75,
) {
  if (typeof document === "undefined") return image;
  const chosen =
    scene ??
    avatarScenes.find((item) => item.id === sceneId) ??
    avatarScenes[0];
  let versions = gradedPortraits.get(image);
  if (!versions) {
    versions = new Map();
    gradedPortraits.set(image, versions);
  }
  const key = `${chosen.id}:${isIsolated ? 1 : 0}:${JSON.stringify(chosen.lighting ?? null)}:${hatShadow}:${paintStrength}`;
  if (versions.has(key)) {
    const cached = versions.get(key);
    versions.delete(key);
    versions.set(key, cached);
    return cached;
  }
  const scale = Math.min(1, 640 / Math.max(image.width, image.height));
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(image.width * scale));
  off.height = Math.max(1, Math.round(image.height * scale));
  const sx = off.width / image.width,
    sy = off.height / image.height;
  if (image.faceBox) {
    const box = image.faceBox;
    off.faceBox = {
      w: box.w * sx,
      h: box.h * sy,
      cx: box.cx * sx,
      cy: box.cy * sy,
    };
    if (Number.isFinite(box.topY)) off.faceBox.topY = box.topY * sy;
    if (Number.isFinite(box.chinY)) off.faceBox.chinY = box.chinY * sy;
  }
  off.landmarks = mapFaceLandmarks(
    image.landmarks,
    { scaleX: sx, scaleY: sy },
    "graded-pixels",
  );
  if (image.pose) off.pose = { ...image.pose };
  const ctx = off.getContext("2d");
  ctx.drawImage(image, 0, 0, off.width, off.height);
  try {
    const pixels = ctx.getImageData(0, 0, off.width, off.height);
    applyVintagePortraitGrade(pixels.data, off.width, off.height, {
      strength: 0.78,
      smoothing: true,
      painterly: true,
      paintStrength,
      hatShadow: chosen.hasHat ? hatShadow : 0,
      sceneId,
      faceBox: off.faceBox,
      landmarks: off.landmarks,
      lighting: chosen.lighting,
    });
    if (isIsolated)
      extendPortraitEdges(
        pixels.data,
        off.width,
        off.height,
        Math.min(4, (chosen.featherPx ?? 1.2) * 1.6),
      );
    ctx.putImageData(pixels, 0, 0);
  } catch {
    // The proportional source still works if canvas pixel readback is unavailable.
  }
  versions.set(key, off);
  // Six recent scene grades per weak photo key, rather than fifty 640px copies.
  if (versions.size > 6) versions.delete(versions.keys().next().value);
  return off;
}

function drawFaceWithOverlay(ctx, portrait, scene, settings) {
  const graded = makeGradedPortraitCanvas(
    portrait.source,
    portrait.isolated,
    scene.hatShadow,
    scene.sceneId,
    scene,
    settings.paintStrength,
  );
  const placement = portraitScenePlacement(
    graded,
    scene,
    settings,
    portrait.isolated,
  );
  const bounds = scene.openingBounds;
  ctx.save();
  // The central aperture is separate from transparent pixels outside the frame.
  // The painted foreground itself supplies the exact curved occlusion boundary.
  ctx.beginPath();
  ctx.rect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
  ctx.clip();
  ctx.transform(...placement.transform);
  ctx.drawImage(graded, 0, 0);
  ctx.restore();
  return placement;
}

function drawHairAboveOverlay(ctx, portrait, scene, placement, paintStrength) {
  const capMask = portrait.source.headCapMask ?? portrait.source.hairMask;
  if (!scene.hairWindow || !portrait.isolated || !capMask) return;
  const graded = makeGradedPortraitCanvas(
    portrait.source,
    true,
    scene.hatShadow,
    scene.sceneId,
    scene,
    paintStrength,
  );
  if (!graded.hairLayer) {
    const hair = document.createElement("canvas");
    hair.width = graded.width;
    hair.height = graded.height;
    const hairContext = hair.getContext("2d");
    hairContext.drawImage(graded, 0, 0);
    hairContext.globalCompositeOperation = "destination-in";
    hairContext.drawImage(capMask, 0, 0, hair.width, hair.height);
    graded.hairLayer = hair;
  }
  const faceBottom = scene.faceBounds.y + scene.faceBounds.height;
  const bottom = Math.min(
    faceBottom,
    (scene.anchors.chin?.[1] ?? faceBottom) + 1,
    scene.collarY - 5,
  );
  ctx.save();
  // Bring the real hair and upper forehead in front of the hatless backdrop.
  // Each window protects the painted frame or glass and the lower collar.
  ctx.beginPath();
  ctx.ellipse(...scene.hairWindow, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, 256, bottom);
  ctx.clip();
  ctx.transform(...placement.transform);
  ctx.drawImage(graded.hairLayer, 0, 0);
  ctx.restore();
}

function drawFaceInTemplate(
  ctx,
  { source: image, isolated },
  scene,
  { zoom, offsetX, offsetY, paintStrength },
) {
  const graded = makeGradedPortraitCanvas(
    image,
    isolated,
    scene.hatShadow,
    scene.id,
    scene,
    paintStrength,
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

function finishCanvas(ctx, size, intensity = 2) {
  try {
    const pixels = ctx.getImageData(0, 0, size, size);
    applyAntiqueMedallionFinish(pixels.data, size, size, intensity);
    ctx.putImageData(pixels, 0, 0);
  } catch {
    /* Pixel readback can be restricted by the browser. */
  }
}

export function drawAvatar(canvas, portrait, settings = {}, size = 256) {
  const {
    style = "illustrated",
    scene = "elf",
    variant = "front",
    zoom = style === "illustrated" &&
    (portrait?.source?.landmarks?.detected || portrait?.isolated)
      ? 1
      : 1.15,
    offsetX = 0,
    offsetY = 0,
    beard = true,
    rotation = 0,
    paintStrength = 0.75,
  } = settings;
  if (style === "classic") {
    pendingRedraws.delete(canvas);
    return drawAvatarClassic(
      canvas,
      portrait,
      { scene, zoom, offsetX, offsetY, beard },
      size,
    );
  }
  const currentSettings = {
    style,
    scene,
    variant,
    zoom,
    offsetX,
    offsetY,
    beard,
    rotation,
    paintStrength,
  };
  pendingRedraws.set(canvas, { portrait, settings: currentSettings, size });
  if (!portrait) return { ready: false };
  let triggerRedraw = redrawCallbacks.get(canvas);
  if (!triggerRedraw) {
    triggerRedraw = () => {
      const latest = pendingRedraws.get(canvas);
      if (latest)
        drawAvatar(canvas, latest.portrait, latest.settings, latest.size);
    };
    redrawCallbacks.set(canvas, triggerRedraw);
  }
  const chosen = sceneForSettings(currentSettings);
  let overlay;
  if (chosen.overlay) {
    overlay = getTemplateLayer(chosen.overlay, triggerRedraw);
    if (!overlay && !templateCache.get(chosen.overlay)?.failed)
      return { ready: false };
  }
  const id = chosen.sceneId ?? chosen.id;
  let background, foreground;
  const legacy = avatarScenes.find((item) => item.id === id) ?? avatarScenes[0];
  if (!overlay) {
    const bgUrl = `/avatar-templates/${id}-bg.webp`,
      fgUrl = `/avatar-templates/${id}-fg.webp`;
    background = getTemplateLayer(bgUrl, triggerRedraw);
    foreground = getTemplateLayer(fgUrl, triggerRedraw);
    const failed =
      templateCache.get(bgUrl)?.failed ||
      templateCache.get(fgUrl)?.failed ||
      typeof Image === "undefined";
    if ((!background || !foreground) && !failed) return { ready: false };
    if ((!background || !foreground) && failed) {
      drawAvatarClassic(
        canvas,
        portrait,
        { scene: id, zoom, offsetX, offsetY, beard },
        size,
      );
      return { ready: true, fallback: true };
    }
  }
  // Do not clear a completed previous result until the replacement is ready.
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.save();
  ctx.scale(size / 256, size / 256);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#0b2822";
  ctx.fillRect(0, 0, 256, 256);
  let placement;
  if (overlay) {
    placement = drawFaceWithOverlay(ctx, portrait, chosen, currentSettings);
    ctx.drawImage(overlay, 0, 0, 256, 256);
    drawHairAboveOverlay(ctx, portrait, chosen, placement, paintStrength);
  } else {
    ctx.drawImage(background, 0, 0, 256, 256);
    drawFaceInTemplate(ctx, portrait, legacy, currentSettings);
    ctx.drawImage(foreground, 0, 0, 256, 256);
    if (id === "santa" && beard) {
      const [x, y, rx, ry] = legacy.face;
      drawAdaptiveSantaBeard(
        ctx,
        x + offsetX * 0.27,
        y + offsetY * 0.27,
        rx * zoom,
        ry * zoom,
      );
    }
  }
  ctx.restore();
  finishCanvas(ctx, size, overlay ? 1.5 : 3);
  return { ready: true, fallback: !overlay, alignment: placement?.alignment };
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
  if (settings.style !== "classic")
    await preloadSelectedAvatarTemplate(settings);
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
  if (settings.style !== "classic")
    await preloadSelectedAvatarTemplate(settings);
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
