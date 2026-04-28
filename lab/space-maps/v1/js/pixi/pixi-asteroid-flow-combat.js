(() => {
  const root = document.getElementById("pixiRoot");
  const debugEl = document.getElementById("pixiDebug");

  const keys = new Set();

  const state = {
    app: null,
    width: window.innerWidth,
    height: window.innerHeight,
    time: 0,
    player: null,
    bullets: [],
    bulletPool: [],
    asteroids: [],
    stars: [],
    fireCd: 0,
    fpsTimer: 0,
    frameCount: 0,
    fps: 0
  };

  const LAYERS = {
    background: null,
    world: null,
    bullets: null,
    foreground: null
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

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
    LAYERS.foreground = new PIXI.Container();

    app.stage.addChild(LAYERS.background);
    app.stage.addChild(LAYERS.world);
    app.stage.addChild(LAYERS.bullets);
    app.stage.addChild(LAYERS.foreground);

    createBackground();
    createPlayer();
    createAsteroids();

    bindInput();

    app.ticker.add((ticker) => {
      update(ticker.deltaMS / 16.6667);
      renderDebug(ticker.deltaMS);
    });

    window.addEventListener("resize", handleResize);
  }

  function handleResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    createBackground();
  }

  function createBackground() {
    LAYERS.background.removeChildren();

    state.width = window.innerWidth;
    state.height = window.innerHeight;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, state.width, state.height).fill(0x010308);
    LAYERS.background.addChild(bg);

    // Subtle space dust only.
    // The previous large circular nebula shapes looked too artificial.
    for (let i = 0; i < 3; i++) {
      const cloud = new PIXI.Graphics();
      cloud.circle(
        rand(0, state.width),
        rand(0, state.height),
        rand(120, 260)
      ).fill({
        color: 0x5a6f8a,
        alpha: 0.02 + Math.random() * 0.018
      });
      LAYERS.background.addChild(cloud);
    }

    state.stars.length = 0;
    for (let i = 0; i < 110; i++) {
      const s = new PIXI.Graphics();
      const r = rand(0.5, 1.8);
      s.circle(0, 0, r).fill({ color: 0xddeeff, alpha: rand(0.35, 0.9) });
      s.x = Math.random() * state.width;
      s.y = Math.random() * state.height;
      s.speed = rand(0.04, 0.16);
      LAYERS.background.addChild(s);
      state.stars.push(s);
    }
  }

  function createPlayer() {
    const body = new PIXI.Graphics();

    body.poly([
      0, -18,
      13, 14,
      0, 8,
      -13, 14
    ]).fill(0xb9e8ff).stroke({ color: 0xffffff, alpha: 0.45, width: 1.2 });

    const cockpit = new PIXI.Graphics();
    cockpit.poly([
      0, -8,
      5, 8,
      0, 5,
      -5, 8
    ]).fill(0x143750);

    const ship = new PIXI.Container();
    ship.body = body;
    ship.cockpit = cockpit;
    ship.addChild(body);
    ship.addChild(cockpit);
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
    const radii = [82, 64, 44, 38, 34, 30, 26, 24, 22, 20, 18, 18, 16, 16, 14, 14, 12, 12];

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
      g.circle(rand(-r * 0.45, r * 0.45), rand(-r * 0.45, r * 0.45), rand(r * 0.05, r * 0.14))
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

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("keyup", (e) => keys.delete(e.code));
  }

  function update(dt) {
    dt = Math.min(dt, 2);
    state.time += dt;

    updateStars(dt);
    updatePlayer(dt);
    updateGun(dt);
    updateBullets(dt);
    updateAsteroids(dt);
    resolveBulletAsteroidHits();
    resolvePlayerAsteroids();
  }

  function updateStars(dt) {
    for (const s of state.stars) {
      s.x -= s.speed * dt;
      if (s.x < -4) {
        s.x = state.width + 4;
        s.y = Math.random() * state.height;
      }
    }
  }

  function updatePlayer(dt) {
    const p = state.player;

    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const up = keys.has("ArrowUp") || keys.has("KeyW");
    const down = keys.has("ArrowDown") || keys.has("KeyS");

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);

    const accel = 0.34 * dt;
    const drag = Math.pow(0.91, dt);
    const maxSpeed = 5.2;

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
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }

    p.x = clamp(p.x + p.vx * dt, 28, state.width - 28);
    p.y = clamp(p.y + p.vy * dt, 28, state.height - 28);

    // Do not spin when idle. Keep the last facing direction.
    p.rotation = p.faceAngle;

    if (p.impactFlash > 0) {
      p.impactFlash -= dt;
      p.alpha = 0.82 + Math.random() * 0.18;

      // Red damage flash restored.
      if (p.body) p.body.tint = 0xff755f;
      if (p.cockpit) p.cockpit.tint = 0xffb199;
    } else {
      p.alpha = 1;
      if (p.body) p.body.tint = 0xffffff;
      if (p.cockpit) p.cockpit.tint = 0xffffff;
    }
  }

  function updateGun(dt) {
    state.fireCd -= dt;
    if (!keys.has("Space") || state.fireCd > 0) return;

    state.fireCd = 5;

    const p = state.player;
    const ang = p.faceAngle - Math.PI / 2;
    const speed = 12;

    const b = acquireBullet();
    b.x = p.x + Math.cos(ang) * 18;
    b.y = p.y + Math.sin(ang) * 18;
    b.vx = Math.cos(ang) * speed;
    b.vy = Math.sin(ang) * speed;
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
      b.circle(0, 0, 3).fill(0x82e6ff);
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

      if (
        b.life <= 0 ||
        b.x < -20 || b.x > state.width + 20 ||
        b.y < -20 || b.y > state.height + 20
      ) {
        b.dead = true;
      }
    }

    let write = 0;
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      if (b.dead) {
        releaseBullet(b);
      } else {
        state.bullets[write++] = b;
      }
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
        a.x = -a.r - rand(30, 180);
        a.y = rand(50, state.height - 50);
        a.vx = rand(0.45, 1.25) * (a.r > 55 ? 0.55 : 1);
        a.vy = rand(-0.10, 0.24);
      }
    }
  }

  function resolveBulletAsteroidHits() {
    for (const b of state.bullets) {
      if (b.dead) continue;

      for (const a of state.asteroids) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 1;

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
      const d = Math.hypot(dx, dy) || 1;
      const min = p.radius + a.r;

      if (d >= min) continue;

      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;

      p.x += nx * overlap;
      p.y += ny * overlap;

      p.vx += nx * Math.min(1.4, 0.35 + a.r / 95);
      p.vy += ny * Math.min(1.4, 0.35 + a.r / 95);

      a.vx -= nx * a.invMass * 3.5;
      a.vy -= ny * a.invMass * 3.5;

      p.impactFlash = 8;
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
      Bullets: ${state.bullets.length}<br>
      Asteroids: ${state.asteroids.length}<br>
      Renderer: PixiJS/WebGL
    `;
  }

  boot();
})();
