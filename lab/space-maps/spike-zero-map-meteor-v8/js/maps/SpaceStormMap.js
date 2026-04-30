import { BaseMap } from './BaseMap.js';
import { rand, clamp, drawJaggedLine } from '../utils/math.js';

export class SpaceStormMap extends BaseMap {
  constructor(context) {
    super(context);
    this.reuseFx = true;
    this.nebulaWisps = [];
    this.energyParticles = [];
    this.stars = [];
    this.vortices = [];
    this.arcBursts = [];
    this.burstTimer = rand(50, 120);
    this.currentSlow = 1;
    this.tintGfx = null;
    this.particleGfx = null;
    this.arcGfx = null;
  }

  enter() {
    this.nebulaWisps.length = 0;
    this.energyParticles.length = 0;
    this.stars.length = 0;
    this.vortices.length = 0;
    this.arcBursts.length = 0;
    this.burstTimer = rand(45, 100);
    this.currentSlow = 1;

    this.createBackgroundNebula();
    this.createVortices();
    this.createEnergyParticles();
    this.createReusableFx();
  }

  createReusableFx() {
    this.tintGfx = new PIXI.Graphics();
    this.particleGfx = new PIXI.Graphics();
    this.arcGfx = new PIXI.Graphics();
    this.layers.mapFx.addChild(this.tintGfx);
    for (const v of this.vortices) this.layers.mapFx.addChild(v.gfx);
    this.layers.mapFx.addChild(this.particleGfx, this.arcGfx);
  }

  createBackgroundNebula() {
    const { width, height } = this.state;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height).fill(0x050713);
    this.layers.world.addChild(bg);
    this.objects.push(bg);

    for (let i = 0; i < 14; i++) {
      const g = new PIXI.Graphics();
      const y = rand(-height * 0.12, height * 1.12);
      const amp = rand(20, 95);
      const step = width / 8;
      const color = Math.random() > 0.45 ? 0x35245a : 0x17345f;
      const alpha = rand(0.045, 0.095);
      const widthStroke = rand(18, 52);

      g.moveTo(-160, y);
      for (let x = -160; x <= width + 180; x += step) {
        const yy = y + Math.sin((x * 0.006) + i * 1.7) * amp + rand(-16, 16);
        g.lineTo(x, yy);
      }
      g.stroke({ color, alpha, width: widthStroke });
      g.vx = rand(-0.10, -0.035);
      g.baseY = y;
      g.phase = rand(0, Math.PI * 2);

      this.nebulaWisps.push(g);
      this.layers.world.addChild(g);
      this.objects.push(g);
    }

