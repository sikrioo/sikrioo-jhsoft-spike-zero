import { BaseMap } from './BaseMap.js';
import { rand, drawJaggedLine } from '../utils/math.js';

export class JupiterAtmosphereMap extends BaseMap {
  constructor(context) {
    super(context);
    this.reuseFx = true;
    this.bands = [];
    this.swirlCells = [];
    this.frontWisps = [];
    this.lightnings = [];
    this.lightningTimer = rand(45, 120);
    this.flashPower = 0;
    this.overlayGfx = null;
    this.wispGfx = null;
    this.lightningGfx = null;
    this.flashGfx = null;
  }

  enter() {
    this.bands.length = 0;
    this.swirlCells.length = 0;
    this.frontWisps.length = 0;
    this.lightnings.length = 0;
    this.flashPower = 0;
    this.lightningTimer = rand(35, 95);

    this.createAtmosphereBands();
    this.createSwirlCells();
    this.createFrontWisps();
    this.createReusableFx();
  }


  createReusableFx() {
    this.overlayGfx = new PIXI.Graphics();
    this.wispGfx = new PIXI.Graphics();
    this.lightningGfx = new PIXI.Graphics();
    this.flashGfx = new PIXI.Graphics();
    this.layers.mapFx.addChild(this.overlayGfx, this.wispGfx, this.lightningGfx, this.flashGfx);
  }

