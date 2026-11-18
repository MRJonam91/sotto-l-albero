import { useEffect, useId, useRef, useState } from "react";
import {
  CandyCane,
  Check,
  Flame,
  Lightbulb,
  PartyPopper,
  Snowflake,
  Sparkles,
  Star,
} from "lucide-react";
import { Modal, Button } from "./ui.jsx";
import {
  EXTRA_EFFECTS,
  SNOW_LEVELS,
  countActiveEffects,
} from "./ambientEffects.js";

const EFFECT_ICONS = {
  sparkles: Sparkles,
  fireworks: PartyPopper,
  fireplace: Flame,
  candies: CandyCane,
  lights: Lightbulb,
  meteors: Star,
};

const SNOW_PRESETS = {
  low: {
    density: 58,
    minCount: 34,
    maxCount: 82,
    radius: [1.2, 2.6],
    speedY: [22, 46],
    windX: [-4, 12],
    sway: [8, 22],
    alpha: [0.36, 0.62],
    streak: 0,
  },
  medium: {
    density: 108,
    minCount: 58,
    maxCount: 145,
    radius: [1.3, 3.6],
    speedY: [32, 68],
    windX: [4, 24],
    sway: [12, 30],
    alpha: [0.42, 0.8],
    streak: 0,
  },
  blizzard: {
    density: 255,
    minCount: 140,
    maxCount: 340,
    radius: [1.2, 4.4],
    speedY: [105, 225],
    windX: [95, 195],
    sway: [18, 45],
    alpha: [0.48, 0.92],
    streak: 0.14,
  },
};

const FIREWORK_PALETTES = [
  ["#ffe599", "#d6ba7b", "#fff7db"],
  ["#e0525e", "#ff9b85", "#ffd166"],
  ["#74c69d", "#d8f3dc", "#f5efe2"],
  ["#ff6b6b", "#f5efe2", "#d6ba7b"],
];

const LIGHT_COLORS = [
  [255, 209, 102],
  [214, 186, 123],
  [224, 82, 94],
  [116, 198, 157],
  [255, 243, 204],
];

