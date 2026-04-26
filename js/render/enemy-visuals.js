window.EnemyVisuals = (() => {
  function getCache(){
    return GameState.textureCache || (GameState.textureCache = {});
  }

  function getRenderer(){
    return GameState.app && GameState.app.renderer;
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

  function getBasicEnemyShipStyle(tierKey){
    const styles = {
      normal: {
        aura: 0.08, nose: 1.05, tail: 0.9, wing: 0.82, wingBack: 0.45,
        core: 0.16, bodyAlpha: 0.18, hull: 0x08101d, trim: 0x7df9ff
      },
      gunner: {
        aura: 0.12, nose: 1.08, tail: 1.08, wing: 0.98, wingBack: 0.54,
        core: 0.18, bodyAlpha: 0.24, hull: 0x171126, trim: 0xfff0bf,
        twinMuzzle: true
      },
      bomber: {
        aura: 0.13, nose: 0.82, tail: 1.16, wing: 1.1, wingBack: 0.3,
        core: 0.2, bodyAlpha: 0.26, hull: 0x1d0e14, trim: 0xffc187,
        bellyCore: true
      },
      elite: {
        aura: 0.12, nose: 1.12, tail: 0.86, wing: 0.74, wingBack: 0.6,
        core: 0.2, bodyAlpha: 0.24, hull: 0x081225, trim: 0xbfe6ff,
        splitWing: true
      },
      flanker: {
        aura: 0.11, nose: 1.0, tail: 0.95, wing: 0.72, wingBack: 0.72,
        core: 0.18, bodyAlpha: 0.24, hull: 0x071b1a, trim: 0xc9fff4,
        sweptWing: true
      },
      tank: {
        aura: 0.14, nose: 0.78, tail: 1.1, wing: 0.78, wingBack: 0.36,
        core: 0.22, bodyAlpha: 0.28, hull: 0x141126, trim: 0xe3d7ff,
        heavy: true
      },
      rusher: {
        aura: 0.12, nose: 1.32, tail: 0.8, wing: 0.62, wingBack: 0.72,
        core: 0.16, bodyAlpha: 0.24, hull: 0x1d0b12, trim: 0xffb0b0,
        spike: true
      },
      midboss: {
        aura: 0.16, nose: 0.92, tail: 1.24, wing: 1.18, wingBack: 0.42,
        core: 0.24, bodyAlpha: 0.32, hull: 0x201018, trim: 0xffd08a,
        heavy: true, twinMuzzle: true, bellyCore: true
      },
      boss: {
        aura: 0.18, nose: 0.86, tail: 1.28, wing: 1.08, wingBack: 0.48,
        core: 0.26, bodyAlpha: 0.34, hull: 0x1d0c1c, trim: 0xffb3c8,
        heavy: true, splitWing: true, twinMuzzle: true, bellyCore: true
      }
    };
    return styles[tierKey] || null;
  }

  function drawBasicEnemyShip(c, tierKey, tier, style){
    const r = tier.radius;
    const aura = new PIXI.Graphics();
    const shadow = new PIXI.Graphics();
    const wing = new PIXI.Graphics();
    const body = new PIXI.Graphics();
    const plating = new PIXI.Graphics();
    const core = new PIXI.Graphics();
    const detail = new PIXI.Graphics();
    const nose = r * style.nose;
    const tail = r * style.tail;
    const wingSpan = r * style.wing;
    const wingBack = r * style.wingBack;

    aura.beginFill(tier.fillColor, style.aura);
    aura.drawPolygon([
      nose + r * 0.6, 0,
      -tail - r * 0.55, -wingSpan - r * 0.14,
      -tail * 0.5, -r * 0.16,
      -tail - r * 0.36, 0,
      -tail * 0.5, r * 0.16,
      -tail - r * 0.55, wingSpan + r * 0.14
    ]);
    aura.endFill();

    shadow.beginFill(0x030610, 0.84);
    shadow.drawPolygon([
      nose + r * 0.24, 0,
      r * 0.05, -r * 0.34,
      -tail * 0.86, -wingSpan * 0.78,
      -tail * 0.48, -r * 0.18,
      -tail - r * 0.18, 0,
      -tail * 0.48, r * 0.18,
      -tail * 0.86, wingSpan * 0.78,
      r * 0.05, r * 0.34
    ]);
    shadow.endFill();

    wing.beginFill(style.hull, 0.96);
    wing.lineStyle(1.4, tier.lineColor, 0.62);
    if (style.heavy) {
      wing.drawPolygon([ -r * 0.1, -r * 0.38, -tail * 0.92, -wingSpan * 0.76, -tail * 0.6, -r * 0.22 ]);
      wing.drawPolygon([ -r * 0.1, r * 0.38, -tail * 0.92, wingSpan * 0.76, -tail * 0.6, r * 0.22 ]);
    } else if (style.sweptWing) {
      wing.drawPolygon([ r * 0.05, -r * 0.2, -tail * 0.94, -wingSpan * 0.86, -tail * 0.18, -r * 0.06 ]);
      wing.drawPolygon([ r * 0.05, r * 0.2, -tail * 0.94, wingSpan * 0.86, -tail * 0.18, r * 0.06 ]);
    } else {
      wing.drawPolygon([ r * 0.02, -r * 0.24, -wingBack, -wingSpan, -tail * 0.34, -r * 0.18 ]);
      wing.drawPolygon([ r * 0.02, r * 0.24, -wingBack, wingSpan, -tail * 0.34, r * 0.18 ]);
    }
    wing.endFill();

    body.beginFill(style.hull, 0.98);
    body.lineStyle(tierKey === "tank" ? 2.6 : 2, tier.lineColor, 0.92);
    body.drawPolygon([
      nose, 0,
      r * 0.16, -r * 0.36,
      -tail * 0.62, -r * 0.28,
      -tail, 0,
      -tail * 0.62, r * 0.28,
      r * 0.16, r * 0.36
    ]);
    body.endFill();

    plating.beginFill(tier.fillColor, style.bodyAlpha);
    plating.drawPolygon([
      r * 0.5, 0,
      -r * 0.16, -r * 0.16,
      -r * 0.04, 0,
      -r * 0.16, r * 0.16
    ]);
    plating.endFill();

    if (style.spike) {
      detail.beginFill(style.trim, 0.3);
      detail.drawPolygon([ nose + r * 0.22, 0, r * 0.48, -r * 0.16, r * 0.48, r * 0.16 ]);
      detail.endFill();
    }

    if (style.twinMuzzle) {
      detail.lineStyle(2, style.trim, 0.8);
      detail.moveTo(r * 0.34, -r * 0.12);
      detail.lineTo(nose + r * 0.22, -r * 0.12);
      detail.moveTo(r * 0.34, r * 0.12);
      detail.lineTo(nose + r * 0.22, r * 0.12);
    } else {
      detail.lineStyle(1.5, style.trim, 0.56);
      detail.moveTo(r * 0.12, 0);
      detail.lineTo(nose + r * 0.08, 0);
    }

    if (style.splitWing) {
      detail.lineStyle(1.4, style.trim, 0.42);
      detail.moveTo(-r * 0.08, -r * 0.24);
      detail.lineTo(-wingBack, -wingSpan * 0.72);
      detail.moveTo(-r * 0.08, r * 0.24);
      detail.lineTo(-wingBack, wingSpan * 0.72);
    }

    core.beginFill(tier.fillColor, tierKey === "normal" ? 0.74 : 0.82);
    core.drawCircle(style.bellyCore ? -r * 0.12 : -r * 0.04, 0, Math.max(3, r * style.core));
    core.endFill();
    core.beginFill(0xffffff, 0.46);
    core.drawCircle(style.bellyCore ? -r * 0.12 : -r * 0.04, 0, Math.max(1.4, r * style.core * 0.42));
    core.endFill();

    c.addChild(aura, shadow, wing, body, plating, detail, core);
  }

  function getEnemyTexture(tierKey, tier){
    return makeTexture(`enemy.${tierKey}`, ()=>{
      const c = new PIXI.Container();
      const aura = new PIXI.Graphics();
      const ring = new PIXI.Graphics();
      const inner = new PIXI.Graphics();
      const r = tier.radius;

      const basicShipStyle = getBasicEnemyShipStyle(tierKey);
      if (basicShipStyle) {
        drawBasicEnemyShip(c, tierKey, tier, basicShipStyle);
        return c;
      }

      if (tierKey === "lancer" || tierKey === "spin_lancer") {
        aura.beginFill(tier.fillColor, 0.10);
        aura.drawPolygon([
          r + 12, 0,
          -r - 6, -r * 0.82,
          -r * 0.55, 0,
          -r - 6, r * 0.82
        ]);
        aura.endFill();

        ring.beginFill(0x0b0b18, 1);
        ring.lineStyle(2.5, tier.lineColor, 0.96);
        ring.drawPolygon([
          r + 5, 0,
          -r, -r * 0.72,
          -r * 0.48, 0,
          -r, r * 0.72
        ]);
        ring.endFill();

        inner.beginFill(tier.fillColor, 0.24);
        inner.drawPolygon([
          r * 0.45, 0,
          -r * 0.5, -r * 0.34,
          -r * 0.26, 0,
          -r * 0.5, r * 0.34
        ]);
        inner.endFill();

        const core = new PIXI.Graphics();
        core.beginFill(0xffffff, 0.32);
        core.drawCircle(-r * 0.2, 0, r * 0.16);
        core.endFill();

        c.addChild(aura, ring, inner, core);
        return c;
      }

      aura.beginFill(tier.fillColor, 0.10);
      aura.drawPolygon([
        r + 12, 0,
        r * 0.14, -r * 0.76,
        -r - 8, -r * 0.58,
        -r * 0.58, 0,
        -r - 8, r * 0.58,
        r * 0.14, r * 0.76
      ]);
      aura.endFill();

      ring.beginFill(0x0b0b18, 1);
      ring.lineStyle(2.5, tier.lineColor, 0.95);
      ring.drawPolygon([
        r + 4, 0,
        r * 0.12, -r * 0.56,
        -r * 0.88, -r * 0.46,
        -r * 0.48, 0,
        -r * 0.88, r * 0.46,
        r * 0.12, r * 0.56
      ]);
      ring.endFill();

      inner.beginFill(tier.fillColor, 0.22);
      inner.drawPolygon([
        r * 0.45, 0,
        -r * 0.12, -r * 0.24,
        -r * 0.32, 0,
        -r * 0.12, r * 0.24
      ]);
      inner.endFill();

      c.addChild(aura, ring, inner);
      return c;
    });
  }

  function makeEnemySprite(tierKey, tier, x, y){
    return makeCenteredSprite(getEnemyTexture(tierKey, tier), x, y, 0xffffff, 1, 1);
  }

  function makeTurretVisual(enemy, tierKey, tier) {
    const root = new PIXI.Container();

    const aura = new PIXI.Graphics();
    aura.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.12 : 0.1);
    aura.drawRoundedRect(-tier.radius - 8, -tier.radius - 8, (tier.radius + 8) * 2, (tier.radius + 8) * 2, 12);
    aura.endFill();
    aura.filters = [new PIXI.filters.BlurFilter(tierKey === "turret_laser" ? 10 : 8)];

    const frame = new PIXI.Graphics();
    frame.beginFill(0x0a0d18, 0.98);
    frame.lineStyle(2.5, tier.lineColor, 0.95);
    frame.drawRoundedRect(-tier.radius, -tier.radius, tier.radius * 2, tier.radius * 2, 9);
    frame.endFill();

    const plating = new PIXI.Graphics();
    plating.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.12 : 0.16);
    plating.drawRoundedRect(-tier.radius + 4, -tier.radius + 4, tier.radius * 2 - 8, tier.radius * 2 - 8, 7);
    plating.endFill();

    const barrel = new PIXI.Graphics();
    barrel.beginFill(tier.lineColor, 0.95);
    if (tierKey === "turret_laser") {
      barrel.drawRoundedRect(4, -5, tier.radius + 12, 10, 4);
      barrel.beginFill(0xffffff, 0.52);
      barrel.drawRoundedRect(10, -2, tier.radius + 2, 4, 2);
      barrel.endFill();
    } else if (tierKey === "turret_sniper") {
      barrel.drawRoundedRect(2, -4, tier.radius + 18, 8, 4);
      barrel.drawRoundedRect(10, -2, tier.radius + 12, 4, 2);
      barrel.beginFill(0xffffff, 0.44);
      barrel.drawRoundedRect(tier.radius + 10, -1, 10, 2, 1);
      barrel.endFill();
    } else {
      barrel.drawRoundedRect(4, -4, tier.radius + 8, 8, 4);
      barrel.drawRoundedRect(8, -10, tier.radius + 2, 5, 2);
      barrel.drawRoundedRect(8, 5, tier.radius + 2, 5, 2);
    }
    barrel.endFill();

    const coreRing = new PIXI.Graphics();
    coreRing.lineStyle(2, 0xffffff, 0.25);
    coreRing.drawCircle(0, 0, tierKey === "turret_laser" ? tier.radius * 0.48 : tierKey === "turret_sniper" ? tier.radius * 0.36 : tier.radius * 0.42);

    const core = new PIXI.Graphics();
    core.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.72 : tierKey === "turret_sniper" ? 0.7 : 0.66);
    core.drawCircle(0, 0, tierKey === "turret_laser" ? tier.radius * 0.34 : tierKey === "turret_sniper" ? tier.radius * 0.22 : tier.radius * 0.28);
    core.endFill();

    root.addChild(aura, frame, plating, barrel, coreRing, core);
    enemy.bodySpr.addChild(root);
    return { root, aura, frame, plating, barrel, coreRing, core };
  }

  function updateTurretVisuals(enemy, target) {
    const visuals = enemy.visuals;
    const state = enemy.enemyState;
    if (!visuals || !state) return;

    const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    visuals.root.rotation = aim;

    const fixedMul = state.mode === "fixed" ? 1 : 0;
    const chargeMul = state.mode === "charge" ? 1 : 0;
    const firingMul = state.mode === "firing" ? 1 : 0;
    const pulse = 1 + Math.sin(performance.now() * (enemy.tier === "turret_laser" ? 0.015 : 0.02)) * (enemy.tier === "turret_laser" ? 0.05 : 0.04);

    visuals.root.scale.set((state.mode === "move" ? 1.02 : 1) * pulse);
    visuals.aura.alpha = enemy.tier === "turret_laser"
      ? 0.12 + chargeMul * 0.1 + firingMul * 0.08
      : enemy.tier === "turret_sniper"
        ? 0.1 + chargeMul * 0.08 + firingMul * 0.14
        : 0.1 + fixedMul * 0.08;
    visuals.core.scale.set(1 + chargeMul * 0.26 + firingMul * (enemy.tier === "turret_sniper" ? 0.28 : 0.18));
    visuals.core.alpha = enemy.tier === "turret_laser"
      ? 0.72 + chargeMul * 0.22 + firingMul * 0.14
      : enemy.tier === "turret_sniper"
        ? 0.68 + chargeMul * 0.18 + firingMul * 0.2
        : 0.66 + fixedMul * 0.2;
    visuals.barrel.alpha = state.mode === "move" ? 0.88 : 1;
    visuals.frame.tint = state.mode === "move"
      ? 0xffffff
      : enemy.tier === "turret_laser" ? 0xffd8f2 : enemy.tier === "turret_sniper" ? 0xf2fbff : 0xfff0bf;
    visuals.plating.tint = state.mode === "move"
      ? 0xffffff
      : enemy.tier === "turret_laser" ? 0xffd1fb : enemy.tier === "turret_sniper" ? 0xd8f3ff : 0xfff3b2;
  }

  function clearTurretLaserFx(enemy) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    if (state.laserSpr.parent) state.laserSpr.parent.removeChild(state.laserSpr);
    state.laserSpr = null;
  }

  return {
    makeEnemySprite,
    makeTurretVisual,
    updateTurretVisuals,
    clearTurretLaserFx
  };
})();
