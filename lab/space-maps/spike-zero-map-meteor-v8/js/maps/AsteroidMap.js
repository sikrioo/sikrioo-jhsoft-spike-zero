import { BaseMap } from './BaseMap.js';
import { rand } from '../utils/math.js';

export class AsteroidMap extends BaseMap {
  constructor(context) {
    super(context);
    this.asteroids = [];
  }

  enter() {
    this.asteroids.length = 0;
    const radii = [82,64,44,38,34,30,26,24,22,20,18,18,16,16,14,14,12,12];

    for (const r of radii) {
      const asteroid = this.createAsteroid(r);
      asteroid.x = rand(-this.state.width * 0.15, this.state.width * 1.05);
      asteroid.y = rand(50, this.state.height - 50);
      this.asteroids.push(asteroid);
      this.layers.world.addChild(asteroid);
    }
  }

  createAsteroid(r) {
    const g = new PIXI.Graphics();
    const points = [];

    for (let i = 0; i < 11; i++) {
      const angle = Math.PI * 2 * i / 11;
      const rr = r * rand(0.72, 1.15);
      points.push(Math.cos(angle) * rr, Math.sin(angle) * rr);
    }

    const base = Math.floor(rand(75, 120));
    const color = (base << 16) + ((base - 8) << 8) + Math.max(10, base - 18);

    g.poly(points).fill(color).stroke({ color: 0xf5eedc, alpha: 0.25, width: 2 });

    for (let i = 0; i < (r > 50 ? 5 : 2); i++) {
      g.circle(rand(-r * .45, r * .45), rand(-r * .45, r * .45), rand(r * .05, r * .14))
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

  update(dt) {
    this.updateAsteroids(dt);
    this.resolveBulletAsteroidHits();
    this.resolvePlayerAsteroids();
  }

  updateAsteroids(dt) {
    for (const asteroid of this.asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.spin * dt;
      asteroid.vx += (0.65 - asteroid.vx) * 0.0015 * dt;

      if (asteroid.x > this.state.width + asteroid.r * 3 || asteroid.y > this.state.height + asteroid.r * 3 || asteroid.y < -asteroid.r * 3) {
        asteroid.x = -asteroid.r - rand(30, 180);
        asteroid.y = rand(50, this.state.height - 50);
        asteroid.vx = rand(0.45, 1.25) * (asteroid.r > 55 ? 0.55 : 1);
        asteroid.vy = rand(-0.10, 0.24);
      }
    }
  }

  resolveBulletAsteroidHits() {
    for (const bullet of this.state.bullets) {
      if (bullet.dead) continue;

      for (const asteroid of this.asteroids) {
        const d = Math.hypot(asteroid.x - bullet.x, asteroid.y - bullet.y) || 1;
        if (d >= asteroid.r + bullet.r) continue;

        bullet.dead = true;
        const force = 1.2 / Math.max(1, asteroid.mass) * 9;
        asteroid.vx += bullet.vx * force * 0.06;
        asteroid.vy += bullet.vy * force * 0.06;
        asteroid.spin += (Math.random() - 0.5) * 0.012;
        break;
      }
    }
  }

  resolvePlayerAsteroids() {
    const player = this.state.player;

    for (const asteroid of this.asteroids) {
      const dx = player.x - asteroid.x;
      const dy = player.y - asteroid.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = player.radius + asteroid.r;
      if (d >= min) continue;

      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;

      player.x += nx * overlap;
      player.y += ny * overlap;
      player.vx += nx * Math.min(1.4, 0.35 + asteroid.r / 95);
      player.vy += ny * Math.min(1.4, 0.35 + asteroid.r / 95);
      asteroid.vx -= nx * asteroid.invMass * 3.5;
      asteroid.vy -= ny * asteroid.invMass * 3.5;
      player.impactFlash = 8;
    }
  }

  getDebugInfo() {
    return { Asteroids: this.asteroids.length };
  }
}
