window.NebulaRenderer = (() => {
  function createRuntime(state, stage) {
    const runtime = {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#24245a",
        mid: "#0c0b28",
        edge: "#010208",
        nebulaA: "150,95,250",
        nebulaB: "70,205,255",
        starCount: 140
      }),
      particles: [],
      dangerDots: [],

      // 번개는 단발이 아니라 클러스터 단위로 발생한다.
      // 하나의 클러스터는 최대 약 1~4초 사이에서 불규칙하게 여러 번 번쩍인다.
      flashTimer: Utils.rand(stage.flashIntervalMin, stage.flashIntervalMax),
      flashCluster: null,
      lightningBolts: []
    };

    for (let i = 0; i < 120; i++) {
      runtime.particles.push({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        r: Utils.rand(1.2, 4.8),
        vx: Utils.rand(-.08, .08),
        vy: Utils.rand(.02, .18),
        alpha: Utils.rand(.08, .28),
        color: Math.random() > .5 ? "155,105,250" : "90,215,255"
      });
    }

    for (let i = 0; i < 22; i++) {
      runtime.dangerDots.push({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        r: Utils.rand(5, 13),
        vx: Utils.rand(-.18, .18),
        vy: Utils.rand(-.12, .12),
        alpha: Utils.rand(.32, .64)
      });
    }

    return runtime;
  }

  function createLightningBolts(state) {
    const bolts = [];
    const boltCount = Math.floor(Utils.rand(1, 4));

    for (let b = 0; b < boltCount; b++) {
      const points = [];
      let x = Utils.rand(state.width * .12, state.width * .9);
      let y = Utils.rand(-30, state.height * .18);
      points.push({ x, y });

      const segmentCount = Math.floor(Utils.rand(6, 11));
      for (let i = 0; i < segmentCount; i++) {
        x += Utils.rand(-55, 55);
        y += state.height / segmentCount;
        points.push({ x, y });
      }

      bolts.push({
        points,
        width: Utils.rand(1.2, 3.2),
        alpha: Utils.rand(.45, .9)
      });
    }

    return bolts;
  }

  function startFlashCluster(runtime) {
    // 60fps 기준 1~4초 사이
    const totalFrames = Math.floor(Utils.rand(60, 240));

    runtime.flashCluster = {
      totalFrames,
      remainingFrames: totalFrames,
      flashTime: 0,
      nextDelay: 0,
      intensity: 0,
      remainingFlashes: Math.floor(Utils.rand(3, 8))
    };

    runtime.lightningBolts = [];
  }

  function triggerClusterFlash(runtime, state) {
    const c = runtime.flashCluster;
    if (!c || c.remainingFlashes <= 0) return;

    // 짧게 번쩍이는 시간. 약 0.08~0.28초
    c.flashTime = Math.floor(Utils.rand(5, 17));

    // 다음 번개까지 간격. 너무 규칙적이지 않게.
    c.nextDelay = Math.floor(Utils.rand(6, 34));

    // 밝기 랜덤
    c.intensity = Utils.rand(.55, 1.35);

    c.remainingFlashes--;

    // 번개 줄기도 매번 새로 생성
    runtime.lightningBolts = createLightningBolts(state);
  }

  function updateLightning(runtime, state) {
    runtime.flashTimer--;

    if (runtime.flashTimer <= 0 && !runtime.flashCluster) {
      startFlashCluster(runtime);

      // 다음 클러스터까지 대기 시간
      runtime.flashTimer = Math.floor(Utils.rand(
        runtime.stage.flashIntervalMin,
        runtime.stage.flashIntervalMax
      ));
    }

    const c = runtime.flashCluster;
    if (!c) return;

    c.remainingFrames--;

    if (c.flashTime > 0) {
      c.flashTime--;
    } else {
      c.nextDelay--;

      if (c.nextDelay <= 0 && c.remainingFlashes > 0) {
        triggerClusterFlash(runtime, state);
      }
    }

    // 총 지속시간이 끝나거나 번개를 다 소모하고 충분히 쉰 경우 종료
    if (c.remainingFrames <= 0) {
      runtime.flashCluster = null;
      runtime.lightningBolts = [];
    }

    // JS에는 and가 없으므로 위 방어용 분기 아래에서 실제 종료 처리
    if (runtime.flashCluster && c.remainingFlashes <= 0 && c.flashTime <= 0 && c.nextDelay <= 0) {
      runtime.flashCluster = null;
      runtime.lightningBolts = [];
    }
  }

  function update(runtime, state) {
    updateLightning(runtime, state);

    for (const p of runtime.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = state.width + 10;
      if (p.x > state.width + 10) p.x = -10;
      if (p.y > state.height + 10) p.y = -10;
    }

    for (const d of runtime.dangerDots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -20) d.x = state.width + 20;
      if (d.x > state.width + 20) d.x = -20;
      if (d.y < -20) d.y = state.height + 20;
      if (d.y > state.height + 20) d.y = -20;
    }
  }

  function getLightInfo(state, runtime) {
    const p = state.player;
    const lightOn = !!p.lightOn && p.lightEnergy > 0;
    return {
      player: p,
      lightOn,
      radius: lightOn ? 310 : (runtime.stage.visibilityRadius || 82)
    };
  }

  function isFlashRevealing(runtime) {
    return !!(runtime.flashCluster && runtime.flashCluster.flashTime > 0);
  }

  function getFlashIntensity(runtime) {
    if (!isFlashRevealing(runtime)) return 0;
    const c = runtime.flashCluster;
    const flicker = Utils.rand(.86, 1.14);
    return c.intensity * flicker;
  }

  function drawParticles(ctx, runtime, alphaMultiplier = 1) {
    for (const p of runtime.particles) {
      ctx.fillStyle = `rgba(${p.color},${p.alpha * alphaMultiplier})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDangerDots(ctx, runtime, alphaMultiplier = 1) {
    for (const d of runtime.dangerDots) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(255,90,130,${d.alpha * alphaMultiplier})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,150,180,${d.alpha * .55 * alphaMultiplier})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSceneContent(ctx, runtime, state, alphaMultiplier = 1) {
    ctx.save();
    ctx.globalAlpha = alphaMultiplier;
    ctx.drawImage(runtime.spaceLayer, 0, 0);
    ctx.restore();

    drawParticles(ctx, runtime, alphaMultiplier);
    drawDangerDots(ctx, runtime, alphaMultiplier);
  }

  function drawLightReveal(ctx, runtime, state) {
    const { player: p, lightOn, radius } = getLightInfo(state, runtime);

    ctx.save();

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.clip();

    drawSceneContent(ctx, runtime, state, lightOn ? 1.45 : .70);

    if (lightOn) {
      ctx.globalCompositeOperation = "screen";
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      glow.addColorStop(0, "rgba(170,250,255,.30)");
      glow.addColorStop(.32, "rgba(90,220,255,.18)");
      glow.addColorStop(.72, "rgba(60,160,230,.07)");
      glow.addColorStop(1, "rgba(60,160,230,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = lightOn ? "rgba(160,245,255,.46)" : "rgba(120,205,235,.10)";
    ctx.lineWidth = lightOn ? 1.2 : .6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * .985, 0, Math.PI * 2);
    ctx.stroke();

    if (lightOn) {
      ctx.strokeStyle = "rgba(180,250,255,.12)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * .52, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawLightBeam(ctx, runtime, state) {
    const { player: p, lightOn } = getLightInfo(state, runtime);
    if (!lightOn) return;

    const angle = p.angle - Math.PI / 2;
    const bx = Math.cos(angle);
    const by = Math.sin(angle);

    const coneLen = 260;
    const coneWidth = 95;
    const tipX = p.x + bx * coneLen;
    const tipY = p.y + by * coneLen;
    const leftX = p.x + Math.cos(angle - Math.PI / 2) * coneWidth;
    const leftY = p.y + Math.sin(angle - Math.PI / 2) * coneWidth;
    const rightX = p.x + Math.cos(angle + Math.PI / 2) * coneWidth;
    const rightY = p.y + Math.sin(angle + Math.PI / 2) * coneWidth;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const beam = ctx.createLinearGradient(p.x, p.y, tipX, tipY);
    beam.addColorStop(0, "rgba(170,245,255,.08)");
    beam.addColorStop(.65, "rgba(90,210,255,.025)");
    beam.addColorStop(1, "rgba(90,210,255,0)");

    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawFog(ctx, runtime, state) {
    // 번개가 번쩍이는 순간에는 전체가 잠깐 보인다.
    if (isFlashRevealing(runtime)) return;

    const { lightOn } = getLightInfo(state, runtime);

    ctx.fillStyle = lightOn ? "rgba(0,0,0,.91)" : "rgba(0,0,0,.96)";
    ctx.fillRect(0, 0, state.width, state.height);

    drawLightReveal(ctx, runtime, state);
    drawLightBeam(ctx, runtime, state);
  }

  function drawLightning(ctx, runtime, state) {
    if (!isFlashRevealing(runtime)) return;

    const intensity = getFlashIntensity(runtime);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 번개 순간 전체 화면을 불규칙하게 노출
    ctx.fillStyle = `rgba(185,235,255,${Math.min(.62, .18 + intensity * .22)})`;
    ctx.fillRect(0, 0, state.width, state.height);

    // 성운 자체도 순간적으로 더 선명하게 다시 드러냄
    drawSceneContent(ctx, runtime, state, Math.min(1.85, 1.05 + intensity * .45));

    // 번개 줄기
    for (const bolt of runtime.lightningBolts) {
      if (!bolt.points.length) continue;

      ctx.beginPath();
      ctx.moveTo(bolt.points[0].x, bolt.points[0].y);

      for (let i = 1; i < bolt.points.length; i++) {
        ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
      }

      ctx.strokeStyle = `rgba(230,250,255,${Math.min(1, bolt.alpha * intensity)})`;
      ctx.lineWidth = bolt.width;
      ctx.stroke();

      // 얇은 내부 코어
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, .45 * intensity)})`;
      ctx.lineWidth = Math.max(1, bolt.width * .45);
      ctx.stroke();
    }

    ctx.restore();
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      drawSceneContent(ctx, runtime, state, .28);
    }

    if (layer === "foreground") {
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .26);
      drawFog(ctx, runtime, state);
      drawLightning(ctx, runtime, state);
    }
  }

  return { createRuntime, update, render };
})();
