import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sceneIds = [
  "elf",
  "santa",
  "sleigh",
  "cozy",
  "nutcracker",
  "victorian",
  "reindeer",
  "chimney",
  "ornament",
  "snowglobe",
];
const variantIds = ["front", "left", "right", "tilt-left", "tilt-right"];
const round = (value) => Math.round(value * 100) / 100;
const designedYaw = (variantId) =>
  variantId === "left" ? -10 : variantId === "right" ? 10 : 0;

/** Locate an enclosed alpha component, never the transparent outer corners. */
export function analyzeOpening(rgba, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const candidates = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || rgba[start * 4 + 3] >= 32) continue;
    let count = 0;
    let tail = 1;
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    queue[0] = start;
    visited[start] = 1;
    while (count < tail) {
      const position = queue[count++];
      const x = position % width;
      const y = Math.floor(position / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const neighbor of [
        x > 0 ? position - 1 : -1,
        x < width - 1 ? position + 1 : -1,
        y > 0 ? position - width : -1,
        y < height - 1 ? position + width : -1,
      ]) {
        if (neighbor < 0 || visited[neighbor] || rgba[neighbor * 4 + 3] >= 32)
          continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    const cx = (minX + maxX) / 2 / width;
    const cy = (minY + maxY) / 2 / height;
    if (
      minX > 0 &&
      minY > 0 &&
      maxX < width - 1 &&
      maxY < height - 1 &&
      count > width * height * 0.012 &&
      cx > 0.25 &&
      cx < 0.75 &&
      cy > 0.2 &&
      cy < 0.8
    ) {
      candidates.push({
        area: count,
        minX,
        maxX,
        minY,
        maxY,
        pixels: queue.slice(0, tail),
      });
    }
  }
  candidates.sort((a, b) => b.area - a.area);
  if (!candidates.length)
    throw new Error(
      "No enclosed central transparent face opening; regenerate the artwork.",
    );
  const chosen = candidates[0];
  const mask = new Uint8Array(width * height);
  const rows = Array.from({ length: height }, () => ({
    left: width,
    right: -1,
    width: 0,
  }));
  for (const index of chosen.pixels) {
    mask[index] = 1;
    const y = Math.floor(index / width),
      x = index % width;
    rows[y].left = Math.min(rows[y].left, x);
    rows[y].right = Math.max(rows[y].right, x);
    rows[y].width++;
  }
  delete chosen.pixels;
  return { ...chosen, mask, rows };
}

