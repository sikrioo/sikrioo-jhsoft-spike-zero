import { BaseMap } from './BaseMap.js';
import {
  rand,
  clamp,
  drawJaggedLine,
  isPointNearSegment,
  resolveStaticCircleCollision
} from '../utils/math.js';

const METEOR_INTERVAL_MULTIPLIER = 1 / 0.3;

export class CataclysmMap extends BaseMap {
  constructor(context) {
    super(context);
    this.reuseFx = true;

    this.stars = [];
    this.planets = [];
    this.streams = [];
    this.warningZones = [];
    this.meteors = [];
    this.heatZones = [];
    this.spaceLightnings = [];
    this.planetLightnings = [];
    this.flashPower = 0;
    this.spaceFlashPower = 0;
    this.planetFlashPower = 0;
    this.meteorTimer = rand(60, 110) * METEOR_INTERVAL_MULTIPLIER;
    this.lightningTimer = rand(80, 150);
    this.pressureTime = 0;
    this.shake = 0;

    this.anomaly = null;
    this.bgGfx = null;
    this.fieldGfx = null;
    this.streamGfx = null;
    this.warningGfx = null;
    this.meteorGfx = null;
    this.heatGfx = null;
    this.lightningGfx = null;
    this.gasGfx = null;
    this.overlayGfx = null;
  }

  enter() {
    this.stars.length = 0;
    this.planets.length = 0;
    this.streams.length = 0;
    this.warningZones.length = 0;
    this.meteors.length = 0;
    this.heatZones.length = 0;
    this.spaceLightnings.length = 0;
    this.planetLightnings.length = 0;
    this.flashPower = 0;
    this.spaceFlashPower = 0;
    this.planetFlashPower = 0;
    this.meteorTimer = rand(55, 95) * METEOR_INTERVAL_MULTIPLIER;
    this.lightningTimer = rand(72, 135);
    this.pressureTime = 0;
    this.shake = 0;

    this.createBackground();
    this.createAnomaly();
    this.createDriftPlanets();
    this.createStreams();
    this.createReusableFx();
  }

  createBackground() {
    const { width, height } = this.state;
    this.bgGfx = new PIXI.Graphics();
    this.bgGfx.rect(0, 0, width, height).fill(0x02040a);

    for (let i = 0; i < 11; i++) {
      const y = rand(-height * 0.08, height * 1.08);
      this.bgGfx.moveTo(-150, y);
      for (let x = -150; x <= width + 180; x += width / 8) {
        const yy = y + Math.sin(x * 0.005 + i * 1.5) * rand(20, 68) + rand(-18, 18);
        this.bgGfx.lineTo(x, yy);
      }
      this.bgGfx.stroke({
        color: i % 2 ? 0x2a1a35 : 0x17344d,
        alpha: rand(0.04, 0.09),
        width: rand(18, 52)
      });
    }

    const horizonX = width * 0.85;
    const horizonY = height * 1.16;
    const horizonR = Math.min(width, height) * 0.52;
    this.bgGfx.circle(horizonX, horizonY, horizonR)
      .fill({ color: 0x161d2e, alpha: 0.58 })
      .stroke({ color: 0xffb067, alpha: 0.16, width: 3 });

    for (let i = 0; i < 96; i++) {
      const s = new PIXI.Graphics();
      s.circle(0, 0, rand(0.4, 1.5)).fill({ color: 0xe7efff, alpha: rand(0.18, 0.62) });
      s.x = rand(0, width);
      s.y = rand(0, height);
      s.phase = rand(0, Math.PI * 2);
      s.twinkle = rand(0.004, 0.013);
      this.stars.push(s);
      this.layers.world.addChild(s);
      this.objects.push(s);
    }

    this.layers.world.addChildAt(this.bgGfx, 0);
    this.objects.push(this.bgGfx);
  }

