window.PlanetSystem = (() => {
  const SIZE_RADIUS = {
    small: 28,
    medium: 56,
    large: 84
  };

  function makePlanetSprite(planet, seed = 1) {
    const root = new PIXI.Container();
    const body = new PIXI.Graphics();
    const shade = new PIXI.Graphics();
    const detail = new PIXI.Graphics();
    const r = planet.radius;
    const points = [];
    let state = seed * 9973 + 17;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };

    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const jitter = 0.9 + rand() * 0.18;
      points.push(Math.cos(a) * r * jitter, Math.sin(a) * r * jitter);
    }

    body.beginFill(planet.color, 0.96);
    body.lineStyle(2, planet.rimColor, 0.42);
    body.drawPolygon(points);
    body.endFill();

    shade.beginFill(0x050713, 0.34);
    shade.drawEllipse(r * 0.2, r * 0.12, r * 0.62, r * 0.78);
    shade.endFill();

    detail.lineStyle(1, planet.rimColor, 0.18);
    for (let i = 0; i < planet.craters; i++) {
      const a = rand() * Math.PI * 2;
      const d = r * (0.18 + rand() * 0.52);
      const cr = Math.max(3, r * (0.07 + rand() * 0.08));
      detail.drawEllipse(Math.cos(a) * d, Math.sin(a) * d, cr, cr * (0.55 + rand() * 0.35));
    }

    root.addChild(body, shade, detail);
    root.x = planet.x;
    root.y = planet.y;
    root.rotation = planet.rotation || 0;
    return root;
  }

  function clear() {
    const S = GameState;
    for (const planet of S.planets) {
      if (planet.spr && planet.spr.parent) planet.spr.parent.removeChild(planet.spr);
    }
    S.planets.length = 0;
  }

  function getStagePlanets(stage = 1) {
    const arena = Helpers.getArenaBounds();
    const cx = arena.left + arena.width * 0.5;
    const cy = arena.top + arena.height * 0.5;
    const configs = [
      [
        { id:"planet_s1_a", size:"medium", x:cx - arena.width * 0.28, y:cy - arena.height * 0.16, color:0x243458, rimColor:0x79b8ff, craters:7, rotation:0.2 },
        { id:"planet_s1_b", size:"small", x:cx + arena.width * 0.24, y:cy + arena.height * 0.18, color:0x4a2f35, rimColor:0xff9d7a, craters:5, rotation:-0.45 }
      ],
      [
        { id:"planet_s2_a", size:"large", x:cx + arena.width * 0.26, y:cy - arena.height * 0.18, color:0x3a314e, rimColor:0xc7a8ff, craters:9, rotation:0.55 },
        { id:"planet_s2_b", size:"small", x:cx - arena.width * 0.22, y:cy + arena.height * 0.22, color:0x28413f, rimColor:0x78ffd9, craters:5, rotation:-0.15 }
      ],
      [
        { id:"planet_s3_a", size:"medium", x:cx - arena.width * 0.25, y:cy - arena.height * 0.2, color:0x44311f, rimColor:0xffc07a, craters:8, rotation:-0.3 },
        { id:"planet_s3_b", size:"medium", x:cx + arena.width * 0.28, y:cy + arena.height * 0.12, color:0x252953, rimColor:0x8e9dff, craters:7, rotation:0.4 },
        { id:"planet_s3_c", size:"small", x:cx - arena.width * 0.04, y:cy + arena.height * 0.28, color:0x263d4b, rimColor:0x7df9ff, craters:5, rotation:0.1 }
      ]
    ];
    return configs[Math.max(0, Math.min(2, stage - 1))];
  }

  function resetForStage(stage = 1) {
    clear();
    const S = GameState;
    const planets = getStagePlanets(stage).map((data, index) => {
      const radius = SIZE_RADIUS[data.size] || SIZE_RADIUS.medium;
      return {
        ...data,
        radius,
        collision: true,
        blocksBullet: true,
        blocksShip: true,
        damageOnContact: false,
        gravity: false,
        spr: null,
        seed: stage * 10 + index + 1
      };
    });

    for (const planet of planets) {
      planet.spr = makePlanetSprite(planet, planet.seed);
      S.uiLayer.addChildAt(planet.spr, 0);
      S.planets.push(planet);
    }
  }

  function resolveShipCollision(entity, radius) {
    const S = GameState;
    if (!entity || !S.planets.length) return false;
    let moved = false;
    const x = entity.x != null ? entity.x : entity.spr.x;
    const y = entity.y != null ? entity.y : entity.spr.y;
    let nextX = x;
    let nextY = y;

    for (const planet of S.planets) {
      if (!planet.blocksShip) continue;
      const rr = planet.radius + radius;
      const dx = nextX - planet.x;
      const dy = nextY - planet.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d >= rr) continue;
      const push = rr - d + 0.4;
      nextX += (dx / d) * push;
      nextY += (dy / d) * push;
      moved = true;
    }

    if (moved) {
      if (entity.x != null) entity.x = nextX;
      if (entity.y != null) entity.y = nextY;
      if (entity.spr) {
        entity.spr.x = nextX;
        entity.spr.y = nextY;
      }
    }
    return moved;
  }

  function blocksProjectile(projectile) {
    if (!projectile || !GameState.planets.length) return false;
    for (const planet of GameState.planets) {
      if (!planet.blocksBullet) continue;
      const rr = planet.radius + (projectile.r || 0);
      if (Helpers.dist2(projectile.x, projectile.y, planet.x, planet.y) <= rr * rr) return true;
    }
    return false;
  }

  return {
    clear,
    resetForStage,
    resolveShipCollision,
    blocksProjectile
  };
})();
