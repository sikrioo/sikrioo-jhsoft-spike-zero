import { clearContainer } from '../core/Layers.js';
import { MAP_REGISTRY } from '../maps/MapRegistry.js';

export class MapManager {
  constructor(context, weaponSystem) {
    this.context = context;
    this.state = context.state;
    this.layers = context.layers;
    this.weaponSystem = weaponSystem;
    this.currentMap = null;
  }

  setMap(type, force = false) {
    if (!force && this.state.mapType === type) return;

    this.currentMap?.exit();
    this.currentMap = null;
    this.weaponSystem.clearBullets();

    const MapClass = MAP_REGISTRY[type];
    if (!MapClass) throw new Error(`Unknown map type: ${type}`);

    this.state.mapType = type;
    this.currentMap = new MapClass(this.context);
    this.currentMap.enter();
    this.syncMapButtons(type);
  }

  update(dt) {
    this.currentMap?.update(dt);
  }

  renderFx() {
    // Optimized maps own their reusable mapFx Graphics.
    // Do not clear mapFx here, otherwise enter()에서 addChild한 재사용 Graphics가
    // 매 프레임 destroy되어 렌더링 생명주기가 깨진다.
    if (this.currentMap?.reuseFx) {
      this.currentMap.renderFx();
      return;
    }

    // Temporary compatibility path for legacy maps that still draw by creating
    // short-lived Graphics in renderFx(). New maps should set reuseFx = true.
    clearContainer(this.layers.mapFx, true);
    this.currentMap?.renderFx();
  }

  syncMapButtons(type) {
    document.querySelectorAll('[data-map]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.map === type);
    });
  }

  getDebugInfo() {
    return this.currentMap?.getDebugInfo?.() ?? {};
  }
}
