import { BaseMap } from './BaseMap.js';
import { rand, resolveStaticCircleCollision } from '../utils/math.js';

export class GasMap extends BaseMap {
  constructor(context) {
    super(context);
    this.planets = [];
  }

  enter() {
    this.planets.length = 0;
    const configs = [
      [0.22, 0.30, 76, 0x2e4f55],
      [0.70, 0.32, 98, 0x5b4635],
      [0.42, 0.70, 84, 0x2d554c],
      [0.82, 0.70, 64, 0x4b4d6e]
    ];

    for (const c of configs) {
      const p = new PIXI.Container();
      p.x = this.state.width * c[0];
      p.y = this.state.height * c[1];
      p.r = c[2];
      p.timer = rand(45, 120);
      p.vents = [];
      p.nextClusterDelay = rand(0, 24);

      const body = new PIXI.Graphics();
      body.circle(0, 0, p.r).fill(c[3]).stroke({ color: 0xe8fbff, alpha: 0.26, width: 2 });

      for (let i = 0; i < 7; i++) {
        const y = -p.r * .62 + i * p.r * .20;
        body.ellipse(0, y, p.r * rand(.58, .88), p.r * rand(.035, .070))
          .stroke({ color: 0xffffff, alpha: i % 2 ? 0.05 : 0.12, width: 2 });
      }

      body.arc(0, 0, p.r * .96, Math.PI * 1.05, Math.PI * 1.72)
        .stroke({ color: 0xffffff, alpha: 0.20, width: 2 });

      p.addChild(body);
      this.planets.push(p);
      this.layers.world.addChild(p);
    }
  }

  update(dt) {
    for (const gp of this.planets) {
      this.resolvePlayerPlanetCollision(gp);
      this.updatePlanetVents(gp, dt);
    }
  }

  updatePlanetVents(gp, dt) {
    const player = this.state.player;

    gp.timer -= dt;
    if (gp.timer <= 0) {
      this.spawnVentCluster(gp);
      gp.timer = rand(75, 165);
    }

    for (const vent of gp.vents) {
      if (vent.delay > 0) {
        vent.delay -= dt;
        continue;
      }

      if (!vent.active && vent.warn > 0) {
        vent.warn -= dt;
        if (vent.warn <= 0) vent.active = true;
        continue;
      }

      if (vent.active) {
        vent.life -= dt;
        this.applyVentForce(gp, vent, player);
      }
    }

    gp.vents = gp.vents.filter((vent) => vent.delay > 0 || vent.warn > 0 || vent.life > 0);
  }

  spawnVentCluster(gp) {
    const count = Math.floor(rand(2, 6));
    const base = rand(0, Math.PI * 2);

    for (let i = 0; i < count; i++) {
      const spread = rand(-1.45, 1.45);
      const angle = base + spread + rand(-0.22, 0.22);
      gp.vents.push({
        angle,
        delay: rand(0, 28),
        warn: rand(10, 30),
        life: rand(26, 72),
        len: rand(190, 440),
        width: gp.r * rand(.16, .42),
        seed: Math.random() * 999,
        ribbons: Math.floor(rand(2, 5)),
        active: false
      });
    }
  }

  applyVentForce(gp, vent, player) {
    const lx = Math.cos(vent.angle);
    const ly = Math.sin(vent.angle);
    const dx = player.x - gp.x;
    const dy = player.y - gp.y;
    const along = dx * lx + dy * ly;
    const perp = Math.abs(-ly * dx + lx * dy);

    if (along > gp.r * .55 && along < vent.len && perp < vent.width * .95) {
      player.vx += lx * 0.09;
      player.vy += ly * 0.09;
      player.impactFlash = Math.max(player.impactFlash, 5);
    }
  }

  resolvePlayerPlanetCollision(planet) {
    const hit = resolveStaticCircleCollision(this.state.player, planet.x, planet.y, planet.r, {
      bounce: 1.15,
      friction: 0.985
    });

    if (hit) this.state.player.impactFlash = Math.max(this.state.player.impactFlash, 6);
  }

  renderFx() {
    for (const gp of this.planets) {
      for (const vent of gp.vents) {
        if (vent.delay > 0) continue;
        if (!vent.active && vent.warn > 0) this.drawWarning(gp, vent);
        if (vent.active && vent.life > 0) this.drawVent(gp, vent);
      }
    }
  }

  drawWarning(gp, vent) {
    const lx = Math.cos(vent.angle);
    const ly = Math.sin(vent.angle);
    const warn = new PIXI.Graphics();
    const sx = gp.x + lx * gp.r * .82;
    const sy = gp.y + ly * gp.r * .82;
    const ex = gp.x + lx * (gp.r + rand(38, 72));
    const ey = gp.y + ly * (gp.r + rand(38, 72));

    warn.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: 0xffffff, alpha: .42, width: 1.5 });
    warn.circle(sx, sy, gp.r * .045).fill({ color: 0xffffff, alpha: .46 });
    this.layers.mapFx.addChild(warn);
  }

  drawVent(gp, vent) {
    const fade = Math.min(1, vent.life / 18);
    const burst = new PIXI.Graphics();
    const bx = Math.cos(vent.angle);
    const by = Math.sin(vent.angle);
    const tx = -by;
    const ty = bx;
    const sx = gp.x + bx * gp.r * .78;
    const sy = gp.y + by * gp.r * .78;

    for (let i = 0; i < vent.ribbons; i++) {
      const len = vent.len * rand(.58, 1.22);
      const width = vent.width * rand(.45, 1.15);
      const side = rand(-1, 1);
      const jitter = Math.sin(this.state.time * .08 + vent.seed + i) * width * .28;
      const ex = sx + bx * len + tx * (side * width * .38 + jitter);
      const ey = sy + by * len + ty * (side * width * .38 + jitter);

      burst.poly([
        sx + tx * width * .08, sy + ty * width * .08,
        ex + tx * width * rand(.22, .70), ey + ty * width * rand(.22, .70),
        ex + bx * rand(16, 54), ey + by * rand(16, 54),
        ex - tx * width * rand(.22, .70), ey - ty * width * rand(.22, .70),
        sx - tx * width * .08, sy - ty * width * .08
      ]).fill({ color: 0xffffff, alpha: rand(.08, .20) * fade });

      burst.moveTo(sx, sy).lineTo(ex + bx * rand(15, 48), ey + by * rand(15, 48))
        .stroke({ color: 0xffffff, alpha: rand(.38, .76) * fade, width: rand(.8, 2.2) });
    }

    // thin gas scratches: gives a rough, tearing jet feeling
    for (let k = 0; k < 5; k++) {
      const t0 = rand(.05, .28);
      const t1 = rand(.42, 1.05);
      const side = Math.random() > .5 ? 1 : -1;
      burst.moveTo(sx + bx * vent.len * t0 + tx * side * rand(1, vent.width * .20), sy + by * vent.len * t0 + ty * side * rand(1, vent.width * .20))
        .lineTo(sx + bx * vent.len * t1 + tx * side * rand(vent.width * .18, vent.width * .95), sy + by * vent.len * t1 + ty * side * rand(vent.width * .18, vent.width * .95))
        .stroke({ color: 0xffffff, alpha: .18 * fade, width: 1 });
    }

    this.layers.mapFx.addChild(burst);
  }

  getDebugInfo() {
    const vents = this.planets.reduce((sum, p) => sum + p.vents.length, 0);
    return { 'Gas Planets': this.planets.length, 'Gas Vents': vents };
  }
}
