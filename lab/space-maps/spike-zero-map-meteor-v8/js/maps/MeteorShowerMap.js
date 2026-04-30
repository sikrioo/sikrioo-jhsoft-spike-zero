import { BaseMap } from './BaseMap.js';
import { rand, clamp, drawJaggedLine } from '../utils/math.js';

const EVENT_WARN = 'warn';
const EVENT_FALL = 'fall';
const EVENT_IMPACT = 'impact';

export class MeteorShowerMap extends BaseMap {
  constructor(context) {
    super(context);
    this.reuseFx = true;

    this.stars = [];
    this.embers = [];
    this.warningZones = [];
    this.meteors = [];
    this.impacts = [];
    this.debris = [];
    this.heatZones = [];

    this.eventTimer = rand(70, 120);
    this.difficultyTime = 0;
    this.waveIndex = 0;
    this.shake = 0;

    this.bgGfx = null;
    this.warningGfx = null;
    this.meteorGfx = null;
    this.impactGfx = null;
    this.debrisGfx = null;
    this.heatGfx = null;
    this.overlayGfx = null;
  }

  enter() {
    this.stars.length = 0;
    this.embers.length = 0;
    this.warningZones.length = 0;
    this.meteors.length = 0;
    this.impacts.length = 0;
    this.debris.length = 0;
    this.heatZones.length = 0;

    this.eventTimer = rand(55, 100);
    this.difficultyTime = 0;
    this.waveIndex = 0;
    this.shake = 0;

    this.createBackground();
    this.createEmbers();
    this.createReusableFx();
  }

  createBackground() {
    const { width, height } = this.state;
    this.bgGfx = new PIXI.Graphics();
    this.bgGfx.rect(0, 0, width, height).fill(0x04060b);

    // Dark nebula sweep, red-brown but not too bright.
    for (let i = 0; i < 9; i++) {
      const y = rand(-height * 0.1, height * 1.1);
      this.bgGfx.moveTo(-140, y);
      for (let x = -140; x <= width + 160; x += width / 7) {
        const yy = y + Math.sin(x * 0.005 + i * 1.7) * rand(22, 70) + rand(-18, 18);
        this.bgGfx.lineTo(x, yy);
      }
      this.bgGfx.stroke({
        color: Math.random() > 0.5 ? 0x6d2c17 : 0x25314d,
        alpha: rand(0.035, 0.085),
        width: rand(16, 48)
      });
    }

    // Distant planet curve at bottom right, matching the concept but subtle.
    const planetX = width * 0.78;
    const planetY = height * 1.18;
    const planetR = Math.min(width, height) * 0.55;
    this.bgGfx.circle(planetX, planetY, planetR)
      .fill({ color: 0x1a2333, alpha: 0.55 })
      .stroke({ color: 0xff9960, alpha: 0.18, width: 3 });
    this.bgGfx.arc(planetX, planetY, planetR * 1.01, Math.PI * 1.08, Math.PI * 1.78)
      .stroke({ color: 0xd9e5ff, alpha: 0.22, width: 2 });

    for (let i = 0; i < 120; i++) {
      const s = new PIXI.Graphics();
      s.circle(0, 0, rand(0.45, 1.5)).fill({ color: 0xe4e7ff, alpha: rand(0.18, 0.60) });
      s.x = rand(0, width);
      s.y = rand(0, height);
      s.phase = rand(0, Math.PI * 2);
      s.twinkle = rand(0.004, 0.014);
      this.stars.push(s);
      this.layers.world.addChild(s);
      this.objects.push(s);
    }

    this.layers.world.addChildAt(this.bgGfx, 0);
    this.objects.push(this.bgGfx);
  }

  createEmbers() {
    const { width, height } = this.state;
    for (let i = 0; i < 80; i++) {
      this.embers.push({
        x: rand(0, width),
        y: rand(0, height),
        vx: rand(-0.55, -0.12),
        vy: rand(0.16, 0.52),
        len: rand(10, 42),
        r: rand(0.5, 1.6),
        alpha: rand(0.08, 0.26),
        color: Math.random() > 0.65 ? 0xffb56b : 0xff6338
      });
    }
  }

