export const avatarScenes = [
  {
    id: "elf",
    name: "Elfo di bottega",
    colors: ["#172f27", "#4a2e28"],
    face: [129, 121, 53, 66],
  },
  {
    id: "santa",
    name: "Babbo Natale",
    colors: ["#153e3b", "#102826"],
    face: [128, 120, 56, 64],
  },
  {
    id: "sleigh",
    name: "Volo in slitta",
    colors: ["#151d42", "#745466"],
    face: [130, 104, 49, 60],
  },
  {
    id: "chimney",
    name: "Dentro il camino",
    colors: ["#182528", "#4e2c2b"],
    face: [128, 111, 53, 62],
  },
  {
    id: "snowglobe",
    name: "Sfera di neve",
    colors: ["#213b4b", "#3a6771"],
    face: [128, 117, 56, 62],
  },
  {
    id: "gingerbread",
    name: "Pan di zenzero",
    colors: ["#4c2923", "#232d27"],
    face: [128, 105, 53, 59],
  },
];

const cream = "#fff1d1";
const gold = "#edba64";
const red = "#b53c40";

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
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

function star(ctx, x, y, size, color = gold) {
  polygon(
    ctx,
    [
      [x, y - size],
      [x + size * 0.22, y - size * 0.24],
      [x + size, y],
      [x + size * 0.22, y + size * 0.24],
      [x, y + size],
      [x - size * 0.22, y + size * 0.24],
      [x - size, y],
      [x - size * 0.22, y - size * 0.24],
    ],
    color,
  );
}

function snow(ctx, count, foreground = false) {
  for (let i = 0; i < count; i += 1) {
    const x = (17 + i * 97) % 256;
    const y = (23 + i * 61) % 256;
    if (foreground && x > 74 && x < 182 && y > 50 && y < 175) continue;
    const r = 0.7 + (i % 5) / 2;
    ellipse(ctx, x, y, r, r, i % 4 ? "#fff3d796" : "#f9d38cba");
  }
}

function pine(ctx, x, y, scale, color) {
  const w = 19 * scale;
  const h = 54 * scale;
  polygon(
    ctx,
    [
      [x, y - h],
      [x + w * 0.68, y - h * 0.55],
      [x + w * 0.38, y - h * 0.55],
      [x + w, y - h * 0.16],
      [x + w * 0.6, y - h * 0.16],
      [x + w * 1.15, y],
      [x - w * 1.15, y],
      [x - w * 0.6, y - h * 0.16],
      [x - w, y - h * 0.16],
      [x - w * 0.38, y - h * 0.55],
      [x - w * 0.68, y - h * 0.55],
    ],
    color,
  );
}

function parcel(ctx, x, y, w, h, paper) {
  fillRect(ctx, x, y, w, h, paper);
  fillRect(ctx, x + w * 0.43, y, w * 0.16, h, gold);
  fillRect(ctx, x, y + h * 0.38, w, h * 0.12, gold);
}

function village(ctx) {
  ellipse(ctx, 205, 44, 22, 22, "#fff0bb");
  for (let i = 0; i < 7; i += 1) {
    const x = 10 + i * 38;
    const y = 197 + (i % 3) * 10;
    fillRect(ctx, x, y, 27, 47, i % 2 ? "#3d424d" : "#343440");
    polygon(
      ctx,
      [
        [x - 3, y + 1],
        [x + 12, y - 18],
        [x + 30, y + 1],
      ],
      "#eadbc8",
    );
    fillRect(ctx, x + 6, y + 8, 6, 9, "#f6c987");
    fillRect(ctx, x + 17, y + 8, 6, 9, "#f6c987");
  }
  ellipse(ctx, 119, 267, 160, 37, "#d4ced1");
}

function bricks(ctx, yStart, edgeOnly = false) {
  for (let row = 0; row < 7; row += 1) {
    const y = yStart + row * 25;
    if (y >= 256) break;
    for (let col = 0; col < 7; col += 1) {
      const x = col * 43 - (row % 2) * 20;
      if (edgeOnly && x > 33 && x < 187) continue;
      fillRect(
        ctx,
        x,
        y,
        40,
        22,
        ["#793d35", "#9a503e", "#82433a"][(row + col) % 3],
      );
      fillRect(ctx, x + 1, y + 1, 37, 2, "#c67d5b55");
    }
  }
}

function drawBackground(ctx, scene) {
  const [top, bottom] = scene.colors;
  const gradient = ctx.createLinearGradient(30, 0, 190, 256);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  fillRect(ctx, 0, 0, 256, 256, gradient);
  snow(ctx, 44);
  switch (scene.id) {
    case "elf":
      for (const y of [60, 114, 174]) {
        fillRect(ctx, 0, y, 256, 7, "#936043");
        parcel(ctx, 12 + (y % 23), y - 26, 27, 26, "#a74b41");
        parcel(ctx, 201 - (y % 16), y - 22, 26, 22, "#57826b");
      }
      ellipse(ctx, 128, 256, 87, 87, "#3d8966");
      polygon(
        ctx,
        [
          [83, 101],
          [48, 88],
          [76, 132],
        ],
        "#c08a68",
      );
      polygon(
        ctx,
        [
          [172, 101],
          [208, 88],
          [180, 132],
        ],
        "#c08a68",
      );
      break;
    case "santa":
      pine(ctx, 30, 215, 1.9, "#567c70");
      pine(ctx, 223, 227, 2.4, "#4b7366");
      pine(ctx, 20, 226, 1.4, "#28584c");
      ellipse(ctx, 129, 266, 91, 104, red);
      break;
    case "sleigh":
      village(ctx);
      ellipse(ctx, 128, 197, 74, 66, "#824343");
      break;
    case "chimney":
      bricks(ctx, 32, true);
      ellipse(ctx, 129, 235, 78, 85, "#9b4540");
      break;
    case "snowglobe":
      pine(ctx, 45, 208, 1.3, "#9ab8b8");
      pine(ctx, 211, 206, 1.7, "#a7c4c3");
      ellipse(ctx, 129, 202, 75, 48, "#b4c7c5");
      break;
    case "gingerbread":
      ellipse(ctx, 129, 107, 75, 77, "#ae633d");
      ellipse(ctx, 129, 214, 89, 81, "#bd7449");
      break;
  }
}