  createAtmosphereBands() {
    const { width, height } = this.state;
    const colors = [0x281713, 0x563322, 0x7a4a31, 0x9a6040, 0x4a2a21, 0xb0714b, 0x321b18];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const band = new PIXI.Container();
      band.y = (height / count) * i - 12;
      band.baseY = band.y;
      band.speed = rand(0.025, 0.075) * (i % 2 ? 1 : -1);
      band.phase = rand(0, Math.PI * 2);
      band.bandHeight = height / count + rand(28, 62);

      const g = new PIXI.Graphics();
      g.rect(-120, 0, width + 240, band.bandHeight)
        .fill({ color: colors[i % colors.length], alpha: rand(0.48, 0.72) });

      // Curved belt details. These are soft atmospheric ribbons, not hard structures.
      for (let k = 0; k < 7; k++) {
        const y = rand(6, Math.max(12, band.bandHeight - 10));
        const amp = rand(4, 18);
        const wave = rand(0.006, 0.014);
        const alpha = rand(0.035, 0.095);
        const lineColor = k % 3 === 0 ? 0xffd0a2 : 0x2b1712;
        const widthLine = rand(2, 8);
        this.drawWavyRibbon(g, -140, width + 140, y, amp, wave, band.phase + k * 1.7, lineColor, alpha, widthLine);
      }

      // A few embedded storm knots, drawn as nested curved rings so they read as gas patterns.
      if (i === 3 || i === 5 || Math.random() < 0.22) {
        this.drawStormKnot(g, rand(width * 0.15, width * 0.9), rand(band.bandHeight * 0.22, band.bandHeight * 0.78), rand(80, 190));
      }

      band.addChild(g);
      this.bands.push(band);
      this.layers.world.addChild(band);
    }
  }

  drawWavyRibbon(g, startX, endX, baseY, amp, wave, phase, color, alpha, width) {
    g.moveTo(startX, baseY + Math.sin(startX * wave + phase) * amp);
    const step = 36;
    for (let x = startX + step; x <= endX; x += step) {
      const y = baseY + Math.sin(x * wave + phase) * amp + Math.sin(x * wave * 2.2 + phase * 0.7) * amp * 0.28;
      g.lineTo(x, y);
    }
    g.stroke({ color, alpha, width });
  }

  drawStormKnot(g, x, y, r) {
    const ringCount = 4 + Math.floor(rand(0, 3));
    for (let i = 0; i < ringCount; i++) {
      const rr = r * (1 - i * 0.16);
      const h = rr * rand(0.18, 0.32);
      g.ellipse(x + Math.sin(i) * 4, y + Math.cos(i) * 3, rr, h)
        .stroke({ color: i % 2 ? 0xffc18d : 0x2b1712, alpha: 0.035 + i * 0.012, width: rand(3, 7) });
    }
  }

  createSwirlCells() {
    const { width, height } = this.state;

    for (let i = 0; i < 10; i++) {
      const cell = new PIXI.Container();
      cell.x = rand(-120, width + 120);
      cell.y = rand(height * 0.16, height * 0.84);
      cell.vx = rand(-0.17, -0.045);
      cell.vy = rand(-0.018, 0.018);
      cell.rotSpeed = rand(-0.0015, 0.0015);
      cell.radius = rand(95, 230);
      cell.phase = rand(0, Math.PI * 2);
      cell.alpha = rand(0.55, 0.9);

      const g = new PIXI.Graphics();
      this.drawCoherentSwirl(g, cell.radius, cell.phase);
      cell.addChild(g);

      this.swirlCells.push(cell);
      this.layers.world.addChild(cell);
    }
  }

  drawCoherentSwirl(g, radius, phase) {
    // Replaces the old random polygon-like structures with coherent gas vortices.
    const turns = rand(1.4, 2.2);
    const arms = 3 + Math.floor(rand(0, 3));

    g.circle(0, 0, radius * 0.72).fill({ color: 0xd69a72, alpha: 0.018 });

    for (let arm = 0; arm < arms; arm++) {
      const offset = phase + (Math.PI * 2 * arm) / arms;
      for (let lane = 0; lane < 2; lane++) {
        const laneOffset = lane * 0.24;
        g.moveTo(0, 0);
        for (let t = 1; t <= 34; t++) {
          const ratio = t / 34;
          const angle = offset + ratio * Math.PI * 2 * turns + laneOffset;
          const wave = Math.sin(ratio * Math.PI * 3 + phase) * radius * 0.035;
          const rr = radius * Math.pow(ratio, 0.86) + wave;
          const x = Math.cos(angle) * rr;
          const y = Math.sin(angle) * rr * 0.46;
          g.lineTo(x, y);
        }
        g.stroke({ color: lane === 0 ? 0xf2c09a : 0x321a13, alpha: lane === 0 ? 0.075 : 0.055, width: lane === 0 ? rand(10, 20) : rand(6, 14) });
      }
    }

    g.ellipse(0, 0, radius * 0.35, radius * 0.11)
      .stroke({ color: 0xffd0a6, alpha: 0.10, width: 5 });
  }

  createFrontWisps() {
    const { width, height } = this.state;

    for (let i = 0; i < 34; i++) {
      this.frontWisps.push({
        x: rand(-80, width),
        y: rand(0, height),
        len: rand(160, 420),
        thickness: rand(10, 34),
        speed: rand(0.95, 2.75),
        alpha: rand(0.025, 0.085),
        wave: rand(0.006, 0.016),
        amp: rand(7, 28),
        phase: rand(0, Math.PI * 2),
        tone: Math.random() < 0.45 ? 0xf1c098 : 0x2d1914
      });
    }
  }

  update(dt) {
    this.updateBands(dt);
    this.updateSwirlCells(dt);
    this.updateFrontWisps(dt);
    this.updateLightning(dt);
    this.applyAtmosphericDrift(dt);
  }

  updateBands(dt) {
    for (const band of this.bands) {
      band.x += band.speed * dt;
      band.y = band.baseY + Math.sin(this.state.time * 0.005 + band.phase) * 10;
      if (band.x > 90 || band.x < -90) band.x = 0;
      band.scale.x = 1 + Math.sin(this.state.time * 0.0025 + band.phase) * 0.012;
    }
  }

  updateSwirlCells(dt) {
    const { width, height } = this.state;
    for (const cell of this.swirlCells) {
      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt + Math.sin(this.state.time * 0.004 + cell.phase) * 0.035 * dt;
      cell.rotation += cell.rotSpeed * dt;
      if (cell.x < -300) cell.x = width + rand(90, 260);
      if (cell.y < -130) cell.y = height + 130;
      if (cell.y > height + 130) cell.y = -130;
    }
  }

  updateFrontWisps(dt) {
    const { width, height } = this.state;
    for (const wisp of this.frontWisps) {
      wisp.x -= wisp.speed * dt;
      wisp.y += Math.sin(this.state.time * 0.014 + wisp.phase) * 0.10 * dt;
      if (wisp.x < -wisp.len - 80) {
        wisp.x = width + rand(30, 210);
        wisp.y = rand(0, height);
        wisp.len = rand(160, 420);
        wisp.thickness = rand(10, 34);
        wisp.speed = rand(0.95, 2.75);
        wisp.alpha = rand(0.025, 0.085);
        wisp.phase = rand(0, Math.PI * 2);
      }
    }
  }

  updateLightning(dt) {
    this.lightningTimer -= dt;
    this.flashPower = Math.max(0, this.flashPower - 0.045 * dt);

    if (this.lightningTimer <= 0) {
      this.spawnLightningBurst();
      this.lightningTimer = rand(42, 135);
    }

    for (const bolt of this.lightnings) {
      bolt.delay -= dt;
      if (bolt.delay <= 0) {
        bolt.life -= dt;
        if (!bolt.flashesApplied) {
          this.flashPower = Math.max(this.flashPower, rand(0.16, 0.36));
          bolt.flashesApplied = true;
        }
      }
    }

    this.lightnings = this.lightnings.filter((bolt) => bolt.delay > 0 || bolt.life > 0);
  }

  spawnLightningBurst() {
    const count = Math.floor(rand(1, 5));
    const baseX = rand(this.state.width * 0.15, this.state.width * 0.90);
    const baseY = rand(this.state.height * 0.12, this.state.height * 0.82);

    for (let i = 0; i < count; i++) {
      this.lightnings.push({
        x: baseX + rand(-180, 180),
        y: baseY + rand(-120, 120),
        len: rand(80, 240),
        angle: rand(-0.8, 0.8) + Math.PI * 0.5,
        branches: Math.floor(rand(1, 4)),
        delay: i * rand(3, 10) + rand(0, 6),
        life: rand(4, 9),
        flashesApplied: false
      });
    }
  }

  applyAtmosphericDrift(dt) {
    const p = this.state.player;
    const driftTarget = -0.8;
    p.vx += (driftTarget - p.vx) * 0.003 * dt;
    p.vy += Math.sin(this.state.time * 0.012) * 0.002 * dt;
  }

  renderFx() {
    this.drawDarkMoodOverlay();
    this.drawFrontWisps();
    this.drawLightnings();
    this.drawLightningFlash();
    this.applyLayerShake();
  }

  drawDarkMoodOverlay() {
    const { width, height } = this.state;
    const overlay = this.overlayGfx;
    overlay.clear();
    overlay.rect(0, 0, width, height).fill({ color: 0x100807, alpha: 0.40 });
    overlay.rect(0, 0, width, height * 0.20).fill({ color: 0x000000, alpha: 0.24 });
    overlay.rect(0, height * 0.72, width, height * 0.28).fill({ color: 0x000000, alpha: 0.30 });
    overlay.rect(0, 0, width, height).fill({ color: 0x463121, alpha: 0.10 });
  }

  drawFrontWisps() {
    const g = this.wispGfx;
    g.clear();

    for (const w of this.frontWisps) {
      const startX = w.x;
      const endX = w.x + w.len;
      const baseY = w.y;
      g.moveTo(startX, baseY);
      const step = 34;
      for (let x = startX + step; x <= endX; x += step) {
        const y = baseY + Math.sin(x * w.wave + this.state.time * 0.01 + w.phase) * w.amp
          + Math.sin(x * w.wave * 2.1 + w.phase) * w.amp * 0.28;
        g.lineTo(x, y);
      }
      g.stroke({ color: w.tone, alpha: w.alpha, width: w.thickness });

      g.moveTo(startX + 20, baseY + 2);
      for (let x = startX + 20 + step; x <= endX - 20; x += step) {
        const y = baseY + 2 + Math.sin(x * w.wave + this.state.time * 0.012 + w.phase + 0.7) * w.amp * 0.7;
        g.lineTo(x, y);
      }
      g.stroke({ color: 0xffd7b1, alpha: w.alpha * 0.35, width: Math.max(1, w.thickness * 0.13) });
    }
  }

  drawLightnings() {
    const g = this.lightningGfx;
    g.clear();
    for (const bolt of this.lightnings) {
      if (bolt.delay > 0 || bolt.life <= 0) continue;

      const alpha = Math.min(1, bolt.life / 5);
      const ex = bolt.x + Math.cos(bolt.angle) * bolt.len;
      const ey = bolt.y + Math.sin(bolt.angle) * bolt.len;

      g.circle(bolt.x, bolt.y, bolt.len * 0.65).fill({ color: 0xffd0a8, alpha: 0.035 * alpha });
      drawJaggedLine(g, bolt.x, bolt.y, ex, ey, 8, 22, 0xffc08a, 0.35 * alpha, 9);
      drawJaggedLine(g, bolt.x, bolt.y, ex, ey, 8, 16, 0xffffff, 0.92 * alpha, 2);

      for (let i = 0; i < bolt.branches; i++) {
        const t = 0.25 + ((i + 1) / (bolt.branches + 2)) * 0.5;
        const bx = bolt.x + (ex - bolt.x) * t;
        const by = bolt.y + (ey - bolt.y) * t;
        const branchAngle = bolt.angle + Math.sin(bolt.x + i * 17) * 1.15;
        const blen = bolt.len * (0.18 + (i % 3) * 0.08);
        drawJaggedLine(g, bx, by, bx + Math.cos(branchAngle) * blen, by + Math.sin(branchAngle) * blen, 5, 12, 0xffffff, 0.56 * alpha, 1.2);
      }
    }
  }

  drawLightningFlash() {
    const flash = this.flashGfx;
    flash.clear();
    if (this.flashPower <= 0.01) return;
    flash.rect(0, 0, this.state.width, this.state.height).fill({ color: 0xffe2bd, alpha: this.flashPower });
  }

  applyLayerShake() {
    const shake = this.flashPower > 0.05 ? this.flashPower * 8 : 1.0;
    this.layers.world.x = Math.sin(this.state.time * 0.17) * shake;
    this.layers.world.y = Math.cos(this.state.time * 0.13) * shake;
  }

  exit() {
    this.overlayGfx = null;
    this.wispGfx = null;
    this.lightningGfx = null;
    this.flashGfx = null;
    super.exit();
    this.bands.length = 0;
    this.swirlCells.length = 0;
    this.frontWisps.length = 0;
    this.lightnings.length = 0;
  }

  getDebugInfo() {
    return {
      'Jupiter Bands': this.bands.length,
      'Swirl Cells': this.swirlCells.length,
      'Front Wisps': this.frontWisps.length,
      'Lightning Bolts': this.lightnings.length
    };
  }
}