  createAnomaly() {
    const { width, height } = this.state;
    this.anomaly = {
      x: width * 0.63,
      y: height * 0.46,
      r: Math.min(width, height) * 0.105,
      field: Math.min(width, height) * 0.26,
      phase: rand(0, Math.PI * 2)
    };

    const core = new PIXI.Container();
    core.x = this.anomaly.x;
    core.y = this.anomaly.y;

    const body = new PIXI.Graphics();
    body.circle(0, 0, this.anomaly.r * 1.22).fill({ color: 0x201128, alpha: 0.22 });
    body.circle(0, 0, this.anomaly.r).fill(0x0e1524);
    body.circle(0, 0, this.anomaly.r * 0.76).fill({ color: 0x2f5671, alpha: 0.52 });
    body.circle(-this.anomaly.r * 0.18, -this.anomaly.r * 0.22, this.anomaly.r * 0.24)
      .fill({ color: 0xcce7ff, alpha: 0.18 });
    body.circle(0, 0, this.anomaly.r)
      .stroke({ color: 0xc7e3ff, alpha: 0.26, width: 2 });
    body.ellipse(0, 0, this.anomaly.field * 0.66, this.anomaly.field * 0.24)
      .stroke({ color: 0x9cc8ff, alpha: 0.10, width: 3 });
    core.addChild(body);

    this.layers.world.addChild(core);
    this.objects.push(core);
  }

  createDriftPlanets() {
    const configs = [
      { r: 58, x: -90, y: this.state.height * 0.24, vx: 0.18, vy: 0.02, color: 0x3f4f67 },
      { r: 42, x: this.state.width * 0.14, y: this.state.height * 0.78, vx: 0.24, vy: -0.015, color: 0x534238 }
    ];

    for (const config of configs) {
      const planet = new PIXI.Container();
      planet.x = config.x;
      planet.y = config.y;
      planet.r = config.r;
      planet.vx = config.vx;
      planet.vy = config.vy;
      planet.spin = rand(-0.0018, 0.0018);
      planet.lightningTimer = rand(90, 170);
      planet.ventTimer = rand(120, 210);
      planet.vents = [];

      const body = new PIXI.Graphics();
      const points = [];
      const facets = 11;
      for (let i = 0; i < facets; i++) {
        const angle = (Math.PI * 2 * i) / facets;
        const rr = planet.r * rand(0.74, 1.14);
        points.push(Math.cos(angle) * rr, Math.sin(angle) * rr);
      }

      body.poly(points).fill(config.color)
        .stroke({ color: 0xf3e7cf, alpha: 0.20, width: 2 });

      for (let i = 0; i < (planet.r > 50 ? 4 : 2); i++) {
        body.circle(
          rand(-planet.r * 0.42, planet.r * 0.42),
          rand(-planet.r * 0.42, planet.r * 0.42),
          rand(planet.r * 0.08, planet.r * 0.18)
        ).fill({ color: 0x1f1c19, alpha: 0.22 });
      }

      body.poly([
        -planet.r * 0.22, -planet.r * 0.34,
        planet.r * 0.04, -planet.r * 0.46,
        planet.r * 0.26, -planet.r * 0.18,
        0, -planet.r * 0.08
      ]).fill({ color: 0xb6d4ea, alpha: 0.10 });
      planet.addChild(body);

      this.planets.push(planet);
      this.layers.world.addChild(planet);
      this.objects.push(planet);
    }
  }

  createStreams() {
    const { width, height } = this.state;
    for (let i = 0; i < 4; i++) {
      this.streams.push({
        x: rand(-width * 0.18, width * 0.25),
        y: rand(height * 0.12, height * 0.88),
        len: rand(width * 0.10, width * 0.18),
        width: rand(12, 22),
        angle: rand(-0.18, 0.12),
        speed: rand(0.18, 0.34),
        alpha: rand(0.025, 0.055),
        phase: rand(0, Math.PI * 2),
        sway: rand(6, 18)
      });
    }
  }

  createReusableFx() {
    this.fieldGfx = new PIXI.Graphics();
    this.streamGfx = new PIXI.Graphics();
    this.warningGfx = new PIXI.Graphics();
    this.meteorGfx = new PIXI.Graphics();
    this.heatGfx = new PIXI.Graphics();
    this.lightningGfx = new PIXI.Graphics();
    this.gasGfx = new PIXI.Graphics();
    this.overlayGfx = new PIXI.Graphics();
    this.layers.mapFx.addChild(
      this.fieldGfx,
      this.streamGfx,
      this.warningGfx,
      this.meteorGfx,
      this.heatGfx,
      this.lightningGfx,
      this.gasGfx,
      this.overlayGfx
    );
  }

