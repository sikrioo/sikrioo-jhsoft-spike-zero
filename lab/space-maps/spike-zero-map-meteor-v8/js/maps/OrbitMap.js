import { BaseMap } from './BaseMap.js';
import { rand } from '../utils/math.js';

export class OrbitMap extends BaseMap {
  constructor(context) {
    super(context);
    this.satellites = [];
  }

  enter() {
    this.satellites.length = 0;
    const configs = [[.20,.22,'h',90,true,28],[.45,.28,'v',75,false,22],[.74,.22,'h',110,true,36],[.32,.58,'v',95,true,28],[.62,.55,'h',85,false,30],[.84,.67,'v',70,true,22],[.52,.78,'h',115,false,32]];

    for (const c of configs) {
      const sat = this.createSatellite(c[5]);
      sat.baseX = this.state.width * c[0];
      sat.baseY = this.state.height * c[1];
      sat.moveType = c[2];
      sat.range = c[3];
      sat.canLaser = c[4];
      sat.phase = Math.random() * Math.PI * 2;
      sat.speed = rand(.008, .013);
      sat.radius = c[5];
      sat.timer = rand(100, 250);
      sat.warn = 0;
      sat.fire = 0;
      sat.laserAngle = 0;
      this.satellites.push(sat);
      this.layers.world.addChild(sat);
    }
  }

  createSatellite(radius) {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const s = radius / 30;
    g.rect(-36 * s, -8 * s, 22 * s, 16 * s).fill(0x4e86b8).stroke({ color: 0xdff6ff, alpha: .35, width: 1 });
    g.rect(14 * s, -8 * s, 22 * s, 16 * s).fill(0x4e86b8).stroke({ color: 0xdff6ff, alpha: .35, width: 1 });
    g.rect(-13 * s, -12 * s, 26 * s, 24 * s).fill(0xcfd8e2).stroke({ color: 0xffffff, alpha: .45, width: 1 });
    g.moveTo(8 * s, -12 * s).lineTo(24 * s, -25 * s).stroke({ color: 0xe8f6ff, alpha: .65, width: 1 });
    c.addChild(g);
    return c;
  }

  update(dt) {
    const player = this.state.player;

    for (const s of this.satellites) {
      const m = Math.sin(this.state.time * s.speed + s.phase) * s.range;
      s.x = s.baseX + (s.moveType === 'h' ? m : 0);
      s.y = s.baseY + (s.moveType === 'v' ? m : 0);
      s.rotation = Math.sin(this.state.time * .01 + s.phase) * .15;

      if (Math.hypot(player.x - s.x, player.y - s.y) < player.radius + s.radius) {
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        player.x = s.x + dx / d * (player.radius + s.radius + 1);
        player.y = s.y + dy / d * (player.radius + s.radius + 1);
        player.vx += dx / d * 1.8;
        player.vy += dy / d * 1.8;
        player.impactFlash = 10;
      }

      if (!s.canLaser) continue;

      if (s.fire > 0) {
        s.fire -= dt;
        if (this.isPlayerOnLaser(player, s)) player.impactFlash = 10;
        continue;
      }

      if (s.warn > 0) {
        s.warn -= dt;
        s.laserAngle = Math.atan2(player.y - s.y, player.x - s.x);
        if (s.warn <= 0) s.fire = rand(30, 60);
        continue;
      }

      s.timer -= dt;
      if (s.timer <= 0) {
        s.warn = rand(30, 65);
        s.timer = rand(140, 320);
      }
    }
  }

  isPlayerOnLaser(player, s) {
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    const lx = Math.cos(s.laserAngle);
    const ly = Math.sin(s.laserAngle);
    const along = dx * lx + dy * ly;
    if (along < 0 || along > 1000) return false;
    return Math.abs(-ly * dx + lx * dy) < player.radius + 5;
  }

  renderFx() {
    this.drawEarth();
    this.drawLasers();
  }

  drawEarth() {
    const earth = new PIXI.Graphics();
    const ex = this.state.width * .17;
    const ey = this.state.height * 1.07;
    const er = Math.min(this.state.width, this.state.height) * .42;
    earth.circle(ex, ey, er * 1.32).fill({ color: 0x3b9dff, alpha: .08 });
    earth.circle(ex, ey, er).fill({ color: 0x0b3b78, alpha: .92 });
    earth.circle(ex - er * .15, ey - er * .25, er * .22).fill({ color: 0x2e8b57, alpha: .42 });
    earth.circle(ex + er * .18, ey - er * .1, er * .16).fill({ color: 0x3fa06c, alpha: .35 });
    this.layers.mapFx.addChild(earth);
  }

  drawLasers() {
    for (const s of this.satellites) {
      if (s.warn > 0) {
        const line = new PIXI.Graphics();
        line.moveTo(s.x, s.y)
          .lineTo(s.x + Math.cos(s.laserAngle) * 260, s.y + Math.sin(s.laserAngle) * 260)
          .stroke({ color: 0xff556a, alpha: .35, width: 1 });
        this.layers.mapFx.addChild(line);
      }

      if (s.fire > 0) {
        const len = Math.max(this.state.width, this.state.height) * 1.3;
        const laser = new PIXI.Graphics();
        laser.moveTo(s.x, s.y)
          .lineTo(s.x + Math.cos(s.laserAngle) * len, s.y + Math.sin(s.laserAngle) * len)
          .stroke({ color: 0xff2048, alpha: .35, width: 8 });
        laser.moveTo(s.x, s.y)
          .lineTo(s.x + Math.cos(s.laserAngle) * len, s.y + Math.sin(s.laserAngle) * len)
          .stroke({ color: 0xffffff, alpha: .75, width: 1.2 });
        this.layers.mapFx.addChild(laser);
      }
    }
  }

  getDebugInfo() {
    return { Satellites: this.satellites.length };
  }
}
