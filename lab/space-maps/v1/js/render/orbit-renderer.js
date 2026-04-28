window.OrbitRenderer = (() => {
  function createRuntime(state, stage) {
    const runtime = {
      stage,
      earthLayer: createEarthLayer(state.width, state.height),
      starLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#061324",
        mid: "#030813",
        edge: "#010208",
        nebulaA: "40,105,170",
        nebulaB: "40,80,130",
        starCount: 115
      }),
      satellites: [],
      hitFlash: 0
    };

    createSatellites(runtime, state, stage);
    return runtime;
  }

  function createEarthLayer(width, height) {
    const c = Utils.makeCanvas(width, height);
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#01040a";
    ctx.fillRect(0, 0, width, height);

    const ex = width * .18;
    const ey = height * 1.05;
    const er = Math.min(width, height) * .42;

    // atmosphere glow
    const glow = ctx.createRadialGradient(ex, ey, er * .6, ex, ey, er * 1.5);
    glow.addColorStop(0, "rgba(120,200,255,.25)");
    glow.addColorStop(.5, "rgba(60,140,255,.12)");
    glow.addColorStop(1, "rgba(60,140,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ex, ey, er * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // earth base
    const earth = ctx.createRadialGradient(ex - er * .3, ey - er * .4, er * .1, ex, ey, er);
    earth.addColorStop(0, "#7fd0ff");
    earth.addColorStop(.35, "#1c6fb8");
    earth.addColorStop(.7, "#0b2a55");
    earth.addColorStop(1, "#020814");
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();

    // continents (simple noise blobs)
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(40,120,70,.45)";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(
        ex + (Math.random() - .5) * er * .8,
        ey + (Math.random() - .5) * er * .8,
        er * Math.random() * .25,
        er * Math.random() * .12,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // night city lights
    ctx.fillStyle = "rgba(255,210,120,.25)";
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = er * Math.random();
      const x = ex + Math.cos(angle) * r;
      const y = ey + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // atmosphere rim
    ctx.strokeStyle = "rgba(140,220,255,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, er + 1, Math.PI * 1.05, Math.PI * 1.9);
    ctx.stroke();

    return c;
  }

  function createSatelliteSprite(type = "panel", scale = 1) {
    const w = Math.ceil(96 * scale);
    const h = Math.ceil(70 * scale);
    const c = Utils.makeCanvas(w, h);
    const ctx = c.getContext("2d");
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if (type === "white") {
      // 흰색 관측 위성: 본체가 크고 밝음
      ctx.fillStyle = "rgba(235,242,248,.95)";
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1.2;
      roundRect(ctx, -15, -16, 30, 32, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(60,120,170,.75)";
      ctx.fillRect(-46, -8, 26, 16);
      ctx.fillRect(20, -8, 26, 16);
      ctx.strokeStyle = "rgba(220,245,255,.34)";
      ctx.strokeRect(-46, -8, 26, 16);
      ctx.strokeRect(20, -8, 26, 16);

      ctx.fillStyle = "rgba(20,35,45,.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(230,245,255,.70)";
      ctx.beginPath();
      ctx.moveTo(12, -14);
      ctx.lineTo(28, -30);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(31, -33, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    else if (type === "cube") {
      // 작은 큐브샛: 작고 각진 형태
      const body = ctx.createLinearGradient(-10, -10, 12, 12);
      body.addColorStop(0, "#d9e6f2");
      body.addColorStop(.55, "#677483");
      body.addColorStop(1, "#1f2731");
      ctx.fillStyle = body;
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.lineWidth = 1;
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);

      ctx.fillStyle = "rgba(75,145,190,.72)";
      ctx.fillRect(-31, -6, 16, 12);
      ctx.fillRect(15, -6, 16, 12);
      ctx.strokeStyle = "rgba(220,245,255,.22)";
      ctx.strokeRect(-31, -6, 16, 12);
      ctx.strokeRect(15, -6, 16, 12);

      ctx.strokeStyle = "rgba(230,245,255,.65)";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, -28);
      ctx.stroke();
    }

    else if (type === "large-panel") {
      // 대형 패널 위성: 넓은 태양광 패널
      ctx.fillStyle = "rgba(55,120,175,.84)";
      ctx.strokeStyle = "rgba(220,245,255,.38)";
      ctx.lineWidth = 1;
      ctx.fillRect(-54, -12, 34, 24);
      ctx.fillRect(20, -12, 34, 24);
      ctx.strokeRect(-54, -12, 34, 24);
      ctx.strokeRect(20, -12, 34, 24);

      ctx.strokeStyle = "rgba(230,250,255,.20)";
      for (let x of [-45, -36, -27, 29, 38, 47]) {
        ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, 12); ctx.stroke();
      }

      const body = ctx.createLinearGradient(-16, -14, 18, 16);
      body.addColorStop(0, "#f0f5f8");
      body.addColorStop(.5, "#8794a3");
      body.addColorStop(1, "#222b36");
      ctx.fillStyle = body;
      ctx.fillRect(-17, -15, 34, 30);
      ctx.strokeStyle = "rgba(255,255,255,.48)";
      ctx.strokeRect(-17, -15, 34, 30);

      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(-10, -9, 20, 6);
    }

    else if (type === "antenna") {
      // 안테나형 위성: 패널은 작고 접시/안테나 강조
      ctx.fillStyle = "rgba(180,190,198,.9)";
      ctx.strokeStyle = "rgba(255,255,255,.38)";
      ctx.lineWidth = 1.1;
      ctx.fillRect(-13, -10, 26, 20);
      ctx.strokeRect(-13, -10, 26, 20);

      ctx.fillStyle = "rgba(70,125,160,.70)";
      ctx.fillRect(-32, -7, 15, 14);
      ctx.fillRect(17, -7, 15, 14);

      ctx.strokeStyle = "rgba(230,245,255,.72)";
      ctx.beginPath();
      ctx.moveTo(10, -7);
      ctx.lineTo(32, -22);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(38, -25, 8, 4, -.55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-7, 10);
      ctx.lineTo(-20, 24);
      ctx.stroke();
    }

    else {
      // 기본 패널형
      ctx.fillStyle = "rgba(70,130,180,.82)";
      ctx.strokeStyle = "rgba(220,245,255,.38)";
      ctx.lineWidth = 1;
      ctx.fillRect(-38, -9, 22, 18);
      ctx.strokeRect(-38, -9, 22, 18);
      ctx.fillRect(16, -9, 22, 18);
      ctx.strokeRect(16, -9, 22, 18);

      const body = ctx.createLinearGradient(-10, -10, 12, 12);
      body.addColorStop(0, "#f3f8ff");
      body.addColorStop(.55, "#7d8a99");
      body.addColorStop(1, "#252d38");
      ctx.fillStyle = body;
      ctx.fillRect(-14, -12, 28, 24);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.strokeRect(-14, -12, 28, 24);

      ctx.strokeStyle = "rgba(230,245,255,.65)";
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(20, -22); ctx.stroke();
      ctx.beginPath(); ctx.arc(22, -24, 3, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
    return { canvas: c, offsetX: w / 2, offsetY: h / 2 };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function createSatellites(runtime, state, stage) {
    const spriteMap = {
      panel: createSatelliteSprite("panel", 1),
      white: createSatelliteSprite("white", 1.05),
      cube: createSatelliteSprite("cube", .82),
      large: createSatelliteSprite("large-panel", 1.18),
      antenna: createSatelliteSprite("antenna", .96)
    };

    const presets = [
      { x: .20, y: .22, move: "horizontal", range: 90, speed: .009, laser: true, type: "white", radius: 32 },
      { x: .46, y: .25, move: "vertical", range: 70, speed: .011, laser: false, type: "cube", radius: 22 },
      { x: .76, y: .20, move: "horizontal", range: 110, speed: .008, laser: true, type: "large", radius: 38 },
      { x: .32, y: .56, move: "vertical", range: 95, speed: .010, laser: true, type: "antenna", radius: 28 },
      { x: .62, y: .55, move: "horizontal", range: 85, speed: .012, laser: false, type: "panel", radius: 29 },
      { x: .84, y: .66, move: "vertical", range: 70, speed: .010, laser: true, type: "cube", radius: 22 },
      { x: .52, y: .78, move: "horizontal", range: 115, speed: .007, laser: false, type: "white", radius: 32 }
    ];

    runtime.satellites = presets.map((p) => ({
      baseX: state.width * p.x,
      baseY: state.height * p.y,
      x: state.width * p.x,
      y: state.height * p.y,
      move: p.move,
      range: p.range,
      speed: p.speed,
      phase: Utils.rand(0, Math.PI * 2),
      angle: Utils.rand(-.16, .16),
      sprite: spriteMap[p.type] || spriteMap.panel,
      type: p.type,
      radius: p.radius,
      mass: p.radius / 28,
      canLaser: p.laser,
      state: "idle",
      timer: Math.floor(Utils.rand(stage.laserIntervalMin, stage.laserIntervalMax)),
      warnTime: 0,
      warnTotal: 0,
      laserTime: 0,
      laserTotal: 0,
      laserAngle: 0
    }));
  }

  function countActiveLasers(runtime) {
    return runtime.satellites.filter(s => s.state === "warning" || s.state === "firing").length;
  }

  function update(runtime, state) {
    const stage = runtime.stage;
    if (runtime.hitFlash > 0) runtime.hitFlash--;

    for (const s of runtime.satellites) {
      const motion = Math.sin(state.time * s.speed + s.phase) * s.range;
      if (s.move === "horizontal") {
        s.x = s.baseX + motion;
        s.y = s.baseY;
      } else {
        s.x = s.baseX;
        s.y = s.baseY + motion;
      }

      s.angle = Math.sin(state.time * .012 + s.phase) * .14;

      if (Math.hypot(state.player.x - s.x, state.player.y - s.y) < state.player.radius + s.radius) {
        applyImpact(runtime, state.player, s, "satellite");
      }

      if (!s.canLaser) continue;

      if (s.state === "idle") {
        s.timer--;
        if (s.timer <= 0 && countActiveLasers(runtime) < stage.maxActiveLasers) {
          s.state = "warning";
          s.warnTime = Math.floor(Utils.rand(stage.laserWarnMin, stage.laserWarnMax));
          s.warnTotal = s.warnTime;
          s.laserAngle = Math.atan2(state.player.y - s.y, state.player.x - s.x);
        }
      } else if (s.state === "warning") {
        s.warnTime--;
        // 예고 중에는 플레이어 방향을 약간 추적
        const target = Math.atan2(state.player.y - s.y, state.player.x - s.x);
        s.laserAngle = lerpAngle(s.laserAngle, target, .045);
        if (s.warnTime <= 0) {
          s.state = "firing";
          s.laserTime = Math.floor(Utils.rand(stage.laserDurationMin, stage.laserDurationMax));
          s.laserTotal = s.laserTime;
        }
      } else if (s.state === "firing") {
        s.laserTime--;
        if (isPlayerOnLaser(state.player, s)) {
          if ((state.player.laserHitCooldown || 0) <= 0) {
            applyLaserHit(runtime, state.player);
            state.player.laserHitCooldown = 14;
          }
        }
        // simple knockback physics
        const dx = state.player.x - s.x;
        const dy = state.player.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        state.player.vx += (dx / dist) * 2.2;
        state.player.vy += (dy / dist) * 2.2;
        if (s.laserTime <= 0) {
          s.state = "idle";
          s.timer = Math.floor(Utils.rand(stage.laserIntervalMin, stage.laserIntervalMax));
        }
      }
    }
  }

  function applyLaserHit(runtime, player) {
    // Laser = damage feedback, not physical collision.
    // It should not continuously push the player.
    runtime.hitFlash = 7;
    player.impactFlash = 11;

    // One-time tiny hit jitter only. No sustained knockback.
    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterForce = 0.42;
    player.vx += Math.cos(jitterAngle) * jitterForce;
    player.vy += Math.sin(jitterAngle) * jitterForce;

    // Short visual wobble.
    player.impactSpin += (Math.random() - .5) * .075;

    // Slight braking: feels like taking damage, not being pushed.
    player.vx *= .82;
    player.vy *= .82;
  }

  function applyImpact(runtime, player, source, type) {
    // Satellite collision only: physical knockback.
    runtime.hitFlash = 10;

    const dx = player.x - source.x;
    const dy = player.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;

    const nx = dx / dist;
    const ny = dy / dist;

    const mass = source.mass || 1;
    const force = 1.6 + mass * 1.25;

    player.vx += nx * force;
    player.vy += ny * force;

    // collision spin / wobble
    const tangent = Math.sign(nx * player.vy - ny * player.vx) || (Math.random() > .5 ? 1 : -1);
    player.impactSpin += tangent * (.075 + mass * .025);
    player.impactFlash = 14;

    // prevent repeated hard sticking inside satellite
    const minDist = player.radius + source.radius + 2;
    if (dist < minDist) {
      player.x = source.x + nx * minDist;
      player.y = source.y + ny * minDist;
    }
  }

  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  function isPlayerOnLaser(player, s) {
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    const along = dx * Math.cos(s.laserAngle) + dy * Math.sin(s.laserAngle);
    if (along < 0 || along > 900) return false;

    const perp = Math.abs(-Math.sin(s.laserAngle) * dx + Math.cos(s.laserAngle) * dy);
    return perp < player.radius + 5;
  }

  function drawSatellites(ctx, runtime) {
    for (const s of runtime.satellites) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.drawImage(s.sprite.canvas, -s.sprite.offsetX, -s.sprite.offsetY);
      ctx.restore();

      if (s.state === "warning") drawLaserWarning(ctx, s);
    }
  }

  function drawLaserWarning(ctx, s) {
    const ratio = s.warnTotal > 0 ? 1 - s.warnTime / s.warnTotal : 1;
    const pulse = Math.sin(ratio * Math.PI * 10) > 0 ? 1 : .35;
    const len = 160 + ratio * 240;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,70,90,${.20 + .34 * pulse})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 10]);

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(s.laserAngle) * len, s.y + Math.sin(s.laserAngle) * len);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(255,90,110,${.35 + .45 * pulse})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4 + ratio * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLasers(ctx, runtime, state) {
    for (const s of runtime.satellites) {
      if (s.state !== "firing") continue;

      const fade = Math.min(1, s.laserTime / 12);
      const len = Math.max(state.width, state.height) * 1.25;
      const sx = s.x + Math.cos(s.laserAngle) * 18;
      const sy = s.y + Math.sin(s.laserAngle) * 18;
      const ex = s.x + Math.cos(s.laserAngle) * len;
      const ey = s.y + Math.sin(s.laserAngle) * len;

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      ctx.strokeStyle = `rgba(255,40,80,${.26 * fade})`;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,160,175,${.55 * fade})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${.75 * fade})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawHitFlash(ctx, runtime, state) {
    if (runtime.hitFlash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,85,65,${runtime.hitFlash / 70})`;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      ctx.drawImage(runtime.starLayer || runtime.earthLayer, 0, 0);
      ctx.drawImage(runtime.earthLayer, 0, 0);
      drawLasers(ctx, runtime, state);
      drawSatellites(ctx, runtime);
    }

    if (layer === "foreground") {
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .36);
      drawHitFlash(ctx, runtime, state);
    }
  }

  return { createRuntime, update, render };
})();
