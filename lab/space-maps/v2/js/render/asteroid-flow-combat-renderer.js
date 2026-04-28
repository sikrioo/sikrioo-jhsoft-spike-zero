window.AsteroidFlowCombatRenderer = (() => {
  const MAX_BULLETS = 120;

  function createRuntime(state, stage) {
    const rt = {
      stage,
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height, {
        center: "#101827", mid: "#050914", edge: "#010308",
        nebulaA: "70,105,145", nebulaB: "148,111,70", starCount: 95
      }),
      gridLayer: BackgroundRenderer.createGridLayer(state.width, state.height),
      asteroids: [],
      bullets: [],
      sparks: [],
      fireCd: 0,
      hitFlash: 0,
      asteroidGrid: SpatialGrid.create(128),
      queryCache: [],
      bulletPool: ObjectPool.create(
        () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 3, power: 1.2 }),
        (b, d) => {
          b.x = d.x; b.y = d.y; b.vx = d.vx; b.vy = d.vy;
          b.life = d.life; b.r = d.r; b.power = d.power;
          b.dead = false;
        },
        MAX_BULLETS
      )
    };

    spawnAsteroids(rt, state);
    return rt;
  }

  function spawnAsteroids(rt, state) {
    // 엔진식 최적화 테스트용: 수량 제한 + 충돌 후보는 SpatialGrid 사용
    const radii = [82, 64, 44, 38, 34, 30, 26, 24, 22, 20, 18, 18, 16, 16, 14, 14, 12, 12];

    for (const r of radii) {
      rt.asteroids.push(makeAsteroid(state, r));
    }
  }

  function makeAsteroid(state, r) {
    const a = {
      x: Utils.rand(-state.width * .15, state.width * 1.05),
      y: Utils.rand(50, state.height - 50),
      r,
      mass: Math.max(1, r * r * 0.014),
      vx: Utils.rand(.45, 1.25) * (r > 55 ? .55 : 1),
      vy: Utils.rand(-.10, .24),
      angle: Utils.rand(0, Math.PI * 2),
      spin: Utils.rand(-.006, .006),
      color: Math.floor(Utils.rand(75, 120))
    };

    a.invMass = 1 / a.mass;
    a.sprite = makeAsteroidSprite(a);
    return a;
  }

  function makeAsteroidSprite(a) {
    const size = Math.ceil(a.r * 3);
    const c = Utils.makeCanvas(size, size);
    const ctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;
    const points = [];

    for (let i = 0; i < 11; i++) {
      const ang = Math.PI * 2 * i / 11;
      const rr = a.r * Utils.rand(.72, 1.15);
      points.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
    }

    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();

    const g = ctx.createLinearGradient(cx - a.r, cy - a.r, cx + a.r, cy + a.r);
    g.addColorStop(0, `rgb(${a.color + 45},${a.color + 38},${a.color + 28})`);
    g.addColorStop(.5, `rgb(${a.color},${a.color - 8},${a.color - 18})`);
    g.addColorStop(1, `rgb(${Math.max(10, a.color - 50)},${Math.max(10, a.color - 55)},${Math.max(10, a.color - 60)})`);

    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(245,238,220,.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    return { canvas: c, offset: size / 2 };
  }

  function update(rt, state) {
    if (rt.fireCd > 0) rt.fireCd--;
    if (rt.hitFlash > 0) rt.hitFlash--;

    updateGun(rt, state);
    updateBullets(rt, state);
    updateAsteroids(rt, state);
    rebuildAsteroidGrid(rt);
    updateSparks(rt);
    resolveBulletAsteroidHits(rt);
    resolvePlayerAsteroids(rt, state);
  }

  function updateGun(rt, state) {
    if (!state.keys.has("Space") || rt.fireCd > 0) return;
    if (rt.bullets.length >= MAX_BULLETS) return;

    rt.fireCd = 5;

    const p = state.player;
    const ang = p.angle - Math.PI / 2;
    const speed = 12;

    const bullet = rt.bulletPool.acquire({
      x: p.x + Math.cos(ang) * 18,
      y: p.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 55,
      r: 3,
      power: 1.2
    });

    rt.bullets.push(bullet);
  }

  function updateBullets(rt, state) {
    for (const b of rt.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      if (
        b.life <= 0 ||
        b.x < -20 || b.x > state.width + 20 ||
        b.y < -20 || b.y > state.height + 20
      ) {
        b.dead = true;
      }
    }

    compactBullets(rt);
  }

  function compactBullets(rt) {
    let write = 0;

    for (let read = 0; read < rt.bullets.length; read++) {
      const b = rt.bullets[read];

      if (b.dead) {
        rt.bulletPool.release(b);
        continue;
      }

      rt.bullets[write++] = b;
    }

    rt.bullets.length = write;
  }

  function updateAsteroids(rt, state) {
    for (const a of rt.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.spin;

      // 총알 충격 등으로 속도가 변해도 지나가는 흐름으로 서서히 복귀
      a.vx += (0.65 - a.vx) * 0.0015;

      if (a.x > state.width + a.r * 3 || a.y > state.height + a.r * 3 || a.y < -a.r * 3) {
        recycleAsteroid(a, state);
      }
    }
  }

  function recycleAsteroid(a, state) {
    const n = makeAsteroid(state, a.r);
    a.x = -a.r - Utils.rand(30, 180);
    a.y = n.y;
    a.vx = n.vx;
    a.vy = n.vy;
    a.angle = n.angle;
    a.spin = n.spin;
  }

  function rebuildAsteroidGrid(rt) {
    SpatialGrid.clear(rt.asteroidGrid);

    for (const a of rt.asteroids) {
      SpatialGrid.insert(rt.asteroidGrid, a, a.x, a.y, a.r);
    }
  }

  function resolveBulletAsteroidHits(rt) {
    for (const b of rt.bullets) {
      if (b.dead) continue;

      const candidates = SpatialGrid.query(rt.asteroidGrid, b.x, b.y, 72, rt.queryCache);

      for (const a of candidates) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 1;

        if (d >= a.r + b.r) continue;

        b.dead = true;

        // 물리 반응: 총알 방향으로 소행성이 살짝 밀림
        const force = b.power / Math.max(1, a.mass) * 9;
        a.vx += b.vx * force * 0.06;
        a.vy += b.vy * force * 0.06;
        a.spin += (Math.random() - .5) * 0.012;

        spawnSpark(rt, b.x, b.y, b.vx, b.vy);
        break;
      }
    }

    compactBullets(rt);
  }

  function resolvePlayerAsteroids(rt, state) {
    const p = state.player;
    const candidates = SpatialGrid.query(rt.asteroidGrid, p.x, p.y, 130, rt.queryCache);

    for (const a of candidates) {
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = p.radius + a.r;

      if (d >= min) continue;

      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;

      // 지나갈 수 없도록 위치만 확실히 분리
      p.x += nx * overlap;
      p.y += ny * overlap;

      // 강한 지속 반동 대신 짧은 반동만
      p.vx += nx * Math.min(1.4, .35 + a.r / 95);
      p.vy += ny * Math.min(1.4, .35 + a.r / 95);

      // 소행성도 약하게 반응
      a.vx -= nx * a.invMass * 3.5;
      a.vy -= ny * a.invMass * 3.5;

      p.impactFlash = 8;
      rt.hitFlash = 5;
    }
  }

  function spawnSpark(rt, x, y, vx, vy) {
    if (rt.sparks.length > 80) return;
    for (let i = 0; i < 5; i++) {
      rt.sparks.push({
        x,
        y,
        vx: -vx * .08 + Utils.rand(-1.2, 1.2),
        vy: -vy * .08 + Utils.rand(-1.2, 1.2),
        life: Utils.rand(8, 16)
      });
    }
  }

  function updateSparks(rt) {
    let write = 0;

    for (let read = 0; read < rt.sparks.length; read++) {
      const s = rt.sparks[read];

      s.x += s.vx;
      s.y += s.vy;
      s.life--;

      if (s.life > 0) {
        rt.sparks[write++] = s;
      }
    }

    rt.sparks.length = write;
  }

  function render(ctx, rt, state, layer) {
    rt._drawWidth = state.width;
    rt._drawHeight = state.height;

    if (layer === "background") {
      ctx.drawImage(rt.spaceLayer, 0, 0);
      ctx.drawImage(rt.gridLayer, 0, 0);
      drawAsteroids(ctx, rt, false);
      drawBullets(ctx, rt);
      drawSparks(ctx, rt);
    }

    if (layer === "foreground") {
      drawAsteroids(ctx, rt, true);
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .48);

      if (rt.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(255,120,80,${rt.hitFlash / 95})`;
        ctx.fillRect(0, 0, state.width, state.height);
        ctx.restore();
      }
    }
  }

  function drawAsteroids(ctx, rt, front) {
    for (const a of rt.asteroids) {
      if ((a.r >= 46) !== front) continue;

      if (a.x < -a.r * 2 || a.x >  rt._drawWidth + a.r * 2 || a.y < -a.r * 2 || a.y > rt._drawHeight + a.r * 2) continue;

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.drawImage(a.sprite.canvas, -a.sprite.offset, -a.sprite.offset);
      ctx.restore();
    }
  }

  function drawBullets(ctx, rt) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const b of rt.bullets) {
      ctx.fillStyle = "rgba(130,230,255,.95)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(220,255,255,.45)";
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * .9, b.y - b.vy * .9);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSparks(ctx, rt) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const s of rt.sparks) {
      ctx.fillStyle = `rgba(255,220,150,${s.life / 16})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  return { createRuntime, update, render };
})();
