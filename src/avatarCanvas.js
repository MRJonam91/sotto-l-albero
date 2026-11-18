import {
  applyAntiqueMedallionFinish,
  applyVintagePortraitGrade,
} from "./avatarVintageFilter.js";

export const avatarScenes = [
  {
    id: "elf",
    name: "Elfo di bottega",
    colors: ["#d8c6a5", "#9f8764"],
    face: [128, 125, 55, 66],
    hatShadow: 0.32,
  },
  {
    id: "santa",
    name: "Babbo Natale",
    colors: ["#4a4134", "#27211a"],
    face: [125, 121, 56, 65],
    hatShadow: 0.34,
  },
  {
    id: "sleigh",
    name: "Volo in slitta",
    colors: ["#14233c", "#2a384e"],
    face: [128, 118, 46, 56],
    hatShadow: 0.36,
  },
  {
    id: "chimney",
    name: "Dentro il camino",
    colors: ["#17253a", "#324357"],
    face: [128, 134, 49, 57],
    hatShadow: 0.34,
  },
  {
    id: "snowglobe",
    name: "Sfera di neve",
    colors: ["#1e3545", "#385e68"],
    face: [128, 118, 54, 62],
    hatShadow: 0.22,
  },
  {
    id: "ornament",
    name: "Pallina di vetro",
    colors: ["#142e24", "#0a1914"],
    face: [128, 142, 54, 63],
    hatShadow: 0.2,
  },
  {
    id: "gingerbread",
    name: "Pan di zenzero",
    colors: ["#44251c", "#211510"],
    face: [128, 108, 52, 59],
    hatShadow: 0.24,
  },
];

const cream = "#f6ead3";
const gold = "#deb261";
const crimson = "#8f2224";
const brightRed = "#b33234";

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

function furCluster(
  ctx,
  points,
  baseRadius,
  baseColor = "#e7d8be",
  highlight = "#fbf3e4",
) {
  for (let i = 0; i < points.length; i++) {
    const [x, y, rScale = 1] = points[i];
    const r = baseRadius * rScale;
    ellipse(ctx, x, y + 1.5, r * 1.05, r * 0.95, "#9c896e55");
    ellipse(ctx, x, y, r, r * 0.92, baseColor);
    ellipse(ctx, x - r * 0.18, y - r * 0.18, r * 0.65, r * 0.58, highlight);
  }
}

function pineBranch(ctx, x, y, angle, length = 85) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  stroke(ctx, "#4a3525", 2.5, () => {
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
  });
  for (let i = 0; i < 18; i++) {
    const start = 4 + (i * length) / 19;
    const span = 21 - i * 0.65;
    stroke(ctx, i % 2 ? "#274732" : "#486b4c", 1.7, () => {
      ctx.moveTo(start + 8, -span);
      ctx.lineTo(start, 0);
      ctx.lineTo(start + 8, span);
    });
  }
  ctx.restore();
}

function hollyBerries(ctx, clusters) {
  for (const [cx, cy] of clusters) {
    for (const [dx, dy] of [
      [-4, 0],
      [3, -3],
      [2, 3],
    ]) {
      ellipse(ctx, cx + dx, cy + dy, 3.6, 3.6, "#8c2224");
      ellipse(ctx, cx + dx - 1, cy + dy - 1, 1.2, 1.2, "#e07a74");
    }
  }
}

function snow(ctx, count, foreground = false) {
  for (let i = 0; i < count; i += 1) {
    const x = (19 + i * 97) % 256;
    const y = (23 + i * 61) % 256;
    if (foreground && x > 70 && x < 186 && y > 48 && y < 182) continue;
    const r = 0.8 + (i % 5) * 0.42;
    ellipse(ctx, x, y, r, r, i % 3 ? "#fff4dc90" : "#f5d79ab0");
  }
}

