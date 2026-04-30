import { rand } from '../utils/math.js';
import { clearContainer } from '../core/Layers.js';

export class BackgroundSystem {
  constructor(state, layers) {
    this.state = state;
    this.layers = layers;
  }

  recreate() {
    clearContainer(this.layers.background, true);
    this.state.width = window.innerWidth;
    this.state.height = window.innerHeight;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.state.width, this.state.height).fill(0x010308);
    this.layers.background.addChild(bg);

    for (let i = 0; i < 3; i++) {
      const cloud = new PIXI.Graphics();
      cloud.circle(rand(0, this.state.width), rand(0, this.state.height), rand(120, 260))
        .fill({ color: 0x5a6f8a, alpha: 0.018 + Math.random() * 0.018 });
      this.layers.background.addChild(cloud);
    }

    for (let i = 0; i < 110; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, rand(0.5, 1.8)).fill({ color: 0xddeeff, alpha: rand(0.35, 0.9) });
      star.x = Math.random() * this.state.width;
      star.y = Math.random() * this.state.height;
      star.speed = rand(0.04, 0.16);
      this.layers.background.addChild(star);
    }
  }
}