  update(dt) {
    const { time, width, height } = this.state;
    const player = this.state.player;
    this.pressureTime += dt;
    this.spaceFlashPower = Math.max(0, this.spaceFlashPower - 0.028 * dt);
    this.planetFlashPower = Math.max(0, this.planetFlashPower - 0.032 * dt);
    this.flashPower = Math.max(this.spaceFlashPower, this.planetFlashPower);

    for (const s of this.stars) {
      s.alpha = 0.24 + Math.sin(time * s.twinkle + s.phase) * 0.17;
    }

    this.updatePlanets(dt, player);
    for (const stream of this.streams) {
      stream.x += stream.speed * dt;
      stream.y += Math.sin(time * 0.01 + stream.phase) * 0.08 * dt;
      if (stream.x > width + 120) {
        stream.x = rand(-width * 0.35, -50);
        stream.y = rand(height * 0.12, height * 0.88);
      }
    }

    this.applyAnomalyField(player, dt);
    this.resolvePlanetCollisions(player);
    this.applyStreamDrift(player);
    this.updateMeteors(dt, player);
    this.updateLightning(dt, player);
    this.updateHeatZones(dt, player);
    this.applyShake(dt);
  }

  getPressure() {
    return clamp(1 + this.pressureTime / 2400, 1, 2.2);
  }

  updatePlanets(dt, player) {
    const { width, height } = this.state;
    for (const planet of this.planets) {
      planet.x += planet.vx * dt;
      planet.y += planet.vy * dt;
      planet.rotation += planet.spin * dt;
      this.updatePlanetHazards(planet, dt, player);

      if (planet.x > width + planet.r * 2.4) {
        planet.x = -planet.r * 2.4 - rand(20, 80);
        planet.y = rand(height * 0.18, height * 0.84);
      }

      if (planet.y < planet.r || planet.y > height - planet.r) {
        planet.vy *= -1;
      }
    }
  }

  updatePlanetHazards(planet, dt, player) {
    planet.lightningTimer -= dt;
    planet.ventTimer -= dt;

    if (planet.lightningTimer <= 0) {
      this.spawnPlanetLightning(planet);
      planet.lightningTimer = rand(110, 210);
    }

    if (planet.ventTimer <= 0) {
      this.spawnPlanetVent(planet);
      planet.ventTimer = rand(140, 250);
    }

    for (const vent of planet.vents) {
      if (vent.delay > 0) {
        vent.delay -= dt;
        continue;
      }

      if (!vent.active) {
        vent.warn -= dt;
        if (vent.warn <= 0) vent.active = true;
        continue;
      }

      vent.life -= dt;
      this.applyVentForce(planet, vent, player);
    }

    planet.vents = planet.vents.filter((vent) => vent.delay > 0 || !vent.active || vent.life > 0);
  }

  applyAnomalyField(player, dt) {
    const a = this.anomaly;
    const dx = player.x - a.x;
    const dy = player.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const depth = clamp(1 - dist / a.field, 0, 1);

    if (depth > 0) {
      player.vx -= (dx / dist) * depth * 0.028 * dt;
      player.vy -= (dy / dist) * depth * 0.028 * dt;
      player.vx *= 0.996 - depth * 0.012;
      player.vy *= 0.996 - depth * 0.012;
    }

    const hit = resolveStaticCircleCollision(player, a.x, a.y, a.r, {
      bounce: 0.9,
      friction: 0.97
    });
    if (hit) {
      player.impactFlash = Math.max(player.impactFlash, 8);
      this.shake = Math.max(this.shake, 7);
    }
  }

  resolvePlanetCollisions(player) {
    for (const planet of this.planets) {
      const hit = resolveStaticCircleCollision(player, planet.x, planet.y, planet.r, {
        bounce: 1.05,
        friction: 0.985
      });
      if (hit) {
        player.impactFlash = Math.max(player.impactFlash, 7);
        this.shake = Math.max(this.shake, 5);
      }
    }
  }