function snowflakeMotif(ctx, cx, cy, radius, color = "#fff6e5cc") {
  ctx.save();
  ctx.translate(cx, cy);
  for (let arm = 0; arm < 6; arm++) {
    ctx.rotate(Math.PI / 3);
    stroke(ctx, color, 1.1, () => {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, radius);
      ctx.moveTo(0, radius * 0.55);
      ctx.lineTo(-radius * 0.25, radius * 0.78);
      ctx.moveTo(0, radius * 0.55);
      ctx.lineTo(radius * 0.25, radius * 0.78);
    });
  }
  ctx.restore();
}

function pineTree(
  ctx,
  x,
  y,
  scale,
  darkColor = "#1d332c",
  snowColor = "#dce3e0",
) {
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
  ellipse(ctx, x, y - h * 0.58, w * 0.42, 3 * scale, snowColor);
  ellipse(ctx, x, y - h * 0.22, w * 0.62, 3.5 * scale, snowColor);
}

function drawCottageVillage(ctx) {
  fillRect(ctx, 18, 120, 44, 42, "#3a3537");
  polygon(
    ctx,
    [
      [12, 123],
      [40, 96],
      [68, 123],
    ],
    "#e8e0d5",
  );
  fillRect(ctx, 33, 132, 12, 14, "#f7c774");
  glow(ctx, 39, 139, 16, "#ffcf7566");

  fillRect(ctx, 178, 108, 64, 55, "#463733");
  fillRect(ctx, 194, 82, 13, 24, "#744133");
  ellipse(ctx, 201, 72, 7, 10, "#d9dad788");
  ellipse(ctx, 206, 57, 10, 13, "#d9dad755");
  polygon(
    ctx,
    [
      [170, 112],
      [210, 84],
      [248, 112],
    ],
    "#ebe3d5",
  );
  fillRect(ctx, 198, 124, 16, 16, "#fad184");
  glow(ctx, 206, 132, 22, "#ffd98477");
}

function texturedBricks(ctx, yStart) {
  fillRect(ctx, 24, yStart, 208, 256 - yStart, "#b59f8e");
  const rows = [
    [
      [28, 58, "#8c3d2b"],
      [90, 74, "#9e4b36"],
      [168, 60, "#7a3223"],
    ],
    [
      [28, 34, "#7d3525"],
      [66, 68, "#94412e"],
      [138, 56, "#a6513b"],
      [198, 30, "#833828"],
    ],
    [
      [28, 62, "#9b4734"],
      [94, 70, "#813726"],
      [168, 60, "#91412f"],
    ],
  ];
  for (let r = 0; r < rows.length; r++) {
    const y = yStart + 6 + r * 24;
    for (const [x, w, color] of rows[r]) {
      fillRect(ctx, x, y, w, 19, color);
      fillRect(ctx, x + 2, y + 2, w - 4, 3, "#cb765744");
      fillRect(ctx, x + 2, y + 14, w - 4, 3, "#3b150e44");
    }
  }
}