function calibrate(opening, width, height, sceneId, variantId) {
  const { rows, minX, maxX, minY, maxY } = opening;
  let widestY = minY;
  for (let y = minY; y <= maxY; y++)
    if (rows[y].width > rows[widestY].width) widestY = y;
  const widest = rows[widestY].width;
  let faceBottom = maxY;
  // A sustained narrowing below the broad head marks the short neck opening.
  for (let y = widestY + 1; y < maxY - 2; y++) {
    if ([0, 1, 2].every((offset) => rows[y + offset].width < widest * 0.65)) {
      faceBottom = y - 1;
      break;
    }
  }
  if (faceBottom - minY < height * 0.12 || widest < width * 0.12)
    throw new Error(`${sceneId}-${variantId}: face opening is too small.`);
  const faceHeight = faceBottom - minY + 1;
  let faceLeft = width,
    faceRight = -1;
  for (let y = minY; y <= faceBottom; y++) {
    faceLeft = Math.min(faceLeft, rows[y].left);
    faceRight = Math.max(faceRight, rows[y].right);
  }
  const faceWidth = faceRight - faceLeft + 1;
  const centerAt = (fraction) => {
    const row = rows[Math.round(minY + faceHeight * fraction)];
    return (row.left + row.right) / 2;
  };
  const measuredRoll =
    (Math.atan2(-(centerAt(0.7) - centerAt(0.3)), faceHeight * 0.4) * 180) /
    Math.PI;
  const roll = Math.max(-22, Math.min(22, measuredRoll));
  const yaw = designedYaw(variantId);
  const centerX = centerAt(0.45);
  const centerY = minY + faceHeight * 0.5;
  const eyeY = minY + faceHeight * 0.4;
  // The coverage fixture has eye centres 44% of its oval width apart.
  // Calibrating to 46% gives its uniform eye alignment a small edge margin.
  const eyeSpread = faceWidth * 0.23;
  const eyeSlope = Math.tan((roll * Math.PI) / 180);
  const safePoint = (x, y) => {
    let best = null;
    for (let dy = -14; dy <= 14; dy++)
      for (let dx = -14; dx <= 14; dx++) {
        const px = Math.round(x + dx),
          py = Math.round(y + dy);
        if (px < 3 || py < 3 || px >= width - 3 || py >= height - 3) continue;
        if (
          ![-3, 0, 3].every((oy) =>
            [-3, 0, 3].every((ox) => opening.mask[(py + oy) * width + px + ox]),
          )
        )
          continue;
        const distance = dx * dx + dy * dy;
        if (!best || distance < best.distance)
          best = { x: px, y: py, distance };
      }
    if (!best)
      throw new Error(
        `${sceneId}-${variantId}: designed feature falls outside the transparent face opening.`,
      );
    return [round((best.x * 256) / width), round((best.y * 256) / height)];
  };
  const scaledBox = (x, y, w, h) => ({
    x: round((x * 256) / width),
    y: round((y * 256) / height),
    width: round((w * 256) / width),
    height: round((h * 256) / height),
  });
  return {
    id: `${sceneId}-${variantId}`,
    sceneId,
    variantId,
    overlay: `/avatar-templates/v2/${sceneId}-${variantId}.webp`,
    coordinateSize: 256,
    openingBounds: scaledBox(minX, minY, maxX - minX + 1, maxY - minY + 1),
    faceBounds: scaledBox(faceLeft, minY, faceWidth, faceHeight),
    face: [
      round((centerX * 256) / width),
      round((centerY * 256) / height),
      round(((faceWidth / 2) * 256) / width),
      round(((faceHeight / 2) * 256) / height),
    ],
    anchors: {
      imageLeftEye: safePoint(centerX - eyeSpread, eyeY - eyeSpread * eyeSlope),
      imageRightEye: safePoint(
        centerX + eyeSpread,
        eyeY + eyeSpread * eyeSlope,
      ),
      noseTip: safePoint(
        centerAt(0.63) + (yaw / 18) * faceWidth * 0.045,
        minY + faceHeight * 0.63,
      ),
      mouthCenter: safePoint(
        centerAt(0.78) + (yaw / 18) * faceWidth * 0.025,
        minY + faceHeight * 0.78,
      ),
      chin: safePoint(centerAt(0.94), minY + faceHeight * 0.94),
    },
    pose: { yaw, pitch: 0, roll: round(roll) },
    lighting: {
      temperature: ["reindeer", "snowglobe"].includes(sceneId) ? 0.12 : 0.3,
      direction: [-0.65, -0.45],
      strength: sceneId === "chimney" ? 0.35 : 0.22,
    },
    collarY: round(((maxY + 1) * 256) / height),
    featherPx: 1.5,
  };
}

