window.GasPlanetRenderer = (() => {
  function createRuntime(state, stage) {
    const runtime = {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#17212f",
        mid: "#060b12",
        edge: "#010307",
        nebulaA: "50,155,145",
        nebulaB: "210,115,50",
        starCount: 120
      }),
      gridLayer: BackgroundRenderer.createGridLayer(state.width, state.height),
      planets: [],
      hitFlash: 0
    };

    createPlanets(runtime, state, stage);
    return runtime;
  }

  function createPlanets(runtime, state, stage) {
    const presets = [
      { x: .22, y: .28, r: 72, colorA: "#415069", colorB: "#171d28", gasColor: "95,230,220" },
      { x: .72, y: .26, r: 96, colorA: "#7c5131", colorB: "#23140c", gasColor: "95,230,220" },
      { x: .38, y: .66, r: 88, colorA: "#35685e", colorB: "#10251f", gasColor: "95,230,220" },
      { x: .82, y: .72, r: 64, colorA: "#695a86", colorB: "#1a1428", gasColor: "95,230,220" },
      { x: .55, y: .48, r: 56, colorA: "#8a7048", colorB: "#211b12", gasColor: "95,230,220" }
    ];

    runtime.planets = presets.map(p => createPlanet({
      x: state.width * p.x,
      y: state.height * p.y,
      r: p.r,
      colorA: p.colorA,
      colorB: p.colorB,
      gasColor: p.gasColor,
      timer: Math.floor(Utils.rand(stage.gasIntervalMin, stage.gasIntervalMax)),
      state: "idle",
      warnTime: 0,
      warnTotal: 0,
      gasTime: 0,
      gasTotal: 0,
      angle: Utils.rand(0, Math.PI * 2),
      nextAngle: Utils.rand(0, Math.PI * 2),
      jetCountMin: Math.floor(Utils.rand(1, 3)),
      jetCountMax: Math.floor(Utils.rand(2, 5)),
      jetLengthMul: Utils.rand(.82, 1.24),
      jetWidthMul: Utils.rand(.72, 1.18),
      jetRoughness: Utils.rand(.75, 1.35),
      jetAngleSpread: Utils.rand(.18, .42)
    }));
  }

  function createPlanet(data) {
    data.sprite = createPlanetSprite(data);
    return data;
  }

  function createPlanetSprite(p) {
    const size = Math.ceil(p.r * 2.8);
    const c = Utils.makeCanvas(size, size);
    const ctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;

    const glow = ctx.createRadialGradient(cx, cy, p.r * .45, cx, cy, p.r * 1.25);
    glow.addColorStop(0, "rgba(255,255,255,0)");
    glow.addColorStop(1, "rgba(90,180,255,.12)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r * 1.25, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(cx - p.r * .35, cy - p.r * .35, p.r * .1, cx, cy, p.r);
    body.addColorStop(0, p.colorA);
    body.addColorStop(.55, p.colorB);
    body.addColorStop(1, "#05070b");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < 7; i++) {
      const y = cy - p.r * .65 + i * p.r * .22;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255,235,190,.13)" : "rgba(20,30,35,.20)";
      ctx.lineWidth = Math.max(2, p.r * .055);
      ctx.beginPath();
      ctx.ellipse(cx, y, p.r * .92, p.r * .12, Utils.rand(-.15, .15), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    ctx.strokeStyle = "rgba(245,245,235,.22)";
    ctx.lineWidth = Math.max(1, p.r * .025);
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.stroke();

    return { canvas: c, offset: size / 2 };
  }

  function countActive(runtime) {
    return runtime.planets.filter(p => p.state === "warning" || p.state === "erupting").length;
  }


  function buildJetProfiles(p) {
    const count = Math.floor(Utils.rand(p.jetCountMin, p.jetCountMax + 1));
    const profiles = [];

    for (let i = 0; i < count; i++) {
      const offset = count === 1
        ? 0
        : Utils.rand(-p.jetAngleSpread, p.jetAngleSpread);

      profiles.push({
        angleOffset: offset,
        lengthMul: Utils.rand(.72, 1.22) * p.jetLengthMul,
        widthMul: Utils.rand(.68, 1.14) * p.jetWidthMul,
        delay: Math.floor(Utils.rand(0, 12)),
        flickerSeed: Utils.rand(0, 1000),
        shardCount: Math.floor(Utils.rand(3, 7))
      });
    }

    return profiles;
  }

  function update(runtime, state) {
    const stage = runtime.stage;
    if (runtime.hitFlash > 0) runtime.hitFlash--;

    for (const p of runtime.planets) {
      if (p.state === "idle") {
        p.timer--;
        if (p.timer <= 0 && countActive(runtime) < stage.maxActiveGas) {
          p.state = "warning";
          p.warnTime = Math.floor(Utils.rand(stage.gasWarnMin, stage.gasWarnMax));
          p.warnTotal = p.warnTime;
          p.nextAngle = Utils.rand(0, Math.PI * 2);
          p.pendingJets = buildJetProfiles(p);
        }
      } else if (p.state === "warning") {
        p.warnTime--;
        p.angle = p.nextAngle;
        if (p.warnTime <= 0) {
          p.state = "erupting";
          p.gasTime = Math.floor(Utils.rand(stage.gasDurationMin, stage.gasDurationMax));
          p.gasTotal = p.gasTime;
          p.jets = p.pendingJets && p.pendingJets.length ? p.pendingJets : buildJetProfiles(p);
        }
      } else if (p.state === "erupting") {
        p.gasTime--;
        if (isPlayerInGas(state.player, p)) runtime.hitFlash = 8;
        if (p.gasTime <= 0) {
          p.state = "idle";
          p.timer = Math.floor(Utils.rand(stage.gasIntervalMin, stage.gasIntervalMax));
        }
      }

      if (isPlayerTouchingPlanet(state.player, p)) runtime.hitFlash = 8;
    }
  }

  function isPlayerTouchingPlanet(player, p) {
    return Math.hypot(player.x - p.x, player.y - p.y) < p.r + player.radius;
  }

  function isPlayerInGas(player, p) {
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < p.r * .78 || dist > p.r + 270) return false;

    const a = Math.atan2(dy, dx);
    const diff = Math.abs(normalizeAngle(a - p.angle));
    return diff < Math.PI / 7.5;
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function drawPlanets(ctx, runtime) {
    for (const p of runtime.planets) {
      ctx.drawImage(p.sprite.canvas, p.x - p.sprite.offset, p.y - p.sprite.offset);
      if (p.state === "warning") drawWarning(ctx, p);
    }
  }

  function drawWarning(ctx, p) {
    const ratio = p.warnTotal > 0 ? 1 - p.warnTime / p.warnTotal : 1;
    const blink = Math.sin(ratio * Math.PI * 12) > 0 ? 1 : .28;
    const jets = p.pendingJets && p.pendingJets.length ? p.pendingJets : [{ angleOffset: 0, lengthMul: 1 }];

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // 간결한 예고: 실제 분출될 방향만 짧게 표시
    for (const jet of jets) {
      const angle = p.angle + jet.angleOffset;
      const bx = Math.cos(angle);
      const by = Math.sin(angle);

      const sx = p.x + bx * p.r * .72;
      const sy = p.y + by * p.r * .72;
      const ex = p.x + bx * (p.r + 32 + 16 * jet.lengthMul);
      const ey = p.y + by * (p.r + 32 + 16 * jet.lengthMul);

      ctx.strokeStyle = `rgba(${p.gasColor},${.24 + .44 * blink})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = `rgba(${p.gasColor},${.30 + .42 * blink})`;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * .075, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawGasJets(ctx, runtime) {
    for (const p of runtime.planets) {
      if (p.state !== "erupting") continue;

      const baseRatio = p.gasTotal > 0 ? 1 - p.gasTime / p.gasTotal : 1;
      const fadeOut = Math.min(1, p.gasTime / 18);
      const jets = p.jets && p.jets.length ? p.jets : [{ angleOffset: 0, lengthMul: 1, widthMul: 1, delay: 0, flickerSeed: 0, shardCount: 4 }];

      for (const jet of jets) {
        const localFrame = Math.max(0, baseRatio * p.gasTotal - jet.delay);
        if (localFrame <= 0) continue;

        const localRatio = Math.min(1, localFrame / Math.max(1, p.gasTotal - jet.delay));
        const burst = Math.min(1, localRatio * 3.4);
        const flicker = .86 + Math.sin((runtime.stage.gasDurationMax - p.gasTime + jet.flickerSeed) * .38) * .14;

        const angle = p.angle + jet.angleOffset;
        const length = (90 + burst * 320) * jet.lengthMul * flicker;
        const width = p.r * (.28 + .18 * Math.sin(localRatio * Math.PI * 9)) * jet.widthMul;

        const start = p.r * .78;
        const bx = Math.cos(angle);
        const by = Math.sin(angle);
        const px = -by;
        const py = bx;

        const sx = p.x + bx * start;
        const sy = p.y + by * start;
        const ex = p.x + bx * (start + length);
        const ey = p.y + by * (start + length);

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // 날카로운 메인 제트: 각 줄기마다 길이/폭/각도 차이
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, `rgba(${p.gasColor},${.72 * fadeOut})`);
        grad.addColorStop(.22, `rgba(${p.gasColor},${.46 * fadeOut})`);
        grad.addColorStop(.72, `rgba(${p.gasColor},${.18 * fadeOut})`);
        grad.addColorStop(1, `rgba(${p.gasColor},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(sx + px * width * .14, sy + py * width * .14);
        ctx.lineTo(ex + px * width * Utils.rand(.20, .48), ey + py * width * Utils.rand(.20, .48));
        ctx.lineTo(ex + px * width * Utils.rand(.03, .15) + bx * Utils.rand(22, 48), ey + py * width * Utils.rand(.03, .15) + by * Utils.rand(22, 48));
        ctx.lineTo(ex - px * width * Utils.rand(.20, .48), ey - py * width * Utils.rand(.20, .48));
        ctx.lineTo(sx - px * width * .14, sy - py * width * .14);
        ctx.closePath();
        ctx.fill();

        // 중심 고속선
        ctx.strokeStyle = `rgba(255,255,255,${.40 * fadeOut})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex + bx * 36, ey + by * 36);
        ctx.stroke();

        // 거친 보조 가닥
        for (let i = 0; i < jet.shardCount; i++) {
          const side = Math.random() > .5 ? 1 : -1;
          const t0 = Utils.rand(.04, .25);
          const t1 = Utils.rand(.50, 1.08);
          const spread0 = side * Utils.rand(1, width * .18);
          const spread1 = side * Utils.rand(width * .24, width * .72);

          const x0 = sx + bx * length * t0 + px * spread0;
          const y0 = sy + by * length * t0 + py * spread0;
          const x1 = sx + bx * length * t1 + px * spread1;
          const y1 = sy + by * length * t1 + py * spread1;

          ctx.strokeStyle = `rgba(${p.gasColor},${Utils.rand(.14, .38) * fadeOut})`;
          ctx.lineWidth = Utils.rand(.7, 1.6);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }

        // 입자는 적게 유지
        for (let i = 0; i < 6; i++) {
          const t = Math.random();
          const spread = (Math.random() - .5) * width * (1.1 - t * .25);
          const x = sx + bx * length * t + px * spread;
          const y = sy + by * length * t + py * spread;
          ctx.fillStyle = `rgba(${p.gasColor},${Utils.rand(.10, .30) * fadeOut})`;
          ctx.beginPath();
          ctx.arc(x, y, Utils.rand(1.0, 2.8), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
  }

  function drawHitFlash(ctx, runtime, state) {
    if (runtime.hitFlash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,80,60,${runtime.hitFlash / 80})`;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      ctx.drawImage(runtime.spaceLayer, 0, 0);
      ctx.drawImage(runtime.gridLayer, 0, 0);
      drawGasJets(ctx, runtime);
      drawPlanets(ctx, runtime);
    }

    if (layer === "foreground") {
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .44);
      drawHitFlash(ctx, runtime, state);
    }
  }

  return { createRuntime, update, render };
})();
