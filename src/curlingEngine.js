import Matter from "matter-js";
import { interpolate } from "../shared/languages.js";

// Score the current positions again after every shot: collisions can move older gifts.
export function scoreGift(gift) {
  if (gift.out) return 0;
  const distance = Math.hypot(
    gift.body.position.x - 180,
    gift.body.position.y - 122,
  );
  return distance < 32 ? 3 : distance < 61 ? 2 : distance < 91 ? 1 : 0;
}

// Isolated imperative canvas controller; React owns its mount and disposal.
export function createCurlingGame(
  root,
  { onComplete, translate = interpolate, subscribeLocale } = {},
) {
  const listeners = new AbortController();
  let disposed = false,
    animationFrame = null,
    computerTimer = null;
  function scheduleFrame(callback) {
    animationFrame = requestAnimationFrame((time) => {
      animationFrame = null;
      if (!disposed) callback(time);
    });
  }
  function scheduleComputer(callback, delay) {
    computerTimer = setTimeout(() => {
      computerTimer = null;
      if (!disposed) callback();
    }, delay);
  }
  function stopScheduled() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (computerTimer !== null) clearTimeout(computerTimer);
    animationFrame = computerTimer = null;
  }
  const $ = (s) => root.querySelector(s),
    canvas = $("canvas"),
    ctx = canvas.getContext("2d"),
    handle = $("[data-handle]"),
    M = Matter;
  const W = 360,
    H = 500,
    dt = 1000 / 120,
    engine = M.Engine.create({ positionIterations: 8, velocityIterations: 8 });
  engine.gravity.scale = 0;
  root.dataset.engine = "Matter.js";
  root.dataset.timestep = String(dt);
  const walls = [
    M.Bodies.rectangle(25, 250, 12, 500, {
      isStatic: true,
      label: "side",
      restitution: 0.6,
    }),
    M.Bodies.rectangle(335, 250, 12, 500, {
      isStatic: true,
      label: "side",
      restitution: 0.6,
    }),
  ];
  M.Composite.add(engine.world, walls);
  let gifts = [],
    shots = 0,
    starter = 0,
    busy = false,
    epoch = 0,
    angle = 0,
    force = 63,
    drag = null,
    completed = false;
  const colors = ["#b6574d", "#d9b45e"],
    names = () => [translate("Tu"), translate("Computer")],
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const current = () => (starter + shots) % 2;
  const computerTurn = () => current() === 1;
  const pts = scoreGift;
  const speed = () => 2.2 + force * 0.074;
  const distance = () => (speed() * (1 - 0.022 / 2)) / 0.022; // two half-steps per 60 Hz frame; geometric friction sum.
  function controls() {
    root
      .querySelectorAll(
        "[data-launch],[data-left],[data-right],[data-angle],[data-force]",
      )
      .forEach((n) => (n.disabled = busy || computerTurn() || shots >= 6));
    $("[data-cancel]").disabled = busy || computerTurn() || shots >= 6;
    handle.hidden = busy || computerTurn() || shots >= 6;
    handle.querySelector("span").style.background = colors[current()];
    $("[data-angle]").value = angle;
    $("[data-force]").value = force;
    $("[data-angle-out]").textContent = angle + "°";
    $("[data-force-out]").textContent = force + "%";
    root.dataset.shots = shots;
    root.dataset.busy = String(busy);
  }
  let statusKey = "";
  function update(msg = "") {
    statusKey = msg;
    let scores = [0, 0];
    gifts.forEach((g) => (scores[g.owner] += pts(g)));
    $("[data-score]").textContent =
      `${names()[0]}: ${scores[0]} · ${names()[1]}: ${scores[1]}`;
    $("[data-turn]").textContent =
      shots < 6
        ? translate("Tiro {number}/6 · {player}", {
            number: shots + 1,
            player: names()[current()],
          })
        : translate("Sei tiri conclusi");
    if (shots === 6)
      msg =
        scores[0] === scores[1]
          ? "Pareggio! La lanterna aspetta la rivincita."
          : scores[0] > scores[1]
            ? "Hai vinto. Nella rivincita cambia chi comincia."
            : "Il computer ha vinto. Nella rivincita cambia chi comincia.";
    $("[data-status]").textContent = msg
      ? translate(msg)
      : translate(
          "{player}, avvicina il regalo alla lanterna. La mira iniziale raggiunge il centro.",
          { player: names()[current()] },
        );
    controls();
    draw();
  }
  function gift(x, y, owner, rotation = 0, out = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = "#12382a55";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = out ? "#7e938a" : colors[owner];
    ctx.beginPath();
    ctx.roundRect(-13, -13, 26, 26, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#f8dfa0";
    ctx.fillRect(-2, -13, 4, 26);
    ctx.fillRect(-13, -2, 26, 4);
    ctx.strokeStyle = "#f9e3ad";
    ctx.beginPath();
    ctx.ellipse(-4, -5, 4, 3, -0.6, 0, 7);
    ctx.ellipse(4, -5, 4, 3, 0.6, 0, 7);
    ctx.stroke();
    ctx.restore();
  }
  function draw() {
    if (!canvas.width) return;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    let grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#9bc3bd");
    grd.addColorStop(1, "#d9e7da");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#234a41";
    ctx.fillRect(0, 0, 28, H);
    ctx.fillRect(332, 0, 28, H);
    for (let y = 18; y < 480; y += 28) {
      ctx.fillStyle = "#c7b579";
      ctx.beginPath();
      ctx.arc(15, y, 2, 0, 7);
      ctx.arc(345, y, 2, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(45 + i * 32, 20);
      ctx.lineTo(35 + i * 32, 480);
      ctx.stroke();
    }
    [
      [91, "#70a69b"],
      [61, "#f0dfb1"],
      [32, "#c98768"],
    ].forEach(([r, c]) => {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.arc(180, 122, r, 0, 7);
      ctx.fill();
    });
    ctx.fillStyle = "#31534a";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("1", 258, 126);
    ctx.fillText("2", 225, 126);
    ctx.fillText("3", 201, 126);
    let glow = ctx.createRadialGradient(180, 117, 0, 180, 117, 38);
    glow.addColorStop(0, "#fff7bfee");
    glow.addColorStop(1, "#fff7bf00");
    ctx.fillStyle = glow;
    ctx.fillRect(140, 77, 80, 80);
    ctx.fillStyle = "#795735";
    ctx.fillRect(174, 106, 12, 23);
    ctx.fillStyle = "#fff4b2";
    ctx.fillRect(177, 109, 6, 15);
    ctx.strokeStyle = "#795735";
    ctx.strokeRect(173, 105, 14, 25);
    ctx.beginPath();
    ctx.arc(180, 104, 5, Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = "#659b8a";
    ctx.beginPath();
    ctx.moveTo(45, 400);
    ctx.lineTo(315, 400);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!busy && shots < 6) {
      let rad = (angle * Math.PI) / 180,
        d = distance(),
        tx = 180 + Math.sin(rad) * d,
        ty = 430 - Math.cos(rad) * d;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#315b4fa0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, 17, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(180, 430);
      ctx.lineTo(180 + Math.sin(rad) * 70, 430 - Math.cos(rad) * 70);
      ctx.stroke();
      ctx.setLineDash([]);
      if (drag) {
        ctx.strokeStyle = "#c28652";
        ctx.beginPath();
        ctx.moveTo(180, 430);
        ctx.lineTo(
          180 - Math.sin(rad) * force * 0.6,
          430 + Math.cos(rad) * force * 0.6,
        );
        ctx.stroke();
      }
    }
    gifts.forEach((g) => {
      let p = g.body.position;
      gift(p.x, p.y, g.owner, g.body.angle, g.out);
      if (!busy) {
        ctx.fillStyle = "#264f42";
        ctx.font = "bold 12px system-ui";
        ctx.fillText(pts(g), p.x, p.y + 28);
      }
    });
  }
  function out(g) {
    g.out = true;
    M.Body.setVelocity(g.body, { x: 0, y: 0 });
    M.Body.setPosition(g.body, {
      x: g.owner ? 346 : 14,
      y: 270 + gifts.indexOf(g) * 31,
    });
    M.Body.setStatic(g.body, true);
    g.body.isSensor = true;
  }
  M.Events.on(engine, "collisionStart", (e) => {
    root.dataset.contacts = String(
      +(root.dataset.contacts || 0) +
        e.pairs.filter(
          (p) => p.bodyA.label === "gift" && p.bodyB.label === "gift",
        ).length,
    );
    for (let pair of e.pairs) {
      let wall =
        pair.bodyA.label === "side"
          ? pair.bodyA
          : pair.bodyB.label === "side"
            ? pair.bodyB
            : null;
      if (!wall) continue;
      let body = wall === pair.bodyA ? pair.bodyB : pair.bodyA,
        g = gifts.find((g) => g.body === body);
      if (g && !g.out && ++g.bounces > 1) out(g);
    }
  });
  function physics() {
    M.Engine.update(engine, dt);
    for (let g of gifts)
      if (!g.out && (g.body.position.y < 26 || g.body.position.y > 477)) out(g);
  }
  function launch(isComputer = false) {
    if (busy || shots >= 6 || computerTurn() !== isComputer) return;
    drag = null;
    $(".f1-rink").classList.remove("aiming");
    busy = true;
    const rad = (angle * Math.PI) / 180,
      v = speed(),
      body = M.Bodies.circle(180, 430, 13.5, {
        restitution: 0.86,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.022,
        label: "gift",
      });
    gifts.push({ body, owner: current(), out: false, bounces: 0 });
    M.Composite.add(engine.world, body);
    M.Body.setVelocity(body, { x: Math.sin(rad) * v, y: -Math.cos(rad) * v });
    let ticks = 0,
      my = epoch;
    controls();
    statusKey = "Il regalo scivola… gli urti possono cambiare il punteggio.";
    $("[data-status]").textContent = translate(statusKey);
    function finish() {
      if (my !== epoch) return;
      gifts.forEach((g) => {
        M.Body.setVelocity(g.body, { x: 0, y: 0 });
        M.Body.setAngularVelocity(g.body, 0);
      });
      shots++;
      busy = false;
      angle = 0;
      force = 63;
      update();
      if (shots === 6 && !completed) {
        completed = true;
        onComplete?.();
      }
      if (shots < 6 && computerTurn()) {
        angle = [-3, 5, -6][Math.floor(shots / 2)] || 2;
        force = [63, 60, 68][Math.floor(shots / 2)] || 63;
        scheduleComputer(() => {
          if (my === epoch) launch(true);
        }, 350);
      }
    }
    if (reduced) {
      while (ticks++ < 720) physics();
      finish();
      return;
    }
    let last = 0,
      acc = 0;
    function frame(t) {
      if (my !== epoch) return;
      if (!last) last = t;
      acc += Math.min(t - last, 50);
      last = t;
      while (acc >= dt && ticks < 720) {
        physics();
        acc -= dt;
        ticks++;
      }
      draw();
      if (
        ticks >= 720 ||
        (ticks > 120 && gifts.every((g) => g.out || g.body.speed < 0.025))
      )
        finish();
      else scheduleFrame(frame);
    }
    scheduleFrame(frame);
  }
  function cancel() {
    drag = null;
    $(".f1-rink").classList.remove("aiming");
    angle = 0;
    force = 63;
    update("Mira annullata. Il pacco è ancora qui.");
  }
  function reset() {
    root.dataset.contacts = "0";
    epoch++;
    stopScheduled();
    M.Composite.remove(
      engine.world,
      gifts.map((g) => g.body),
    );
    M.Engine.clear(engine);
    gifts = [];
    shots = 0;
    completed = false;
    busy = false;
    angle = 0;
    force = 63;
    drag = null;
    $(".f1-rink").classList.remove("aiming");
    update();
    if (computerTurn()) {
      const my = epoch;
      scheduleComputer(() => {
        if (my === epoch) launch(true);
      }, 350);
    }
  }
  $("[data-launch]").onclick = () => launch();
  $("[data-cancel]").onclick = cancel;
  $("[data-left]").onclick = () => {
    angle = Math.max(-38, angle - 3);
    controls();
    draw();
  };
  $("[data-right]").onclick = () => {
    angle = Math.min(38, angle + 3);
    controls();
    draw();
  };
  $("[data-angle]").oninput = (e) => {
    angle = +e.target.value;
    controls();
    draw();
  };
  $("[data-force]").oninput = (e) => {
    force = +e.target.value;
    controls();
    draw();
  };
  $("[data-reset]").onclick = () => {
    starter = 1 - starter;
    reset();
  };
  root.addEventListener(
    "keydown",
    (e) => {
      if (
        busy ||
        computerTurn() ||
        shots >= 6 ||
        e.target.matches("select,input")
      )
        return;
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
          e.key,
        ) ||
        ![canvas, handle].includes(e.target)
      )
        return;
      e.preventDefault();
      if (e.key === "ArrowLeft") angle = Math.max(-38, angle - 3);
      if (e.key === "ArrowRight") angle = Math.min(38, angle + 3);
      if (e.key === "ArrowUp") force = Math.min(100, force + 2);
      if (e.key === "ArrowDown") force = Math.max(20, force - 2);
      if (e.key === "Enter") launch();
      controls();
      draw();
    },
    { signal: listeners.signal },
  );
  const point = (e) => {
    let b = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) * W) / b.width,
      y: ((e.clientY - b.top) * H) / b.height,
    };
  };
  handle.onpointerdown = (e) => {
    if (busy || computerTurn() || shots >= 6) return;
    drag = point(e);
    handle.setPointerCapture(e.pointerId);
    $(".f1-rink").classList.add("aiming");
    e.preventDefault();
  };
  handle.onpointermove = (e) => {
    if (!drag) return;
    let p = point(e),
      dx = drag.x - p.x,
      dy = p.y - drag.y;
    angle = Math.round(
      Math.max(
        -38,
        Math.min(38, (Math.atan2(dx, Math.max(12, dy)) * 180) / Math.PI),
      ),
    );
    force = Math.round(
      Math.max(20, Math.min(100, 30 + Math.hypot(dx, dy) * 0.75)),
    );
    controls();
    draw();
  };
  handle.onpointerup = (e) => {
    if (!drag) return;
    let p = point(e);
    if (p.y < drag.y - 15 || p.x < 0 || p.x > W || p.y > H + 50) {
      cancel();
      return;
    }
    drag = null;
    launch();
  };
  handle.onpointercancel = cancel;
  handle.onlostpointercapture = () => {
    if (drag) cancel();
  };
  const observer = new ResizeObserver(() => {
    let b = canvas.getBoundingClientRect();
    if (b.width <= 0) return;
    canvas.width = Math.round(b.width * devicePixelRatio);
    canvas.height = Math.round(b.height * devicePixelRatio);
    draw();
  });
  observer.observe(canvas);
  const unsubscribe = subscribeLocale?.(() => update(statusKey));
  update();
  return () => {
    disposed = true;
    epoch++;
    stopScheduled();
    unsubscribe?.();
    observer.disconnect();
    listeners.abort();
    for (const node of root.querySelectorAll("button, input, select")) {
      for (const event of [
        "onclick",
        "oninput",
        "onchange",
        "onpointerdown",
        "onpointermove",
        "onpointerup",
        "onpointercancel",
        "onlostpointercapture",
      ])
        node[event] = null;
    }
    M.Events.off(engine);
    M.Composite.clear(engine.world, false);
    M.Engine.clear(engine);
    gifts = [];
  };
}
