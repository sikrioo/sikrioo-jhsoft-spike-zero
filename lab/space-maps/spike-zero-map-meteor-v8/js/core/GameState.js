export function createGameState() {
  return {
    app: null,
    width: window.innerWidth,
    height: window.innerHeight,
    time: 0,
    mapType: '',
    player: null,
    bullets: [],
    bulletPool: [],
    fireCd: 0,
    fps: 0,
    fpsTimer: 0,
    frameCount: 0,
    mapObjects: []
  };
}
