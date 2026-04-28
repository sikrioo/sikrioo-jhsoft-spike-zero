window.MagneticRenderer = (() => {
  function createRuntime(state, stage) {
    return {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#11182a",
        mid: "#060915",
        edge: "#010208",
        nebulaA: "60,95,210",
        nebulaB: "120,70,190",
        starCount: 120
      }),
      planets: createPlanets(state),
      lightningTimer: rand(55, 110),
      chainCooldown: 0,
      strikes: [],
      hitFlash: 0,
      slowActive: false
    };
  }

  function createPlanets(state) {
    return [
      { x: state.width * 0.24, y: state.height * 0.30, r: 74, field: 165, phase: Math.random() * 10 },
      { x: state.width * 0.68, y: state.height * 0.47, r: 94, field: 190, phase: Math.random() * 10 },
      { x: state.width * 0.42, y: state.height * 0.74, r: 64, field: 145, phase: Math.random() * 10 }
    ];
  }

  function update(rt, state) {
    const player = state.player;
    if (rt.hitFlash > 0) rt.hitFlash--;

    rt.slowActive = false;

    for (const planet of rt.planets) {
      const dx = player.x - planet.x;
      const dy = player.y - planet.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < planet.r + player.radius) {
        resolvePlanetCollision(rt, player, planet, dx, dy, dist);
      }

      if (dist < planet.field) {
        rt.slowActive = true;
        const depth = 1 - dist / planet.field;
        const slowDrag = 0.985 - depth * 0.035;
        player.vx *= slowDrag;
        player.vy *= slowDrag;
        player.impactSpin += Math.sin(state.time * 0.08 + planet.phase) * depth * 0.0009;
      }
    }

    rt.lightningTimer--;
    if (rt.chainCooldown > 0) rt.chainCooldown--;

    if (rt.lightningTimer <= 0) {
      spawnLightningCluster(rt, state);
      rt.lightningTimer = rand(65, 125);
      rt.chainCooldown = rand(14, 30);
    }

    // 연쇄 번개: 첫 번개 이후 짧은 간격으로 주변 행성에서도 추가 발생
    if (rt.chainCooldown === 1 && Math.random() < 0.72) {
      spawnLightningCluster(rt, state, true);
      rt.chainCooldown = Math.random() < 0.45 ? rand(12, 26) : 0;
    }

    for (const s of rt.strikes) {
      if (!s.active) {
        s.warn--;
        if (s.warn <= 0) s.active = true;
      } else {
        s.life--;

        if (!s.hitDone && isPlayerOnLightning(player, s)) {
          applyLightningHit(rt, player, s);
          s.hitDone = true;
        }
      }
    }

    rt.strikes = rt.strikes.filter(s => !s.active || s.life > 0);
  }

  function resolvePlanetCollision(rt, player, planet, dx, dy, dist) {
    const nx = dx / dist;
    const ny = dy / dist;
    const minDist = planet.r + player.radius + 1;

    player.x = planet.x + nx * minDist;
    player.y = planet.y + ny * minDist;

    const incoming = player.vx * nx + player.vy * ny;
    if (incoming < 0) {
      player.vx -= incoming * nx * 1.55;
      player.vy -= incoming * ny * 1.55;
    }

    player.vx += nx * 1.2;
    player.vy += ny * 1.2;
    player.impactSpin += (Math.random() - 0.5) * 0.12;
    player.impactFlash = 12;
    rt.hitFlash = 8;
  }

  function spawnLightningCluster(rt, state, isChain = false) {
    const count = isChain ? rand(1, 3) : rand(2, 5);
    const used = [];

    for (let i = 0; i < count; i++) {
      const source = pickPlanet(rt.planets, used);
      used.push(source);

      // 플레이어 근처 방향으로 나올 확률을 높여서 체감 위험도를 올림
      const toPlayer = Math.atan2(state.player.y - source.y, state.player.x - source.x);
      const angle = Math.random() < 0.62
        ? toPlayer + rand(-35, 36) * Math.PI / 180
        : Math.random() * Math.PI * 2;

      const length = rand(source.r + 130, source.field + 145);
      const strike = createStrike(source, angle, length, isChain);
      rt.strikes.push(strike);
    }
  }

  function pickPlanet(planets, used) {
    const pool = planets.filter(p => !used.includes(p));
    return (pool.length ? pool : planets)[Math.floor(Math.random() * (pool.length ? pool.length : planets.length))];
  }

  function createStrike(source, angle, length, isChain) {
    const strike = {
      planet: source,
      angle,
      startX: source.x + Math.cos(angle) * source.r * 0.82,
      startY: source.y + Math.sin(angle) * source.r * 0.82,
      endX: source.x + Math.cos(angle) * length,
      endY: source.y + Math.sin(angle) * length,
      warn: isChain ? rand(16, 34) : rand(22, 46),
      warnTotal: 0,
      life: rand(14, 28),
      active: false,
      width: rand(1, 4),
      hitDone: false,
      branches: buildLightningBranches(source, angle, length)
    };
    strike.warnTotal = strike.warn;
    return strike;
  }

  function buildLightningBranches(planet, angle, length) {
    const branches = [];
    const count = rand(2, 5);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 0.78 + 0.15;
      const baseX = planet.x + Math.cos(angle) * length * t;
      const baseY = planet.y + Math.sin(angle) * length * t;
      const branchAngle = angle + (Math.random() > 0.5 ? 1 : -1) * rand(25, 70) * Math.PI / 180;
      branches.push({
        x1: baseX,
        y1: baseY,
        x2: baseX + Math.cos(branchAngle) * rand(22, 58),
        y2: baseY + Math.sin(branchAngle) * rand(22, 58),
        alpha: Math.random() * 0.35 + 0.25
      });
    }
    return branches;
  }

  function isPlayerOnLightning(player, s) {
    const dist = distanceToSegment(player.x, player.y, s.startX, s.startY, s.endX, s.endY);
    return dist < player.radius + 18;
  }

  function distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    return Math.hypot(px - x, py - y);
  }

  function applyLightningHit(rt, player, s) {
    rt.hitFlash = 12;
    player.impactFlash = 16;

    const dx = player.x - s.startX;
    const dy = player.y - s.startY;
    const dist = Math.hypot(dx, dy) || 1;
    player.vx += (dx / dist) * 1.7;
    player.vy += (dy / dist) * 1.7;
    player.impactSpin += (Math.random() - 0.5) * 0.18;
  }

  function render(ctx, rt, state, layer) {
    if (layer === "background") {
      ctx.drawImage(rt.spaceLayer, 0, 0);
      drawPlanets(ctx, rt, state);
    }

    if (layer === "foreground") {
      drawStrikes(ctx, rt);
      drawSlowOverlay(ctx, rt, state);
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, 0.42);

      if (rt.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(170,220,255,${rt.hitFlash / 68})`;
        ctx.fillRect(0, 0, state.width, state.height);
        ctx.restore();
      }
    }
  }

  function drawPlanets(ctx, rt, state) {
    for (const p of rt.planets) {
      const pulse = 0.5 + Math.sin(state.time * 0.04 + p.phase) * 0.18;

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const field = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.field);
      field.addColorStop(0, `rgba(90,150,255,${0.06 + pulse * 0.04})`);
      field.addColorStop(0.55, `rgba(90,90,255,${0.035 + pulse * 0.03})`);
      field.addColorStop(1, "rgba(90,90,255,0)");

      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.field, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(120,180,255,${0.14 + pulse * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.field, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(150,200,255,${0.05 + pulse * 0.03})`;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.field * (0.42 + i * 0.18), p.field * (0.20 + i * 0.09), state.time * 0.004 + p.phase + i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const body = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, 0, p.x, p.y, p.r);
      body.addColorStop(0, "#667aa8");
      body.addColorStop(0.52, "#202b4b");
      body.addColorStop(1, "#060812");

      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(210,230,255,.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawStrikes(ctx, rt) {
    for (const s of rt.strikes) {
      if (!s.active) {
        const ratio = 1 - s.warn / Math.max(1, s.warnTotal);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(180,220,255,${0.18 + ratio * 0.42})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([7, 9]);
        ctx.beginPath();
        ctx.moveTo(s.startX, s.startY);
        ctx.lineTo(s.endX, s.endY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `rgba(200,235,255,${0.32 + ratio * 0.48})`;
        ctx.beginPath();
        ctx.arc(s.startX, s.startY, 4 + ratio * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        ctx.strokeStyle = "rgba(80,170,255,.36)";
        ctx.lineWidth = s.width + 8;
        drawJaggedBolt(ctx, s.startX, s.startY, s.endX, s.endY, 7, 18);

        ctx.strokeStyle = "rgba(235,250,255,.96)";
        ctx.lineWidth = s.width;
        drawJaggedBolt(ctx, s.startX, s.startY, s.endX, s.endY, 7, 18);

        ctx.strokeStyle = "rgba(255,255,255,.86)";
        ctx.lineWidth = 1;
        drawJaggedBolt(ctx, s.startX, s.startY, s.endX, s.endY, 7, 9);

        ctx.strokeStyle = "rgba(130,205,255,.45)";
        ctx.lineWidth = 1;
        for (const b of s.branches) {
          ctx.globalAlpha = b.alpha;
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x2, b.y2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
  }

  function drawJaggedBolt(ctx, x1, y1, x2, y2, segments, jitter) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + rand(-jitter, jitter);
      const y = y1 + (y2 - y1) * t + rand(-jitter, jitter);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawSlowOverlay(ctx, rt, state) {
    if (!rt.slowActive) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(70,120,255,.035)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function rand(a, b) {
    return Math.floor(Math.random() * (b - a) + a);
  }

  return { createRuntime, update, render };
})();
