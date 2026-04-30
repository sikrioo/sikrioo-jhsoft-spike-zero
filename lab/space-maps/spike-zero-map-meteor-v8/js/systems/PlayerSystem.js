import { clamp } from '../utils/math.js';

export class PlayerSystem {
  constructor(state, layers, input) {
    this.state = state;
    this.layers = layers;
    this.input = input;
  }

  create() {
    const body = new PIXI.Graphics();
    body.poly([0, -18, 13, 14, 0, 8, -13, 14])
      .fill(0xb9e8ff)
      .stroke({ color: 0xffffff, alpha: 0.45, width: 1.2 });

    const cockpit = new PIXI.Graphics();
    cockpit.poly([0, -8, 5, 8, 0, 5, -5, 8]).fill(0x143750);

    const ship = new PIXI.Container();
    ship.body = body;
    ship.cockpit = cockpit;
    ship.addChild(body, cockpit);
    ship.x = this.state.width * 0.5;
    ship.y = this.state.height * 0.72;
    ship.vx = 0;
    ship.vy = 0;
    ship.radius = 15;
    ship.faceAngle = -Math.PI / 2;
    ship.rotation = ship.faceAngle;
    ship.impactFlash = 0;

    this.layers.foreground.addChild(ship);
    this.state.player = ship;
  }

  update(dt) {
    const p = this.state.player;
    const left = this.input.has('ArrowLeft') || this.input.has('KeyA');
    const right = this.input.has('ArrowRight') || this.input.has('KeyD');
    const up = this.input.has('ArrowUp') || this.input.has('KeyW');
    const down = this.input.has('ArrowDown') || this.input.has('KeyS');

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);

    let accel = 0.34 * dt;
    if (this.state.mapType === 'magnetic') accel *= 0.82;

    const drag = Math.pow(0.91, dt);
    const maxSpeed = this.state.mapType === 'magnetic' ? 4.2 : 5.2;

    if (ax || ay) {
      const len = Math.hypot(ax, ay) || 1;
      p.vx += (ax / len) * accel;
      p.vy += (ay / len) * accel;
      p.faceAngle = Math.atan2(ay, ax) + Math.PI / 2;
    }

    p.vx *= drag;
    p.vy *= drag;

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = p.vx / speed * maxSpeed;
      p.vy = p.vy / speed * maxSpeed;
    }

    p.x = clamp(p.x + p.vx * dt, 28, this.state.width - 28);
    p.y = clamp(p.y + p.vy * dt, 28, this.state.height - 28);
    p.rotation = p.faceAngle;

    if (p.impactFlash > 0) {
      p.impactFlash -= dt;
      p.alpha = 0.82 + Math.random() * 0.18;
      p.body.tint = 0xff755f;
      p.cockpit.tint = 0xffb199;
    } else {
      p.alpha = 1;
      p.body.tint = 0xffffff;
      p.cockpit.tint = 0xffffff;
    }
  }
}
