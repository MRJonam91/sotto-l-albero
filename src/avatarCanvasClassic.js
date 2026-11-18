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
    id: "ornament",
    name: "Pallina di vetro",
    colors: ["#0b342b", "#061c19"],
    face: [128, 132, 57, 64],
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

function evergreen(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  stroke(ctx, "#668a68", 2, () => {
    ctx.moveTo(0, 0);
    ctx.lineTo(92, 0);
  });
  for (let i = 0; i < 17; i++) {
    const start = 5 + i * 5;
    const span = 23 - i * 0.8;
    stroke(ctx, i % 3 ? "#426f55" : "#86a682", 1.5, () => {
      ctx.moveTo(start + 9, -span);
      ctx.lineTo(start, 0);
      ctx.lineTo(start + 9, span);
    });
  }
  ctx.restore();
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
      glow(ctx, 129, 105, 126, "#9c7e467f");
      evergreen(ctx, 0, 125, -1.12);
      evergreen(ctx, 257, 141, -2.02);
      for (const [x, y] of [
        [31, 116],
        [221, 121],
        [34, 163],
        [219, 50],
      ]) {
        glow(ctx, x, y, 18, "#ebb35b8c");
        star(ctx, x, y, 3);
      }
      ellipse(
        ctx,
        128,
        257,
        99,
        87,
        material(ctx, 65, 164, 121, 85, ["#467759", "#254d3c", "#123428"]),
      );
      polygon(
        ctx,
        [
          [83, 101],
          [48, 88],
          [76, 132],
        ],
        "#b17a57",
      );
      polygon(
        ctx,
        [
          [172, 101],
          [208, 88],
          [180, 132],
        ],
        "#b17a57",
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
      glow(ctx, 205, 44, 45, "#ffedb963");
      star(ctx, 47, 45, 11, "#ffdf9e");
      star(ctx, 204, 101, 6, "#ffdf9e");
      ellipse(
        ctx,
        128,
        150,
        61,
        102,
        material(ctx, 62, 55, 111, 112, ["#6c4835", "#382825", "#201c24"]),
      );
      ellipse(ctx, 128, 202, 73, 57, "#623936");
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
    case "ornament":
      evergreen(ctx, 0, 13, 0.63);
      evergreen(ctx, 256, 21, 2.55);
      evergreen(ctx, 0, 224, -0.48);
      evergreen(ctx, 256, 224, -2.65);
      glow(ctx, 128, 135, 97, "#d5dbad72");
      ellipse(
        ctx,
        128,
        136,
        89,
        89,
        material(ctx, 48, 57, 156, 153, ["#315e51", "#253e39", "#193833"]),
      );
      pine(ctx, 63, 177, 0.7, "#56786d");
      pine(ctx, 192, 179, 0.9, "#628579");
      break;
    case "gingerbread":
      ellipse(ctx, 129, 107, 75, 77, "#ae633d");
      ellipse(ctx, 129, 214, 89, 81, "#bd7449");
      break;
  }
}

