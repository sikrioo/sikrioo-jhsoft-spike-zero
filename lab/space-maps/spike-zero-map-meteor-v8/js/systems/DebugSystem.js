export class DebugSystem {
  constructor(state, debugEl, mapManager) {
    this.state = state;
    this.debugEl = debugEl;
    this.mapManager = mapManager;
  }

  render(deltaMS) {
    this.state.frameCount++;
    this.state.fpsTimer += deltaMS;

    if (this.state.fpsTimer >= 500) {
      this.state.fps = Math.round(this.state.frameCount * 1000 / this.state.fpsTimer);
      this.state.frameCount = 0;
      this.state.fpsTimer = 0;
    }

    const mapInfo = this.mapManager.getDebugInfo();
    const mapRows = Object.entries(mapInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join('<br>');

    this.debugEl.innerHTML = `
      FPS: ${this.state.fps}<br>
      Map: ${this.state.mapType}<br>
      Bullets: ${this.state.bullets.length}<br>
      ${mapRows ? `${mapRows}<br>` : ''}
      Renderer: PixiJS/WebGL
    `;
  }
}