  createReusableFx() {
    this.heatGfx = new PIXI.Graphics();
    this.warningGfx = new PIXI.Graphics();
    this.meteorGfx = new PIXI.Graphics();
    this.impactGfx = new PIXI.Graphics();
    this.debrisGfx = new PIXI.Graphics();
    this.overlayGfx = new PIXI.Graphics();
    this.layers.mapFx.addChild(
      this.heatGfx,
      this.warningGfx,
      this.meteorGfx,
      this.impactGfx,
      this.debrisGfx,
      this.overlayGfx
    );
  }

  update(dt) {
    const { width, height, time } = this.state;
    const player = this.state.player;

    this.difficultyTime += dt;
    this.eventTimer -= dt;

    if (this.eventTimer <= 0) {
      this.spawnMeteorWave();
      const pressure = this.getPressure();
      this.eventTimer = rand(82, 132) / pressure;
    }

    for (const s of this.stars) {
      s.alpha = 0.22 + Math.sin(time * s.twinkle + s.phase) * 0.16;
    }

    for (const e of this.embers) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < -80 || e.y > height + 80) {
        e.x = rand(width * 0.15, width + 160);
        e.y = rand(-80, height * 0.7);
      }
    }

    this.updateWarnings(dt);
    this.updateMeteors(dt, player);
    this.updateImpacts(dt, player);
    this.updateHeatZones(dt, player);
    this.updateDebris(dt, player);
    this.applyShake(dt);
  }

  getPressure() {
    // Gradually increases meteor density without becoming uncontrollable.
    return clamp(1 + this.difficultyTime / 2200, 1, 2.35);
  }

  spawnMeteorWave() {
    const { width, height } = this.state;
    const pressure = this.getPressure();
    const count = Math.floor(rand(2, 4 + pressure * 2.2));
    const isHeavyWave = this.waveIndex > 0 && this.waveIndex % 5 === 0;
    const waveCount = isHeavyWave ? count + 3 : count;

    for (let i = 0; i < waveCount; i++) {
      const targetX = rand(width * 0.16, width * 0.92);
      const targetY = rand(height * 0.18, height * 0.86);
      const radius = isHeavyWave ? rand(34, 54) : rand(24, 42);
      this.warningZones.push({
        state: EVENT_WARN,
        x: targetX,
        y: targetY,
        r: radius,
        warn: rand(34, 58),
        warnTotal: 58,
        delay: i * rand(4, 10),
        heavy: isHeavyWave && Math.random() > 0.45,
        phase: rand(0, Math.PI * 2)
      });
    }

    this.waveIndex++;
  }

  updateWarnings(dt) {
    for (const w of this.warningZones) {
      w.delay -= dt;
      if (w.delay > 0) continue;
      w.warn -= dt;
      if (w.warn <= 0) {
        this.spawnMeteorFromWarning(w);
        w.dead = true;
      }
    }
    this.warningZones = this.warningZones.filter((w) => !w.dead);
  }

  spawnMeteorFromWarning(w) {
    const angle = Math.PI * 0.72 + rand(-0.16, 0.13); // upper-right to lower-left feeling.
    const travel = rand(480, 780);
    const speed = w.heavy ? rand(11.5, 14.5) : rand(8.2, 11.2);
    const sx = w.x - Math.cos(angle) * travel;
    const sy = w.y - Math.sin(angle) * travel;

    this.meteors.push({
      x: sx,
      y: sy,
      targetX: w.x,
      targetY: w.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: w.heavy ? rand(13, 19) : rand(7, 13),
      hitR: w.r,
      tail: w.heavy ? rand(130, 190) : rand(80, 140),
      life: 130,
      heavy: w.heavy,
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.05, 0.05)
    });
  }

  updateMeteors(dt, player) {
    for (const m of this.meteors) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      m.rot += m.spin * dt;

      if (Math.hypot(m.x - player.x, m.y - player.y) < m.r + player.radius + 4) {
        player.impactFlash = 18;
        const dx = player.x - m.x;
        const dy = player.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        player.vx += (dx / d) * (m.heavy ? 3.2 : 2.1);
        player.vy += (dy / d) * (m.heavy ? 3.2 : 2.1);
        this.shake = Math.max(this.shake, m.heavy ? 18 : 11);
        this.explodeMeteor(m, true);
        m.dead = true;
        continue;
      }

      if (Math.hypot(m.x - m.targetX, m.y - m.targetY) < m.r + 10 || m.life <= 0) {
        this.explodeMeteor(m, false);
        m.dead = true;
      }
    }
    this.meteors = this.meteors.filter((m) => !m.dead);
  }

  explodeMeteor(m, airBurst) {
    const impactRadius = m.heavy ? rand(72, 98) : rand(46, 68);
    this.impacts.push({
      x: m.x,
      y: m.y,
      r: impactRadius,
      life: m.heavy ? 34 : 24,
      total: m.heavy ? 34 : 24,
      hit: airBurst,
      heavy: m.heavy
    });

    this.heatZones.push({
      x: m.x,
      y: m.y,
      r: impactRadius * (m.heavy ? 1.10 : 0.90),
      life: m.heavy ? 230 : 150,
      total: m.heavy ? 230 : 150,
      tick: 0,
      heavy: m.heavy
    });

    const debrisCount = m.heavy ? 18 : 10;
    for (let i = 0; i < debrisCount; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(1.1, m.heavy ? 4.2 : 3.1);
      this.debris.push({
        x: m.x,
        y: m.y,
        vx: Math.cos(a) * sp + m.vx * 0.10,
        vy: Math.sin(a) * sp + m.vy * 0.10,
        r: rand(2, m.heavy ? 6 : 4.5),
        life: rand(85, 170),
        total: 170,
        hot: Math.random() > 0.35
      });
    }

    this.shake = Math.max(this.shake, m.heavy ? 22 : 13);
  }

  updateImpacts(dt, player) {
    for (const i of this.impacts) {
      i.life -= dt;
      if (!i.hit && Math.hypot(player.x - i.x, player.y - i.y) < player.radius + i.r * 0.65) {
        i.hit = true;
        player.impactFlash = i.heavy ? 18 : 12;
        const dx = player.x - i.x;
        const dy = player.y - i.y;
        const d = Math.hypot(dx, dy) || 1;
        player.vx += (dx / d) * (i.heavy ? 2.8 : 1.8);
        player.vy += (dy / d) * (i.heavy ? 2.8 : 1.8);
      }
    }
    this.impacts = this.impacts.filter((i) => i.life > 0);
  }

  updateHeatZones(dt, player) {
    for (const h of this.heatZones) {
      h.life -= dt;
      h.tick -= dt;
      const dist = Math.hypot(player.x - h.x, player.y - h.y);
      if (dist < player.radius + h.r) {
        const depth = 1 - dist / (player.radius + h.r);
        player.vx *= 0.994 - depth * 0.010;
        player.vy *= 0.994 - depth * 0.010;
        if (h.tick <= 0) {
          player.impactFlash = Math.max(player.impactFlash, h.heavy ? 7 : 4);
          h.tick = h.heavy ? 18 : 26;
        }
      }
    }
    this.heatZones = this.heatZones.filter((h) => h.life > 0);
  }

  updateDebris(dt, player) {
    const { width, height } = this.state;
    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.pow(0.992, dt);
      d.vy *= Math.pow(0.992, dt);
      d.life -= dt;

      if (Math.hypot(player.x - d.x, player.y - d.y) < player.radius + d.r + 1) {
        player.impactFlash = Math.max(player.impactFlash, d.hot ? 9 : 5);
        const dx = player.x - d.x;
        const dy = player.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        player.vx += (dx / dist) * 0.75;
        player.vy += (dy / dist) * 0.75;
        d.dead = true;
      }

      if (d.x < -80 || d.x > width + 80 || d.y < -80 || d.y > height + 80) d.dead = true;
    }
    this.debris = this.debris.filter((d) => !d.dead && d.life > 0);
  }

  applyShake(dt) {
    if (this.shake <= 0) {
      this.layers.world.x = 0;
      this.layers.world.y = 0;
      this.layers.mapFx.x = 0;
      this.layers.mapFx.y = 0;
      return;
    }

    const amp = Math.min(7, this.shake * 0.35);
    const sx = rand(-amp, amp);
    const sy = rand(-amp, amp);
    this.layers.world.x = sx;
    this.layers.world.y = sy;
    this.layers.mapFx.x = sx;
    this.layers.mapFx.y = sy;
    this.shake = Math.max(0, this.shake - dt);
  }

  renderFx() {
    this.drawHeatZones();
    this.drawWarnings();
    this.drawMeteors();
    this.drawImpacts();
    this.drawDebrisAndEmbers();
    this.drawOverlay();
  }

  drawHeatZones() {
    const g = this.heatGfx;
    g.clear();
    for (const h of this.heatZones) {
      const fade = clamp(h.life / h.total, 0, 1);
      const pulse = 0.5 + Math.sin(this.state.time * 0.08 + h.x) * 0.5;
      g.circle(h.x, h.y, h.r * (1.0 + pulse * 0.06))
        .fill({ color: 0xff4a1f, alpha: 0.055 * fade });
      g.circle(h.x, h.y, h.r * 0.58)
        .fill({ color: 0xffa14a, alpha: 0.045 * fade });
      g.circle(h.x, h.y, h.r)
        .stroke({ color: 0xff6c38, alpha: 0.18 * fade, width: 1.2 });
    }
  }

  drawWarnings() {
    const g = this.warningGfx;
    g.clear();
    for (const w of this.warningZones) {
      if (w.delay > 0) continue;
      const t = clamp(w.warn / w.warnTotal, 0, 1);
      const pulse = 0.5 + Math.sin(this.state.time * 0.25 + w.phase) * 0.5;
      const radius = w.r * (1.1 + pulse * 0.25 + (1 - t) * 0.4);
      g.circle(w.x, w.y, radius)
        .stroke({ color: w.heavy ? 0xffd08a : 0xff5533, alpha: 0.28 + (1 - t) * 0.35, width: w.heavy ? 3 : 2 });
      g.circle(w.x, w.y, 4 + pulse * 3)
        .fill({ color: 0xff6a32, alpha: 0.45 });
      g.moveTo(w.x - w.r * 0.55, w.y).lineTo(w.x + w.r * 0.55, w.y)
        .stroke({ color: 0xff6a32, alpha: 0.22, width: 1 });
      g.moveTo(w.x, w.y - w.r * 0.55).lineTo(w.x, w.y + w.r * 0.55)
        .stroke({ color: 0xff6a32, alpha: 0.22, width: 1 });
    }
  }

  drawMeteors() {
    const g = this.meteorGfx;
    g.clear();
    for (const m of this.meteors) {
      const dir = Math.atan2(m.vy, m.vx);
      const tx = -Math.cos(dir) * m.tail;
      const ty = -Math.sin(dir) * m.tail;

      g.moveTo(m.x + tx, m.y + ty).lineTo(m.x, m.y)
        .stroke({ color: 0xff3d18, alpha: 0.18, width: m.r * 2.8 });
      g.moveTo(m.x + tx * 0.65, m.y + ty * 0.65).lineTo(m.x, m.y)
        .stroke({ color: 0xff9a35, alpha: 0.42, width: m.r * 1.35 });
      g.moveTo(m.x + tx * 0.28, m.y + ty * 0.28).lineTo(m.x, m.y)
        .stroke({ color: 0xfff2c2, alpha: 0.82, width: Math.max(1.4, m.r * 0.32) });

      // Rock core: simple jagged polygon, reused in one Graphics.
      const points = [];
      for (let k = 0; k < 9; k++) {
        const a = m.rot + (Math.PI * 2 * k) / 9;
        const rr = m.r * rand(0.68, 1.12);
        points.push(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr);
      }
      g.poly(points).fill(0x2b211c).stroke({ color: 0xffb270, alpha: 0.35, width: 1.2 });
      g.circle(m.x - Math.cos(dir) * m.r * 0.35, m.y - Math.sin(dir) * m.r * 0.35, m.r * 0.42)
        .fill({ color: 0xff5b20, alpha: 0.56 });
    }
  }

  drawImpacts() {
    const g = this.impactGfx;
    g.clear();
    for (const i of this.impacts) {
      const fade = clamp(i.life / i.total, 0, 1);
      const expansion = 1 + (1 - fade) * 0.55;
      g.circle(i.x, i.y, i.r * expansion)
        .fill({ color: 0xff5d24, alpha: 0.10 * fade });
      g.circle(i.x, i.y, i.r * 0.44 * expansion)
        .fill({ color: 0xffd59b, alpha: 0.22 * fade });
      g.circle(i.x, i.y, i.r * expansion)
        .stroke({ color: 0xff7a3d, alpha: 0.42 * fade, width: 2 });
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI * 2 * k) / 6 + i.x * 0.01;
        g.moveTo(i.x, i.y).lineTo(i.x + Math.cos(a) * i.r * expansion, i.y + Math.sin(a) * i.r * expansion)
          .stroke({ color: 0xff8a44, alpha: 0.12 * fade, width: 1.2 });
      }
    }
  }

  drawDebrisAndEmbers() {
    const g = this.debrisGfx;
    g.clear();

    for (const e of this.embers) {
      g.moveTo(e.x, e.y).lineTo(e.x - e.vx * e.len, e.y - e.vy * e.len)
        .stroke({ color: e.color, alpha: e.alpha, width: e.r });
    }

    for (const d of this.debris) {
      const fade = clamp(d.life / d.total, 0, 1);
      const color = d.hot ? 0xff8444 : 0x6f665c;
      g.circle(d.x, d.y, d.r).fill({ color, alpha: (d.hot ? 0.46 : 0.28) * fade });
      if (d.hot) {
        g.moveTo(d.x, d.y).lineTo(d.x - d.vx * 16, d.y - d.vy * 16)
          .stroke({ color: 0xffb063, alpha: 0.25 * fade, width: 1.2 });
      }
    }
  }

  drawOverlay() {
    const { width, height, time } = this.state;
    const g = this.overlayGfx;
    g.clear();
    g.rect(0, 0, width, height).fill({ color: 0x090609, alpha: 0.12 });
    g.rect(0, 0, width, height).fill({ color: 0x331106, alpha: 0.045 + Math.sin(time * 0.018) * 0.015 });

    // Rare distant streaks, not hazards: only visual depth.
    if (Math.random() < 0.18) {
      const x = rand(width * 0.35, width + 50);
      const y = rand(-30, height * 0.45);
      drawJaggedLine(g, x, y, x - rand(80, 210), y + rand(42, 110), 4, 6, 0xff8a45, 0.12, 1);
    }
  }

  exit() {
    this.bgGfx = null;
    this.warningGfx = null;
    this.meteorGfx = null;
    this.impactGfx = null;
    this.debrisGfx = null;
    this.heatGfx = null;
    this.overlayGfx = null;
    super.exit();
    this.stars.length = 0;
    this.embers.length = 0;
    this.warningZones.length = 0;
    this.meteors.length = 0;
    this.impacts.length = 0;
    this.debris.length = 0;
    this.heatZones.length = 0;
  }

  getDebugInfo() {
    return {
      'Meteor Warnings': this.warningZones.length,
      'Meteors': this.meteors.length,
      'Debris': this.debris.length,
      'Heat Zones': this.heatZones.length,
      'Meteor Pressure': `${Math.round(this.getPressure() * 100)}%`
    };
  }
}