function drawBackground(ctx, scene) {
  const [top, bottom] = scene.colors;
  const gradient = ctx.createLinearGradient(25, 10, 225, 246);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  fillRect(ctx, 0, 0, 256, 256, gradient);

  switch (scene.id) {
    case "elf":
      glow(ctx, 128, 116, 118, "#f5deb380");
      pineBranch(ctx, 170, 26, 0.55, 92);
      pineBranch(ctx, 182, 104, 0.18, 84);
      pineBranch(ctx, 178, 162, -0.25, 86);
      pineBranch(ctx, 76, 172, 2.85, 86);
      pineBranch(ctx, 72, 118, 3.25, 80);
      hollyBerries(ctx, [
        [204, 66],
        [218, 92],
        [44, 152],
        [55, 184],
      ]);
      ellipse(
        ctx,
        128,
        244,
        96,
        66,
        material(ctx, 50, 185, 156, 70, ["#2e4f39", "#1d3827", "#14281c"]),
      );
      polygon(
        ctx,
        [
          [78, 102],
          [42, 86],
          [56, 116],
          [79, 130],
        ],
        "#ce916a",
      );
      polygon(
        ctx,
        [
          [74, 108],
          [50, 94],
          [60, 114],
          [75, 122],
        ],
        "#9d5f41",
      );
      polygon(
        ctx,
        [
          [178, 102],
          [214, 86],
          [200, 116],
          [177, 130],
        ],
        "#ce916a",
      );
      polygon(
        ctx,
        [
          [182, 108],
          [206, 94],
          [196, 114],
          [181, 122],
        ],
        "#9d5f41",
      );
      break;

    case "santa":
      glow(ctx, 128, 115, 112, "#8c735355");
      ellipse(
        ctx,
        128,
        244,
        104,
        74,
        material(ctx, 40, 175, 176, 80, ["#8e2022", "#631315", "#470d0e"]),
      );
      furCluster(
        ctx,
        [
          [56, 192, 1.1],
          [72, 206, 1.15],
          [90, 218, 1.2],
          [166, 218, 1.2],
          [184, 206, 1.15],
          [200, 192, 1.1],
        ],
        13,
      );
      break;

    case "sleigh":
      snow(ctx, 38);
      glow(ctx, 198, 66, 28, "#ffe7a366");
      star(ctx, 198, 66, 12, "#ffe59e");
      pineTree(ctx, 34, 176, 1.35);
      pineTree(ctx, 224, 178, 1.3);
      polygon(
        ctx,
        [
          [12, 152],
          [68, 156],
          [188, 156],
          [244, 152],
          [232, 235],
          [24, 235],
        ],
        material(ctx, 20, 150, 210, 85, ["#862022", "#581315", "#3d0c0e"]),
      );
      stroke(ctx, gold, 4, () => {
        ctx.moveTo(14, 153);
        ctx.quadraticCurveTo(45, 148, 70, 165);
        ctx.moveTo(242, 153);
        ctx.quadraticCurveTo(211, 148, 186, 165);
      });
      ellipse(ctx, 128, 112, 62, 68, "#452d1e");
      ellipse(
        ctx,
        128,
        232,
        92,
        62,
        material(ctx, 50, 175, 156, 75, ["#61412b", "#462d1d", "#2f1e13"]),
      );
      break;

    case "chimney":
      snow(ctx, 48);
      drawCottageVillage(ctx);
      break;

    case "snowglobe":
      snow(ctx, 36);
      pineTree(ctx, 52, 204, 1.25, "#5f8588");
      pineTree(ctx, 204, 204, 1.5, "#6b9396");
      ellipse(ctx, 128, 202, 78, 46, "#b9cfcd");
      break;

    case "ornament":
      pineBranch(ctx, 8, 42, 0.45, 105);
      pineBranch(ctx, 248, 42, 2.69, 105);
      pineBranch(ctx, 10, 210, -0.45, 105);
      pineBranch(ctx, 246, 210, -2.69, 105);
      hollyBerries(ctx, [
        [34, 82],
        [224, 78],
        [38, 198],
        [218, 196],
      ]);
      glow(ctx, 128, 142, 86, "#e3c58845");
      ellipse(
        ctx,
        128,
        142,
        78,
        78,
        material(ctx, 56, 68, 144, 144, ["#4c3f2f", "#2c241b", "#1c1610"]),
      );
      break;

    case "gingerbread":
      glow(ctx, 128, 115, 95, "#c57c4644");
      ellipse(ctx, 128, 108, 74, 76, "#9c5633");
      ellipse(ctx, 128, 214, 88, 80, "#ab623c");
      break;
  }
}

