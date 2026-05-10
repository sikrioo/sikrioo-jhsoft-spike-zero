window.HazardSystem = (() => {
  const STAGE_INTERVALS = {
    1: { introMin: 3300, introMax: 4500, min: 1080, max: 1440, damage: 12, speed: 22, radius: 22 },
    2: { introMin: 1380, introMax: 1920, min: 620, max: 920, damage: 17, speed: 26, radius: 27 },
    3: { introMin: 840, introMax: 1320, min: 460, max: 720, damage: 21, speed: 30, radius: 31 }
  };

  function getSpec(){
    const stage = Math.max(1, GameState.progression.stage || 1);
    return STAGE_INTERVALS[stage] || STAGE_INTERVALS[3];
  }

  function scheduleNext(options = {}){
    const spec = getSpec();
    const initial = !!options.initial;
    const min = initial ? spec.introMin : spec.min;
    const max = initial ? spec.introMax : spec.max;
    GameState.hazardTimer = Helpers.randi(min, max);
  }

  function resetTimer(){
    scheduleNext({ initial: true });
  }

  function makeCometVisual(radius, color){
    const c = new PIXI.Container();

    const outerTail = new PIXI.Graphics();
    outerTail.beginFill(0xd89b6a, 0.12);
    outerTail.drawPolygon([
      radius * 0.1, -radius * 0.32,
      -radius * 14.0, -radius * 1.05,
      -radius * 10.5, 0,
      -radius * 14.0, radius * 1.05,
      radius * 0.1, radius * 0.32
    ]);
    outerTail.endFill();
    outerTail.filters = [new PIXI.filters.BlurFilter(20)];

    const innerTail = new PIXI.Graphics();
    innerTail.beginFill(0xf0d0a0, 0.22);
    innerTail.drawPolygon([
      radius * 0.08, -radius * 0.18,
      -radius * 9.2, -radius * 0.42,
      -radius * 7.4, 0,
      -radius * 9.2, radius * 0.42,
      radius * 0.08, radius * 0.18
    ]);
    innerTail.endFill();
    innerTail.filters = [new PIXI.filters.BlurFilter(10)];

    const body = new PIXI.Graphics();
    body.beginFill(color, 0.82);
    body.drawPolygon([
      radius * 1.28, 0,
      radius * 0.22, -radius * 0.54,
      -radius * 0.88, -radius * 0.18,
      -radius * 1.04, 0,
      -radius * 0.88, radius * 0.18,
      radius * 0.22, radius * 0.54
    ]);
    body.endFill();
    body.filters = [new PIXI.filters.BlurFilter(1.2)];

    const core = new PIXI.Graphics();
    core.beginFill(0xfff0d0, 0.62);
    core.drawPolygon([
      radius * 0.82, 0,
      radius * 0.08, -radius * 0.24,
      -radius * 0.34, -radius * 0.07,
      -radius * 0.42, 0,
      -radius * 0.34, radius * 0.07,
      radius * 0.08, radius * 0.24
    ]);
    core.endFill();

    const ember = new PIXI.Graphics();
    ember.beginFill(0xd8b07d, 0.26);
    ember.drawCircle(-radius * 2.2, -radius * 0.2, radius * 0.09);
    ember.drawCircle(-radius * 3.8, radius * 0.18, radius * 0.07);
    ember.drawCircle(-radius * 5.6, -radius * 0.08, radius * 0.05);
    ember.endFill();
    ember.filters = [new PIXI.filters.BlurFilter(4)];

    c.addChild(outerTail, innerTail, body, core, ember);
    return c;
  }

  function spawnComet(){
    const S = GameState;
    const spec = getSpec();
    const view = Helpers.getViewBounds();
    const w = view.width;
    const h = view.height;
    const radius = spec.radius + Helpers.rand(-4, 5);
    const margin = Math.max(120, radius * 5);
    const side = Helpers.randi(0, 3);
    let startX;
    let startY;
    let endX;
    let endY;

    if (side === 0) {
      startX = view.left - margin;
      startY = Helpers.rand(view.top + h * 0.08, view.top + h * 0.92);
      endX = view.right + margin;
      endY = startY + Helpers.rand(-h * 0.35, h * 0.35);
    } else if (side === 1) {
      startX = view.right + margin;
      startY = Helpers.rand(view.top + h * 0.08, view.top + h * 0.92);
      endX = view.left - margin;
      endY = startY + Helpers.rand(-h * 0.35, h * 0.35);
    } else if (side === 2) {
      startX = Helpers.rand(view.left + w * 0.08, view.left + w * 0.92);
      startY = view.top - margin;
      endX = startX + Helpers.rand(-w * 0.35, w * 0.35);
      endY = view.bottom + margin;
    } else {
      startX = Helpers.rand(view.left + w * 0.08, view.left + w * 0.92);
      startY = view.bottom + margin;
      endX = startX + Helpers.rand(-w * 0.35, w * 0.35);
      endY = view.top - margin;
    }

    const ang = Math.atan2(endY - startY, endX - startX);
    const speed = spec.speed + Helpers.rand(-1.8, 2.4);
    const color = 0xc98855;
    const spr = makeCometVisual(radius, color);
    spr.x = startX;
    spr.y = startY;
    spr.rotation = ang;
    S.fx.addChild(spr);

    S.hazards.push({
      spr,
      type: "comet",
      x: startX,
      y: startY,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: radius,
      damage: spec.damage,
      color,
      wakeT: 0,
      hit: false,
      life: Math.ceil((Math.hypot(endX - startX, endY - startY) / speed) + 80),
      armTime: 40
    });
  }

  function damagePlayer(hazard){
    const S = GameState;
    const p = S.player;
    if (!p || p.inv > 0 || hazard.hit) return false;
    if (S.activeSkillState.stealthT > 0 && window.ActiveSkillSystem) {
      ActiveSkillSystem.breakStealth("hit");
    }

    let damage = Math.max(1, Math.ceil(hazard.damage - S.stats.defense));
    if (S.activeSkillState.boostMitigationT > 0) {
      damage = Math.max(1, Math.ceil(damage * S.activeSkillState.boostMitigationMul));
    }
    if (S.stats.shield > 0) {
      const absorbed = Math.min(S.stats.shield, damage);
      S.stats.shield -= absorbed;
      damage -= absorbed;
      S.stats.shieldRegenDelay = S.stats.shieldRegenDelayMax;
      Effects.emitParticle(p.spr.x, p.spr.y, 0x7fe7ff, 18, 1.2);
    }
    if (damage > 0) S.stats.hp -= damage;

    const dx = p.spr.x - hazard.x;
    const dy = p.spr.y - hazard.y;
    const dist = Math.hypot(dx, dy) || 1;
    p.vx += (dx / dist) * 8;
    p.vy += (dy / dist) * 8;
    p.inv = 34;
    hazard.hit = true;

    Effects.emitParticle(p.spr.x, p.spr.y, hazard.color, 24, 1.8);
    Effects.emitPulse(p.spr.x, p.spr.y, hazard.color, 74, 14);
    S.shake = Math.min(24, S.shake + 12);
    if (window.SoundSystem) SoundSystem.play("player_hit", { playbackRate: 0.86, volume: 0.75 });
    if (S.stats.hp <= 0) {
      S.stats.hp = 0;
      Boot.gameOver();
    }
    return true;
  }

  function updateComet(hazard, dt){
    const S = GameState;
    hazard.armTime -= dt;
    hazard.x += hazard.vx * dt;
    hazard.y += hazard.vy * dt;
    hazard.life -= dt;
    hazard.wakeT -= dt;
    hazard.spr.x = hazard.x;
    hazard.spr.y = hazard.y;

    if (hazard.wakeT <= 0) {
      hazard.wakeT = 2.5;
      const trail = Effects.makeTrailSprite(
        hazard.x - hazard.vx * 1.4 + Helpers.rand(-4, 4),
        hazard.y - hazard.vy * 1.4 + Helpers.rand(-4, 4),
        hazard.color,
        Helpers.rand(0.32, 0.58),
        0.24
      );
      S.fx.addChild(trail);
      S.particles.push({ spr: trail, x: trail.x, y: trail.y, vx: -hazard.vx * 0.02, vy: -hazard.vy * 0.02, drag: 0.88, life: Helpers.randi(16, 26) });
    }

    const p = S.player;
    if (hazard.armTime <= 0 && p) {
      const rr = hazard.r + p.r;
      if (Helpers.dist2(hazard.x, hazard.y, p.spr.x, p.spr.y) <= rr * rr) damagePlayer(hazard);
    }
  }

  function update(dt){
    const S = GameState;
    if (!S.app || !S.player) return;
    if (S.stats.practice && S.stats.practiceMode === "enemy") return;
    if (S.progression.stageState === "combat") {
      S.hazardTimer -= dt;
      if (S.hazardTimer <= 0) {
        spawnComet();
        scheduleNext();
      }
    }

    const view = Helpers.getViewBounds();
    const margin = 260;
    for (let i=S.hazards.length-1; i>=0; i--){
      const hazard = S.hazards[i];
      if (hazard.type === "comet") updateComet(hazard, dt);
      if (
        hazard.life <= 0 ||
        hazard.x < view.left - margin ||
        hazard.x > view.right + margin ||
        hazard.y < view.top - margin ||
        hazard.y > view.bottom + margin
      ) {
        if (hazard.spr && hazard.spr.parent) hazard.spr.parent.removeChild(hazard.spr);
        S.hazards.splice(i, 1);
      }
    }
  }

  return { update, spawnComet, resetTimer };
})();
