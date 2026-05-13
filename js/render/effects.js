window.Effects = (() => {
  function getCache(){
    return GameState.textureCache || (GameState.textureCache = {});
  }

  function getGlowFilterClass(){
    if (window.PIXI && PIXI.filters && PIXI.filters.GlowFilter) return PIXI.filters.GlowFilter;
    if (window.pixiFilters && window.pixiFilters.GlowFilter) return window.pixiFilters.GlowFilter;
    return null;
  }

  function makeGlowFilter({color=0x32f6ff, distance=18, outerStrength=2.2, innerStrength=0.4, quality=0.25} = {}){
    const Glow = getGlowFilterClass();
    if (Glow) {
      const highQuality = GameState.effectQuality === "high";
      return new Glow({
        distance: highQuality ? distance : Math.max(4, distance * 0.72),
        outerStrength: highQuality ? outerStrength : outerStrength * 0.72,
        innerStrength: highQuality ? innerStrength : innerStrength * 0.8,
        color,
        quality: highQuality ? quality : Math.max(0.1, quality * 0.72)
      });
    }
    return null;
  }

  function asFilters(f){
    return f ? [f] : [];
  }

  function getRenderer(){
    return GameState.app && GameState.app.renderer;
  }

  function getEffectQuality(){
    return GameState.effectQuality === "high" ? "high" : "standard";
  }

  function isHighQuality(){
    return getEffectQuality() === "high";
  }

  function makeTexture(cacheKey, draw){
    const cache = getCache();
    if (cache[cacheKey]) return cache[cacheKey];
    const renderer = getRenderer();
    if (!renderer) return PIXI.Texture.WHITE;

    const displayObject = draw();
    const texture = renderer.generateTexture(displayObject);
    if (displayObject.destroy) displayObject.destroy({ children:true });
    cache[cacheKey] = texture;
    return texture;
  }

  function makeCenteredSprite(texture, x, y, tint=0xffffff, alpha=1, scale=1){
    const spr = new PIXI.Sprite(texture);
    spr.anchor.set(0.5);
    spr.x = x;
    spr.y = y;
    spr.tint = tint;
    spr.alpha = alpha;
    spr.scale.set(scale);
    return spr;
  }

  function getParticleTexture(){
    return makeTexture("particle.circle", ()=>{
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 1);
      g.drawCircle(16, 16, 16);
      g.endFill();
      return g;
    });
  }

  function getTrailTexture(){
    return makeTexture("particle.trail", ()=>{
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 1);
      g.drawCircle(8, 8, 8);
      g.endFill();
      return g;
    });
  }

  function getLinearTrailTexture(){
    return makeTexture("particle.trail.linear", ()=>{
      const c = new PIXI.Container();
      const aura = new PIXI.Graphics();
      const body = new PIXI.Graphics();
      const core = new PIXI.Graphics();
      aura.beginFill(0xffffff, 0.08);
      aura.drawRoundedRect(0, 8, 54, 16, 8);
      aura.endFill();
      body.beginFill(0xffffff, 0.22);
      body.drawRoundedRect(4, 10, 42, 12, 6);
      body.endFill();
      core.beginFill(0xffffff, 0.92);
      core.drawRoundedRect(20, 12, 18, 8, 4);
      core.endFill();
      c.addChild(aura, body, core);
      return c;
    });
  }

  function getPulseTexture(){
    return makeTexture("pulse.ring", ()=>{
      const g = new PIXI.Graphics();
      g.lineStyle(8, 0xffffff, 0.08);
      g.drawCircle(32, 32, 20);
      g.lineStyle(3, 0xffffff, 0.34);
      g.drawCircle(32, 32, 20);
      return g;
    });
  }

  function getBulletTexture(kind="default"){
    return makeTexture(`bullet.${kind}`, ()=>{
      const g = new PIXI.Graphics();
      const c = new PIXI.Container();
      const shell = new PIXI.Graphics();
      const core = new PIXI.Graphics();
      const accent = new PIXI.Graphics();

      if (kind === "shotgun") {
        shell.beginFill(0xffffff, 0.05);
        shell.drawPolygon([
          16, 5,
          23, 16,
          16, 27,
          9, 16
        ]);
        shell.endFill();
        shell.beginFill(0xffffff, 0.16);
        shell.drawPolygon([
          16, 7,
          20.5, 16,
          16, 25,
          11.5, 16
        ]);
        shell.endFill();
        shell.beginFill(0xffffff, 0.92);
        shell.drawRoundedRect(14.2, 8, 3.6, 16, 2);
        shell.endFill();

        core.beginFill(0xffffff, 0.98);
        core.drawRoundedRect(15.1, 6, 1.8, 7.5, 1);
        core.endFill();

        accent.lineStyle(1.8, 0xffffff, 0.52);
        accent.moveTo(16, 8);
        accent.lineTo(16, 22);
        accent.moveTo(12.6, 12.5);
        accent.lineTo(16, 8);
        accent.lineTo(19.4, 12.5);
      } else if (kind === "hardpoint") {
        shell.beginFill(0xffffff, 0.06);
        shell.drawRoundedRect(8, 1, 16, 26, 7);
        shell.endFill();
        shell.beginFill(0xffffff, 0.14);
        shell.drawRoundedRect(10, 3, 12, 22, 5);
        shell.endFill();
        shell.beginFill(0xffffff, 0.92);
        shell.drawRoundedRect(12, 5, 8, 18, 4);
        shell.endFill();

        core.beginFill(0xffffff, 0.95);
        core.drawRoundedRect(14, 3, 4, 8, 2);
        core.endFill();
      } else if (kind === "missile" || kind === "missileHeavy") {
        shell.beginFill(0xffffff, 0.08);
        shell.drawRoundedRect(8, -1, 16, 32, 8);
        shell.endFill();
        shell.beginFill(0xffffff, 0.18);
        shell.drawRoundedRect(11, 1, 10, 28, 5);
        shell.endFill();
        shell.beginFill(0xffffff, 0.94);
        shell.drawPolygon([ 16,0, 22,10, 20,24, 16,30, 12,24, 10,10 ]);
        shell.endFill();

        core.beginFill(0xffffff, 0.95);
        core.drawRoundedRect(14, 6, 4, 14, 2);
        core.endFill();

        accent.lineStyle(1.8, 0xffffff, 0.62);
        accent.moveTo(12, 20);
        accent.lineTo(8, 25);
        accent.moveTo(20, 20);
        accent.lineTo(24, 25);

        if (kind === "missileHeavy") {
          accent.lineStyle(2.5, 0xffffff, 0.38);
          accent.drawCircle(16, 15, 12);
        }
      } else {
        shell.beginFill(0xffffff, 0.06);
        shell.drawRoundedRect(8, -1, 16, 32, 8);
        shell.endFill();
        shell.beginFill(0xffffff, 0.14);
        shell.drawRoundedRect(10, 1, 12, 28, 6);
        shell.endFill();
        shell.beginFill(0xffffff, 0.96);
        shell.drawRoundedRect(12, 4, 8, 22, 4);
        shell.endFill();

        core.beginFill(0xffffff, 0.95);
        core.drawRoundedRect(14, 2, 4, 9, 2);
        core.endFill();

        accent.lineStyle(1.4, 0xffffff, 0.44);
        accent.moveTo(12, 14);
        accent.lineTo(20, 14);
      }

      c.addChild(shell, accent, core);
      return c;
    });
  }

  function makeParticleSprite(x, y, color=0x32f6ff, size=1, alpha=0.85){
    return makeCenteredSprite(getParticleTexture(), x, y, color, alpha, size);
  }

  function makeTrailSprite(x, y, color=0x32f6ff, size=1, alpha=0.2, options={}){
    const kind = options.kind || "default";
    const texture = kind === "linear" ? getLinearTrailTexture() : getTrailTexture();
    const spr = makeCenteredSprite(texture, x, y, color, alpha, size);
    if (kind === "linear") spr.anchor.set(0.14, 0.5);
    return spr;
  }

  function makeBulletSprite(x, y, ang, color=0x32f6ff, options={}){
    const kind = options.kind || "default";
    const spr = makeCenteredSprite(getBulletTexture(kind), x, y, color, options.alpha || 0.95, options.scale || 1);
    spr.rotation = ang + Math.PI / 2;
    if (options.useFilterGlow) {
      spr.filters = asFilters(
        makeGlowFilter({
          color,
          distance: options.glowDistance || (kind === "missileHeavy" ? 18 : 12),
          outerStrength: options.outerStrength || (kind === "missileHeavy" ? 2.4 : 1.6),
          innerStrength: options.innerStrength || 0.25,
          quality: 0.2
        })
      );
    }
    return spr;
  }

  function emitPulse(x, y, color=0xffffff, radius=120, life=20){
    const S = GameState;
    const ring = makeCenteredSprite(getPulseTexture(), x, y, color, 0.95, 1);
    S.fx.addChild(ring);
    S.particles.push({
      spr: ring,
      x, y,
      vx: 0,
      vy: 0,
      color,
      life,
      maxLife: life,
      pulseRadius: radius,
      pulse: true
    });
  }

  function emitLineTelegraph(x1, y1, x2, y2, color=0xffffff, life=18, width=8, options = {}){
    const S = GameState;
    const g = new PIXI.Graphics();
    S.fx.addChild(g);
    S.particles.push({
      spr: g,
      x: x1,
      y: y1,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      telegraphLine: { x1, y1, x2, y2, color, width, style: options.style || "default" }
    });
  }

  function emitGroundTelegraph(x, y, radius=40, color=0xffffff, life=20){
    const S = GameState;
    const g = new PIXI.Graphics();
    S.fx.addChild(g);
    S.particles.push({
      spr: g,
      x,
      y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      telegraphRing: { x, y, radius, color }
    });
  }

  function emitSlashArc(x, y, startAngle, endAngle, color=0xffffff, life=10, radius=58, width=10){
    const S = GameState;
    const g = new PIXI.Graphics();
    S.fx.addChild(g);
    S.particles.push({
      spr: g,
      x,
      y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      slashArc: { x, y, startAngle, endAngle, color, radius, width }
    });
  }

  function emitElectricArc(x1, y1, x2, y2, color=0x6cf5ff, coreColor=0xffffff, life=8, jitter=12){
    const S = GameState;
    const g = new PIXI.Graphics();
    S.fx.addChild(g);
    S.particles.push({
      spr: g,
      x: x1,
      y: y1,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      electricArc: { x1, y1, x2, y2, color, coreColor, jitter }
    });
  }

  function emitParticle(x, y, color=0x32f6ff, count=10, power=1){
    const S = GameState;
    for (let i=0;i<count;i++){
      const size = Helpers.rand(0.08, 0.18);
      const p = makeParticleSprite(x, y, color, size, 0.85);
      S.fx.addChild(p);

      const ang = Helpers.rand(0, Math.PI*2);
      const sp = Helpers.rand(1.5, 6.5) * power;
      S.particles.push({
        spr:p,
        x, y,
        vx:Math.cos(ang)*sp,
        vy:Math.sin(ang)*sp,
        life:Helpers.randi(18,36)
      });
    }
  }

  function emitPlayerExplosion(x, y){
    const S = GameState;
    emitPulse(x, y, 0xff9b59, 84, 18);
    emitPulse(x, y, 0x32f6ff, 52, 12);
    emitParticle(x, y, 0xff9b59, 18, 1.5);
    emitParticle(x, y, 0xff3edb, 14, 1.2);
    emitParticle(x, y, 0x32f6ff, 24, 1.8);

    const flash = makeParticleSprite(x, y, 0xffffff, 1.5, 0.9);
    S.fx.addChild(flash);
    S.particles.push({
      spr: flash,
      x, y,
      vx: 0,
      vy: 0,
      drag: 0.9,
      life: 10
    });

    for (let i=0; i<12; i++){
      const ang = (Math.PI * 2 * i) / 12 + Helpers.rand(-0.18, 0.18);
      const shard = makeTrailSprite(x, y, i % 2 === 0 ? 0xffc66d : 0x32f6ff, Helpers.rand(0.3, 0.48), 0.42);
      shard.rotation = ang;
      S.fx.addChild(shard);
      const speed = Helpers.rand(3.8, 7.2);
      S.particles.push({
        spr: shard,
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        drag: 0.9,
        life: Helpers.randi(14, 22)
      });
    }
  }

  return {
    makeGlowFilter,
    asFilters,
    getEffectQuality,
    isHighQuality,
    emitParticle,
    emitPulse,
    emitLineTelegraph,
    emitGroundTelegraph,
    emitSlashArc,
    emitElectricArc,
    emitPlayerExplosion,
    makeParticleSprite,
    makeTrailSprite,
    makeBulletSprite
  };
})();