function makeGradedPortraitCanvas(image, isIsolated, hatShadow) {
  if (typeof document === "undefined") return image;
  const maxDim = 240;
  const scale = Math.min(
    1,
    maxDim / Math.max(image.width || 240, image.height || 240),
  );
  const w = Math.max(1, Math.round((image.width || 240) * scale));
  const h = Math.max(1, Math.round((image.height || 240) * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  octx.drawImage(image, 0, 0, w, h);
  try {
    const imgData = octx.getImageData(0, 0, w, h);
    applyVintagePortraitGrade(imgData.data, w, h, {
      strength: 0.84,
      smoothing: true,
      hatShadow: isIsolated ? hatShadow : hatShadow * 0.85,
    });
    octx.putImageData(imgData, 0, 0);
  } catch {
    // Fallback if canvas is tainted
  }
  return off;
}

function drawFace(
  ctx,
  { source: image, isolated },
  [x, y, rx, ry],
  { zoom, offsetX, offsetY },
  hatShadow = 0.28,
) {
  const graded = makeGradedPortraitCanvas(image, isolated, hatShadow);
  ctx.save();
  if (isolated) {
    const scale =
      Math.min((rx * 2.22) / graded.width, (ry * 2.08) / graded.height) * zoom;
    const w = graded.width * scale;
    const h = graded.height * scale;
    ctx.shadowColor = "#1a100b88";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(
      graded,
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
    Math.max((rx * 2) / graded.width, (ry * 2) / graded.height) * zoom;
  const w = graded.width * scale;
  const h = graded.height * scale;
  const dx = ((w / 2 - rx) * offsetX) / 100;
  const dy = ((h / 2 - ry) * offsetY) / 100;
  ctx.drawImage(graded, x - w / 2 + dx, y - h / 2 + dy, w, h);

  const innerShade = ctx.createRadialGradient(
    x,
    y,
    Math.min(rx, ry) * 0.68,
    x,
    y,
    Math.max(rx, ry),
  );
  innerShade.addColorStop(0, "transparent");
  innerShade.addColorStop(1, "#1e130c66");
  ellipse(ctx, x, y, rx, ry, innerShade);
  ctx.restore();
}

function drawElfForeground(ctx) {
  ctx.beginPath();
  ctx.moveTo(74, 84);
  ctx.bezierCurveTo(64, 34, 96, 12, 136, 16);
  ctx.bezierCurveTo(174, 20, 190, 52, 184, 84);
  ctx.quadraticCurveTo(128, 62, 74, 84);
  ctx.fillStyle = material(ctx, 70, 16, 118, 70, [
    "#3d6146",
    "#25422e",
    "#192e1f",
  ]);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(86, 36);
  ctx.bezierCurveTo(54, 42, 34, 82, 38, 126);
  ctx.bezierCurveTo(46, 104, 62, 82, 78, 72);
  ctx.closePath();
  ctx.fillStyle = material(ctx, 36, 36, 50, 90, ["#35563d", "#1e3726"]);
  ctx.fill();

  ellipse(
    ctx,
    38,
    131,
    8.5,
    8.5,
    material(ctx, 30, 123, 16, 16, ["#f9df9b", "#c5923e", "#6e4c1a"]),
  );
  stroke(ctx, "#3d260b", 1.5, () => {
    ctx.moveTo(33, 132);
    ctx.lineTo(43, 132);
  });

  ctx.beginPath();
  ctx.moveTo(71, 85);
  ctx.quadraticCurveTo(128, 59, 185, 85);
  ctx.quadraticCurveTo(188, 71, 180, 62);
  ctx.quadraticCurveTo(128, 42, 76, 62);
  ctx.closePath();
  ctx.fillStyle = material(ctx, 72, 48, 114, 36, [
    "#2a4a34",
    "#1f3827",
    "#2a4a34",
  ]);
  ctx.fill();

  stroke(ctx, gold, 2.2, () => {
    ctx.moveTo(72, 85);
    ctx.quadraticCurveTo(128, 61, 184, 85);
    ctx.moveTo(75, 65);
    ctx.quadraticCurveTo(128, 44, 181, 65);
  });

  for (const [bx, by] of [
    [92, 68],
    [110, 62],
    [128, 59],
    [146, 62],
    [164, 68],
  ]) {
    star(ctx, bx, by, 3.8, gold);
    ellipse(ctx, bx, by, 1.8, 1.8, "#a6292b");
  }

  furCluster(
    ctx,
    [
      [96, 179, 0.7],
      [106, 184, 0.7],
      [117, 187, 0.7],
      [139, 187, 0.7],
      [150, 184, 0.7],
      [160, 179, 0.7],
    ],
    7,
    "#e5d5b7",
    "#fbf2df",
  );
  polygon(
    ctx,
    [
      [84, 181],
      [124, 194],
      [124, 240],
      [68, 232],
    ],
    "#213d2a",
  );
  polygon(
    ctx,
    [
      [172, 181],
      [132, 194],
      [132, 240],
      [188, 232],
    ],
    "#213d2a",
  );
  for (const [cx, cy] of [
    [98, 206],
    [108, 220],
    [158, 206],
    [148, 220],
  ]) {
    star(ctx, cx, cy, 4, gold);
    ellipse(ctx, cx, cy, 2, 2, "#a4282a");
  }
}

function drawSantaHat(ctx, cx = 126, brimY = 72, scale = 1, pomRight = true) {
  ctx.save();
  ctx.translate(cx, brimY);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.moveTo(-64, 6);
  ctx.bezierCurveTo(-62, -46, -12, -64, 34, -54);
  if (pomRight) {
    ctx.bezierCurveTo(72, -44, 92, -8, 88, 34);
    ctx.bezierCurveTo(70, 22, 62, 6, 56, 4);
  } else {
    ctx.bezierCurveTo(-72, -44, -92, -8, -88, 34);
  }
  ctx.closePath();
  ctx.fillStyle = material(ctx, -60, -58, 145, 88, [
    "#a92629",
    "#7c171a",
    "#540e10",
  ]);
  ctx.fill();

  const brimPuffs = [
    [-54, 8, 1.05],
    [-38, 2, 1.15],
    [-20, -2, 1.2],
    [0, -4, 1.22],
    [20, -2, 1.2],
    [38, 2, 1.15],
    [54, 9, 1.05],
  ];
  furCluster(ctx, brimPuffs, 13.5, "#e6d7bd", "#fbf4e6");

  const px = pomRight ? 84 : -84;
  const py = 42;
  furCluster(
    ctx,
    [
      [px - 6, py, 0.9],
      [px + 6, py, 0.9],
      [px, py - 6, 0.95],
      [px, py + 5, 0.95],
      [px, py, 1.1],
    ],
    13,
    "#e6d7bd",
    "#fcf5e8",
  );
  ctx.restore();
}

function drawSantaBeardAndMoustache(ctx) {
  ellipse(ctx, 126, 152, 46, 12, "#24160e44");

  const beardPuffs = [
    [76, 144, 0.95],
    [74, 160, 1.1],
    [176, 144, 0.95],
    [178, 160, 1.1],
    [82, 174, 1.2],
    [98, 170, 1.15],
    [114, 172, 1.18],
    [138, 172, 1.18],
    [154, 170, 1.15],
    [170, 174, 1.2],
    [88, 192, 1.3],
    [108, 194, 1.35],
    [126, 196, 1.4],
    [144, 194, 1.35],
    [164, 192, 1.3],
    [98, 212, 1.25],
    [118, 216, 1.32],
    [136, 216, 1.32],
    [154, 212, 1.25],
    [114, 232, 1.15],
    [138, 232, 1.15],
  ];
  furCluster(ctx, beardPuffs, 13.5, "#dfd0b6", "#f8eedc");

  ctx.beginPath();
  ctx.moveTo(126, 135);
  ctx.bezierCurveTo(110, 130, 88, 135, 76, 147);
  ctx.bezierCurveTo(90, 149, 110, 143, 126, 140);
  ctx.bezierCurveTo(142, 143, 162, 149, 176, 147);
  ctx.bezierCurveTo(164, 135, 142, 130, 126, 135);
  ctx.fillStyle = "#f7eedb";
  ctx.fill();
  stroke(ctx, "#d1bfa2", 1.4, () => {
    ctx.moveTo(82, 145);
    ctx.quadraticCurveTo(106, 136, 126, 138);
    ctx.quadraticCurveTo(146, 136, 170, 145);
  });
}

function drawAviatorSleighForeground(ctx) {
  ctx.beginPath();
  ctx.moveTo(68, 86);
  ctx.bezierCurveTo(66, 26, 190, 26, 188, 86);
  ctx.quadraticCurveTo(128, 66, 68, 86);
  ctx.fillStyle = material(ctx, 68, 28, 120, 60, [
    "#734c32",
    "#4f3320",
    "#382315",
  ]);
  ctx.fill();

  furCluster(
    ctx,
    [
      [74, 86, 0.9],
      [70, 102, 0.95],
      [68, 118, 1.0],
      [66, 134, 1.05],
      [63, 148, 0.95],
      [182, 86, 0.9],
      [186, 102, 0.95],
      [188, 118, 1.0],
      [190, 134, 1.05],
      [193, 148, 0.95],
    ],
    10.5,
    "#d8c09d",
    "#f2e3ca",
  );
  furCluster(
    ctx,
    [
      [86, 76, 0.95],
      [102, 72, 1.0],
      [120, 70, 1.02],
      [136, 70, 1.02],
      [154, 72, 1.0],
      [170, 76, 0.95],
    ],
    10,
    "#dec7a4",
    "#f5e8d2",
  );

  stroke(ctx, "#3b2416", 7, () => {
    ctx.moveTo(74, 58);
    ctx.quadraticCurveTo(128, 42, 182, 58);
  });
  for (const gx of [106, 150]) {
    ellipse(
      ctx,
      gx,
      52,
      19,
      14,
      material(ctx, gx - 16, 38, 32, 28, ["#e5ba6e", "#94652a", "#f2cf8d"]),
    );
    ellipse(
      ctx,
      gx,
      52,
      14,
      10,
      material(ctx, gx - 12, 42, 24, 20, ["#52667a", "#23313f", "#172029"]),
    );
    stroke(ctx, "#fff3d9aa", 1.8, () => ctx.arc(gx - 2, 50, 8, 3.5, 4.8));
  }

  ellipse(
    ctx,
    128,
    176,
    54,
    16,
    material(ctx, 74, 160, 108, 32, ["#9b2528", "#681517", "#882022"]),
  );
  ellipse(
    ctx,
    134,
    190,
    58,
    15,
    material(ctx, 76, 175, 116, 30, ["#821c1e", "#591113", "#9b282a"]),
  );
  furCluster(
    ctx,
    [
      [62, 184, 1.05],
      [74, 196, 1.1],
      [182, 196, 1.1],
      [194, 184, 1.05],
    ],
    11,
    "#d8c09d",
    "#f0e1c8",
  );

  ellipse(ctx, 98, 224, 21, 16, "#3d2b20");
  ellipse(ctx, 158, 224, 21, 16, "#3d2b20");
  stroke(ctx, gold, 6, () => {
    ctx.moveTo(68, 244);
    ctx.quadraticCurveTo(128, 212, 188, 244);
  });
}

function drawChimneyForeground(ctx) {
  ctx.save();
  ctx.translate(126, 92);
  ctx.scale(-0.88, 0.88);
  drawSantaHat(ctx, 0, 0, 1, true);
  ctx.restore();

  texturedBricks(ctx, 174);

  furCluster(
    ctx,
    [
      [34, 172, 1.2],
      [54, 170, 1.25],
      [76, 171, 1.2],
      [98, 172, 1.22],
      [120, 171, 1.25],
      [140, 172, 1.25],
      [162, 171, 1.2],
      [184, 170, 1.25],
      [204, 171, 1.22],
      [222, 173, 1.15],
    ],
    13,
    "#ded9d1",
    "#f7f4ee",
  );

  for (const [mx, dir] of [
    [82, 1],
    [174, -1],
  ]) {
    ellipse(ctx, mx, 156, 23, 16, "#7e1d1f", dir * 0.18);
    ellipse(ctx, mx + dir * 15, 161, 10, 8, "#942426", dir * 0.3);
    snowflakeMotif(ctx, mx - dir * 3, 155, 9, "#f5ead6dd");
  }
}

function drawOrnamentForeground(ctx) {
  stroke(ctx, gold, 2.5, () => {
    ctx.moveTo(128, 6);
    ctx.lineTo(128, 48);
  });
  polygon(
    ctx,
    [
      [128, 34],
      [88, 20],
      [84, 44],
    ],
    crimson,
  );
  polygon(
    ctx,
    [
      [128, 34],
      [168, 20],
      [172, 44],
    ],
    crimson,
  );
  polygon(
    ctx,
    [
      [122, 36],
      [90, 56],
      [104, 62],
    ],
    brightRed,
  );
  polygon(
    ctx,
    [
      [134, 36],
      [166, 56],
      [152, 62],
    ],
    brightRed,
  );
  ellipse(ctx, 128, 34, 7, 6, "#6b1517");

  fillRect(
    ctx,
    114,
    47,
    28,
    16,
    material(ctx, 114, 47, 28, 0, ["#8d6328", "#f3d48c", "#7d5520"]),
  );

  const cx = 128;
  const cy = 142;
  const r = 79;

  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    if (angle > 1.25 && angle < 1.9) continue;
    const fx = cx + Math.cos(angle) * (r - 10);
    const fy = cy + Math.sin(angle) * (r - 10);
    snowflakeMotif(ctx, fx, fy, 7.5, "#fff7e688");
  }

  stroke(ctx, "#fff9ea99", 5.5, () => {
    ctx.arc(cx, cy, r - 8, 3.35, 4.18);
  });
  stroke(ctx, "#fff9ea55", 2.2, () => {
    ctx.arc(cx, cy, r - 4, 0.3, 1.25);
  });
  stroke(ctx, "#e8cfa0aa", 2.2, () => {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  });
}

function drawMedallionFrame(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 256, 256);
  ctx.arc(128, 128, 121, 0, Math.PI * 2, true);
  ctx.fillStyle = "#0b2822";
  ctx.fill();

  stroke(ctx, "#160e0888", 4, () => {
    ctx.arc(128, 128, 119, 0, Math.PI * 2);
  });

  const goldRing = material(ctx, 20, 20, 216, 216, [
    "#f3d48b",
    "#b8893d",
    "#f7dfa4",
    "#7c5720",
    "#dfb464",
  ]);
  stroke(ctx, goldRing, 5.5, () => {
    ctx.arc(128, 128, 121.5, 0, Math.PI * 2);
  });
  stroke(ctx, "#fff3cc88", 1.2, () => {
    ctx.arc(128, 128, 119.2, 0, Math.PI * 2);
  });
  ctx.restore();
}

function drawForeground(ctx, scene, beard) {
  switch (scene.id) {
    case "elf":
      drawElfForeground(ctx);
      break;
    case "santa":
      if (beard) drawSantaBeardAndMoustache(ctx);
      drawSantaHat(ctx, 126, 70, 1, true);
      break;
    case "sleigh":
      drawAviatorSleighForeground(ctx);
      break;
    case "chimney":
      drawChimneyForeground(ctx);
      break;
    case "snowglobe":
      stroke(ctx, "#c9ebedb8", 3, () => ctx.arc(128, 114, 96, 0, Math.PI * 2));
      stroke(ctx, "#e7fcffe0", 7, () =>
        ctx.arc(128, 113, 82, Math.PI * 1.09, Math.PI * 1.33),
      );
      ellipse(ctx, 128, 201, 88, 17, "#eff3ed");
      ellipse(ctx, 128, 224, 86, 24, "#7a4d3b");
      ellipse(ctx, 128, 212, 84, 12, "#b37b56");
      star(ctx, 128, 229, 9, cream);
      break;
    case "ornament":
      drawOrnamentForeground(ctx);
      break;
    case "gingerbread":
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
      break;
  }
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
  ctx.save();
  ctx.scale(size / 256, size / 256);
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, chosen);
  if (portrait) {
    drawFace(
      ctx,
      portrait,
      chosen.face,
      { zoom, offsetX, offsetY },
      chosen.hatShadow,
    );
  }
  drawForeground(ctx, chosen, beard);
  drawMedallionFrame(ctx);
  ctx.restore();

  try {
    const frameData = ctx.getImageData(0, 0, size, size);
    applyAntiqueMedallionFinish(frameData.data, size, size, 6);
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
