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

  function drawStage4LightGlow(target, x, y, radius, color, alpha) {
    const glow = new PIXI.Container();
    glow.x = x;
    glow.y = y;
    glow.blendMode = PIXI.BLEND_MODES.ADD;
    for (let i = 0; i < 2; i++) {
      const t = i / 1;
      const g = new PIXI.Graphics();
      g.beginFill(color, alpha * Math.pow(1 - t, 1.5));
      g.drawCircle(0, 0, radius * (0.4 + t * 0.62));
      g.endFill();
      g.filters = [new PIXI.filters.BlurFilter(18 + i * 8)];
      glow.addChild(g);
    }
    target.addChild(glow);
    return glow;
  }

  function drawStage4HorizonPlanet(target, w, h) {
    const planet = new PIXI.Container();
    planet.x = w * 0.18;
    planet.y = h * 1.08;

    const body = new PIXI.Graphics();
    body.beginFill(0x04070d, 0.96);
    body.drawCircle(0, 0, h * 0.56);
    body.endFill();

    const rim = new PIXI.Graphics();
    rim.lineStyle(9, 0x6cbcff, 0.11);
    rim.arc(0, 0, h * 0.56, Math.PI * 1.05, Math.PI * 1.88);
    rim.lineStyle(3, 0xc7efff, 0.18);
    rim.arc(0, 0, h * 0.548, Math.PI * 1.08, Math.PI * 1.84);
    rim.filters = [new PIXI.filters.BlurFilter(4)];

    const haze = new PIXI.Graphics();
    haze.beginFill(0x1f4372, 0.045);
    haze.drawEllipse(0, -h * 0.5, h * 0.42, h * 0.09);
    haze.endFill();
    haze.filters = [new PIXI.filters.BlurFilter(14)];

    planet.addChild(body, haze, rim);
    target.addChild(planet);
    return planet;
  }

  function drawStage4MidPlanet(target, config) {
    const planet = new PIXI.Container();
    planet.x = config.x;
    planet.y = config.y;

    const body = new PIXI.Graphics();
    body.beginFill(config.color, 0.92);
    body.drawCircle(0, 0, config.radius);
    body.endFill();

    const shade = new PIXI.Graphics();
    shade.beginFill(0x02040a, 0.42);
    shade.drawEllipse(config.radius * 0.22, config.radius * 0.08, config.radius * 0.7, config.radius * 0.84);
    shade.endFill();

    const rim = new PIXI.Graphics();
    rim.lineStyle(4, config.rimColor, 0.12);
    rim.arc(0, 0, config.radius, config.rimStart, config.rimEnd);
    rim.lineStyle(1.5, 0xe6f7ff, 0.16);
    rim.arc(0, 0, config.radius - 2, config.rimStart + 0.05, config.rimEnd - 0.05);
    rim.filters = [new PIXI.filters.BlurFilter(2)];

    planet.alpha = config.alpha;
    planet.addChild(body, shade, rim);
    target.addChild(planet);
    planet.radius = config.radius;
    planet.parallaxSpeed = config.speed;
    planet.baseX = config.x;
    return planet;
  }

  function buildStage4Layer() {
    const S = GameState;
    if (!S.app || !S.bgLayer) return null;

    const w = Math.max(S.app.renderer.width, window.innerWidth || 0) + 640;
    const h = Math.max(S.app.renderer.height, window.innerHeight || 0) + 640;
    const layer = new PIXI.Container();
    layer.name = "stageAtmosphere";
    layer.x = -320;
    layer.y = -320;
    const staticLayer = new PIXI.Container();
    const dynamicLayer = new PIXI.Container();
    layer.addChild(staticLayer, dynamicLayer);

    const light = drawStage4LightGlow(dynamicLayer, w * 0.86, h * 0.14, Math.min(w, h) * 0.16, 0x8ec9ff, 0.1);
    light.alpha = 0.9;

    const horizon = drawStage4HorizonPlanet(staticLayer, w, h);
    const midPlanets = [
      drawStage4MidPlanet(dynamicLayer, {
        x: w * 0.63, y: h * 0.28, radius: 44, color: 0x0d1730, rimColor: 0x8cc4ff,
        rimStart: Math.PI * 1.08, rimEnd: Math.PI * 1.9, alpha: 0.78, speed: 0.08
      })
    ];
    staticLayer.cacheAsBitmap = true;

    layer.stage4 = {
      width: w,
      height: h,
      light,
      horizon,
      midPlanets,
      staticLayer
    };
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
    if (activeStage !== 3 && activeStage !== 4) return;

    seed = 3000 + activeStage * 97;
    root = activeStage === 4 ? buildStage4Layer() : buildStage3Layer();
    if (!root) return;
    GameState.bgLayer.addChild(root);
    if (activeStage === 3) scheduleNextFlash();
  }

  function resize(){
    if (activeStage === 3 || activeStage === 4) resetForStage(activeStage);
  }

  function beginFlash(){
    flashDuration = 34 + rand() * 28;
    flashT = flashDuration;
    flashPeak = 0.22 + rand() * 0.12;
  }

  function update(dt=1){
    if (!root) return;
    if (activeStage === 4) {
      const stage4 = root.stage4;
      if (!stage4) return;
      const t = performance.now();
      stage4.light.alpha = 0.72 + Math.sin(t / 2400) * 0.04;
      for (let i = 0; i < stage4.midPlanets.length; i++) {
        const planet = stage4.midPlanets[i];
        planet.x -= planet.parallaxSpeed * dt;
        if (planet.x < -(planet.radius || 40) - 90) planet.x = stage4.width + (planet.radius || 40) + 90;
      }
      return;
    }
    if (activeStage !== 3) return;

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