export async function prepareAvatarVariants({
  registry = path.join(root, ".wrangler/avatar-v2-generation.json"),
  strict = false,
  contactSheet = false,
} = {}) {
  const records = JSON.parse(await readFile(registry, "utf8"));
  if (!Array.isArray(records))
    throw new Error("Generation registry must be an array.");
  const outDir = path.join(root, "public/avatar-templates/v2");
  await mkdir(outDir, { recursive: true });
  const previousManifest = await readFile(
    path.join(outDir, "manifest.json"),
    "utf8",
  )
    .then(JSON.parse)
    .catch(() => null);
  const previous = new Map(
    previousManifest?.pipelineVersion === 1
      ? previousManifest.templates.map((template) => [template.id, template])
      : [],
  );
  const templates = [],
    sources = new Set(),
    keys = new Set(),
    errors = [];
  for (const record of records) {
    const { sceneId, variantId } = record;
    const id = `${sceneId}-${variantId}`;
    try {
      if (!sceneIds.includes(sceneId) || !variantIds.includes(variantId))
        throw new Error("Invalid scene or variant ID.");
      if (keys.has(id)) throw new Error("Duplicate scene/variant record.");
      keys.add(id);
      const sourcePath = path.resolve(root, record.path);
      const sourceBytes = await readFile(sourcePath);
      const sourceSha256 = createHash("sha256")
        .update(sourceBytes)
        .digest("hex");
      if (sources.has(sourceSha256))
        throw new Error(
          "Artwork is reused: every variant needs a separately generated source.",
        );
      sources.add(sourceSha256);
      const output = path.join(outDir, `${id}.webp`);
      const cached = previous.get(id);
      if (
        cached?.sourceSha256 === sourceSha256 &&
        (await stat(output).catch(() => null))?.size === cached.bytes
      ) {
        if (cached.calibrationVersion === 2) templates.push(cached);
        else {
          const rgba = await sharp(output).ensureAlpha().raw().toBuffer();
          const opening = analyzeOpening(rgba, 512, 512);
          templates.push({
            ...calibrate(opening, 512, 512, sceneId, variantId),
            calibrationVersion: 2,
            sourceSha256,
            bytes: cached.bytes,
            transparentOpeningPixels: opening.area,
          });
        }
        continue;
      }
      const image = sharp(sourceBytes).rotate();
      const metadata = await image.metadata();
      if (!metadata.hasAlpha)
        throw new Error("Artwork has no alpha channel; regenerate it.");
      if (Math.abs(metadata.width / metadata.height - 1) > 0.04)
        throw new Error("Artwork must be square.");
      const rgba = await image
        .resize(512, 512, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const opening = analyzeOpening(rgba, 512, 512);
      const template = calibrate(opening, 512, 512, sceneId, variantId);
      await sharp(rgba, { raw: { width: 512, height: 512, channels: 4 } })
        .webp({ quality: 92, alphaQuality: 100, effort: 6 })
        .toFile(output);
      templates.push({
        ...template,
        calibrationVersion: 2,
        sourceSha256,
        bytes: (await stat(output)).size,
        transparentOpeningPixels: opening.area,
      });
    } catch (error) {
      errors.push({ id, error: error.message });
    }
  }
  templates.sort(
    (a, b) =>
      sceneIds.indexOf(a.sceneId) - sceneIds.indexOf(b.sceneId) ||
      variantIds.indexOf(a.variantId) - variantIds.indexOf(b.variantId),
  );
  const manifest = {
    version: 2,
    pipelineVersion: 1,
    coordinateSize: 256,
    imageSize: 512,
    expectedCount: 50,
    complete: templates.length === 50 && !errors.length,
    templates,
    errors,
  };
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const modulePath = path.join(root, "src/avatarTemplateVariants.js");
  const module = await readFile(modulePath, "utf8");
  const browserMetadata = templates.map(
    ({
      sourceSha256,
      bytes,
      transparentOpeningPixels,
      calibrationVersion,
      ...template
    }) => template,
  );
  await writeFile(
    modulePath,
    module.replace(
      /\/\* avatar-templates:start \*\/[\s\S]*?\/\* avatar-templates:end \*\//,
      `/* avatar-templates:start */ ${JSON.stringify(browserMetadata, null, 2)} /* avatar-templates:end */`,
    ),
  );
  if (contactSheet) await createContactSheet(templates, outDir);
  if (strict && !manifest.complete)
    throw new Error(
      `Expected 50 valid separate templates, found ${templates.length}. ${JSON.stringify(errors)}`,
    );
  return {
    count: templates.length,
    totalBytes: templates.reduce((sum, template) => sum + template.bytes, 0),
    errors,
  };
}

async function createContactSheet(templates, outDir) {
  const tile = 200,
    cellHeight = 224;
  const sheetScenes = sceneIds.filter((sceneId) =>
    templates.some((template) => template.sceneId === sceneId),
  );
  if (!sheetScenes.length) return;
  const overlays = [];
  for (let row = 0; row < sheetScenes.length; row++)
    for (let col = 0; col < variantIds.length; col++) {
      const template = templates.find(
        (item) =>
          item.sceneId === sheetScenes[row] &&
          item.variantId === variantIds[col],
      );
      const x = col * tile,
        y = row * cellHeight;
      const background = Buffer.from(
        `<svg width="200" height="224" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="check" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#ddd"/><path d="M0 0h10v10H0zM10 10h10v10H10z" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#check)"/><rect y="200" width="200" height="24" fill="#181818"/><text x="100" y="216" fill="white" font-size="12" text-anchor="middle">${sheetScenes[row]} / ${variantIds[col]}${template ? "" : " — pending"}</text></svg>`,
      );
      overlays.push({ input: background, left: x, top: y });
      if (template) {
        overlays.push({
          input: await sharp(path.join(outDir, `${template.id}.webp`))
            .resize(tile, tile)
            .toBuffer(),
          left: x,
          top: y,
        });
        const points = Object.values(template.anchors)
          .map(
            ([px, py]) =>
              `<circle cx="${(px * tile) / 256}" cy="${(py * tile) / 256}" r="1.8" fill="#00ffff" stroke="#111" stroke-width=".5"/>`,
          )
          .join("");
        overlays.push({
          input: Buffer.from(
            `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">${points}</svg>`,
          ),
          left: x,
          top: y,
        });
      }
    }
  await sharp({
    create: {
      width: tile * 5,
      height: cellHeight * sheetScenes.length,
      channels: 4,
      background: "#181818",
    },
  })
    .composite(overlays)
    .webp({ quality: 86 })
    .toFile(path.join(root, ".wrangler/avatar-v2-contact-sheet.webp"));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const registryIndex = process.argv.indexOf("--registry");
  prepareAvatarVariants({
    registry:
      registryIndex >= 0
        ? path.resolve(process.argv[registryIndex + 1])
        : undefined,
    strict: process.argv.includes("--strict"),
    contactSheet: process.argv.includes("--contact-sheet"),
  })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
