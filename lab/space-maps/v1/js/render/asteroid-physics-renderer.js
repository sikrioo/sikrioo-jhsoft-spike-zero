window.AsteroidPhysicsRenderer = (() => {
  function createRuntime(state, stage) {
    const runtime = {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#101827",
        mid: "#050914",
        edge: "#010308",
        nebulaA: "70,105,145",
        nebulaB: "148,111,70",
        starCount: 110
      }),
      gridLayer: BackgroundRenderer.createGridLayer(state.width, state.height),
      asteroids: [],
      hitFlash: 0
    };

    createAsteroids(runtime, state);
    return runtime;
  }

  function createAsteroids(runtime, state) {
    // 기존 Asteroid Belt보다 약 30% 줄인 밀도
    const counts = { large: 3, mid: 11, small: 38 };
    for (let i = 0; i < counts.large; i++) runtime.asteroids.push(createAsteroid(state, "large"));
    for (let i = 0; i < counts.mid; i++) runtime.asteroids.push(createAsteroid(state, "mid"));
    for (let i = 0; i < counts.small; i++) runtime.asteroids.push(createAsteroid(state, "small"));
    runtime.asteroids.sort((a, b) => a.r - b.r);
  }

  function createAsteroid(state, type) {
    const isLarge = type === "large";
    const isMid = type === "mid";
    const r = isLarge ? Utils.rand(62, 108) : isMid ? Utils.rand(28, 52) : Utils.rand(9, 22);
    const mass = Math.max(1, r * r * 0.012);
    const a = {
      type,
      r,
      mass,
      invMass: 1 / mass,
      x: Utils.rand(r + 20, state.width - r - 20),
      y: Utils.rand(r + 20, state.height - r - 20),
      vx: Utils.rand(-0.65, 0.65) * (isLarge ? 0.45 : isMid ? 0.75 : 1.15),
      vy: Utils.rand(-0.65, 0.65) * (isLarge ? 0.45 : isMid ? 0.75 : 1.15),
      angle: Utils.rand(0, Math.PI * 2),
      spin: Utils.rand(-0.008, 0.008) * (isLarge ? 0.45 : 1),
      color: {
        r: Math.floor(Utils.rand(82, 122)),
        g: Math.floor(Utils.rand(76, 108)),
        b: Math.floor(Utils.rand(66, 94))
      }
    };
    a.sprite = createSprite(a);
    return a;
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
      const x = cx + p.x, y = cy + p.y;
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

    const craterCount = a.type === "large" ? 9 : a.type === "mid" ? 5 : 2;
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
      const x = cx + p.x, y = cy + p.y;
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
    const restitution = runtime.stage.restitution ?? 0.84;
    const friction = runtime.stage.friction ?? 0.998;

    for (const a of runtime.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.spin;
      a.vx *= friction;
      a.vy *= friction;
      a.spin *= 0.999;
      resolveWall(a, state, restitution);
    }

    resolveAsteroids(runtime.asteroids, restitution);
    resolvePlayer(runtime, state, restitution);
  }

  function resolveWall(a, state, restitution) {
    if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx) * restitution; }
    if (a.x > state.width - a.r) { a.x = state.width - a.r; a.vx = -Math.abs(a.vx) * restitution; }
    if (a.y < a.r) { a.y = a.r; a.vy = Math.abs(a.vy) * restitution; }
    if (a.y > state.height - a.r) { a.y = state.height - a.r; a.vy = -Math.abs(a.vy) * restitution; }
  }

  function resolveAsteroids(arr, restitution) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.r + b.r;
        if (dist >= minDist) continue;

        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        const totalInv = a.invMass + b.invMass;

        a.x -= nx * overlap * (a.invMass / totalInv);
        a.y -= ny * overlap * (a.invMass / totalInv);
        b.x += nx * overlap * (b.invMass / totalInv);
        b.y += ny * overlap * (b.invMass / totalInv);

        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const vel = rvx * nx + rvy * ny;
        if (vel > 0) continue;

        const impulse = -(1 + restitution) * vel / totalInv;
        const ix = impulse * nx, iy = impulse * ny;
        a.vx -= ix * a.invMass; a.vy -= iy * a.invMass;
        b.vx += ix * b.invMass; b.vy += iy * b.invMass;

        const tangent = (rvx * -ny + rvy * nx) * 0.0008;
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
      const dx = p.x - a.x, dy = p.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = p.radius + a.r;
      if (dist >= minDist) continue;

      const nx = dx / dist, ny = dy / dist;
      const overlap = minDist - dist;

      p.x += nx * overlap * .72;
      p.y += ny * overlap * .72;
      a.x -= nx * overlap * .28;
      a.y -= ny * overlap * .28;

      const rvx = p.vx - a.vx, rvy = p.vy - a.vy;
      const vel = rvx * nx + rvy * ny;
      if (vel < 0) {
        const totalInv = playerInv + a.invMass;
        const impulse = -(1 + restitution) * vel / totalInv;
        p.vx += impulse * nx * playerInv;
        p.vy += impulse * ny * playerInv;
        a.vx -= impulse * nx * a.invMass;
        a.vy -= impulse * ny * a.invMass;
      }

      const push = Math.min(2.6, 0.7 + a.r / 55);
      p.vx += nx * push;
      p.vy += ny * push;
      a.vx -= nx * push * a.invMass * 7;
      a.vy -= ny * push * a.invMass * 7;

      p.impactFlash = 12;
      p.impactSpin += (Math.random() - .5) * .12;
      runtime.hitFlash = 8;
      a.spin += (nx * p.vy - ny * p.vx) * .004;
    }
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      ctx.drawImage(runtime.spaceLayer, 0, 0);
      ctx.drawImage(runtime.gridLayer, 0, 0);
      drawAsteroids(ctx, runtime, state, false);
    }

    if (layer === "foreground") {
      drawAsteroids(ctx, runtime, state, true);
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

  function drawAsteroids(ctx, runtime, state, front) {
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