const CANDY_TYPES = ["cane", "peppermint", "bonbon", "starCookie"];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawFourPointStar(ctx, x, y, outerR, innerR, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 4;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function makeFlake(width, height, preset, randomY = false) {
  return {
    x: rand(-40, width + 40),
    y: randomY ? rand(-20, height) : rand(-60, -8),
    r: rand(preset.radius[0], preset.radius[1]),
    vy: rand(preset.speedY[0], preset.speedY[1]),
    vx: rand(preset.windX[0], preset.windX[1]),
    swayAmp: rand(preset.sway[0], preset.sway[1]),
    swayFreq: rand(0.7, 1.8),
    phase: rand(0, Math.PI * 2),
    alpha: rand(preset.alpha[0], preset.alpha[1]),
  };
}

function makeSparkle(width, height, randomAge = false) {
  const life = rand(2.2, 4.4);
  return {
    x: rand(20, width - 20),
    y: rand(20, height - 20),
    life,
    age: randomAge ? rand(0, life) : 0,
    size: rand(5, 12),
    rotation: rand(0, Math.PI),
    spin: rand(-0.6, 0.6),
    vx: rand(-6, 6),
    vy: rand(-14, -4),
    tint: Math.random() < 0.7 ? "#ffe8a3" : "#fff8df",
  };
}

function makeSmokePuff(width, height, randomAge = false) {
  const leftSide = Math.random() < 0.5;
  const baseX = leftSide
    ? rand(width * 0.06, width * 0.24)
    : rand(width * 0.76, width * 0.94);
  const life = rand(4.5, 7.2);
  return {
    x: baseX,
    y: height + rand(10, 40),
    life,
    age: randomAge ? rand(0, life) : 0,
    vy: rand(34, 62),
    drift: rand(-14, 14),
    swayAmp: rand(8, 22),
    phase: rand(0, Math.PI * 2),
    startR: rand(14, 24),
    endR: rand(44, 72),
    maxAlpha: rand(0.06, 0.13),
  };
}

function makeEmber(width, height, randomAge = false) {
  const leftSide = Math.random() < 0.5;
  const baseX = leftSide
    ? rand(width * 0.05, width * 0.25)
    : rand(width * 0.75, width * 0.95);
  const life = rand(2.6, 4.8);
  return {
    x: baseX,
    y: height + rand(4, 24),
    life,
    age: randomAge ? rand(0, life) : 0,
    vy: rand(52, 105),
    vx: rand(-16, 16),
    phase: rand(0, Math.PI * 2),
    r: rand(1.3, 2.8),
    color: pick(["#ff9f43", "#ffd166", "#ff7043", "#ffe599"]),
  };
}

function makeCandy(width, height, randomAge = false) {
  const life = rand(4.6, 7.2);
  return {
    type: pick(CANDY_TYPES),
    x: rand(width * 0.08, width * 0.92),
    y: rand(height * 0.12, height * 0.88),
    size: rand(15, 23),
    life,
    age: randomAge ? rand(0, life * 0.85) : 0,
    rotation: rand(-0.45, 0.45),
    rotSpeed: rand(-0.35, 0.35),
    vx: rand(-8, 8),
    vy: rand(-12, -4),
    bobPhase: rand(0, Math.PI * 2),
    palette:
      Math.random() < 0.5 ? ["#c93b47", "#f8f2e4"] : ["#d6ba7b", "#a73943"],
  };
}

function makeTreeLight(width, height, index, total) {
  const isGarland = index < Math.floor(total * 0.32);
  const garlandRatio = (index + 0.5) / Math.max(1, Math.floor(total * 0.32));
  return {
    x: isGarland ? garlandRatio * width : rand(24, width - 24),
    y: isGarland
      ? 14 + Math.sin(garlandRatio * Math.PI * 3) * 10
      : rand(40, height - 40),
    r: isGarland ? rand(7, 13) : rand(12, 26),
    color: pick(LIGHT_COLORS),
    phase: rand(0, Math.PI * 2),
    speed: rand(1.1, 2.3),
    vx: isGarland ? 0 : rand(-5, 5),
    vy: isGarland ? 0 : rand(-4, 4),
    isGarland,
  };
}

function makeRocket(width, height) {
  const startX = rand(width * 0.14, width * 0.86);
  const targetY = rand(height * 0.14, height * 0.48);
  return {
    x: startX,
    y: height + 10,
    vx: rand(-35, 35),
    vy: -rand(380, 520),
    targetY,
    palette: pick(FIREWORK_PALETTES),
    trail: [],
  };
}

function burstRocket(rocket) {
  const count = Math.floor(rand(36, 52));
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(-0.12, 0.12);
    const speed = rand(75, 225);
    sparks.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: rand(0.95, 1.65),
      r: rand(1.6, 3.1),
      color: pick(rocket.palette),
      trail: [],
    });
  }
  return sparks;
}

function makeMeteor(width, height) {
  const fromLeft = Math.random() < 0.7;
  const speed = rand(440, 680);
  const angle = fromLeft ? rand(0.32, 0.58) : Math.PI - rand(0.32, 0.58);
  return {
    x: fromLeft ? rand(-40, width * 0.65) : rand(width * 0.35, width + 40),
    y: rand(-20, height * 0.32),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    life: rand(0.85, 1.45),
    length: rand(75, 130),
  };
}

