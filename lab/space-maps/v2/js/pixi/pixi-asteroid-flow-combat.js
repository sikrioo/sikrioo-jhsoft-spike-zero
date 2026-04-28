(() => {
  const root = document.getElementById("pixiRoot");
  const debugEl = document.getElementById("pixiDebug");
  const keys = new Set();

  const state = {
    app: null,
    width: window.innerWidth,
    height: window.innerHeight,
    time: 0,
    mapType: "",
    player: null,
    bullets: [],
    bulletPool: [],
    fireCd: 0,
    fps: 0,
    fpsTimer: 0,
    frameCount: 0,
    mapObjects: [],
    asteroids: [],
    gasPlanets: [],
    gasBursts: [],
    magneticPlanets: [],
    magneticStrikes: [],
    satellites: []
  };

  const LAYERS = {
    background: null,
    world: null,
    bullets: null,
    mapFx: null,
    foreground: null
  };

  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  async function boot() {
    const app = new PIXI.Application();
    await app.init({
      resizeTo: window,
      background: "#010308",
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });

    state.app = app;
    root.prepend(app.canvas);

    LAYERS.background = new PIXI.Container();
    LAYERS.world = new PIXI.Container();
    LAYERS.bullets = new PIXI.Container();
    LAYERS.mapFx = new PIXI.Container();
    LAYERS.foreground = new PIXI.Container();

    app.stage.addChild(LAYERS.background);
    app.stage.addChild(LAYERS.world);
    app.stage.addChild(LAYERS.bullets);
    app.stage.addChild(LAYERS.mapFx);
    app.stage.addChild(LAYERS.foreground);

    createBackground();
    createPlayer();
    bindInput();
    bindMapButtons();
    setMap("asteroid");

    app.ticker.add((ticker) => {
      update(Math.min(ticker.deltaMS / 16.6667, 2));
      renderMapFx();
      renderDebug(ticker.deltaMS);
    });

    window.addEventListener("resize", handleResize);
  }

  function handleResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    createBackground();
    setMap(state.mapType || "asteroid", true);
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (e.code === "Digit1") setMap("asteroid");
      if (e.code === "Digit2") setMap("gas");
      if (e.code === "Digit3") setMap("magnetic");
      if (e.code === "Digit4") setMap("nebula");
      if (e.code === "Digit5") setMap("orbit");
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    }, { passive: false });

    window.addEventListener("keyup", (e) => keys.delete(e.code));
  }

  function bindMapButtons() {
    document.querySelectorAll("[data-map]").forEach(btn => {
      btn.addEventListener("click", () => setMap(btn.dataset.map));
    });
  }

  function setMap(type, force = false) {
    if (!force && state.mapType === type) return;

    clearMapWorld();
    clearBullets();

    state.mapType = type;
    state.gasBursts.length = 0;

    if (type === "asteroid" || type === "nebula") {
      createAsteroids();
    } else if (type === "gas") {
      createGasPlanets();
    } else if (type === "magnetic") {
      createMagneticPlanets();
    } else if (type === "orbit") {
      createSatellites();
    }

    document.querySelectorAll("[data-map]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.map === type);
    });
  }

  function clearMapWorld() {
    LAYERS.world.removeChildren();
    LAYERS.mapFx.removeChildren();

    state.mapObjects.length = 0;
    state.asteroids.length = 0;
    state.gasPlanets.length = 0;
    state.gasBursts.length = 0;
    state.magneticPlanets.length = 0;
    state.magneticStrikes.length = 0;
    state.satellites.length = 0;
  }

  function clearBullets() {
    for (const b of state.bullets) {
      if (b.parent) b.parent.removeChild(b);
      b.visible = false;
      b.dead = true;
      state.bulletPool.push(b);
    }
    state.bullets.length = 0;
  }

  function createBackground() {
    LAYERS.background.removeChildren();
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, state.width, state.height).fill(0x010308);
    LAYERS.background.addChild(bg);

    for (let i = 0; i < 3; i++) {
      const cloud = new PIXI.Graphics();
      cloud.circle(rand(0, state.width), rand(0, state.height), rand(120, 260))
        .fill({ color: 0x5a6f8a, alpha: 0.018 + Math.random() * 0.018 });
      LAYERS.background.addChild(cloud);
    }

    for (let i = 0; i < 110; i++) {
      const s = new PIXI.Graphics();
      s.circle(0, 0, rand(0.5, 1.8)).fill({ color: 0xddeeff, alpha: rand(0.35, 0.9) });
      s.x = Math.random() * state.width;
      s.y = Math.random() * state.height;
      s.speed = rand(0.04, 0.16);
      LAYERS.background.addChild(s);
      state.mapObjects.push(s);
    }
  }

  function createPlayer() {
    const body = new PIXI.Graphics();
    body.poly([0,-18, 13,14, 0,8, -13,14])
      .fill(0xb9e8ff)
      .stroke({ color: 0xffffff, alpha: 0.45, width: 1.2 });

    const cockpit = new PIXI.Graphics();
    cockpit.poly([0,-8, 5,8, 0,5, -5,8]).fill(0x143750);

    const ship = new PIXI.Container();
    ship.body = body;
    ship.cockpit = cockpit;
    ship.addChild(body, cockpit);
    ship.x = state.width * 0.5;
    ship.y = state.height * 0.72;
    ship.vx = 0;
    ship.vy = 0;
    ship.radius = 15;
    ship.faceAngle = -Math.PI / 2;
    ship.rotation = ship.faceAngle;
    ship.impactFlash = 0;

    LAYERS.foreground.addChild(ship);
    state.player = ship;
  }

  function createAsteroids() {
    const radii = [82,64,44,38,34,30,26,24,22,20,18,18,16,16,14,14,12,12];

    for (const r of radii) {
      const a = createAsteroid(r);
      a.x = rand(-state.width * 0.15, state.width * 1.05);
      a.y = rand(50, state.height - 50);
      state.asteroids.push(a);
      LAYERS.world.addChild(a);
    }
  }

  function createAsteroid(r) {
    const g = new PIXI.Graphics();
    const points = [];

    for (let i = 0; i < 11; i++) {
      const ang = Math.PI * 2 * i / 11;
      const rr = r * rand(0.72, 1.15);
      points.push(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }

    const base = Math.floor(rand(75, 120));
    const color = (base << 16) + ((base - 8) << 8) + Math.max(10, base - 18);

    g.poly(points).fill(color).stroke({ color: 0xf5eedc, alpha: 0.25, width: 2 });

    for (let i = 0; i < (r > 50 ? 5 : 2); i++) {
      g.circle(rand(-r * .45, r * .45), rand(-r * .45, r * .45), rand(r * .05, r * .14))
        .fill({ color: 0x1f1c19, alpha: 0.28 });
    }

    g.r = r;
    g.mass = Math.max(1, r * r * 0.014);
    g.invMass = 1 / g.mass;
    g.vx = rand(0.45, 1.25) * (r > 55 ? 0.55 : 1);
    g.vy = rand(-0.10, 0.24);
    g.spin = rand(-0.006, 0.006);
    return g;
  }

  function createGasPlanets() {
    const configs = [
      [0.22, 0.30, 76, 0x2e4f55],
      [0.70, 0.32, 98, 0x5b4635],
      [0.42, 0.70, 84, 0x2d554c],
      [0.82, 0.70, 64, 0x4b4d6e]
    ];

    for (const c of configs) {
      const p = new PIXI.Container();
      p.x = state.width * c[0];
      p.y = state.height * c[1];
      p.r = c[2];
      p.timer = rand(70, 160);
      p.warn = 0;
      p.fire = 0;
      p.angle = rand(0, Math.PI * 2);
      p.gasLen = rand(220, 380);
      p.jetCount = Math.floor(rand(1, 4));

      const body = new PIXI.Graphics();

      // Body: sharper and less soft than previous version.
      body.circle(0, 0, p.r).fill(c[3]).stroke({ color: 0xe8fbff, alpha: 0.26, width: 2 });

      // Sharp bands / ridges
      for (let i = 0; i < 6; i++) {
        const y = -p.r * .55 + i * p.r * .22;
        body.ellipse(0, y, p.r * .78, p.r * .055)
          .stroke({ color: 0xffffff, alpha: i % 2 ? 0.06 : 0.12, width: 2 });
      }

      // small rim highlight
      body.arc(0, 0, p.r * .96, Math.PI * 1.05, Math.PI * 1.72)
        .stroke({ color: 0xffffff, alpha: 0.20, width: 2 });

      p.addChild(body);
      state.gasPlanets.push(p);
      LAYERS.world.addChild(p);
    }
  }

  function createMagneticPlanets() {
    const configs = [
      [0.25, 0.30, 76, 170],
      [0.68, 0.48, 96, 205],
      [0.42, 0.74, 66, 150]
    ];

    for (const c of configs) {
      const p = new PIXI.Container();
      p.x = state.width * c[0];
      p.y = state.height * c[1];
      p.r = c[2];
      p.field = c[3];
      p.phase = rand(0, Math.PI * 2);
      p.timer = rand(70, 150);

      const body = new PIXI.Graphics();
      body.circle(0, 0, p.r).fill(0x26375c).stroke({ color: 0xd8ecff, alpha: 0.25, width: 2 });
      body.circle(-p.r * 0.25, -p.r * 0.28, p.r * 0.28).fill({ color: 0x6e8fca, alpha: 0.24 });
      body.arc(0, 0, p.r * .95, Math.PI * 1.04, Math.PI * 1.76).stroke({ color: 0xffffff, alpha: 0.18, width: 2 });

      p.addChild(body);
      state.magneticPlanets.push(p);
      LAYERS.world.addChild(p);
    }
  }

  function createSatellites() {
    const configs = [[.20,.22,"h",90,true,28],[.45,.28,"v",75,false,22],[.74,.22,"h",110,true,36],[.32,.58,"v",95,true,28],[.62,.55,"h",85,false,30],[.84,.67,"v",70,true,22],[.52,.78,"h",115,false,32]];

    for (const c of configs) {
      const sat = createSatellite(c[5]);
      sat.baseX = state.width*c[0];
      sat.baseY = state.height*c[1];
      sat.moveType = c[2];
      sat.range = c[3];
      sat.canLaser = c[4];
      sat.phase = Math.random()*Math.PI*2;
      sat.speed = rand(.008,.013);
      sat.radius = c[5];
      sat.timer = rand(100,250);
      sat.warn = 0;
      sat.fire = 0;
      sat.laserAngle = 0;

      state.satellites.push(sat);
      LAYERS.world.addChild(sat);
    }
  }

  function createSatellite(radius) {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const s = radius/30;
    g.rect(-36*s,-8*s,22*s,16*s).fill(0x4e86b8).stroke({color:0xdff6ff,alpha:.35,width:1});
    g.rect(14*s,-8*s,22*s,16*s).fill(0x4e86b8).stroke({color:0xdff6ff,alpha:.35,width:1});
    g.rect(-13*s,-12*s,26*s,24*s).fill(0xcfd8e2).stroke({color:0xffffff,alpha:.45,width:1});
    g.moveTo(8*s,-12*s).lineTo(24*s,-25*s).stroke({color:0xe8f6ff,alpha:.65,width:1});
    c.addChild(g);
    return c;
  }

  function update(dt) {
    state.time += dt;

    updatePlayer(dt);
    updateGun(dt);
    updateBullets(dt);

    if (["asteroid", "nebula"].includes(state.mapType)) {
      updateAsteroids(dt);
      resolveBulletAsteroidHits();
      resolvePlayerAsteroids();
    }

    if (state.mapType === "gas") updateGas(dt);
    if (state.mapType === "magnetic") updateMagnetic(dt);
    if (state.mapType === "orbit") updateOrbit(dt);
  }

  function updatePlayer(dt) {
    const p = state.player;
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const up = keys.has("ArrowUp") || keys.has("KeyW");
    const down = keys.has("ArrowDown") || keys.has("KeyS");

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);

    let accel = 0.34 * dt;
    if (state.mapType === "magnetic") accel *= 0.82;

    const drag = Math.pow(0.91, dt);
    const maxSpeed = state.mapType === "magnetic" ? 4.2 : 5.2;

    if (ax || ay) {
      const len = Math.hypot(ax, ay) || 1;
      p.vx += (ax / len) * accel;
      p.vy += (ay / len) * accel;
      p.faceAngle = Math.atan2(ay, ax) + Math.PI / 2;
    }

    p.vx *= drag;
    p.vy *= drag;

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = p.vx / speed * maxSpeed;
      p.vy = p.vy / speed * maxSpeed;
    }

    p.x = clamp(p.x + p.vx * dt, 28, state.width - 28);
    p.y = clamp(p.y + p.vy * dt, 28, state.height - 28);
    p.rotation = p.faceAngle;

    if (p.impactFlash > 0) {
      p.impactFlash -= dt;
      p.alpha = 0.82 + Math.random() * 0.18;
      p.body.tint = 0xff755f;
      p.cockpit.tint = 0xffb199;
    } else {
      p.alpha = 1;
      p.body.tint = 0xffffff;
      p.cockpit.tint = 0xffffff;
    }
  }

  function updateGun(dt) {
    state.fireCd -= dt;
    if (!keys.has("Space") || state.fireCd > 0) return;

    state.fireCd = 5;

    const p = state.player;
    const ang = p.faceAngle - Math.PI / 2;
    const b = acquireBullet();

    b.x = p.x + Math.cos(ang) * 18;
    b.y = p.y + Math.sin(ang) * 18;
    b.vx = Math.cos(ang) * 12;
    b.vy = Math.sin(ang) * 12;
    b.life = 55;
    b.dead = false;
    b.visible = true;

    LAYERS.bullets.addChild(b);
    state.bullets.push(b);
  }

  function acquireBullet() {
    let b = state.bulletPool.pop();
    if (!b) {
      b = new PIXI.Graphics();
      b.circle(0,0,3).fill(0x82e6ff);
      b.r = 3;
    }
    return b;
  }

  function releaseBullet(b) {
    b.visible = false;
    b.dead = true;
    if (b.parent) b.parent.removeChild(b);
    state.bulletPool.push(b);
  }

  function updateBullets(dt) {
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > state.width + 20 || b.y < -20 || b.y > state.height + 20) b.dead = true;
    }

    let write = 0;
    for (let i=0; i<state.bullets.length; i++) {
      const b = state.bullets[i];
      if (b.dead) releaseBullet(b);
      else state.bullets[write++] = b;
    }
    state.bullets.length = write;
  }

  function updateAsteroids(dt) {
    for (const a of state.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.spin * dt;
      a.vx += (0.65 - a.vx) * 0.0015 * dt;

      if (a.x > state.width + a.r * 3 || a.y > state.height + a.r * 3 || a.y < -a.r * 3) {
        a.x = -a.r - rand(30,180);
        a.y = rand(50, state.height - 50);
        a.vx = rand(0.45,1.25) * (a.r > 55 ? 0.55 : 1);
        a.vy = rand(-0.10,0.24);
      }
    }
  }

  function updateGas(dt) {
    const player = state.player;

    for (const gp of state.gasPlanets) {
      if (gp.fire > 0) {
        gp.fire -= dt;

        // hazard check, rough cone-ish by distance to main ray
        const lx = Math.cos(gp.angle);
        const ly = Math.sin(gp.angle);
        const dx = player.x - gp.x;
        const dy = player.y - gp.y;
        const along = dx * lx + dy * ly;
        const perp = Math.abs(-ly * dx + lx * dy);

        if (along > gp.r * .5 && along < gp.gasLen && perp < gp.r * .45) {
          player.vx += lx * 0.11;
          player.vy += ly * 0.11;
          player.impactFlash = 5;
        }
        continue;
      }

      if (gp.warn > 0) {
        gp.warn -= dt;
        if (gp.warn <= 0) {
          gp.fire = rand(38, 72);
          gp.jetCount = Math.floor(rand(1, 4));
        }
        continue;
      }

      gp.timer -= dt;
      if (gp.timer <= 0) {
        gp.warn = rand(16, 34);
        gp.angle = rand(0, Math.PI * 2);
        gp.gasLen = rand(230, 390);
        gp.timer = rand(82, 180);
      }
    }
  }

  function updateMagnetic(dt) {
    const player = state.player;

    for (const mp of state.magneticPlanets) {
      // Magnetic field: performance slow, not forced pull.
      const dx = player.x - mp.x;
      const dy = player.y - mp.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < mp.field) {
        const depth = 1 - dist / mp.field;
        const drag = 0.992 - depth * 0.030;
        player.vx *= drag;
        player.vy *= drag;
      }

      mp.timer -= dt;
      if (mp.timer <= 0) {
        const angle = rand(0, Math.PI * 2);
        const len = rand(mp.r + 120, mp.field + 120);
        state.magneticStrikes.push({
          planet: mp,
          angle,
          sx: mp.x + Math.cos(angle) * mp.r * .85,
          sy: mp.y + Math.sin(angle) * mp.r * .85,
          ex: mp.x + Math.cos(angle) * len,
          ey: mp.y + Math.sin(angle) * len,
          warn: rand(18, 40),
          warnTotal: 40,
          life: rand(10, 22),
          active: false,
          hit: false
        });
        mp.timer = rand(80, 170);
      }
    }

    for (const s of state.magneticStrikes) {
      if (!s.active) {
        s.warn -= dt;
        if (s.warn <= 0) s.active = true;
      } else {
        s.life -= dt;

        if (!s.hit && isPointNearSegment(player.x, player.y, s.sx, s.sy, s.ex, s.ey, player.radius + 10)) {
          s.hit = true;
          player.impactFlash = 14;
          const dx = player.x - s.sx;
          const dy = player.y - s.sy;
          const d = Math.hypot(dx, dy) || 1;
          player.vx += dx / d * 1.5;
          player.vy += dy / d * 1.5;
        }
      }
    }

    state.magneticStrikes = state.magneticStrikes.filter(s => !s.active || s.life > 0);
  }

  function isPointNearSegment(px, py, x1, y1, x2, y2, threshold) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    return Math.hypot(px - x, py - y) < threshold;
  }

  function updateOrbit(dt) {
    const p = state.player;

    for (const s of state.satellites) {
      const m = Math.sin(state.time*s.speed+s.phase)*s.range;
      s.x = s.baseX + (s.moveType==="h" ? m : 0);
      s.y = s.baseY + (s.moveType==="v" ? m : 0);
      s.rotation = Math.sin(state.time*.01+s.phase)*.15;

      if (Math.hypot(p.x-s.x,p.y-s.y) < p.radius+s.radius) {
        const dx = p.x-s.x;
        const dy = p.y-s.y;
        const d = Math.hypot(dx,dy)||1;
        p.x = s.x + dx/d*(p.radius+s.radius+1);
        p.y = s.y + dy/d*(p.radius+s.radius+1);
        p.vx += dx/d*1.8;
        p.vy += dy/d*1.8;
        p.impactFlash = 10;
      }

      if (!s.canLaser) continue;

      if (s.fire > 0) {
        s.fire -= dt;
        if (isPlayerOnLaser(p,s)) p.impactFlash = 10;
        continue;
      }

      if (s.warn > 0) {
        s.warn -= dt;
        s.laserAngle = Math.atan2(p.y-s.y,p.x-s.x);
        if (s.warn <= 0) s.fire = rand(30,60);
        continue;
      }

      s.timer -= dt;
      if (s.timer <= 0) {
        s.warn = rand(30,65);
        s.timer = rand(140,320);
      }
    }
  }

  function isPlayerOnLaser(p,s) {
    const dx=p.x-s.x;
    const dy=p.y-s.y;
    const lx=Math.cos(s.laserAngle);
    const ly=Math.sin(s.laserAngle);
    const along=dx*lx+dy*ly;
    if (along<0 || along>1000) return false;
    return Math.abs(-ly*dx+lx*dy) < p.radius+5;
  }

  function resolveBulletAsteroidHits() {
    for (const b of state.bullets) {
      if (b.dead) continue;

      for (const a of state.asteroids) {
        const d = Math.hypot(a.x-b.x, a.y-b.y) || 1;
        if (d >= a.r + b.r) continue;

        b.dead = true;

        const force = 1.2 / Math.max(1, a.mass) * 9;
        a.vx += b.vx * force * 0.06;
        a.vy += b.vy * force * 0.06;
        a.spin += (Math.random() - 0.5) * 0.012;
        break;
      }
    }
  }

  function resolvePlayerAsteroids() {
    const p = state.player;

    for (const a of state.asteroids) {
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const d = Math.hypot(dx,dy) || 1;
      const min = p.radius + a.r;

      if (d >= min) continue;

      const nx = dx/d;
      const ny = dy/d;
      const overlap = min-d;

      p.x += nx * overlap;
      p.y += ny * overlap;
      p.vx += nx * Math.min(1.4, 0.35 + a.r/95);
      p.vy += ny * Math.min(1.4, 0.35 + a.r/95);
      a.vx -= nx * a.invMass * 3.5;
      a.vy -= ny * a.invMass * 3.5;
      p.impactFlash = 8;
    }
  }

  function renderMapFx() {
    LAYERS.mapFx.removeChildren();

    if (state.mapType === "gas") drawGas();
    if (state.mapType === "magnetic") drawMagnetic();
    if (state.mapType === "nebula") drawNebula();
    if (state.mapType === "orbit") drawOrbit();
  }

  function drawGas() {
    for (const gp of state.gasPlanets) {
      const lx = Math.cos(gp.angle);
      const ly = Math.sin(gp.angle);
      const px = -ly;
      const py = lx;

      if (gp.warn > 0) {
        const warn = new PIXI.Graphics();
        const sx = gp.x + lx * gp.r * .78;
        const sy = gp.y + ly * gp.r * .78;
        const ex = gp.x + lx * (gp.r + 54);
        const ey = gp.y + ly * (gp.r + 54);

        warn.moveTo(sx, sy).lineTo(ex, ey)
          .stroke({ color:0xffffff, alpha:.75, width:2 });
        warn.circle(sx, sy, gp.r * .075).fill({ color:0xffffff, alpha:.72 });
        LAYERS.mapFx.addChild(warn);
      }

      if (gp.fire > 0) {
        const fade = Math.min(1, gp.fire / 18);
        const burst = new PIXI.Graphics();

        const baseAngle = gp.angle;
        const count = gp.jetCount || 2;

        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : rand(-0.26, 0.26);
          const angle = baseAngle + offset;
          const bx = Math.cos(angle);
          const by = Math.sin(angle);
          const tx = -by;
          const ty = bx;

          const len = gp.gasLen * rand(.72, 1.18);
          const width = gp.r * rand(.20, .36);
          const sx = gp.x + bx * gp.r * .78;
          const sy = gp.y + by * gp.r * .78;
          const ex = gp.x + bx * len;
          const ey = gp.y + by * len;

          // sharp white wedge
          burst.poly([
            sx + tx * width * .16, sy + ty * width * .16,
            ex + tx * width * rand(.35, .75), ey + ty * width * rand(.35, .75),
            ex + bx * rand(20, 48), ey + by * rand(20, 48),
            ex - tx * width * rand(.35, .75), ey - ty * width * rand(.35, .75),
            sx - tx * width * .16, sy - ty * width * .16
          ]).fill({ color:0xffffff, alpha:.22 * fade });

          burst.moveTo(sx, sy).lineTo(ex + bx * 42, ey + by * 42)
            .stroke({ color:0xffffff, alpha:.78 * fade, width:1.6 });

          for (let k = 0; k < 3; k++) {
            const t0 = rand(.08, .25);
            const t1 = rand(.52, 1.08);
            const side = Math.random() > .5 ? 1 : -1;
            burst.moveTo(sx + bx*len*t0 + tx*side*rand(2,width*.15), sy + by*len*t0 + ty*side*rand(2,width*.15))
              .lineTo(sx + bx*len*t1 + tx*side*rand(width*.25,width*.75), sy + by*len*t1 + ty*side*rand(width*.25,width*.75))
              .stroke({ color:0xffffff, alpha:.32 * fade, width:1 });
          }
        }

        LAYERS.mapFx.addChild(burst);
      }
    }
  }

  function drawMagnetic() {
    for (const mp of state.magneticPlanets) {
      const pulse = 0.5 + Math.sin(state.time * .05 + mp.phase) * .2;
      const field = new PIXI.Graphics();
      field.circle(mp.x, mp.y, mp.field)
        .fill({ color:0x496bff, alpha:.030 + pulse * .015 })
        .stroke({ color:0xa8ccff, alpha:.12 + pulse * .06, width:1 });

      for (let i = 0; i < 3; i++) {
        field.ellipse(mp.x, mp.y, mp.field * (.42 + i*.18), mp.field * (.20 + i*.08))
          .stroke({ color:0xb7d8ff, alpha:.055, width:1 });
      }

      LAYERS.mapFx.addChild(field);
    }

    for (const s of state.magneticStrikes) {
      const bolt = new PIXI.Graphics();

      if (!s.active) {
        bolt.moveTo(s.sx, s.sy).lineTo(s.ex, s.ey)
          .stroke({ color:0xdff6ff, alpha:.35, width:1.2 });
        bolt.circle(s.sx, s.sy, 6).fill({ color:0xffffff, alpha:.55 });
      } else {
        drawJaggedLine(bolt, s.sx, s.sy, s.ex, s.ey, 7, 16, 0x6ebcff, .36, 8);
        drawJaggedLine(bolt, s.sx, s.sy, s.ex, s.ey, 7, 14, 0xffffff, .92, 2);
      }

      LAYERS.mapFx.addChild(bolt);
    }
  }

  function drawJaggedLine(g, x1, y1, x2, y2, segments, jitter, color, alpha, width) {
    let x = x1;
    let y = y1;
    g.moveTo(x, y);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      x = x1 + (x2 - x1) * t + rand(-jitter, jitter);
      y = y1 + (y2 - y1) * t + rand(-jitter, jitter);
      g.lineTo(x, y);
    }
    g.lineTo(x2, y2).stroke({ color, alpha, width });
  }

  function drawNebula() {
    const p = state.player;
    const lightOn = keys.has("KeyL");
    const fog = new PIXI.Graphics();
    fog.rect(0,0,state.width,state.height).fill({ color:0x000000, alpha: lightOn ? .82 : .91 });
    LAYERS.mapFx.addChild(fog);

    const r = lightOn ? 300 : 88;
    const light = new PIXI.Graphics();
    light.circle(p.x,p.y,r).fill({ color:0x76dfff, alpha: lightOn ? .18 : .08 });
    light.circle(p.x,p.y,r*.98).stroke({ color:0xa7f5ff, alpha: lightOn ? .36 : .12, width:1 });
    LAYERS.mapFx.addChild(light);

    if (Math.random() < .025) {
      const flash = new PIXI.Graphics();
      flash.rect(0,0,state.width,state.height).fill({ color:0xcff6ff, alpha:.25 });
      LAYERS.mapFx.addChild(flash);
    }
  }

  function drawOrbit() {
    const earth = new PIXI.Graphics();
    const ex=state.width*.17;
    const ey=state.height*1.07;
    const er=Math.min(state.width,state.height)*.42;

    earth.circle(ex,ey,er*1.32).fill({color:0x3b9dff,alpha:.08});
    earth.circle(ex,ey,er).fill({color:0x0b3b78,alpha:.92});
    earth.circle(ex-er*.15,ey-er*.25,er*.22).fill({color:0x2e8b57,alpha:.42});
    earth.circle(ex+er*.18,ey-er*.1,er*.16).fill({color:0x3fa06c,alpha:.35});
    LAYERS.mapFx.addChild(earth);

    for (const s of state.satellites) {
      if (s.warn > 0) {
        const line = new PIXI.Graphics();
        line.moveTo(s.x,s.y)
          .lineTo(s.x+Math.cos(s.laserAngle)*260,s.y+Math.sin(s.laserAngle)*260)
          .stroke({color:0xff556a,alpha:.35,width:1});
        LAYERS.mapFx.addChild(line);
      }

      if (s.fire > 0) {
        const len = Math.max(state.width,state.height)*1.3;
        const laser = new PIXI.Graphics();
        laser.moveTo(s.x,s.y)
          .lineTo(s.x+Math.cos(s.laserAngle)*len,s.y+Math.sin(s.laserAngle)*len)
          .stroke({color:0xff2048,alpha:.35,width:8});
        laser.moveTo(s.x,s.y)
          .lineTo(s.x+Math.cos(s.laserAngle)*len,s.y+Math.sin(s.laserAngle)*len)
          .stroke({color:0xffffff,alpha:.75,width:1.2});
        LAYERS.mapFx.addChild(laser);
      }
    }
  }

  function renderDebug(deltaMS) {
    state.frameCount++;
    state.fpsTimer += deltaMS;

    if (state.fpsTimer >= 500) {
      state.fps = Math.round(state.frameCount * 1000 / state.fpsTimer);
      state.frameCount = 0;
      state.fpsTimer = 0;
    }

    debugEl.innerHTML = `
      FPS: ${state.fps}<br>
      Map: ${state.mapType}<br>
      Bullets: ${state.bullets.length}<br>
      Asteroids: ${state.asteroids.length}<br>
      Gas Planets: ${state.gasPlanets.length}<br>
      Magnetic Planets: ${state.magneticPlanets.length}<br>
      Satellites: ${state.satellites.length}<br>
      Renderer: PixiJS/WebGL
    `;
  }

  boot();
})();
