window.PlanetSystem = (() => {
  const ASTEROID_MAP_TEST_STAGE = 4;
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

  function createRockPoints(radius, seed = 1) {
    const points = [];
    let state = seed * 92821 + 17;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
    const count = Math.max(8, Math.round(radius / 7));
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const rough = 0.74 + rand() * 0.38;
      points.push(Math.cos(a) * radius * rough, Math.sin(a) * radius * rough);
    }
    return points;
  }

  function makeAsteroidSprite(asteroid, seed = 1) {
    const root = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    const body = new PIXI.Graphics();
    const detail = new PIXI.Graphics();
    const radius = asteroid.radius;
    const points = createRockPoints(radius, seed);

    shadow.beginFill(0x000000, radius >= 42 ? 0.22 : 0.14);
    shadow.drawEllipse(radius * 0.3, radius * 0.16, radius * 0.95, radius * 0.52);
    shadow.endFill();
    shadow.filters = [new PIXI.filters.BlurFilter(radius >= 42 ? 10 : 6)];

    body.beginFill(asteroid.color, 0.98);
    body.lineStyle(Math.max(1, radius * 0.05), asteroid.rimColor, 0.36);
    body.drawPolygon(points);
    body.endFill();

    detail.lineStyle(Math.max(1, radius * 0.03), 0xf0e2c4, 0.16);
    detail.drawPolygon(points.map((value, index) => value * (index % 2 === 0 ? 0.68 : 0.68)));
    detail.lineStyle(1, 0x130f0f, 0.18);
    detail.drawCircle(-radius * 0.18, -radius * 0.12, Math.max(3, radius * 0.14));
    detail.drawCircle(radius * 0.12, radius * 0.18, Math.max(2, radius * 0.1));
    detail.drawCircle(radius * 0.28, -radius * 0.06, Math.max(2, radius * 0.08));

    root.addChild(shadow, body, detail);
    root.x = asteroid.x;
    root.y = asteroid.y;
    root.rotation = asteroid.rotation || 0;
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

  function getAsteroidFieldConfig() {
    const arena = Helpers.getArenaBounds();
    return [
      { size: "large", count: 3, speedMin: 0.18, speedMax: 0.34, yMin: arena.top + arena.height * 0.12, yMax: arena.top + arena.height * 0.46 },
      { size: "medium", count: 8, speedMin: 0.34, speedMax: 0.62, yMin: arena.top + arena.height * 0.08, yMax: arena.bottom - arena.height * 0.08 },
      { size: "small", count: 18, speedMin: 0.58, speedMax: 1.08, yMin: arena.top + arena.height * 0.05, yMax: arena.bottom - arena.height * 0.05 }
    ];
  }

  function resetForAsteroidMapTest() {
    const S = GameState;
    const arena = Helpers.getArenaBounds();
    const radii = { small: 16, medium: 34, large: 66 };
    let seed = 401;
    for (const group of getAsteroidFieldConfig()) {
      for (let i = 0; i < group.count; i++) {
        seed += 17;
        const radius = radii[group.size] + Helpers.rand(-Math.max(2, radii[group.size] * 0.12), Math.max(3, radii[group.size] * 0.16));
        const asteroid = {
          id: `asteroid_test_${group.size}_${i}`,
          size: group.size,
          x: Helpers.rand(arena.left - radius * 0.5, arena.right + radius * 0.5),
          y: Helpers.rand(group.yMin, group.yMax),
          radius,
          collision: true,
          blocksBullet: true,
          blocksShip: true,
          damageOnContact: false,
          gravity: false,
          color: group.size === "large" ? 0x6a6258 : group.size === "medium" ? 0x74695d : 0x857768,
          rimColor: group.size === "large" ? 0xe7d7bb : 0xd8c8a8,
          rotation: Helpers.rand(0, Math.PI * 2),
          spin: Helpers.rand(-0.008, 0.008) * (group.size === "large" ? 0.45 : 1),
          vx: Helpers.rand(group.speedMin, group.speedMax),
          vy: Helpers.rand(-0.14, 0.14),
          spr: null,
          seed,
          isAsteroid: true
        };
        asteroid.spr = makeAsteroidSprite(asteroid, asteroid.seed);
        S.uiLayer.addChildAt(asteroid.spr, 0);
        S.planets.push(asteroid);
      }
    }
  }

  function resetForStage(stage = 1) {
    clear();
    if (Number(stage) === ASTEROID_MAP_TEST_STAGE) {
      resetForAsteroidMapTest();
      return;
    }
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

  function update(dt = 1) {
    const arena = Helpers.getArenaBounds();
    for (const planet of GameState.planets) {
      if (!planet.isAsteroid || !planet.spr) continue;
      planet.x += planet.vx * dt;
      planet.y += planet.vy * dt;
      planet.rotation += planet.spin * dt;

      const horizontalMargin = planet.radius * 3.2;
      const verticalMargin = planet.radius * 1.8;
      if (planet.x > arena.right + horizontalMargin) {
        planet.x = arena.left - horizontalMargin;
        planet.y = Helpers.rand(arena.top + planet.radius, arena.bottom - planet.radius);
      } else if (planet.x < arena.left - horizontalMargin) {
        planet.x = arena.right + horizontalMargin;
        planet.y = Helpers.rand(arena.top + planet.radius, arena.bottom - planet.radius);
      }
      if (planet.y < arena.top - verticalMargin) {
        planet.y = arena.bottom + verticalMargin;
      } else if (planet.y > arena.bottom + verticalMargin) {
        planet.y = arena.top - verticalMargin;
      }

      planet.spr.x = planet.x;
      planet.spr.y = planet.y;
      planet.spr.rotation = planet.rotation;
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

  function blocksLineOfSight(x1, y1, x2, y2, padding = 0) {
    if (!GameState.planets.length) return false;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 0.0001) return false;

    for (const planet of GameState.planets) {
      if (!planet.blocksBullet) continue;
      const rr = planet.radius + padding;
      const t = Helpers.clamp((((planet.x - x1) * dx) + ((planet.y - y1) * dy)) / lenSq, 0, 1);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      if (Helpers.dist2(px, py, planet.x, planet.y) <= rr * rr) return true;
    }
    return false;
  }

  return {
    clear,
    resetForStage,
    update,
    resolveShipCollision,
    blocksProjectile,
    blocksLineOfSight
  };
})();
