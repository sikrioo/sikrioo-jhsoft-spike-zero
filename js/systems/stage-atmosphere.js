window.StageAtmosphere = (() => {
  let root = null;
  let activeStage = 0;
  let nextFlashT = 0;
  let flashT = 0;
  let flashDuration = 0;
  let flashPeak = 0;
  let seed = 1;

  function rand(){
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function scheduleNextFlash(){
    nextFlashT = 300 + rand() * 300;
  }

  function drawCloudMass(target, x, y, scale, rotation=0){
    const cloud = new PIXI.Container();
    cloud.x = x;
    cloud.y = y;
    cloud.rotation = rotation;

    const lobes = [
      { x: -180, y: -18, rx: 178, ry: 64, color: 0x080914, alpha: 0.48 },
      { x: -72, y: -38, rx: 160, ry: 72, color: 0x0d0b20, alpha: 0.52 },
      { x: 72, y: -22, rx: 182, ry: 68, color: 0x090a19, alpha: 0.50 },
      { x: 194, y: 10, rx: 132, ry: 54, color: 0x0b1023, alpha: 0.42 },
      { x: -20, y: 42, rx: 240, ry: 58, color: 0x05060d, alpha: 0.38 }
    ];

    for (const lobe of lobes) {
      const g = new PIXI.Graphics();
      g.beginFill(lobe.color, lobe.alpha);
      g.drawEllipse(lobe.x * scale, lobe.y * scale, lobe.rx * scale, lobe.ry * scale);
      g.endFill();
      cloud.addChild(g);
    }

    target.addChild(cloud);
    return cloud;
  }

  function drawSoftEllipse(target, x, y, rx, ry, color, alpha, rotation=0){
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const layerAlpha = alpha * Math.pow(1 - t, 1.55);
      const layerRx = rx * (1 + t * 0.72);
      const layerRy = ry * (1 + t * 0.72);
      const ellipse = new PIXI.Graphics();
      ellipse.beginFill(color, layerAlpha);
      ellipse.drawEllipse(0, 0, layerRx, layerRy);
      ellipse.endFill();
      ellipse.x = x;
      ellipse.y = y;
      ellipse.rotation = rotation;
      target.addChild(ellipse);
    }
  }

  function buildStage3Layer(){
    const S = GameState;
    if (!S.app || !S.bgLayer) return null;

    const w = Math.max(S.app.renderer.width, window.innerWidth || 0) + 640;
    const h = Math.max(S.app.renderer.height, window.innerHeight || 0) + 640;
    const layer = new PIXI.Container();
    layer.name = "stageAtmosphere";
    layer.x = -320;
    layer.y = -320;
    layer.alpha = 1;
    layer.visible = true;

    const cloudA = drawCloudMass(layer, w * 0.72, h * 0.26, Math.max(0.78, Math.min(w, h) / 880), -0.18);
    const cloudB = drawCloudMass(layer, w * 0.54, h * 0.56, Math.max(0.58, Math.min(w, h) / 1160), -0.52);
    cloudB.alpha = 0.62;

    const flashLayer = new PIXI.Container();
    flashLayer.alpha = 0;
    flashLayer.visible = false;
    flashLayer.blendMode = PIXI.BLEND_MODES.ADD;

    const storm = new PIXI.Container();
    drawSoftEllipse(storm, w * 0.72, h * 0.26, w * 0.16, h * 0.052, 0xa7a2ff, 0.18, -0.2);
    drawSoftEllipse(storm, w * 0.68, h * 0.24, w * 0.09, h * 0.028, 0xf0f2ff, 0.12, -0.18);

    const underglow = new PIXI.Container();
    drawSoftEllipse(underglow, w * 0.54, h * 0.56, w * 0.12, h * 0.036, 0x6f8dff, 0.11, -0.52);

    const vein = new PIXI.Graphics();
    vein.lineStyle(3, 0xf2f3ff, 0.32);
    vein.moveTo(w * 0.58, h * 0.23);
    vein.lineTo(w * 0.65, h * 0.25);
    vein.lineTo(w * 0.62, h * 0.285);
    vein.lineTo(w * 0.72, h * 0.32);
    vein.lineStyle(1.2, 0x9cb6ff, 0.24);
    vein.moveTo(w * 0.67, h * 0.25);
    vein.lineTo(w * 0.72, h * 0.22);
    vein.moveTo(w * 0.69, h * 0.305);
    vein.lineTo(w * 0.76, h * 0.29);
    vein.moveTo(w * 0.78, h * 0.18);
    vein.lineTo(w * 0.84, h * 0.24);
    vein.lineTo(w * 0.8, h * 0.28);
    vein.lineTo(w * 0.88, h * 0.34);

    flashLayer.addChild(storm, underglow, vein);
    layer.addChild(flashLayer);
    layer.flashLayer = flashLayer;
    return layer;
  }

  function clear(){
    if (root && root.parent) root.parent.removeChild(root);
    if (root && root.destroy) root.destroy({ children:true });
    root = null;
    activeStage = 0;
    nextFlashT = 0;
    flashT = 0;
  }

  function resetForStage(stage=1){
    clear();
    activeStage = Math.max(1, stage || 1);
    if (activeStage !== 3) return;

    seed = 3000 + activeStage * 97;
    root = buildStage3Layer();
    if (!root) return;
    GameState.bgLayer.addChild(root);
    scheduleNextFlash();
  }

  function resize(){
    if (activeStage === 3) resetForStage(activeStage);
  }

  function beginFlash(){
    flashDuration = 34 + rand() * 28;
    flashT = flashDuration;
    flashPeak = 0.22 + rand() * 0.12;
  }

  function update(dt=1){
    if (!root || activeStage !== 3) return;

    if (flashT <= 0) {
      nextFlashT -= dt;
      if (nextFlashT <= 0) beginFlash();
    }

    if (flashT > 0) {
      flashT = Math.max(0, flashT - dt);
      const p = 1 - flashT / Math.max(1, flashDuration);
      const envelope = p < 0.16 ? p / 0.16 : Math.pow(1 - p, 2.35);
      const distantFlicker = 0.74 + Math.sin(p * Math.PI * 11) * 0.16;
      const alpha = flashPeak * envelope * distantFlicker;
      root.flashLayer.alpha = alpha;
      root.flashLayer.visible = alpha > 0.006;
      if (flashT <= 0) {
        root.flashLayer.alpha = 0;
        root.flashLayer.visible = false;
        scheduleNextFlash();
      }
    }
  }

  return {
    resetForStage,
    resize,
    clear,
    update
  };
})();
