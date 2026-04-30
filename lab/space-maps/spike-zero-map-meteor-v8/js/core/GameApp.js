import { createGameState } from './GameState.js';
import { createLayers } from './Layers.js';
import { InputManager } from './InputManager.js';
import { BackgroundSystem } from '../systems/BackgroundSystem.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { MapManager } from '../systems/MapManager.js';
import { DebugSystem } from '../systems/DebugSystem.js';

export class GameApp {
  constructor({ root, debugEl }) {
    this.root = root;
    this.debugEl = debugEl;
    this.state = createGameState();
    this.input = new InputManager();
  }

  async boot() {
    const app = new PIXI.Application();
    await app.init({
      resizeTo: window,
      background: '#010308',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });

    this.state.app = app;
    this.root.prepend(app.canvas);

    this.layers = createLayers(app);
    this.context = {
      state: this.state,
      layers: this.layers,
      input: this.input
    };

    this.backgroundSystem = new BackgroundSystem(this.state, this.layers);
    this.playerSystem = new PlayerSystem(this.state, this.layers, this.input);
    this.weaponSystem = new WeaponSystem(this.state, this.layers, this.input);
    this.mapManager = new MapManager(this.context, this.weaponSystem);
    this.debugSystem = new DebugSystem(this.state, this.debugEl, this.mapManager);

    this.backgroundSystem.recreate();
    this.playerSystem.create();
    this.bindEvents();
    this.mapManager.setMap('asteroid');

    app.ticker.add((ticker) => this.tick(Math.min(ticker.deltaMS / 16.6667, 2), ticker.deltaMS));
  }

  bindEvents() {
    this.input.bind({ onMapChange: (type) => this.mapManager.setMap(type) });

    document.querySelectorAll('[data-map]').forEach((button) => {
      button.addEventListener('click', () => this.mapManager.setMap(button.dataset.map));
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.state.width = window.innerWidth;
    this.state.height = window.innerHeight;
    this.backgroundSystem.recreate();
    this.mapManager.setMap(this.state.mapType || 'asteroid', true);
  }

  tick(dt, deltaMS) {
    this.state.time += dt;
    this.playerSystem.update(dt);
    this.weaponSystem.update(dt);
    this.mapManager.update(dt);
    this.mapManager.renderFx();
    this.debugSystem.render(deltaMS);
  }
}