    for (let i = 0; i < 90; i++) {
      const s = new PIXI.Graphics();
      s.circle(0, 0, rand(0.45, 1.55)).fill({ color: 0xc7d8ff, alpha: rand(0.16, 0.48) });
      s.x = rand(0, width);
      s.y = rand(0, height);
      s.twinkle = rand(0.004, 0.012);
      s.phase = rand(0, Math.PI * 2);
      this.stars.push(s);
      this.layers.world.addChild(s);
      this.objects.push(s);
    }
  }

  createVortices() {
    const { width, height } = this.state;
    const minSize = Math.min(width, height);
    const configs = [
      { x: width * 0.28, y: height * 0.28, rx: minSize * 0.16, ry: minSize * 0.12, power: 0.58 },
      { x: width * 0.66, y: height * 0.43, rx: minSize * 0.24, ry: minSize * 0.18, power: 0.70 },
      { x: width * 0.24, y: height * 0.78, rx: minSize * 0.18, ry: minSize * 0.13, power: 0.55 },
      { x: width * 0.82, y: height * 0.76, rx: minSize * 0.15, ry: minSize * 0.11, power: 0.48 }
    ];

    for (const c of configs) {
      this.vortices.push({
        ...c,
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(0.0025, 0.0065) * (Math.random() > 0.5 ? 1 : -1),
        pulse: rand(0, Math.PI * 2),
        driftAmpX: rand(6, 18),
        driftAmpY: rand(4, 14),
        driftPhaseX: rand(0, Math.PI * 2),
        driftPhaseY: rand(0, Math.PI * 2),
        baseX: c.x,
        baseY: c.y,
        inside: false,
        gfx: new PIXI.Graphics()
      });
    }
  }

  createEnergyParticles() {
    const { width, height } = this.state;
    for (let i = 0; i < 80; i++) {
      this.energyParticles.push({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(0.8, 2.4),
        vx: rand(-0.16, 0.10),
        vy: rand(-0.06, 0.06),
        alpha: rand(0.10, 0.36),
        color: Math.random() > 0.45 ? 0xa46dff : 0x82baff
      });
    }
  }

  update(dt) {
    const { width, height, time } = this.state;
    const player = this.state.player;

    for (const w of this.nebulaWisps) {
      w.x += w.vx * dt;
      w.y = Math.sin(time * 0.006 + w.phase) * 8;
      if (w.x < -width * 0.18) w.x = 0;
    }


    for (const s of this.stars) {
      s.alpha = 0.22 + Math.sin(time * s.twinkle + s.phase) * 0.18;
    }

    for (const v of this.vortices) {
      v.rot += v.rotSpeed * dt;
      v.pulse += 0.018 * dt;
      // Bounded drift: avoid v.driftX * time infinite accumulation.
      v.x = v.baseX + Math.sin(time * 0.006 + v.driftPhaseX) * v.driftAmpX;
      v.y = v.baseY + Math.cos(time * 0.005 + v.driftPhaseY) * v.driftAmpY;
      v.inside = false;
    }

    for (const p of this.energyParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }

    this.applyVortexSlow(player, dt);
    this.updateArcBursts(dt);
  }

  applyVortexSlow(player, dt) {
    let strongestDepth = 0;
    let activeVortex = null;

    for (const v of this.vortices) {
      const dx = player.x - v.x;
      const dy = player.y - v.y;
      const n = (dx * dx) / (v.rx * v.rx) + (dy * dy) / (v.ry * v.ry);
      if (n >= 1) continue;

      const depth = clamp(1 - n, 0, 1) * v.power;
      if (depth > strongestDepth) {
        strongestDepth = depth;
        activeVortex = v;
      }
      v.inside = true;
    }

    if (!activeVortex) {
      this.currentSlow = 1;
      return;
    }

    const slowFactor = clamp(1 - strongestDepth * 0.50, 0.48, 1);
    const dragPerFrame = clamp(1 - strongestDepth * 0.075 * dt, 0.84, 1);
    player.vx *= dragPerFrame;
    player.vy *= dragPerFrame;

    const dx = player.x - activeVortex.x;
    const dy = player.y - activeVortex.y;
    const dist = Math.hypot(dx, dy) || 1;
    const tangentSign = activeVortex.rotSpeed >= 0 ? 1 : -1;
    player.vx += (-dy / dist) * strongestDepth * 0.035 * tangentSign * dt;
    player.vy += (dx / dist) * strongestDepth * 0.035 * tangentSign * dt;

    this.currentSlow = slowFactor;
  }

  updateArcBursts(dt) {
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      const count = Math.floor(rand(1, 4));
      for (let i = 0; i < count; i++) {
        const v = this.vortices[Math.floor(rand(0, this.vortices.length))];
        const angle = rand(0, Math.PI * 2);
        const radius = rand(0.35, 0.95);
        this.arcBursts.push({
          x: v.x + Math.cos(angle) * v.rx * radius,
          y: v.y + Math.sin(angle) * v.ry * radius,
          angle,
          len: rand(70, 160),
          life: rand(8, 20),
          total: 20,
          color: Math.random() > 0.5 ? 0xb169ff : 0x7fc8ff,
          jitterSeed: rand(0, 9999)
        });
      }
      this.burstTimer = rand(45, 130);
    }

    for (const b of this.arcBursts) b.life -= dt;
    this.arcBursts = this.arcBursts.filter((b) => b.life > 0);
  }

  renderFx() {
    this.drawStormTint();
    this.drawVortices();
    this.drawEnergyParticles();
    this.drawArcBursts();
  }

  drawStormTint() {
    const { width, height, time } = this.state;
    this.tintGfx.clear();
    this.tintGfx.rect(0, 0, width, height).fill({ color: 0x02030a, alpha: 0.20 });
    this.tintGfx.rect(0, 0, width, height).fill({ color: 0x160920, alpha: 0.16 + Math.sin(time * 0.015) * 0.025 });
  }

  drawVortices() {
    for (const v of this.vortices) {
      const g = v.gfx;
      g.clear();
      const pulse = 0.5 + Math.sin(v.pulse) * 0.5;
      const glowAlpha = v.inside ? 0.22 : 0.13;

      g.ellipse(v.x, v.y, v.rx * 1.05, v.ry * 1.05)
        .fill({ color: 0x2b154b, alpha: 0.10 + pulse * 0.035 });
      g.ellipse(v.x, v.y, v.rx * 0.72, v.ry * 0.56)
        .fill({ color: 0x5b2c8a, alpha: glowAlpha });
      g.ellipse(v.x, v.y, v.rx * 0.22, v.ry * 0.16)
        .fill({ color: 0xe1c5ff, alpha: v.inside ? 0.34 : 0.22 });

      for (let arm = 0; arm < 5; arm++) {
        const armOffset = (Math.PI * 2 * arm) / 5 + v.rot;
        g.moveTo(v.x + Math.cos(armOffset) * v.rx, v.y + Math.sin(armOffset) * v.ry);
        for (let i = 1; i < 38; i++) {
          const t = i / 37;
          const swirl = armOffset + t * Math.PI * 3.8;
          const radius = 1 - t * 0.88;
          const wobble = 1 + Math.sin(t * 16 + v.pulse + arm) * 0.07;
          const x = v.x + Math.cos(swirl) * v.rx * radius * wobble;
          const y = v.y + Math.sin(swirl) * v.ry * radius * wobble;
          g.lineTo(x, y);
        }
        g.stroke({ color: arm % 2 ? 0x9b57ff : 0x78a7ff, alpha: 0.18, width: arm % 2 ? 3 : 2 });
      }

      g.ellipse(v.x, v.y, v.rx, v.ry)
        .stroke({ color: v.inside ? 0xd8bcff : 0x7757a8, alpha: v.inside ? 0.28 : 0.12, width: 1.2 });
    }
  }

  drawEnergyParticles() {
    const g = this.particleGfx;
    g.clear();
    for (const p of this.energyParticles) {
      g.circle(p.x, p.y, p.r).fill({ color: p.color, alpha: p.alpha });
      if (p.r > 1.8) {
        g.moveTo(p.x, p.y).lineTo(p.x - p.vx * 48, p.y - p.vy * 48)
          .stroke({ color: p.color, alpha: p.alpha * 0.35, width: 1 });
      }
    }
  }

  drawArcBursts() {
    const g = this.arcGfx;
    g.clear();
    for (const b of this.arcBursts) {
      const fade = clamp(b.life / b.total, 0, 1);
      const wiggle = Math.sin((this.state.time + b.jitterSeed) * 0.21) * 0.28;
      const ex = b.x + Math.cos(b.angle + wiggle) * b.len;
      const ey = b.y + Math.sin(b.angle + wiggle) * b.len;
      drawJaggedLine(g, b.x, b.y, ex, ey, 6, 18, b.color, 0.22 * fade, 7);
      drawJaggedLine(g, b.x, b.y, ex, ey, 6, 12, 0xe8dbff, 0.62 * fade, 1.5);
    }
  }

  exit() {
    // Explicitly detach/destroy reusable vortex Graphics before clearing arrays.
    // BaseMap.exit() also clears mapFx/world, but this makes ownership clear
    // and avoids stale Graphics references from vortex objects.
    for (const v of this.vortices) {
      if (v.gfx && !v.gfx.destroyed) {
        if (v.gfx.parent) v.gfx.parent.removeChild(v.gfx);
        v.gfx.destroy({ children: true });
      }
      v.gfx = null;
    }

    this.tintGfx = null;
    this.particleGfx = null;
    this.arcGfx = null;

    super.exit();

    this.nebulaWisps.length = 0;
    this.energyParticles.length = 0;
    this.stars.length = 0;
    this.vortices.length = 0;
    this.arcBursts.length = 0;
  }

  getDebugInfo() {
    return {
      'Storm Vortices': this.vortices.length,
      'Storm Particles': this.energyParticles.length,
      'Speed Modifier': `${Math.round(this.currentSlow * 100)}%`,
      'Energy Arcs': this.arcBursts.length
    };
  }
}
