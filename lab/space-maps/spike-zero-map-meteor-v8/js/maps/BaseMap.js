import { clearContainer } from '../core/Layers.js';

export class BaseMap {
  constructor({ state, layers, input }) {
    this.state = state;
    this.layers = layers;
    this.input = input;
    this.objects = [];
    this.fxGraphics = null;
  }

  enter() {}
  update(_dt) {}

  ensureFxGraphics() {
    if (!this.fxGraphics || this.fxGraphics.destroyed) {
      this.fxGraphics = new PIXI.Graphics();
      this.layers.mapFx.addChild(this.fxGraphics);
    }
    return this.fxGraphics;
  }

  renderFx() {
    this.ensureFxGraphics().clear();
  }

  resetLayerTransforms() {
    this.layers.world.x = 0;
    this.layers.world.y = 0;
    this.layers.world.scale.set(1);
    this.layers.world.rotation = 0;
    this.layers.mapFx.x = 0;
    this.layers.mapFx.y = 0;
    this.layers.mapFx.scale.set(1);
    this.layers.mapFx.rotation = 0;
  }

  exit() {
    this.resetLayerTransforms();
    clearContainer(this.layers.world, true);
    clearContainer(this.layers.mapFx, true);
    this.objects.length = 0;
    this.fxGraphics = null;
  }
}