  applyVentForce(planet, vent, player) {
    const lx = Math.cos(vent.angle);
    const ly = Math.sin(vent.angle);
    const dx = player.x - planet.x;
    const dy = player.y - planet.y;
    const along = dx * lx + dy * ly;
    const perp = Math.abs(-ly * dx + lx * dy);

    if (along > planet.r * 0.55 && along < vent.len && perp < vent.width) {
      player.vx += lx * 0.08;
      player.vy += ly * 0.08;
      player.impactFlash = Math.max(player.impactFlash, 5);
    }
  }

  applyStreamDrift(player) {
    for (const stream of this.streams) {
      const sx = stream.x;
      const sy = stream.y;
      const ex = stream.x + Math.cos(stream.angle) * stream.len;
      const ey = stream.y + Math.sin(stream.angle) * stream.len;
      const dx = ex - sx;
      const dy = ey - sy;
      const lenSq = dx * dx + dy * dy || 1;
      let t = ((player.x - sx) * dx + (player.y - sy) * dy) / lenSq;
      t = clamp(t, 0, 1);
      const px = sx + dx * t;
      const py = sy + dy * t;
      const dist = Math.hypot(player.x - px, player.y - py);
      if (dist < stream.width) {
        const force = 1 - dist / stream.width;
        player.vx += Math.cos(stream.angle) * force * 0.038;
        player.vy += Math.sin(stream.angle) * force * 0.018;
      }
    }
  }

  updateMeteors(dt, player) {
    this.meteorTimer -= dt;
    if (this.meteorTimer <= 0) {
      this.spawnMeteorWave();
      this.meteorTimer = (rand(88, 135) / this.getPressure()) * METEOR_INTERVAL_MULTIPLIER;
    }

    for (const zone of this.warningZones) {
      zone.delay -= dt;
      if (zone.delay > 0) continue;
      zone.warn -= dt;
      if (zone.warn <= 0) {
        this.spawnMeteor(zone);
        zone.dead = true;
      }
    }
    this.warningZones = this.warningZones.filter((zone) => !zone.dead);

    for (const meteor of this.meteors) {
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      meteor.rot += meteor.spin * dt;
      meteor.life -= dt;

      if (Math.hypot(meteor.x - player.x, meteor.y - player.y) < meteor.r + player.radius + 3) {
        player.impactFlash = 16;
        const dx = player.x - meteor.x;
        const dy = player.y - meteor.y;
        const d = Math.hypot(dx, dy) || 1;
        player.vx += (dx / d) * 2.4;
        player.vy += (dy / d) * 2.4;
        this.spawnHeatZone(meteor.x, meteor.y, meteor.heavy);
        meteor.dead = true;
        this.shake = Math.max(this.shake, meteor.heavy ? 14 : 9);
        continue;
      }

      if (Math.hypot(meteor.x - meteor.targetX, meteor.y - meteor.targetY) < meteor.r + 10 || meteor.life <= 0) {
        this.spawnHeatZone(meteor.x, meteor.y, meteor.heavy);
        meteor.dead = true;
        this.shake = Math.max(this.shake, meteor.heavy ? 18 : 11);
      }
    }
    this.meteors = this.meteors.filter((meteor) => !meteor.dead);
  }

  spawnMeteorWave() {
    const { width, height } = this.state;
    const count = Math.floor(rand(2, 4 + this.getPressure() * 1.8));
    const heavyWave = Math.random() < 0.24;

    for (let i = 0; i < count + (heavyWave ? 2 : 0); i++) {
      this.warningZones.push({
        x: rand(width * 0.18, width * 0.92),
        y: rand(height * 0.18, height * 0.86),
        r: heavyWave ? rand(30, 50) : rand(20, 38),
        warn: rand(30, 54),
        total: 54,
        delay: i * rand(3, 8),
        heavy: heavyWave && Math.random() > 0.35,
        phase: rand(0, Math.PI * 2)
      });
    }
  }

