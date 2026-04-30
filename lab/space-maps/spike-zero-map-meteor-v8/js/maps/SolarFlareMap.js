import { BaseMap } from './BaseMap.js';
import { rand, clamp } from '../utils/math.js';

export class SolarFlareMap extends BaseMap {
  constructor(context) {
    super(context);
    this.sun = null;
    this.sunRadius = 0;
    this.sunX = 0;
    this.sunY = 0;
    this.visibleEdgeX = 0;
    this.stars = [];
    this.streams = [];
    this.coronaLoops = [];
    this.flareBursts = [];
    this.flareTimer = rand(80, 170);
    this.flashPower = 0;
    this.surfacePulse = 0;
  }

  enter() {
    this.stars.length = 0;
    this.streams.length = 0;
    this.coronaLoops.length = 0;
    this.flareBursts.length = 0;
    this.flareTimer = rand(55, 120);
    this.flashPower = 0;
    this.surfacePulse = 0;

    this.createDeepSpace();
    this.createSun();
    this.createCoronaLoops();
    this.createSolarStreams();
  }

  createDeepSpace() {
    const { width, height } = this.state;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height).fill(0x010206);
    bg.rect(0, 0, width, height).fill({ color: 0x150602, alpha: 0.22 });
    this.layers.world.addChild(bg);
    this.objects.push(bg);

    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(0.4, 1.5),
        alpha: rand(0.12, 0.62),
        twinkle: rand(0.004, 0.018),
        phase: rand(0, Math.PI * 2)
      });
    }

    // 먼 우주에 흐르는 희미한 태양풍 먼지. 직선 대신 긴 곡선 스트림으로 처리한다.
    for (let i = 0; i < 9; i++) {
      this.streams.push({
        x: rand(width * 0.15, width * 0.95),
        y: rand(height * 0.12, height * 0.88),
        len: rand(width * 0.18, width * 0.52),
        amp: rand(10, 34),
        speed: rand(0.08, 0.34),
        alpha: rand(0.018, 0.07),
        phase: rand(0, Math.PI * 2),
        width: rand(1.2, 3.8)
      });
    }
  }

  createSun() {
    const { width, height } = this.state;

    // 화면 왼쪽에 일부만 보이는 거대한 물리 오브젝트.
    this.sunRadius = Math.max(width, height) * 0.58;
    this.sunX = -this.sunRadius * 0.76;
    this.sunY = height * 0.52;
    this.visibleEdgeX = this.sunX + this.sunRadius;

    const sun = new PIXI.Container();
    sun.x = this.sunX;
    sun.y = this.sunY;

    const corona = new PIXI.Graphics();
    corona.circle(0, 0, this.sunRadius * 1.45).fill({ color: 0xff4b0f, alpha: 0.018 });
    corona.circle(0, 0, this.sunRadius * 1.16).fill({ color: 0xff7a19, alpha: 0.036 });
    corona.circle(0, 0, this.sunRadius * 1.02).fill({ color: 0xffc45a, alpha: 0.055 });
    sun.addChild(corona);

    const body = new PIXI.Graphics();
    body.circle(0, 0, this.sunRadius).fill(0xd94b08);
    body.circle(0, 0, this.sunRadius * 0.94).fill({ color: 0xff7b15, alpha: 0.72 });
    body.circle(0, 0, this.sunRadius * 0.70).fill({ color: 0xffaa2e, alpha: 0.32 });

    // 표면 질감: 점/짧은 곡선 위주로, 사진 같은 디테일 대신 웹에서 가볍게 처리.
    for (let i = 0; i < 160; i++) {
      const angle = rand(-1.20, 1.20);
      const r = rand(this.sunRadius * 0.20, this.sunRadius * 0.98);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const size = rand(2, 10);
      body.circle(x, y, size).fill({ color: Math.random() > 0.5 ? 0xffd36b : 0x7d1703, alpha: rand(0.025, 0.12) });
    }

    // 밝은 가장자리. 플레이어가 닿는 물리 경계도 이 원의 일부와 동일하다.
    body.circle(0, 0, this.sunRadius).stroke({ color: 0xfff0b6, alpha: 0.65, width: 4 });
    body.circle(0, 0, this.sunRadius * 1.005).stroke({ color: 0xffffff, alpha: 0.32, width: 2 });
    sun.addChild(body);

    this.sun = sun;
    this.layers.world.addChild(sun);
    this.objects.push(sun);
  }

  createCoronaLoops() {
    // 이미지 레퍼런스처럼 태양 표면에서 솟는 자기장 루프.
    for (let i = 0; i < 8; i++) {
      const angle = rand(-0.95, 0.95);
      this.coronaLoops.push({
        angle,
        span: rand(0.20, 0.44),
        height: rand(this.sunRadius * 0.10, this.sunRadius * 0.28),
        alpha: rand(0.08, 0.22),
        width: rand(1.2, 3.5),
        phase: rand(0, Math.PI * 2)
      });
    }
  }

  createSolarStreams() {
    const { width, height } = this.state;
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: rand(-40, width),
        y: rand(0, height),
        r: rand(0.5, 2.2),
        alpha: rand(0.08, 0.34),
        vx: rand(0.25, 1.6),
        vy: rand(-0.10, 0.10),
        solarDust: true,
        phase: rand(0, Math.PI * 2)
      });
    }
  }

  update(dt) {
    this.surfacePulse += dt;
    this.updateStars(dt);
    this.updateStreams(dt);
    this.updateFlares(dt);
    this.resolveSunCollision(dt);
    this.applySolarWind(dt);
  }

  updateStars(dt) {
    const { width, height } = this.state;
    for (const s of this.stars) {
      if (!s.solarDust) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt + Math.sin(this.state.time * 0.01 + s.phase) * 0.04 * dt;
      if (s.x > width + 30) {
        s.x = rand(-80, -10);
        s.y = rand(0, height);
      }
    }
  }

  updateStreams(dt) {
    const { width, height } = this.state;
    for (const s of this.streams) {
      s.x += s.speed * dt;
      s.y += Math.sin(this.state.time * 0.006 + s.phase) * 0.03 * dt;
      if (s.x > width + 80) {
        s.x = rand(-width * 0.25, width * 0.2);
        s.y = rand(height * 0.12, height * 0.88);
      }
    }
  }

  updateFlares(dt) {
    this.flareTimer -= dt;
    this.flashPower = Math.max(0, this.flashPower - 0.035 * dt);

    if (this.flareTimer <= 0) {
      this.spawnFlareBurst();
      this.flareTimer = rand(90, 210);
    }

    for (const flare of this.flareBursts) {
      flare.delay -= dt;
      if (flare.delay <= 0) {
        flare.life -= dt;
        if (!flare.flashApplied) {
          this.flashPower = Math.max(this.flashPower, rand(0.12, 0.32));
          flare.flashApplied = true;
        }
      }
    }

    this.flareBursts = this.flareBursts.filter((flare) => flare.delay > 0 || flare.life > 0);
  }

  spawnFlareBurst() {
    const count = Math.floor(rand(1, 4));
    const baseAngle = rand(-0.85, 0.85);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + rand(-0.20, 0.28);
      const sx = this.sunX + Math.cos(angle) * this.sunRadius * rand(0.96, 1.015);
      const sy = this.sunY + Math.sin(angle) * this.sunRadius * rand(0.96, 1.015);
      this.flareBursts.push({
        sx,
        sy,
        angle: angle + rand(-0.18, 0.24),
        len: rand(this.state.width * 0.22, this.state.width * 0.50),
        height: rand(70, 190),
        width: rand(18, 46),
        delay: i * rand(3, 10) + rand(0, 7),
        life: rand(13, 30),
        arcs: Math.floor(rand(3, 6)),
        flashApplied: false
      });
    }
  }

  resolveSunCollision(dt) {
    const p = this.state.player;
    if (!p) return;

    const dx = p.x - this.sunX;
    const dy = p.y - this.sunY;
    const dist = Math.hypot(dx, dy) || 1;
    const safeDist = this.sunRadius + p.radius + 6;

    if (dist < safeDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = safeDist - dist;
      p.x += nx * overlap;
      p.y += ny * overlap;

      // 태양은 움직이지 않는 거대한 물체. 기체만 반발한다.
      const approach = p.vx * nx + p.vy * ny;
      if (approach < 0) {
        p.vx -= approach * nx * 1.55;
        p.vy -= approach * ny * 1.55;
      }
      p.vx += nx * 0.45 * dt;
      p.vy += ny * 0.18 * dt;
      p.impactFlash = Math.max(p.impactFlash || 0, 10);
    }

    // 너무 가까운 영역에서는 열풍으로 약하게 밀린다.
    const heatRange = this.sunRadius + 260;
    if (dist < heatRange) {
      const nx = dx / dist;
      const ny = dy / dist;
      const power = clamp(1 - (dist - this.sunRadius) / 260, 0, 1);
      p.vx += nx * power * 0.020 * dt;
      p.vy += ny * power * 0.006 * dt;
    }
  }

  applySolarWind(dt) {
    const p = this.state.player;
    p.vx += 0.0028 * dt;
    p.vy += Math.sin(this.state.time * 0.010) * 0.0012 * dt;
  }

  renderFx() {
    this.drawStarsAndStreams();
    this.drawCoronaLoops();
    this.drawFlares();
    this.drawHeatVeil();
    this.drawFlash();
    this.applyHeatShake();
  }

  drawStarsAndStreams() {
    const g = new PIXI.Graphics();

    for (const s of this.stars) {
      const alpha = s.solarDust
        ? s.alpha
        : s.alpha * (0.75 + Math.sin(this.state.time * (s.twinkle || 0.01) + s.phase) * 0.25);
      g.circle(s.x, s.y, s.r).fill({ color: s.solarDust ? 0xffc078 : 0xdde8ff, alpha });
      if (s.solarDust && s.r > 1.4) {
        g.moveTo(s.x - 16, s.y).lineTo(s.x + 8, s.y)
          .stroke({ color: 0xff9d38, alpha: alpha * 0.28, width: 1 });
      }
    }

    for (const stream of this.streams) {
      const steps = 10;
      g.moveTo(stream.x, stream.y);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = stream.x + stream.len * t;
        const y = stream.y
          + Math.sin(t * Math.PI * 2 + stream.phase + this.state.time * 0.007) * stream.amp
          + Math.sin(t * Math.PI * 5 + stream.phase) * stream.amp * 0.22;
        g.lineTo(x, y);
      }
      g.stroke({ color: 0xff6b1a, alpha: stream.alpha, width: stream.width });
    }

    this.layers.mapFx.addChild(g);
  }

  drawCoronaLoops() {
    const g = new PIXI.Graphics();

    for (const loop of this.coronaLoops) {
      const pulse = 0.7 + Math.sin(this.state.time * 0.025 + loop.phase) * 0.3;
      const a1 = loop.angle - loop.span * 0.5;
      const a2 = loop.angle + loop.span * 0.5;
      const p1 = this.pointOnSun(a1, 1.002);
      const p2 = this.pointOnSun(a2, 1.002);
      const midA = (a1 + a2) * 0.5;
      const cp = this.pointOnSun(midA, 1 + loop.height / this.sunRadius);

      g.moveTo(p1.x, p1.y)
        .quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
        .stroke({ color: 0xff9c27, alpha: loop.alpha * pulse, width: loop.width * 3.2 });
      g.moveTo(p1.x, p1.y)
        .quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
        .stroke({ color: 0xfff1b2, alpha: loop.alpha * 1.55 * pulse, width: Math.max(1, loop.width * 0.65) });
    }

    this.layers.mapFx.addChild(g);
  }

  pointOnSun(angle, radiusScale = 1) {
    return {
      x: this.sunX + Math.cos(angle) * this.sunRadius * radiusScale,
      y: this.sunY + Math.sin(angle) * this.sunRadius * radiusScale
    };
  }

  drawFlares() {
    for (const flare of this.flareBursts) {
      if (flare.delay > 0 || flare.life <= 0) continue;

      const g = new PIXI.Graphics();
      const alpha = Math.min(1, flare.life / 10);
      const nx = Math.cos(flare.angle);
      const ny = Math.sin(flare.angle);
      const tx = -ny;
      const ty = nx;
      const ex = flare.sx + nx * flare.len;
      const ey = flare.sy + ny * flare.len;

      // 플레어는 단순 삼각형이 아니라 휘어진 활 모양으로 보이게 한다.
      for (let i = 0; i < flare.arcs; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const offset = rand(-flare.width, flare.width);
        const sx = flare.sx + tx * offset;
        const sy = flare.sy + ty * offset;
        const cx = flare.sx + nx * flare.len * rand(0.35, 0.62) + tx * side * flare.height * rand(0.35, 0.95);
        const cy = flare.sy + ny * flare.len * rand(0.35, 0.62) + ty * side * flare.height * rand(0.35, 0.95);
        const ex2 = ex + tx * rand(-flare.width * 1.5, flare.width * 1.5);
        const ey2 = ey + ty * rand(-flare.width * 1.5, flare.width * 1.5);

        g.moveTo(sx, sy)
          .quadraticCurveTo(cx, cy, ex2, ey2)
          .stroke({ color: 0xff6a12, alpha: 0.26 * alpha, width: rand(9, 22) });
        g.moveTo(sx, sy)
          .quadraticCurveTo(cx, cy, ex2, ey2)
          .stroke({ color: 0xffd98a, alpha: 0.56 * alpha, width: rand(2, 5) });
        g.moveTo(sx, sy)
          .quadraticCurveTo(cx, cy, ex2, ey2)
          .stroke({ color: 0xffffff, alpha: 0.62 * alpha, width: 1.1 });
      }

      g.circle(flare.sx, flare.sy, flare.width * 1.6).fill({ color: 0xfff0a8, alpha: 0.13 * alpha });
      this.layers.mapFx.addChild(g);
    }
  }

  drawHeatVeil() {
    const { width, height } = this.state;
    const veil = new PIXI.Graphics();

    // 오른쪽은 더 검게 남겨서 레퍼런스처럼 '태양 왼쪽 + 깊은 우주 오른쪽' 대비를 만든다.
    veil.rect(0, 0, width, height).fill({ color: 0x030203, alpha: 0.16 });
    veil.rect(0, 0, width * 0.34, height).fill({ color: 0xff5a12, alpha: 0.12 });
    veil.rect(width * 0.45, 0, width * 0.55, height).fill({ color: 0x000000, alpha: 0.30 });
    veil.rect(0, 0, width, height * 0.14).fill({ color: 0x000000, alpha: 0.12 });
    veil.rect(0, height * 0.84, width, height * 0.16).fill({ color: 0x000000, alpha: 0.16 });

    this.layers.mapFx.addChild(veil);
  }

  drawFlash() {
    if (this.flashPower <= 0.01) return;
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.state.width, this.state.height)
      .fill({ color: 0xffc06a, alpha: this.flashPower });
    this.layers.mapFx.addChild(flash);
  }

  applyHeatShake() {
    const shake = 0.55 + this.flashPower * 5.5;
    this.layers.world.x = Math.sin(this.state.time * 0.13) * shake;
    this.layers.world.y = Math.cos(this.state.time * 0.10) * shake * 0.35;
  }

  exit() {
    this.layers.world.x = 0;
    this.layers.world.y = 0;
    super.exit();
    this.stars.length = 0;
    this.streams.length = 0;
    this.coronaLoops.length = 0;
    this.flareBursts.length = 0;
  }

  getDebugInfo() {
    return {
      'Sun Physics': 'ON',
      'Corona Loops': this.coronaLoops.length,
      'Solar Flares': this.flareBursts.length,
      'Solar Streams': this.streams.length
    };
  }
}