function drawCandy(ctx, candy) {
  const { type, size, palette } = candy;
  if (type === "cane") {
    ctx.save();
    ctx.lineCap = "round";
    const h = size * 1.45;
    const hookR = size * 0.36;
    const strokeW = size * 0.28;
    const traceCane = () => {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.lineTo(0, -h * 0.18);
      ctx.arc(hookR, -h * 0.18, hookR, Math.PI, 0, false);
    };
    ctx.strokeStyle = "#f8f2e4";
    ctx.lineWidth = strokeW;
    traceCane();
    ctx.stroke();

    ctx.strokeStyle = "#c93b47";
    ctx.lineWidth = strokeW;
    ctx.setLineDash([strokeW * 0.9, strokeW * 0.9]);
    traceCane();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  if (type === "peppermint") {
    const r = size * 0.58;
    ctx.save();
    // Twisted wrapper ears
    ctx.fillStyle = "rgba(248, 242, 228, 0.75)";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.85, 0);
      ctx.lineTo(dir * (r + size * 0.42), -size * 0.28);
      ctx.lineTo(dir * (r + size * 0.42), size * 0.28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#f8f2e4";
    ctx.fill();
    ctx.fillStyle = "#c93b47";
    for (let i = 0; i < 4; i++) {
      const start = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 0.92, start, start + Math.PI / 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(214, 186, 123, 0.7)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (type === "bonbon") {
    const rx = size * 0.68;
    const ry = size * 0.42;
    ctx.save();
    ctx.fillStyle = palette[0];
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * rx * 0.85, 0);
      ctx.lineTo(dir * (rx + size * 0.38), -size * 0.26);
      ctx.lineTo(dir * (rx + size * 0.38), size * 0.26);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette[1];
    ctx.fill();
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.36, ry * 0.95, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // starCookie
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size * 0.72 : size * 0.34;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#c98b4b";
  ctx.fill();
  ctx.strokeStyle = "#f8f2e4";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "#c93b47";
  ctx.fill();
  ctx.restore();
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * Renders the full-screen decorative Christmas ambient effects canvas.
 */
export function AmbientEffectsOverlay({ effects }) {
  const canvasRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const activeCount = countActiveEffects(effects);
  const activeExtrasKey = effects.extras.join(",");

  useEffect(() => {
    if (reducedMotion || activeCount === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const extras = new Set(effects.extras);
    const snowPreset = SNOW_PRESETS[effects.snow] || null;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const state = {
      flakes: [],
      sparkles: [],
      smoke: [],
      embers: [],
      candies: [],
      lights: [],
      rockets: [],
      sparks: [],
      meteors: [],
      nextRocketIn: 0.15,
      nextMeteorIn: 0.25,
      elapsed: 0,
    };

    function syncPools() {
      const areaFactor = clamp((width * height) / (1440 * 900), 0.45, 1.6);

      if (snowPreset) {
        const target = clamp(
          Math.round(snowPreset.density * areaFactor),
          snowPreset.minCount,
          snowPreset.maxCount,
        );
        state.flakes = Array.from({ length: target }, () =>
          makeFlake(width, height, snowPreset, true),
        );
      } else {
        state.flakes = [];
      }

      if (extras.has("sparkles")) {
        const target = clamp(Math.round(34 * areaFactor), 18, 52);
        state.sparkles = Array.from({ length: target }, () =>
          makeSparkle(width, height, true),
        );
      } else {
        state.sparkles = [];
      }

      if (extras.has("fireplace")) {
        const smokeTarget = clamp(Math.round(28 * areaFactor), 16, 40);
        const emberTarget = clamp(Math.round(24 * areaFactor), 14, 34);
        state.smoke = Array.from({ length: smokeTarget }, () =>
          makeSmokePuff(width, height, true),
        );
        state.embers = Array.from({ length: emberTarget }, () =>
          makeEmber(width, height, true),
        );
      } else {
        state.smoke = [];
        state.embers = [];
      }

      if (extras.has("candies")) {
        const target = clamp(Math.round(14 * areaFactor), 8, 20);
        state.candies = Array.from({ length: target }, () =>
          makeCandy(width, height, true),
        );
      } else {
        state.candies = [];
      }

      if (extras.has("lights")) {
        const target = clamp(Math.round(34 * areaFactor), 20, 48);
        state.lights = Array.from({ length: target }, (_, i) =>
          makeTreeLight(width, height, i, target),
        );
      } else {
        state.lights = [];
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncPools();
    }

    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    let lastTime = performance.now();

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) {
        lastTime = now;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      state.elapsed += dt;

      ctx.clearRect(0, 0, width, height);

      // 1. Luci dell'albero (soft background bokeh + top garland)
      if (state.lights.length) {
        for (const light of state.lights) {
          light.x += light.vx * dt;
          light.y += light.vy * dt;
          if (!light.isGarland) {
            if (light.x < -30) light.x = width + 30;
            if (light.x > width + 30) light.x = -30;
            if (light.y < -30) light.y = height + 30;
            if (light.y > height + 30) light.y = -30;
          }
          const pulse =
            0.5 + 0.5 * Math.sin(state.elapsed * light.speed + light.phase);
          const alpha = light.isGarland
            ? 0.18 + pulse * 0.34
            : 0.08 + pulse * 0.16;
          const [r, g, b] = light.color;
          const grad = ctx.createRadialGradient(
            light.x,
            light.y,
            0,
            light.x,
            light.y,
            light.r,
          );
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${alpha * 0.42})`);
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Fumo caminetto (hearth glow, smoke puffs & rising embers)
      if (extras.has("fireplace")) {
        const flicker = 0.88 + 0.12 * Math.sin(state.elapsed * 5.2);
        const hearthGrad = ctx.createLinearGradient(0, height - 180, 0, height);
        hearthGrad.addColorStop(0, "rgba(214, 118, 54, 0)");
        hearthGrad.addColorStop(1, `rgba(214, 108, 44, ${0.1 * flicker})`);
        ctx.fillStyle = hearthGrad;
        ctx.fillRect(0, height - 180, width, 180);

        for (let i = 0; i < state.smoke.length; i++) {
          const p = state.smoke[i];
          p.age += dt;
          if (p.age >= p.life) {
            state.smoke[i] = makeSmokePuff(width, height, false);
            continue;
          }
          const t = p.age / p.life;
          p.y -= p.vy * dt;
          p.x +=
            (p.drift + Math.sin(state.elapsed * 1.4 + p.phase) * p.swayAmp) *
            dt;
          const radius = p.startR + (p.endR - p.startR) * t;
          const alpha = p.maxAlpha * Math.sin(t * Math.PI);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
          grad.addColorStop(0, `rgba(224, 218, 206, ${alpha})`);
          grad.addColorStop(0.6, `rgba(205, 205, 196, ${alpha * 0.45})`);
          grad.addColorStop(1, "rgba(205, 205, 196, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < state.embers.length; i++) {
          const e = state.embers[i];
          e.age += dt;
          if (e.age >= e.life) {
            state.embers[i] = makeEmber(width, height, false);
            continue;
          }
          const t = e.age / e.life;
          e.y -= e.vy * dt;
          e.x += (e.vx + Math.sin(state.elapsed * 4 + e.phase) * 24) * dt;
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.85;
          ctx.fillStyle = e.color;
          ctx.shadowColor = e.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (1 - t * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. Stelle comete (shooting stars)
      if (extras.has("meteors")) {
        state.nextMeteorIn -= dt;
        if (state.nextMeteorIn <= 0 && state.meteors.length < 2) {
          state.meteors.push(makeMeteor(width, height));
          state.nextMeteorIn = rand(1.8, 3.6);
        }
        for (let i = state.meteors.length - 1; i >= 0; i--) {
          const m = state.meteors[i];
          m.age += dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.age >= m.life) {
            state.meteors.splice(i, 1);
            continue;
          }
          const t = m.age / m.life;
          const alpha = Math.sin(t * Math.PI) * 0.92;
          const mag = Math.hypot(m.vx, m.vy) || 1;
          const tailX = m.x - (m.vx / mag) * m.length;
          const tailY = m.y - (m.vy / mag) * m.length;
          const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
          grad.addColorStop(0, "rgba(255, 248, 223, 0)");
          grad.addColorStop(0.65, `rgba(214, 186, 123, ${alpha * 0.45})`);
          grad.addColorStop(1, `rgba(255, 250, 232, ${alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 249, 228, ${alpha})`;
          drawFourPointStar(ctx, m.x, m.y, 5.5, 1.8, state.elapsed * 3);
        }
      }

      // 4. Fuochi d'artificio (rockets & bursts)
      if (extras.has("fireworks")) {
        state.nextRocketIn -= dt;
        if (
          state.nextRocketIn <= 0 &&
          state.rockets.length < 3 &&
          state.sparks.length < 180
        ) {
          state.rockets.push(makeRocket(width, height));
          state.nextRocketIn = rand(1.1, 2.2);
        }

        for (let i = state.rockets.length - 1; i >= 0; i--) {
          const r = state.rockets[i];
          r.trail.push({ x: r.x, y: r.y });
          if (r.trail.length > 6) r.trail.shift();
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.vy += 120 * dt;

          for (let j = 0; j < r.trail.length; j++) {
            const pt = r.trail[j];
            ctx.fillStyle = `rgba(255, 232, 163, ${((j + 1) / r.trail.length) * 0.55})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#fff7db";
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
          ctx.fill();

          if (r.y <= r.targetY || r.vy >= -40) {
            state.sparks.push(...burstRocket(r));
            state.rockets.splice(i, 1);
          }
        }

        const drag = Math.pow(0.982, dt * 60);
        for (let i = state.sparks.length - 1; i >= 0; i--) {
          const s = state.sparks[i];
          s.age += dt;
          if (s.age >= s.life) {
            state.sparks.splice(i, 1);
            continue;
          }
          s.trail.push({ x: s.x, y: s.y });
          if (s.trail.length > 4) s.trail.shift();
          s.vx *= drag;
          s.vy = s.vy * drag + 92 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          const t = s.age / s.life;
          const flicker = t > 0.65 && Math.sin(s.age * 38) < 0 ? 0.35 : 1;
          const alpha = (1 - t) * 0.92 * flicker;

          ctx.save();
          ctx.globalAlpha = alpha * 0.55;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.r * 0.75;
          ctx.lineCap = "round";
          if (s.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(s.trail[0].x, s.trail[0].y);
            for (let k = 1; k < s.trail.length; k++) {
              ctx.lineTo(s.trail[k].x, s.trail[k].y);
            }
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * (1 - t * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Scintille (golden star sparkles)
      if (state.sparkles.length) {
        for (let i = 0; i < state.sparkles.length; i++) {
          const sp = state.sparkles[i];
          sp.age += dt;
          if (sp.age >= sp.life) {
            state.sparkles[i] = makeSparkle(width, height, false);
            continue;
          }
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.rotation += sp.spin * dt;
          const t = sp.age / sp.life;
          const intensity = Math.sin(t * Math.PI);
          const outerR = sp.size * (0.4 + 0.6 * intensity);

          ctx.save();
          ctx.globalAlpha = intensity * 0.85;
          const halo = ctx.createRadialGradient(
            sp.x,
            sp.y,
            0,
            sp.x,
            sp.y,
            outerR * 1.4,
          );
          halo.addColorStop(0, "rgba(255, 244, 200, 0.55)");
          halo.addColorStop(1, "rgba(255, 244, 200, 0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, outerR * 1.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = sp.tint;
          drawFourPointStar(
            ctx,
            sp.x,
            sp.y,
            outerR,
            outerR * 0.24,
            sp.rotation,
          );
          ctx.restore();
        }
      }

      // 6. Apparizione caramelle (pop-in Christmas sweets)
      if (state.candies.length) {
        for (let i = 0; i < state.candies.length; i++) {
          const c = state.candies[i];
          c.age += dt;
          if (c.age >= c.life) {
            state.candies[i] = makeCandy(width, height, false);
            continue;
          }
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.rotation += c.rotSpeed * dt;

          const appearT = clamp(c.age / 0.48, 0, 1);
          const fadeOutT = clamp((c.life - c.age) / 0.75, 0, 1);
          const scale =
            appearT < 1 ? easeOutBack(appearT) : 0.86 + 0.14 * fadeOutT;
          const alpha = appearT * fadeOutT * 0.88;
          const bob = Math.sin(c.age * 2.2 + c.bobPhase) * 4;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(c.x, c.y + bob);
          ctx.rotate(c.rotation);
          ctx.scale(scale, scale);
          drawCandy(ctx, c);
          ctx.restore();
        }
      }

      // 7. Neve (low / medium / blizzard)
      if (snowPreset && state.flakes.length) {
        const isBlizzard = effects.snow === "blizzard";
        const gust = isBlizzard ? 1 + 0.32 * Math.sin(state.elapsed * 0.9) : 1;

        for (let i = 0; i < state.flakes.length; i++) {
          const f = state.flakes[i];
          const sway =
            Math.sin(state.elapsed * f.swayFreq + f.phase) * f.swayAmp;
          const vx = f.vx * gust + sway;
          f.x += vx * dt;
          f.y += f.vy * dt;

          if (f.y > height + 16) {
            f.y = rand(-28, -6);
            f.x = rand(-60, width + 40);
          }
          if (f.x > width + 50) f.x = -40;
          if (f.x < -50) f.x = width + 40;

          ctx.save();
          ctx.globalAlpha = f.alpha;
          if (snowPreset.streak > 0 && f.r > 2) {
            ctx.strokeStyle = "#fff8df";
            ctx.lineWidth = f.r * 0.78;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(
              f.x - vx * snowPreset.streak * 0.35,
              f.y - f.vy * snowPreset.streak * 0.35,
            );
            ctx.lineTo(f.x, f.y);
            ctx.stroke();
          } else {
            ctx.fillStyle = "#fff8df";
            if (f.r >= 2.6) {
              ctx.shadowColor = "rgba(255, 248, 223, 0.55)";
              ctx.shadowBlur = 4;
            }
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [activeCount, activeExtrasKey, effects.snow, reducedMotion]);

  if (reducedMotion || activeCount === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="ambient-effects-canvas"
      aria-hidden="true"
      data-snow={effects.snow}
      data-extras={activeExtrasKey}
    />
  );
}

/**
 * Modal dialog allowing users to choose snow intensity and extra Christmas effects.
 */
export function AmbientEffectsModal({ effects, onChange, onClose }) {
  const snowGroupLabelId = useId();
  const extrasLabelId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const activeCount = countActiveEffects(effects);

  function setSnow(snow) {
    onChange({ ...effects, snow });
  }

  function toggleExtra(id) {
    const has = effects.extras.includes(id);
    const extras = has
      ? effects.extras.filter((item) => item !== id)
      : [...effects.extras, id];
    onChange({ ...effects, extras });
  }

  function turnOffAll() {
    onChange({ snow: "off", extras: [] });
  }

  return (
    <Modal title="Atmosfera di Natale" onClose={onClose} wide>
      <p>
        Scegli quanta neve vuoi vedere scendere e aggiungi altri effetti
        natalizi in sottofondo.
      </p>
      {reducedMotion && (
        <p className="notice" role="status">
          Il dispositivo usa la riduzione dei movimenti: le animazioni restano
          in pausa, ma puoi comunque salvare le tue preferenze.
        </p>
      )}

      <div className="ambient-section">
        <h3 id={snowGroupLabelId}>Intensità della neve</h3>
        <div
          className="snow-level-grid"
          role="radiogroup"
          aria-labelledby={snowGroupLabelId}
        >
          {SNOW_LEVELS.map((level) => {
            const selected = effects.snow === level.id;
            return (
              <button
                key={level.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`ambient-choice ${selected ? "selected" : ""}`}
                onClick={() => setSnow(level.id)}
              >
                <span className="ambient-choice-head">
                  <Snowflake size={16} aria-hidden="true" />
                  <strong>{level.label}</strong>
                  {selected && (
                    <Check
                      size={15}
                      className="ambient-choice-check"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <small>{level.description}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ambient-section">
        <h3 id={extrasLabelId}>Altri effetti natalizi</h3>
        <div
          className="effect-toggle-grid"
          role="group"
          aria-labelledby={extrasLabelId}
        >
          {EXTRA_EFFECTS.map((effect) => {
            const active = effects.extras.includes(effect.id);
            const Icon = EFFECT_ICONS[effect.id] || Sparkles;
            return (
              <button
                key={effect.id}
                type="button"
                aria-pressed={active}
                className={`ambient-choice ${active ? "selected" : ""}`}
                onClick={() => toggleExtra(effect.id)}
              >
                <span className="ambient-choice-head">
                  <Icon size={17} aria-hidden="true" />
                  <strong>{effect.label}</strong>
                  {active && (
                    <Check
                      size={15}
                      className="ambient-choice-check"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <small>{effect.description}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-actions ambient-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={turnOffAll}
          disabled={activeCount === 0}
        >
          Spegni tutto
        </Button>
        <Button type="button" onClick={onClose}>
          Fatto
        </Button>
      </div>
    </Modal>
  );
}