  spawnMeteor(zone) {
    const angle = Math.PI * 0.72 + rand(-0.12, 0.16);
    const travel = rand(460, 760);
    const speed = zone.heavy ? rand(11.2, 14.2) : rand(8.6, 11.4);
    this.meteors.push({
      x: zone.x - Math.cos(angle) * travel,
      y: zone.y - Math.sin(angle) * travel,
      targetX: zone.x,
      targetY: zone.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: zone.heavy ? rand(12, 18) : rand(7, 12),
      tail: zone.heavy ? rand(120, 180) : rand(80, 136),
      heavy: zone.heavy,
      life: 130,
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.05, 0.05),
      profile: Array.from({ length: 8 }, () => rand(0.72, 1.08))
    });
  }

  spawnHeatZone(x, y, heavy) {
    this.heatZones.push({
      x,
      y,
      r: heavy ? rand(74, 102) : rand(44, 68),
      life: heavy ? 220 : 145,
      total: heavy ? 220 : 145,
      heavy
    });
  }

  updateHeatZones(dt, player) {
    for (const zone of this.heatZones) {
      zone.life -= dt;
      const dist = Math.hypot(player.x - zone.x, player.y - zone.y);
      if (dist < player.radius + zone.r) {
        const depth = 1 - dist / (player.radius + zone.r);
        player.vx *= 0.995 - depth * 0.012;
        player.vy *= 0.995 - depth * 0.012;
        player.impactFlash = Math.max(player.impactFlash, zone.heavy ? 7 : 4);
      }
    }
    this.heatZones = this.heatZones.filter((zone) => zone.life > 0);
  }

  updateLightning(dt, player) {
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.spawnSpaceLightningBurst();
      this.lightningTimer = rand(78, 155);
    }

    for (const bolt of this.spaceLightnings) {
      bolt.delay -= dt;
      if (bolt.delay > 0) continue;
      bolt.life -= dt;
      if (!bolt.flashApplied) {
        this.spaceFlashPower = Math.max(this.spaceFlashPower, rand(0.10, 0.22));
        bolt.flashApplied = true;
      }
      if (!bolt.hit && isPointNearSegment(player.x, player.y, bolt.sx, bolt.sy, bolt.ex, bolt.ey, player.radius + 10)) {
        bolt.hit = true;
        player.impactFlash = 15;
        const dx = player.x - bolt.sx;
        const dy = player.y - bolt.sy;
        const d = Math.hypot(dx, dy) || 1;
        player.vx += (dx / d) * 1.8;
        player.vy += (dy / d) * 1.8;
        this.shake = Math.max(this.shake, 8);
      }
    }

    for (const bolt of this.planetLightnings) {
      bolt.delay -= dt;
      if (bolt.delay > 0) continue;
      bolt.life -= dt;
      if (!bolt.flashApplied) {
        this.planetFlashPower = Math.max(this.planetFlashPower, rand(0.13, 0.28));
        bolt.flashApplied = true;
      }
      if (!bolt.hit && isPointNearSegment(player.x, player.y, bolt.sx, bolt.sy, bolt.ex, bolt.ey, player.radius + 10)) {
        bolt.hit = true;
        player.impactFlash = 14;
        const dx = player.x - bolt.sx;
        const dy = player.y - bolt.sy;
        const d = Math.hypot(dx, dy) || 1;
        player.vx += (dx / d) * 1.65;
        player.vy += (dy / d) * 1.65;
        this.shake = Math.max(this.shake, 7);
      }
    }

    this.spaceLightnings = this.spaceLightnings.filter((bolt) => bolt.delay > 0 || bolt.life > 0);
    this.planetLightnings = this.planetLightnings.filter((bolt) => bolt.delay > 0 || bolt.life > 0);
    this.flashPower = Math.max(this.spaceFlashPower, this.planetFlashPower);
  }

  spawnSpaceLightningBurst() {
    const count = Math.floor(rand(1, 4));
    const a = this.anomaly;

    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const len = rand(a.r + 110, a.field + 160);
      this.spaceLightnings.push({
        sx: a.x + Math.cos(angle) * a.r * rand(0.72, 0.96),
        sy: a.y + Math.sin(angle) * a.r * rand(0.72, 0.96),
        ex: a.x + Math.cos(angle) * len + rand(-40, 40),
        ey: a.y + Math.sin(angle) * len + rand(-40, 40),
        delay: i * rand(4, 12) + rand(0, 10),
        life: rand(8, 18),
        jitter: rand(16, 34),
        segments: Math.floor(rand(5, 10)),
        flashApplied: false,
        hit: false
      });
    }
  }

  spawnPlanetLightning(planet) {
    const count = Math.floor(rand(1, 3));
    const base = rand(0, Math.PI * 2);

    for (let i = 0; i < count; i++) {
      const angle = base + rand(-1.0, 1.0);
      const len = rand(planet.r + 60, planet.r + 145);
      this.planetLightnings.push({
        sx: planet.x + Math.cos(angle) * planet.r * rand(0.72, 0.96),
        sy: planet.y + Math.sin(angle) * planet.r * rand(0.72, 0.96),
        ex: planet.x + Math.cos(angle) * len + rand(-26, 26),
        ey: planet.y + Math.sin(angle) * len + rand(-26, 26),
        delay: i * rand(3, 8) + rand(0, 5),
        life: rand(7, 15),
        jitter: rand(12, 24),
        segments: Math.floor(rand(5, 9)),
        flashApplied: false,
        hit: false
      });
    }
  }

  spawnPlanetVent(planet) {
    const count = Math.floor(rand(1, 3));
    const base = rand(0, Math.PI * 2);

    for (let i = 0; i < count; i++) {
      const angle = base + rand(-1.1, 1.1);
      planet.vents.push({
        angle,
        delay: rand(0, 18),
        warn: rand(8, 22),
        life: rand(24, 58),
        len: rand(120, 220),
        width: planet.r * rand(0.18, 0.34),
        seed: Math.random() * 999,
        ribbons: Math.floor(rand(2, 4)),
        active: false
      });
    }
  }

  applyShake(dt) {
    if (this.shake <= 0) {
      this.layers.world.x = 0;
      this.layers.world.y = 0;
      this.layers.mapFx.x = 0;
      this.layers.mapFx.y = 0;
      return;
    }

    const amp = Math.min(6, this.shake * 0.34);
    const sx = rand(-amp, amp);
    const sy = rand(-amp, amp);
    this.layers.world.x = sx;
    this.layers.world.y = sy;
    this.layers.mapFx.x = sx;
    this.layers.mapFx.y = sy;
    this.shake = Math.max(0, this.shake - dt);
  }

  renderFx() {
    this.drawAnomalyField();
    this.drawStreams();
    this.drawMeteorWarnings();
    this.drawMeteors();
    this.drawHeatZones();
    this.drawGasVents();
    this.drawLightning();
    this.drawOverlay();
  }

  drawAnomalyField() {
    const g = this.fieldGfx;
    g.clear();
    const a = this.anomaly;
    const pulse = 0.5 + Math.sin(this.state.time * 0.04 + a.phase) * 0.5;

    g.circle(a.x, a.y, a.field)
      .fill({ color: 0x365b8f, alpha: 0.03 + pulse * 0.02 });
    g.circle(a.x, a.y, a.field)
      .stroke({ color: 0xa7d0ff, alpha: 0.12 + pulse * 0.08, width: 1.4 });

    for (let i = 0; i < 4; i++) {
      g.ellipse(a.x, a.y, a.field * (0.32 + i * 0.14), a.field * (0.14 + i * 0.055))
        .stroke({ color: i % 2 ? 0xddeaff : 0x7ab7ff, alpha: 0.05, width: 1 });
    }
  }

  drawStreams() {
    const g = this.streamGfx;
    g.clear();
    for (const stream of this.streams) {
      const sx = stream.x;
      const sy = stream.y;
      const sway = Math.sin(this.state.time * 0.01 + stream.phase) * stream.sway;
      const mx = stream.x + Math.cos(stream.angle) * stream.len * 0.5 + sway;
      const my = stream.y + Math.sin(stream.angle) * stream.len * 0.5 + sway * 0.18;
      const ex = stream.x + Math.cos(stream.angle) * stream.len;
      const ey = stream.y + Math.sin(stream.angle) * stream.len;
      g.moveTo(sx, sy).quadraticCurveTo(mx, my, ex, ey)
        .stroke({ color: 0xffc86d, alpha: stream.alpha, width: stream.width });
      g.moveTo(sx, sy).quadraticCurveTo(mx, my, ex, ey)
        .stroke({ color: 0xfff2c7, alpha: stream.alpha * 0.45, width: Math.max(1.2, stream.width * 0.18) });
    }
  }

  drawMeteorWarnings() {
    const g = this.warningGfx;
    g.clear();
    for (const zone of this.warningZones) {
      if (zone.delay > 0) continue;
      const t = clamp(zone.warn / zone.total, 0, 1);
      const pulse = 0.5 + Math.sin(this.state.time * 0.24 + zone.phase) * 0.5;
      const radius = zone.r * (1.1 + pulse * 0.25 + (1 - t) * 0.42);
      g.circle(zone.x, zone.y, radius)
        .stroke({ color: zone.heavy ? 0xffd08a : 0xff5e36, alpha: 0.26 + (1 - t) * 0.36, width: zone.heavy ? 3 : 2 });
      g.circle(zone.x, zone.y, 4 + pulse * 3).fill({ color: 0xff7c37, alpha: 0.42 });
    }
  }

  drawMeteors() {
    const g = this.meteorGfx;
    g.clear();
    for (const meteor of this.meteors) {
      const dir = Math.atan2(meteor.vy, meteor.vx);
      const tx = -Math.cos(dir) * meteor.tail;
      const ty = -Math.sin(dir) * meteor.tail;

      g.moveTo(meteor.x + tx, meteor.y + ty).lineTo(meteor.x, meteor.y)
        .stroke({ color: 0xff481c, alpha: 0.18, width: meteor.r * 2.8 });
      g.moveTo(meteor.x + tx * 0.6, meteor.y + ty * 0.6).lineTo(meteor.x, meteor.y)
        .stroke({ color: 0xff9f3e, alpha: 0.42, width: meteor.r * 1.34 });
      g.moveTo(meteor.x + tx * 0.28, meteor.y + ty * 0.28).lineTo(meteor.x, meteor.y)
        .stroke({ color: 0xfff1cb, alpha: 0.84, width: Math.max(1.4, meteor.r * 0.3) });

      const points = [];
      for (let i = 0; i < 8; i++) {
        const a = meteor.rot + (Math.PI * 2 * i) / 8;
        const rr = meteor.r * meteor.profile[i];
        points.push(meteor.x + Math.cos(a) * rr, meteor.y + Math.sin(a) * rr);
      }
      g.poly(points).fill(0x31231d).stroke({ color: 0xffaf70, alpha: 0.34, width: 1.1 });
    }
  }

  drawHeatZones() {
    const g = this.heatGfx;
    g.clear();
    for (const zone of this.heatZones) {
      const fade = clamp(zone.life / zone.total, 0, 1);
      const pulse = 0.5 + Math.sin(this.state.time * 0.08 + zone.x) * 0.5;
      g.circle(zone.x, zone.y, zone.r * (1 + pulse * 0.06))
        .fill({ color: 0xff501f, alpha: 0.06 * fade });
      g.circle(zone.x, zone.y, zone.r * 0.56)
        .fill({ color: 0xffb05c, alpha: 0.048 * fade });
      g.circle(zone.x, zone.y, zone.r)
        .stroke({ color: 0xff7b3d, alpha: 0.18 * fade, width: 1.1 });
    }
  }

  drawLightning() {
    const g = this.lightningGfx;
    g.clear();

    if (this.flashPower > 0.01) {
      g.rect(0, 0, this.state.width, this.state.height)
        .fill({ color: this.planetFlashPower > this.spaceFlashPower ? 0xd9ecff : 0xffe2bd, alpha: this.flashPower });
    }

    for (const bolt of this.spaceLightnings) {
      if (bolt.delay > 0) continue;
      g.circle(bolt.sx, bolt.sy, 34).fill({ color: 0xffd0a8, alpha: 0.05 });
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter, 0xffc08a, 0.24, 10);
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter * 0.82, 0xffe0b3, 0.38, 5.5);
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter * 0.55, 0xffffff, 0.9, 1.9);
    }

    for (const bolt of this.planetLightnings) {
      if (bolt.delay > 0) continue;
      g.circle(bolt.sx, bolt.sy, 28).fill({ color: 0x92cbff, alpha: 0.05 });
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter, 0x4e82ff, 0.22, 9);
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter * 0.82, 0x9edfff, 0.34, 4.8);
      drawJaggedLine(g, bolt.sx, bolt.sy, bolt.ex, bolt.ey, bolt.segments, bolt.jitter * 0.55, 0xffffff, 0.9, 1.8);
    }
  }

  drawGasVents() {
    const g = this.gasGfx;
    g.clear();

    for (const planet of this.planets) {
      for (const vent of planet.vents) {
        if (vent.delay > 0) continue;

        const bx = Math.cos(vent.angle);
        const by = Math.sin(vent.angle);
        const tx = -by;
        const ty = bx;
        const sx = planet.x + bx * planet.r * 0.78;
        const sy = planet.y + by * planet.r * 0.78;

        if (!vent.active) {
          g.moveTo(sx, sy).lineTo(sx + bx * 28, sy + by * 28)
            .stroke({ color: 0xd7ebff, alpha: 0.34, width: 1.2 });
          g.circle(sx, sy, planet.r * 0.05).fill({ color: 0xeef7ff, alpha: 0.38 });
          continue;
        }

        const fade = Math.min(1, vent.life / 16);
        for (let i = 0; i < vent.ribbons; i++) {
          const len = vent.len * rand(0.62, 1.12);
          const width = vent.width * rand(0.52, 1.0);
          const jitter = Math.sin(this.state.time * 0.08 + vent.seed + i) * width * 0.26;
          const ex = sx + bx * len + tx * jitter;
          const ey = sy + by * len + ty * jitter;
          g.moveTo(sx, sy).quadraticCurveTo(
            sx + bx * len * 0.46 + tx * width * 0.7,
            sy + by * len * 0.46 + ty * width * 0.35,
            ex,
            ey
          ).stroke({ color: 0xe2f3ff, alpha: 0.18 * fade, width });
          g.moveTo(sx, sy).quadraticCurveTo(
            sx + bx * len * 0.42 - tx * width * 0.4,
            sy + by * len * 0.42 - ty * width * 0.2,
            ex,
            ey
          ).stroke({ color: 0xffffff, alpha: 0.08 * fade, width: Math.max(1, width * 0.22) });
        }
      }
    }
  }

  drawOverlay() {
    const g = this.overlayGfx;
    g.clear();
    g.rect(0, 0, this.state.width, this.state.height).fill({ color: 0x09060d, alpha: 0.11 });
    g.rect(0, 0, this.state.width, this.state.height)
      .fill({ color: 0x301209, alpha: 0.04 + Math.sin(this.state.time * 0.016) * 0.015 });
  }

  exit() {
    this.anomaly = null;
    this.bgGfx = null;
    this.fieldGfx = null;
    this.streamGfx = null;
    this.warningGfx = null;
    this.meteorGfx = null;
    this.heatGfx = null;
    this.lightningGfx = null;
    this.gasGfx = null;
    this.overlayGfx = null;
    super.exit();
    this.stars.length = 0;
    this.planets.length = 0;
    this.streams.length = 0;
    this.warningZones.length = 0;
    this.meteors.length = 0;
    this.heatZones.length = 0;
    this.spaceLightnings.length = 0;
    this.planetLightnings.length = 0;
  }

  getDebugInfo() {
    return {
      'Anomaly Field': this.anomaly ? Math.round(this.anomaly.field) : 0,
      'Drift Planets': this.planets.length,
      'Solar Streams': this.streams.length,
      'Meteor Warnings': this.warningZones.length,
      Meteors: this.meteors.length,
      'Space Lightning': this.spaceLightnings.length,
      'Planet Lightning': this.planetLightnings.length,
      Pressure: `${Math.round(this.getPressure() * 100)}%`
    };
  }
}
