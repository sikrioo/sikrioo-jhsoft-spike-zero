import { BaseMap } from './BaseMap.js';
import { rand, isPointNearSegment, drawJaggedLine, resolveStaticCircleCollision } from '../utils/math.js';

export class MagneticMap extends BaseMap {
  constructor(context) {
    super(context);
    this.planets = [];
    this.strikes = [];
  }

  enter() {
    this.planets.length = 0;
    this.strikes.length = 0;
    const configs = [[0.25, 0.30, 76, 170], [0.68, 0.48, 96, 205], [0.42, 0.74, 66, 150]];

    for (const c of configs) {
      const p = new PIXI.Container();
      p.x = this.state.width * c[0];
      p.y = this.state.height * c[1];
      p.r = c[2];
      p.field = c[3];
      p.phase = rand(0, Math.PI * 2);
      p.timer = rand(45, 130);

      const body = new PIXI.Graphics();
      body.circle(0, 0, p.r).fill(0x26375c).stroke({ color: 0xd8ecff, alpha: 0.25, width: 2 });
      body.circle(-p.r * 0.25, -p.r * 0.28, p.r * 0.28).fill({ color: 0x6e8fca, alpha: 0.24 });
      body.arc(0, 0, p.r * .95, Math.PI * 1.04, Math.PI * 1.76).stroke({ color: 0xffffff, alpha: 0.18, width: 2 });

      p.addChild(body);
      this.planets.push(p);
      this.layers.world.addChild(p);
    }
  }

  update(dt) {
    const player = this.state.player;

    for (const mp of this.planets) {
      this.resolvePlayerPlanetCollision(mp);
      this.applyMagneticDrag(mp, player);

      mp.timer -= dt;
      if (mp.timer <= 0) {
        this.spawnStrikeCluster(mp);
        mp.timer = rand(72, 170);
      }
    }

    for (const strike of this.strikes) {
      if (strike.delay > 0) {
        strike.delay -= dt;
        continue;
      }

      if (!strike.active) {
        strike.warn -= dt;
        if (strike.warn <= 0) strike.active = true;
      } else {
        strike.life -= dt;
        this.applyStrikeHit(strike, player);
      }
    }

    this.strikes = this.strikes.filter((strike) => strike.delay > 0 || !strike.active || strike.life > 0);
  }

  applyMagneticDrag(mp, player) {
    const dx = player.x - mp.x;
    const dy = player.y - mp.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < mp.field) {
      const depth = 1 - dist / mp.field;
      const drag = 0.992 - depth * 0.030;
      player.vx *= drag;
      player.vy *= drag;
    }
  }

  spawnStrikeCluster(mp) {
    const count = Math.floor(rand(2, 6));
    const base = rand(0, Math.PI * 2);

    for (let i = 0; i < count; i++) {
      const angle = base + rand(-1.65, 1.65);
      const len = rand(mp.r + 100, mp.field + 170);
      const sx = mp.x + Math.cos(angle) * mp.r * rand(.72, .98);
      const sy = mp.y + Math.sin(angle) * mp.r * rand(.72, .98);

      this.strikes.push({
        sx,
        sy,
        ex: mp.x + Math.cos(angle) * len + rand(-34, 34),
        ey: mp.y + Math.sin(angle) * len + rand(-34, 34),
        delay: rand(0, 30),
        warn: rand(10, 36),
        life: rand(8, 24),
        active: false,
        hit: false,
        jitter: rand(12, 30),
        segments: Math.floor(rand(5, 10)),
        width: rand(1.4, 3.2)
      });
    }
  }

  applyStrikeHit(strike, player) {
    if (strike.hit) return;
    if (!isPointNearSegment(player.x, player.y, strike.sx, strike.sy, strike.ex, strike.ey, player.radius + 10)) return;

    strike.hit = true;
    player.impactFlash = 14;
    const dx = player.x - strike.sx;
    const dy = player.y - strike.sy;
    const d = Math.hypot(dx, dy) || 1;
    player.vx += dx / d * 1.5;
    player.vy += dy / d * 1.5;
  }

  resolvePlayerPlanetCollision(planet) {
    const hit = resolveStaticCircleCollision(this.state.player, planet.x, planet.y, planet.r, {
      bounce: 0.85,
      friction: 0.96
    });

    if (hit) this.state.player.impactFlash = Math.max(this.state.player.impactFlash, 8);
  }

  renderFx() {
    this.drawFields();
    this.drawStrikes();
  }

  drawFields() {
    for (const mp of this.planets) {
      const pulse = 0.5 + Math.sin(this.state.time * .05 + mp.phase) * .2;
      const field = new PIXI.Graphics();
      field.circle(mp.x, mp.y, mp.field)
        .fill({ color: 0x496bff, alpha: .026 + pulse * .014 })
        .stroke({ color: 0xa8ccff, alpha: .10 + pulse * .06, width: 1 });

      for (let i = 0; i < 4; i++) {
        field.ellipse(mp.x, mp.y, mp.field * (.38 + i * .15), mp.field * (.16 + i * .07))
          .stroke({ color: 0xb7d8ff, alpha: .045, width: 1 });
      }

      this.layers.mapFx.addChild(field);
    }
  }

  drawStrikes() {
    for (const s of this.strikes) {
      if (s.delay > 0) continue;
      const bolt = new PIXI.Graphics();

      if (!s.active) {
        bolt.moveTo(s.sx, s.sy).lineTo(s.ex, s.ey).stroke({ color: 0xdff6ff, alpha: .18, width: 1.1 });
        bolt.circle(s.sx, s.sy, 5).fill({ color: 0xffffff, alpha: .38 });
      } else {
        drawJaggedLine(bolt, s.sx, s.sy, s.ex, s.ey, s.segments, s.jitter, 0x426cff, .20, 12);
        drawJaggedLine(bolt, s.sx, s.sy, s.ex, s.ey, s.segments, s.jitter, 0x6ebcff, .40, 6);
        drawJaggedLine(bolt, s.sx, s.sy, s.ex, s.ey, s.segments, s.jitter * .65, 0xffffff, .90, s.width);
      }

      this.layers.mapFx.addChild(bolt);
    }
  }

  getDebugInfo() {
    return { 'Magnetic Planets': this.planets.length, Strikes: this.strikes.length };
  }
}
