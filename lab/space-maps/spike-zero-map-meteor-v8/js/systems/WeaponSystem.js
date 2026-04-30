export class WeaponSystem {
  constructor(state, layers, input) {
    this.state = state;
    this.layers = layers;
    this.input = input;
  }

  update(dt) {
    this.updateGun(dt);
    this.updateBullets(dt);
  }

  updateGun(dt) {
    this.state.fireCd -= dt;
    if (!this.input.has('Space') || this.state.fireCd > 0) return;

    this.state.fireCd = 5;

    const p = this.state.player;
    const angle = p.faceAngle - Math.PI / 2;
    const bullet = this.acquireBullet();

    bullet.x = p.x + Math.cos(angle) * 18;
    bullet.y = p.y + Math.sin(angle) * 18;
    bullet.vx = Math.cos(angle) * 12;
    bullet.vy = Math.sin(angle) * 12;
    bullet.life = 55;
    bullet.dead = false;
    bullet.visible = true;

    this.layers.bullets.addChild(bullet);
    this.state.bullets.push(bullet);
  }

  acquireBullet() {
    let bullet = this.state.bulletPool.pop();
    if (!bullet) {
      bullet = new PIXI.Graphics();
      bullet.circle(0, 0, 3).fill(0x82e6ff);
      bullet.r = 3;
    }
    return bullet;
  }

  releaseBullet(bullet) {
    bullet.visible = false;
    bullet.dead = true;
    if (bullet.parent) bullet.parent.removeChild(bullet);
    this.state.bulletPool.push(bullet);
  }

  updateBullets(dt) {
    for (const bullet of this.state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (
        bullet.life <= 0 ||
        bullet.x < -20 || bullet.x > this.state.width + 20 ||
        bullet.y < -20 || bullet.y > this.state.height + 20
      ) {
        bullet.dead = true;
      }
    }

    let write = 0;
    for (let i = 0; i < this.state.bullets.length; i++) {
      const bullet = this.state.bullets[i];
      if (bullet.dead) this.releaseBullet(bullet);
      else this.state.bullets[write++] = bullet;
    }
    this.state.bullets.length = write;
  }

  clearBullets() {
    for (const bullet of this.state.bullets) {
      this.releaseBullet(bullet);
    }
    this.state.bullets.length = 0;
  }
}
