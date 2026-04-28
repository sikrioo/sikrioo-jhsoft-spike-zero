window.AsteroidFlowRenderer = (() => {
  function createRuntime(state, stage) {
    const runtime = {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#101827",
        mid: "#050914",
        edge: "#010308",
        nebulaA: "70,105,145",
        nebulaB: "148,111,70",
        starCount: 105
      }),
      gridLayer: BackgroundRenderer.createGridLayer(state.width, state.height),
      asteroids: [],
      hitFlash: 0
    };

    createAsteroids(runtime, state);
    return runtime;
  }

  function createAsteroids(runtime, state) {
    // Asteroid Physics Belt보다 약 20% 더 감소.
    // 이전: large 3, mid 11, small 38 = 52개
    // 신규: large 2, mid 9, small 31 = 42개
    const counts = { large: 2, mid: 9, small: 31 };

    for (let i = 0; i < counts.large; i++) runtime.asteroids.push(createAsteroid(state, "large", true));
    for (let i = 0; i < counts.mid; i++) runtime.asteroids.push(createAsteroid(state, "mid", true));
    for (let i = 0; i < counts.small; i++) runtime.asteroids.push(createAsteroid(state, "small", true));

    runtime.asteroids.sort((a, b) => a.r - b.r);
  }

  function createAsteroid(state, type, initial = false) {
    const isLarge = type === "large";
    const isMid = type === "mid";
    const r = isLarge ? Utils.rand(62, 108) : isMid ? Utils.rand(28, 52) : Utils.rand(9, 22);
    const mass = Math.max(1, r * r * 0.012);

    const direction = Math.random() < 0.78 ? "leftToRight" : "diagonal";
    const speedBase = isLarge ? Utils.rand(0.35, 0.7) : isMid ? Utils.rand(0.65, 1.15) : Utils.rand(1.05, 1.85);

    const a = {
      type,
      r,
      mass,
      invMass: 1 / mass,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      baseVx: 0,
      baseVy: 0,
      angle: Utils.rand(0, Math.PI * 2),
      spin: Utils.rand(-0.008, 0.008) * (isLarge ? 0.45 : 1),
      color: {
        r: Math.floor(Utils.rand(82, 122)),
        g: Math.floor(Utils.rand(76, 108)),
        b: Math.floor(Utils.rand(66, 94))
      }
    };

    if (direction === "leftToRight") {
      a.x = initial ? Utils.rand(-state.width * 0.1, state.width * 1.05) : -r - Utils.rand(20, 180);
      a.y = Utils.rand(r + 20, state.height - r - 20);
      a.baseVx = speedBase;
      a.baseVy = Utils.rand(-0.18, 0.18);
    } else {
      a.x = initial ? Utils.rand(-state.width * 0.1, state.width * 1.05) : -r - Utils.rand(20, 180);
      a.y = Utils.rand(r, state.height * 0.65);
      a.baseVx = speedBase * Utils.rand(0.85, 1.15);
      a.baseVy = Utils.rand(0.18, 0.55);
    }

    a.vx = a.baseVx;
    a.vy = a.baseVy;
    a.sprite = createSprite(a);
    return a;
  }

  function recycleAsteroid(a, state) {
    const fresh = createAsteroid(state, a.type, false);
    a.r = fresh.r;
    a.mass = fresh.mass;
    a.invMass = fresh.invMass;
    a.x = fresh.x;
    a.y = fresh.y;
    a.vx = fresh.vx;
    a.vy = fresh.vy;
    a.baseVx = fresh.baseVx;
    a.baseVy = fresh.baseVy;
    a.angle = fresh.angle;
    a.spin = fresh.spin;
    a.color = fresh.color;
    a.sprite = fresh.sprite;
  }

  function createSprite(a) {
    const size = Math.ceil(a.r * 3.2);
    const c = Utils.makeCanvas(size, size);
    const ctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;
    const points = [];

    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * 2 * i / 12;
      const rough = Utils.rand(.72, 1.18);
      points.push({ x: Math.cos(angle) * a.r * rough, y: Math.sin(angle) * a.r * rough });
    }

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = cx + p.x;
      const y = cy + p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.save();
    ctx.clip();

    const g = ctx.createLinearGradient(cx - a.r, cy - a.r, cx + a.r, cy + a.r);
    g.addColorStop(0, `rgb(${a.color.r + 42},${a.color.g + 38},${a.color.b + 32})`);
    g.addColorStop(.42, `rgb(${a.color.r},${a.color.g},${a.color.b})`);
    g.addColorStop(1, `rgb(${Math.max(15, a.color.r - 56)},${Math.max(15, a.color.g - 50)},${Math.max(15, a.color.b - 44)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const craterCount = a.type === "large" ? 8 : a.type === "mid" ? 4 : 2;
    for (let i = 0; i < craterCount; i++) {
      const x = cx + Utils.rand(-a.r * .42, a.r * .42);
      const y = cy + Utils.rand(-a.r * .42, a.r * .42);
      const rr = Utils.rand(a.r * .045, a.r * .13);
      const cg = ctx.createRadialGradient(x - rr * .28, y - rr * .28, 0, x, y, rr);
      cg.addColorStop(0, "rgba(230,220,195,.10)");
      cg.addColorStop(.5, "rgba(42,36,32,.34)");
      cg.addColorStop(1, "rgba(10,10,12,.02)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = cx + p.x;
      const y = cy + p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(245,238,220,.25)";
    ctx.lineWidth = Math.max(1.2, a.r * .032);
    ctx.stroke();

    return { canvas: c, offset: size / 2 };
  }

  function update(runtime, state) {
    if (runtime.hitFlash > 0) runtime.hitFlash--;
    const restitution = runtime.stage.restitution ?? 0.72;
    const friction = runtime.stage.friction ?? 0.999;

    for (const a of runtime.asteroids) {
      // 흐름형 맵: 기본 진행 방향으로 계속 흘러감.
      // 충돌로 벗어난 속도는 조금씩 원래 흐름으로 복귀.
      a.vx += (a.baseVx - a.vx) * 0.004;
      a.vy += (a.baseVy - a.vy) * 0.004;

      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.spin;

      a.vx *= friction;
      a.vy *= friction;
      a.spin *= 0.999;

      if (a.x > state.width + a.r * 3 || a.y > state.height + a.r * 3 || a.y < -a.r * 3) {
        recycleAsteroid(a, state);
      }
    }

    resolveAsteroids(runtime.asteroids, restitution);
    resolvePlayer(runtime, state, restitution);
  }

  function resolveAsteroids(arr, restitution) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.r + b.r;
        if (dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const totalInv = a.invMass + b.invMass;

        a.x -= nx * overlap * (a.invMass / totalInv);
        a.y -= ny * overlap * (a.invMass / totalInv);
        b.x += nx * overlap * (b.invMass / totalInv);
        b.y += ny * overlap * (b.invMass / totalInv);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vel = rvx * nx + rvy * ny;
        if (vel > 0) continue;

        const impulse = -(1 + restitution) * vel / totalInv;
        const ix = impulse * nx;
        const iy = impulse * ny;

        a.vx -= ix * a.invMass;
        a.vy -= iy * a.invMass;
        b.vx += ix * b.invMass;
        b.vy += iy * b.invMass;

        const tangent = (rvx * -ny + rvy * nx) * 0.0007;
        a.spin -= tangent * b.r;
        b.spin += tangent * a.r;
      }
    }
  }

  function resolvePlayer(runtime, state, restitution) {
    const p = state.player;
    const playerMass = 24;
    const playerInv = 1 / playerMass;

    for (const a of runtime.asteroids) {
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = p.radius + a.r;
      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      p.x += nx * overlap * .72;
      p.y += ny * overlap * .72;
      a.x -= nx * overlap * .28;
      a.y -= ny * overlap * .28;

      const rvx = p.vx - a.vx;
      const rvy = p.vy - a.vy;
      const vel = rvx * nx + rvy * ny;

      if (vel < 0) {
        const totalInv = playerInv + a.invMass;
        const impulse = -(1 + restitution) * vel / totalInv;
        p.vx += impulse * nx * playerInv;
        p.vy += impulse * ny * playerInv;
        a.vx -= impulse * nx * a.invMass;
        a.vy -= impulse * ny * a.invMass;
      }

      const push = Math.min(2.4, 0.65 + a.r / 60);
      p.vx += nx * push;
      p.vy += ny * push;
      a.vx -= nx * push * a.invMass * 6;
      a.vy -= ny * push * a.invMass * 6;

      p.impactFlash = 12;
      p.impactSpin += (Math.random() - .5) * .11;
      runtime.hitFlash = 8;
      a.spin += (nx * p.vy - ny * p.vx) * .004;
    }
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      ctx.drawImage(runtime.spaceLayer, 0, 0);
      ctx.drawImage(runtime.gridLayer, 0, 0);
      drawFlowLines(ctx, state);
      drawAsteroids(ctx, runtime, false);
    }

    if (layer === "foreground") {
      drawAsteroids(ctx, runtime, true);
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .48);

      if (runtime.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(255,120,80,${runtime.hitFlash / 95})`;
        ctx.fillRect(0, 0, state.width, state.height);
        ctx.restore();
      }
    }
  }

  function drawFlowLines(ctx, state) {
    ctx.save();
    ctx.strokeStyle = "rgba(210,230,255,.035)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = (i / 12) * state.height + Math.sin((Date.now() * 0.001) + i) * 14;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y + 28);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroids(ctx, runtime, front) {
    for (const a of runtime.asteroids) {
      if ((a.r >= 46) !== front) continue;

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.drawImage(a.sprite.canvas, -a.sprite.offset, -a.sprite.offset);
      ctx.restore();
    }
  }

  return { createRuntime, update, render };
})();