function drawFace(ctx, image, [x, y, rx, ry], { zoom, offsetX, offsetY }) {
  ctx.save();
  ellipse(ctx, x, y, rx, ry);
  ctx.clip();
  const scale =
    Math.max((rx * 2) / image.width, (ry * 2) / image.height) * zoom;
  const w = image.width * scale;
  const h = image.height * scale;
  const dx = ((w / 2 - rx) * offsetX) / 100;
  const dy = ((h / 2 - ry) * offsetY) / 100;
  ctx.drawImage(image, x - w / 2 + dx, y - h / 2 + dy, w, h);
  ctx.restore();
  stroke(ctx, "#fff1d17c", 2, () =>
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2),
  );
}

function drawHat(ctx, color, x, y) {
  polygon(
    ctx,
    [
      [x - 61, y],
      [x - 52, y - 30],
      [x - 16, y - 52],
      [x + 26, y - 55],
      [x + 73, y - 31],
      [x + 47, y - 33],
      [x + 55, y],
    ],
    color,
  );
  ellipse(ctx, x + 73, y - 31, 12, 11, cream);
  ellipse(ctx, x - 2, y + 1, 61, 9, cream);
}

function drawForeground(ctx, scene, beard) {
  switch (scene.id) {
    case "elf":
      drawHat(ctx, "#3d8966", 128, 66);
      polygon(
        ctx,
        [
          [56, 187],
          [126, 220],
          [200, 187],
          [190, 227],
          [72, 227],
        ],
        "#dcc88e",
      );
      fillRect(ctx, 118, 222, 21, 34, "#255944");
      ellipse(ctx, 129, 237, 6, 6, gold);
      break;
    case "santa":
      drawHat(ctx, red, 128, 68);
      if (beard) {
        ellipse(ctx, 91, 159, 17, 24, cream);
        ellipse(ctx, 165, 159, 17, 24, cream);
        ellipse(ctx, 127, 185, 39, 27, cream);
        ellipse(ctx, 129, 199, 23, 24, cream);
      }
      fillRect(ctx, 122, 217, 14, 39, cream);
      break;
    case "sleigh":
      drawHat(ctx, red, 130, 57);
      parcel(ctx, 31, 167, 35, 35, "#6b9469");
      parcel(ctx, 169, 156, 31, 39, "#d1a274");
      polygon(
        ctx,
        [
          [22, 192],
          [173, 192],
          [221, 171],
          [241, 172],
          [211, 217],
          [182, 232],
          [57, 232],
          [36, 220],
        ],
        red,
      );
      stroke(ctx, gold, 5, () => {
        ctx.moveTo(34, 240);
        ctx.lineTo(181, 240);
        ctx.quadraticCurveTo(221, 240, 233, 219);
      });
      break;
    case "chimney":
      bricks(ctx, 176);
      fillRect(ctx, 0, 173, 256, 11, "#d1a38e");
      ellipse(ctx, 20, 168, 54, 12, "#f1ded2");
      ellipse(ctx, 227, 169, 52, 11, "#f1ded2");
      for (const [x, y] of [
        [33, 43],
        [221, 77],
        [213, 130],
        [47, 134],
      ])
        star(ctx, x, y, 7);
      break;
    case "snowglobe":
      stroke(ctx, "#c9ebedb8", 3, () => ctx.arc(128, 114, 98, 0, Math.PI * 2));
      stroke(ctx, "#e7fcffe0", 8, () =>
        ctx.arc(128, 113, 82, Math.PI * 1.09, Math.PI * 1.33),
      );
      ellipse(ctx, 128, 201, 91, 18, "#eff3ed");
      ellipse(ctx, 128, 225, 89, 26, "#875744");
      ellipse(ctx, 128, 213, 87, 13, "#bf8560");
      star(ctx, 128, 232, 10, cream);
      break;
    case "gingerbread":
      stroke(ctx, cream, 5, () =>
        ctx.ellipse(128, 105, 66, 68, 0, 0, Math.PI * 2),
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
        red,
      );
      ellipse(ctx, 128, 184, 7, 7, "#d95854");
      for (const y of [212, 236]) ellipse(ctx, 128, y, 7, 7, cream);
      break;
  }
  snow(ctx, 29, true);
}

export function drawAvatar(
  canvas,
  image,
  { scene, zoom = 1.15, offsetX = 0, offsetY = 0, beard = true },
  size = 256,
) {
  const chosen =
    avatarScenes.find((item) => item.id === scene) ?? avatarScenes[0];
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.scale(size / 256, size / 256);
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, chosen);
  if (image) drawFace(ctx, image, chosen.face, { zoom, offsetX, offsetY });
  drawForeground(ctx, chosen, beard);
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