function drawFace(
  ctx,
  { source: image, isolated },
  [x, y, rx, ry],
  { zoom, offsetX, offsetY },
) {
  ctx.save();
  if (isolated) {
    const scale =
      Math.min((rx * 2.15) / image.width, (ry * 2) / image.height) * zoom;
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.shadowColor = "#271a167c";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(
      image,
      x - w / 2 + offsetX * 0.27,
      y - h / 2 + offsetY * 0.27,
      w,
      h,
    );
    ctx.restore();
    return;
  }
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

function elfHat(ctx) {
  ctx.beginPath();
  ctx.moveTo(65, 81);
  ctx.bezierCurveTo(70, 27, 104, 37, 148, 17);
  ctx.bezierCurveTo(188, -1, 208, 27, 207, 47);
  ctx.quadraticCurveTo(179, 30, 171, 53);
  ctx.quadraticCurveTo(176, 68, 186, 76);
  ctx.quadraticCurveTo(125, 62, 65, 81);
  ctx.fillStyle = material(ctx, 93, 23, 45, 56, [
    "#7b9770",
    "#3e644d",
    "#244537",
  ]);
  ctx.fill();
  stroke(ctx, "#d3b472", 4, () => {
    ctx.moveTo(66, 81);
    ctx.quadraticCurveTo(125, 62, 186, 76);
  });
  ellipse(
    ctx,
    207,
    47,
    8,
    8,
    material(ctx, 200, 40, 15, 13, [cream, gold, "#846035"]),
  );
  star(ctx, 104, 58, 5);
  star(ctx, 123, 51, 3);
}

function goggles(ctx) {
  stroke(ctx, "#49312d", 10, () => {
    ctx.moveTo(78, 59);
    ctx.quadraticCurveTo(128, 32, 180, 59);
  });
  for (const x of [109, 149]) {
    ellipse(
      ctx,
      x,
      49,
      19,
      14,
      material(ctx, x - 9, 40, 19, 16, ["#f0cd83", "#af783f", "#f3d29a"]),
    );
    ellipse(
      ctx,
      x,
      49,
      14,
      10,
      material(ctx, x - 11, 45, 16, 11, ["#73889d", "#253842", "#201f2d"]),
    );
    stroke(ctx, "#e7edf5b5", 2, () => ctx.arc(x, 50, 9, 3.7, 4.7));
  }
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
      elfHat(ctx);
      polygon(
        ctx,
        [
          [56, 187],
          [126, 220],
          [200, 187],
          [190, 227],
          [72, 227],
        ],
        material(ctx, 75, 185, 103, 43, ["#e7d2a0", "#ad8c56", "#ecd3a1"]),
      );
      fillRect(ctx, 118, 222, 21, 34, "#255944");
      ellipse(ctx, 129, 237, 6, 6, gold);
      for (const [x, y] of [
        [78, 210],
        [91, 216],
        [165, 216],
        [180, 207],
      ])
        star(ctx, x, y, 3, "#fff0cc");
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
      goggles(ctx);
      stroke(ctx, "#c79e77", 7, () => {
        ctx.moveTo(77, 66);
        ctx.quadraticCurveTo(64, 104, 84, 150);
        ctx.moveTo(181, 66);
        ctx.quadraticCurveTo(194, 104, 174, 150);
      });
      ellipse(
        ctx,
        129,
        170,
        59,
        16,
        material(ctx, 74, 156, 96, 32, ["#9d3d44", "#651d31", "#bc5c4c"]),
      );
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
        material(ctx, 59, 172, 126, 63, ["#db795d", "#a84049", "#5d2031"]),
      );
      stroke(ctx, gold, 5, () => {
        ctx.moveTo(34, 240);
        ctx.lineTo(181, 240);
        ctx.quadraticCurveTo(221, 240, 233, 219);
      });
      stroke(ctx, "#f6ca83", 2.5, () => {
        ctx.moveTo(35, 199);
        ctx.lineTo(172, 199);
        ctx.quadraticCurveTo(201, 197, 225, 179);
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
    case "ornament": {
      stroke(ctx, "#c7a56b", 1.5, () => {
        ctx.moveTo(128, 0);
        ctx.lineTo(128, 37);
      });
      fillRect(
        ctx,
        114,
        37,
        28,
        15,
        material(ctx, 114, 37, 28, 0, ["#a77439", "#f0d49b", "#9e733d"]),
      );
      ellipse(
        ctx,
        128,
        136,
        89,
        89,
        material(ctx, 60, 56, 160, 155, [
          "#fff1c827",
          "#a0e1e012",
          "#f6d5a63b",
        ]),
      );
      stroke(ctx, "#e9d5a1b0", 2.2, () =>
        ctx.arc(128, 136, 89, 0, Math.PI * 2),
      );
      stroke(ctx, "#faf4dbb3", 5, () => ctx.arc(128, 136, 79, 3.59, 4.36));
      stroke(ctx, "#afd0c995", 2.3, () => ctx.arc(128, 136, 79, 0.42, 1.52));
      for (const [x, y, size] of [
        [63, 101, 7],
        [193, 106, 5],
        [178, 190, 6],
        [91, 205, 4],
      ]) {
        star(ctx, x, y, size, "#f4e6c0");
      }
      break;
    }
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
  portrait,
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
  if (portrait)
    drawFace(ctx, portrait, chosen.face, { zoom, offsetX, offsetY });
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
