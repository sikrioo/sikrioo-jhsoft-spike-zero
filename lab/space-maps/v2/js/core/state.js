window.GameState = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  keys: new Set(),
  stageId: "asteroid",
  player: null,
  mapRuntime: null,
  engine: null,
  debug: { fps: 0, objectCount: 0, updates: 0 }
};
