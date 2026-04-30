import { AsteroidMap } from './AsteroidMap.js';
import { rand, drawJaggedLine } from '../utils/math.js';

export class NebulaMap extends AsteroidMap {
  constructor(context) {
    super(context);
    this.stormTimer = rand(55, 140);
    this.pulses = [];
    this.ghostClouds = [];
  }

  enter() {
    super.enter();
    this.stormTimer = rand(55, 140);
    this.pulses.length = 0;
    this.ghostClouds = this.createGhostClouds();
  }

  update(dt) {
    super.update(dt);

    this.stormTimer -= dt;
    if (this.stormTimer <= 0) {
      this.spawnThunderSequence();
      this.stormTimer = rand(95, 230);
    }

    for (const pulse of this.pulses) {
      if (pulse.delay > 0) {
        pulse.delay -= dt;
        continue;
      }
      pulse.life -= dt;
    }

    this.pulses = this.pulses.filter((pulse) => pulse.delay > 0 || pulse.life > 0);
  }

  createGhostClouds() {
    const clouds = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: rand(0, this.state.width),
        y: rand(0, this.state.height),
        r: rand(90, 260),
        alpha: rand(.018, .052),
        phase: rand(0, Math.PI * 2),
        drift: rand(.003, .010)
      });
    }
    return clouds;
  }

  spawnThunderSequence() {
    const count = Math.floor(rand(1, 5)); // 1~4: 콰-콰콰-광 느낌

    for (let i = 0; i < count; i++) {
      this.pulses.push({
        delay: i * rand(5, 15) + rand(0, 10),
        life: rand(5, 12),
        flashPower: rand(.12, .34),
        bolts: this.createLightningBolts(Math.floor(rand(1, 4)))
      });
    }
  }

  createLightningBolts(count) {
    const bolts = [];

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(rand(0, 4));
      let sx;
      let sy;

      if (edge === 0) {
        sx = rand(this.state.width * .04, this.state.width * .96);
        sy = rand(-50, this.state.height * .12);
      } else if (edge === 1) {
        sx = rand(this.state.width * .88, this.state.width + 50);
        sy = rand(this.state.height * .05, this.state.height * .78);
      } else if (edge === 2) {
        sx = rand(-50, this.state.width * .12);
        sy = rand(this.state.height * .05, this.state.height * .78);
      } else {
        sx = rand(this.state.width * .12, this.state.width * .88);
        sy = rand(this.state.height * .70, this.state.height + 40);
      }

      const ex = rand(this.state.width * .12, this.state.width * .88);
      const ey = rand(this.state.height * .16, this.state.height * .82);

      bolts.push({
        sx,
        sy,
        ex,
        ey,
        jitter: rand(16, 42),
        segments: Math.floor(rand(6, 12)),
        branches: Math.floor(rand(1, 4))
      });
    }

    return bolts;
  }

  renderFx() {
    const player = this.state.player;
    const lightOn = this.input.has('KeyL');
    const activePulses = this.pulses.filter((pulse) => pulse.delay <= 0 && pulse.life > 0);
    const flashPower = activePulses.reduce((sum, pulse) => sum + pulse.flashPower * Math.min(1, pulse.life / 6), 0);

    this.drawDarkNebulaFog(lightOn, flashPower);
    this.drawPlayerLight(player, lightOn, flashPower);
    this.drawGhostClouds(flashPower);

    for (const pulse of activePulses) {
      this.drawThunderPulse(pulse);
    }
  }

  drawDarkNebulaFog(lightOn, flashPower) {
    const fog = new PIXI.Graphics();
    const baseAlpha = lightOn ? .84 : .94;
    fog.rect(0, 0, this.state.width, this.state.height)
      .fill({ color: 0x000104, alpha: Math.max(.55, baseAlpha - flashPower * .55) });
    this.layers.mapFx.addChild(fog);

    const cold = new PIXI.Graphics();
    cold.rect(0, 0, this.state.width, this.state.height)
      .fill({ color: 0x071322, alpha: .18 });
    this.layers.mapFx.addChild(cold);
  }

  drawGhostClouds(flashPower) {
    for (const cloud of this.ghostClouds) {
      const g = new PIXI.Graphics();
      const driftX = Math.sin(this.state.time * cloud.drift + cloud.phase) * 24;
      const driftY = Math.cos(this.state.time * cloud.drift * .7 + cloud.phase) * 14;
      g.circle(cloud.x + driftX, cloud.y + driftY, cloud.r)
        .fill({ color: 0x19314a, alpha: cloud.alpha + flashPower * .018 });
      g.circle(cloud.x + driftX * .6, cloud.y + driftY * .6, cloud.r * .52)
        .fill({ color: 0x05070d, alpha: .06 });
      this.layers.mapFx.addChild(g);
    }
  }

  drawPlayerLight(player, lightOn, flashPower) {
    const r = lightOn ? 300 : 78;
    const light = new PIXI.Graphics();
    light.circle(player.x, player.y, r).fill({ color: 0x76dfff, alpha: lightOn ? .15 : .055 });
    light.circle(player.x, player.y, r * .98)
      .stroke({ color: 0x9eefff, alpha: lightOn ? .30 : .08, width: 1 });

    if (flashPower > .1) {
      light.circle(player.x, player.y, r * 1.35)
        .stroke({ color: 0xffffff, alpha: Math.min(.16, flashPower * .28), width: 1 });
    }

    this.layers.mapFx.addChild(light);
  }

  drawThunderPulse(pulse) {
    const intensity = Math.min(1, pulse.life / 7);

    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.state.width, this.state.height)
      .fill({ color: 0xcff6ff, alpha: pulse.flashPower * intensity });
    this.layers.mapFx.addChild(flash);

    for (const boltData of pulse.bolts) {
      this.drawBoltWithBranches(boltData, intensity);
    }
  }

  drawBoltWithBranches(boltData, intensity) {
    const glow = new PIXI.Graphics();
    const core = new PIXI.Graphics();

    drawJaggedLine(glow, boltData.sx, boltData.sy, boltData.ex, boltData.ey, boltData.segments, boltData.jitter, 0x3b76ff, .22 + intensity * .22, 12);
    drawJaggedLine(glow, boltData.sx, boltData.sy, boltData.ex, boltData.ey, boltData.segments, boltData.jitter * .80, 0x84ddff, .30 + intensity * .24, 7);
    drawJaggedLine(core, boltData.sx, boltData.sy, boltData.ex, boltData.ey, boltData.segments, boltData.jitter * .55, 0xffffff, .70 + intensity * .24, 2);

    for (let i = 0; i < boltData.branches; i++) {
      const t = rand(.22, .82);
      const bx = boltData.sx + (boltData.ex - boltData.sx) * t + rand(-boltData.jitter, boltData.jitter);
      const by = boltData.sy + (boltData.ey - boltData.sy) * t + rand(-boltData.jitter, boltData.jitter);
      const angle = Math.atan2(boltData.ey - boltData.sy, boltData.ex - boltData.sx) + rand(-1.25, 1.25);
      const len = rand(40, 135);
      drawJaggedLine(glow, bx, by, bx + Math.cos(angle) * len, by + Math.sin(angle) * len, 4, boltData.jitter * .45, 0x84ddff, .18 + intensity * .16, 4);
      drawJaggedLine(core, bx, by, bx + Math.cos(angle) * len, by + Math.sin(angle) * len, 4, boltData.jitter * .35, 0xffffff, .42 + intensity * .20, 1);
    }

    this.layers.mapFx.addChild(glow, core);
  }

  getDebugInfo() {
    return { ...super.getDebugInfo(), Thunder: this.pulses.length > 0 ? 'STORM' : 'OFF' };
  }
}
