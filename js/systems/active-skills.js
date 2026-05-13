window.ActiveSkillSystem = (() => {
  function getDefinition(skillId){
    return ACTIVE_SKILL_DEFINITIONS.find(skill => skill.id === skillId) || null;
  }

  function getSlotByKey(code){
    return GameState.activeSkillState.slots.find(slot => slot.key === code) || null;
  }

  function getSlotSkill(slot){
    return slot && slot.skillId ? getDefinition(slot.skillId) : null;
  }

  function getOwnedSkills(){
    return GameState.activeSkillState.ownedSkillIds
      .map(getDefinition)
      .filter(Boolean);
  }

  function getAssignedSkillIds(excludeKey=null){
    return GameState.activeSkillState.slots
      .filter(slot => slot.key !== excludeKey && slot.skillId)
      .map(slot => slot.skillId);
  }

  function autoAssignSkill(skillId){
    const slots = GameState.activeSkillState.slots;
    if (slots.some(slot => slot.skillId === skillId)) return true;
    const empty = slots.find(slot => !slot.skillId);
    if (!empty) return false;
    empty.skillId = skillId;
    empty.cooldown = 0;
    empty.autoCast = false;
    return true;
  }

  function unlockSkill(skillId, options={}){
    const skill = getDefinition(skillId);
    if (!skill) return false;
    const owned = GameState.activeSkillState.ownedSkillIds;
    if (!owned.includes(skillId)) owned.push(skillId);
    if (options.autoAssign !== false) autoAssignSkill(skillId);
    UI.hudUpdate();
    return true;
  }

  function clearSlot(slotKey){
    const slot = getSlotByKey(slotKey);
    if (!slot) return false;
    slot.skillId = null;
    slot.cooldown = 0;
    slot.autoCast = false;
    UI.hudUpdate();
    return true;
  }

  function assignSkillToSlot(slotKey, skillId){
    const slot = getSlotByKey(slotKey);
    const skill = getDefinition(skillId);
    if (!slot || !skill) return false;
    if (!GameState.activeSkillState.ownedSkillIds.includes(skillId)) return false;

    const fromSlot = GameState.activeSkillState.slots.find(item => item.skillId === skillId);
    if (fromSlot && fromSlot !== slot) {
      fromSlot.skillId = null;
      fromSlot.cooldown = 0;
      fromSlot.autoCast = false;
    }

    slot.skillId = skillId;
    slot.cooldown = 0;
    slot.autoCast = false;
    UI.hudUpdate();
    return true;
  }

  function getAssignableSkills(slotKey){
    const blocked = new Set(getAssignedSkillIds(slotKey));
    return getOwnedSkills().filter(skill => !blocked.has(skill.id));
  }

  function assignStartingLoadout(testMode=false){
    const slots = GameState.activeSkillState.slots;
    for (let i=0; i<slots.length; i++){
      slots[i].skillId = null;
      slots[i].cooldown = 0;
      slots[i].autoCast = false;
    }
    GameState.activeSkillState.ownedSkillIds = [];
    GameState.activeSkillState.levels = {
      boost: 1
    };
    GameState.activeSkillState.boostDirection = "forward";

    unlockSkill("boost", { autoAssign: true });

    const shipConfig = GAME_BALANCE.SHIPS && GAME_BALANCE.SHIPS[GameState.playerType || "standard"];
    const shipLoadout = (shipConfig && shipConfig.starterActiveSkills) || [];
    for (const skillId of shipLoadout) unlockSkill(skillId, { autoAssign: true });

    const loadout = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_ACTIVE_SKILLS) || []) : [];
    for (const skillId of loadout) unlockSkill(skillId, { autoAssign: true });

    const startingLevels = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_ACTIVE_SKILL_LEVELS) || {}) : {};
    for (const [skillId, level] of Object.entries(startingLevels)) {
      GameState.activeSkillState.levels[skillId] = Math.max(1, level || 1);
    }
  }

  function canUseSlot(slot){
    if (!slot) return { ok:false, reason:"invalid" };
    const skill = getSlotSkill(slot);
    if (!skill) return { ok:false, reason:"empty" };
    if (slot.cooldown > 0) return { ok:false, reason:"cooldown", skill };
    if (GameState.stats.mp < skill.mpCost) return { ok:false, reason:"mp", skill };
    if (GameState.progression.waveState !== "running") return { ok:false, reason:"paused", skill };
    return { ok:true, skill };
  }

  function tryUseSlotByKey(code){
    return tryUseSlot(getSlotByKey(code));
  }

  function getBoostDirection(){
    return GameState.activeSkillState.boostDirection || "forward";
  }

  function getBoostDirectionLabel(direction = getBoostDirection()){
    if (direction === "left") return "LEFT";
    if (direction === "right") return "RIGHT";
    if (direction === "back") return "BACK";
    return "FRONT";
  }

  function getBoostDirectionIcon(direction = getBoostDirection()){
    if (direction === "left") return "\u2190";
    if (direction === "right") return "\u2192";
    if (direction === "back") return "\u2193";
    return "\u2191";
  }

  function getAvailableBoostDirections(){
    return ["forward", "left", "right", "back"];
  }

  function normalizeBoostDirection(direction){
    const available = getAvailableBoostDirections();
    if (available.includes(direction)) return direction;
    return "forward";
  }

  function setBoostDirection(direction){
    const boostSlot = GameState.activeSkillState.slots.find(slot => slot.skillId === "boost");
    if (!boostSlot) return false;
    GameState.activeSkillState.boostDirection = normalizeBoostDirection(direction);
    UI.flashActiveSlot(boostSlot.key, "cast");
    if (window.UI && UI.showActiveSlotHint) {
      UI.showActiveSlotHint(boostSlot.key, `BOOST ${getBoostDirectionLabel()}`);
    }
    if (window.SoundSystem) {
      SoundSystem.play("ui_hover", { playbackRate: 1.18, volume: 0.18, cooldownMs: 0 });
      SoundSystem.play("radio_in", { playbackRate: 1.3, volume: 0.08, cooldownMs: 0 });
    }
    UI.hudUpdate();
    return true;
  }

  function cycleBoostDirection(){
    const boostSlot = GameState.activeSkillState.slots.find(slot => slot.skillId === "boost");
    if (!boostSlot) return false;
    const directions = getAvailableBoostDirections();
    if (!directions.length) return false;
    const current = normalizeBoostDirection(getBoostDirection());
    const currentIndex = Math.max(0, directions.indexOf(current));
    const nextDirection = directions[(currentIndex + 1) % directions.length];
    return setBoostDirection(nextDirection);
  }

  function tryUseBoostDirection(direction){
    const boostSlot = GameState.activeSkillState.slots.find(slot => slot.skillId === "boost");
    if (!boostSlot) return false;
    return tryUseSlot(boostSlot, { boostDirection: direction });
  }

  function tryUseSlot(slot, context={}){
    const check = canUseSlot(slot);
    if (!check.ok){
      if (slot && check.reason === "mp") UI.flashActiveSlot(slot.key, "mp");
      return false;
    }

    const { skill } = check;
    let casted = false;
    if (skill.id === "decoy_drone") casted = castDecoyDrone(skill);
    if (skill.id === "deploy_turret") casted = castDeployTurret(skill);
    if (skill.id === "boost") casted = castBoost(skill, context);
    if (skill.id === "afterburner") casted = castAfterburner(skill);
    if (skill.id === "nova_pulse") casted = castNovaPulse(skill);
    if (skill.id === "chain_attack") casted = castChainAttack(skill);
    if (skill.id === "crossfire_missiles") casted = castCrossfireMissiles(skill);
    if (skill.id === "omni_burst") casted = castOmniBurst(skill);
    if (skill.id === "magnetic_slow_field") casted = castMagneticSlowField(skill);
    if (skill.id === "swarm_command") casted = castSwarmCommand(skill);
    if (skill.id === "trap_prism") casted = castTrapPrism(skill);
    if (skill.id === "target_painter") casted = castTargetPainter(skill);
    if (skill.id === "repulsor_net") casted = castRepulsorNet(skill);
    if (skill.id === "stasis_arc") casted = castStasisArc(skill);
    if (skill.id === "recall_beacon") casted = castRecallBeacon(skill, slot);
    if (skill.id === "stealth_field") casted = castStealthField(skill);
    // Smoke Screen is disabled in data because the current blurred smoke
    // visual is too expensive. Keep the implementation below for later tuning.
    if (skill.id === "smoke_screen") casted = castSmokeScreen(skill);
    if (!casted) return false;

    GameState.stats.mp = Math.max(0, GameState.stats.mp - skill.mpCost);
    slot.cooldown = skill.cooldown;
    UI.flashActiveSlot(slot.key, "cast");
    return true;
  }

  function castDecoyDrone(skill){
    const S = GameState;
    const angle = Math.atan2(S.mouse.y - S.player.spr.y, S.mouse.x - S.player.spr.x);
    const spawnX = S.player.spr.x + Math.cos(angle) * 40;
    const spawnY = S.player.spr.y + Math.sin(angle) * 40;

    const c = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.beginFill(0x10162a, 1);
    body.lineStyle(2, 0xffd27a, 0.95);
    body.drawPolygon([ 0,-11, 9,8, 0,4, -9,8 ]);
    body.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xffd27a, 0.9);
    core.drawCircle(0, 1, 3);
    core.endFill();

    c.addChild(body, core);
    c.x = spawnX;
    c.y = spawnY;
    c.rotation = angle + Math.PI / 2;
    S.uiLayer.addChild(c);

    S.decoys.push({
      spr: c,
      x: spawnX,
      y: spawnY,
      r: 12,
      hp: skill.effectData.hp,
      life: skill.duration,
      angle
    });

    Effects.emitParticle(spawnX, spawnY, 0xffd27a, 16, 1.1);
    Effects.emitPulse(spawnX, spawnY, 0xffd27a, 48, 14);
    return true;
  }

  function castBoost(skill, context={}){
    const S = GameState;
    const p = S.player;
    const facing = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    const level = Math.max(1, S.activeSkillState.levels.boost || 1);
    const boostSpec = getBoostSpec(skill, facing, level, context.boostDirection || getBoostDirection());

    p.vx += Math.cos(boostSpec.angle) * boostSpec.profile.speed;
    p.vy += Math.sin(boostSpec.angle) * boostSpec.profile.speed;
    S.activeSkillState.boostDir = boostSpec.angle;
    S.activeSkillState.boostDrag = boostSpec.profile.drag;
    S.activeSkillState.boostMitigationT = Math.max(S.activeSkillState.boostMitigationT, skill.duration + 3);
    S.activeSkillState.boostMitigationMul = boostSpec.profile.mitigationMul;
    S.activeSkillState.boostT = Math.max(S.activeSkillState.boostT, skill.duration);

    const backX = p.spr.x - Math.cos(boostSpec.angle) * 18;
    const backY = p.spr.y - Math.sin(boostSpec.angle) * 18;
    Effects.emitParticle(backX, backY, 0x8be9ff, 7, 0.75);
    return true;
  }

  function getBoostSpec(skill, facing, level, explicitDirection=null){
    let angle = facing;
    let profile = scaleBoostProfile(skill.effectData.forward, level);

    if (explicitDirection === "forward"){
      angle = facing;
      profile = scaleBoostProfile(skill.effectData.forward, level);
    } else if (explicitDirection === "back"){
      angle = facing + Math.PI;
      profile = scaleBoostProfile(skill.effectData.back, level);
    } else if (explicitDirection === "left"){
      angle = facing - Math.PI / 2;
      profile = scaleBoostProfile(skill.effectData.side, level);
    } else if (explicitDirection === "right"){
      angle = facing + Math.PI / 2;
      profile = scaleBoostProfile(skill.effectData.side, level);
    }

    return { angle, profile };
  }

  function scaleBoostProfile(profile, level){
    const lv = Math.max(1, level || 1);
    const bonus = lv - 1;
    return {
      // Boost travel distance is primarily driven by launch speed over its fixed sustain window.
      speed: ((profile.speed || 0) + bonus * 1.5) * 1.3,
      drag: Math.min(0.97, (profile.drag || 0.9) + bonus * 0.01),
      mitigationMul: Math.max(0.72, (profile.mitigationMul || 1) - bonus * 0.03)
    };
  }

  function castAfterburner(skill){
    const S = GameState;
    S.activeSkillState.afterburnerT = Math.max(S.activeSkillState.afterburnerT, skill.duration);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xff7a47, 10, 0.75);
    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0xff7a47, 46, 12);
    return true;
  }

  function makeDeployTurretSprite() {
    const c = new PIXI.Container();

    const base = new PIXI.Graphics();
    base.beginFill(0x10161f, 0.96);
    base.lineStyle(1.5, 0x7e93ab, 0.92);
    base.drawRoundedRect(-9, -7, 18, 14, 5);
    base.endFill();

    const head = new PIXI.Graphics();
    head.beginFill(0xd9e2ee, 0.9);
    head.lineStyle(1.2, 0x8ea2bb, 0.92);
    head.drawCircle(0, 0, 5);
    head.endFill();

    const barrel = new PIXI.Graphics();
    barrel.beginFill(0xff6e66, 0.9);
    barrel.drawRoundedRect(-1.2, -16, 2.4, 11, 1.2);
    barrel.endFill();

    const lens = new PIXI.Graphics();
    lens.beginFill(0xff6a62, 0.95);
    lens.drawCircle(0, -2, 1.6);
    lens.endFill();

    c.addChild(base, head, barrel, lens);
    return c;
  }

  function emitDeployTurretShot(turret, target, color = 0xffd7b8) {
    const dx = target.hitCircle.x - turret.x;
    const dy = target.hitCircle.y - turret.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const angle = Math.atan2(dy, dx);
    const bullet = Effects.makeBulletSprite(
      turret.x + nx * 10,
      turret.y + ny * 10,
      angle,
      0xffddb8,
      { kind: "hardpoint", scale: 1, alpha: 0.98 }
    );
    bullet.scale.set(1.7, 1.08);
    GameState.fx.addChild(bullet);
    GameState.particles.push({
      spr: bullet,
      x: bullet.x,
      y: bullet.y,
      vx: nx * 7.4,
      vy: ny * 7.4,
      life: 10,
      drag: 0.992
    });

    const tracer = Effects.makeTrailSprite(
      turret.x + nx * 8,
      turret.y + ny * 8,
      0xffc19b,
      0.52,
      0.34,
      { kind: "linear" }
    );
    tracer.rotation = angle;
    tracer.scale.set(0.7, 0.52);
    GameState.fx.addChild(tracer);
    GameState.particles.push({
      spr: tracer,
      x: tracer.x,
      y: tracer.y,
      vx: nx * 0.8,
      vy: ny * 0.8,
      life: 6,
      drag: 0.92
    });
    Effects.emitParticle(turret.x + nx * 10, turret.y + ny * 10, 0xff9b7f, 2, 0.14);
    Effects.emitParticle(target.hitCircle.x, target.hitCircle.y, 0xffe6d0, 2, 0.16);
  }

  function resetDeployTurrets() {
    const turrets = GameState.activeSkillState.deployTurrets || [];
    for (const turret of turrets) {
      if (turret && turret.spr && turret.spr.parent) turret.spr.parent.removeChild(turret.spr);
    }
    GameState.activeSkillState.deployTurrets = [];
  }

  function getDeployTurretLevel(level) {
    const lv = Math.max(1, Math.min(5, level || 1));
    return {
      count: lv >= 4 ? 4 : lv >= 3 ? 3 : lv >= 2 ? 2 : 1,
      rangeBonus: lv >= 5 ? 18 : lv >= 4 ? 10 : lv >= 3 ? 6 : lv >= 2 ? 2 : 0,
      damageMul: lv >= 5 ? 1.35 : 1,
      fireRateMul: lv >= 5 ? 0.76 : 1
    };
  }

  function getDeployTurretFormation(level) {
    if (level >= 4) return ["front", "left", "right", "back"];
    if (level >= 3) return ["front", "left", "right"];
    if (level >= 2) return ["front_left", "front_right"];
    return ["front"];
  }

  function getDeployTurretOffset(slot, distance, spread) {
    if (slot === "back") return { forward: -distance * 0.86, side: 0 };
    if (slot === "left") return { forward: 14, side: -spread * 0.92 };
    if (slot === "right") return { forward: 14, side: spread * 0.92 };
    if (slot === "front_left") return { forward: distance * 0.9, side: -spread * 0.62 };
    if (slot === "front_right") return { forward: distance * 0.9, side: spread * 0.62 };
    return { forward: distance, side: 0 };
  }

  function castDeployTurret(skill) {
    const S = GameState;
    const player = S.player;
    const level = Math.max(1, S.activeSkillState.levels.deploy_turret || 1);
    const profile = getDeployTurretLevel(level);
    const data = skill.effectData || {};
    const facing = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const forwardX = Math.cos(facing);
    const forwardY = Math.sin(facing);
    const sideX = -forwardY;
    const sideY = forwardX;
    const distance = data.placementDistance || 88;
    const spread = data.placementSpread || 60;
    const formation = getDeployTurretFormation(level);

    resetDeployTurrets();

    for (let i = 0; i < formation.length; i++) {
      const slot = formation[i];
      const offset = getDeployTurretOffset(slot, distance, spread);
      const x = player.spr.x + forwardX * offset.forward + sideX * offset.side;
      const y = player.spr.y + forwardY * offset.forward + sideY * offset.side;
      const spr = makeDeployTurretSprite();
      spr.x = x;
      spr.y = y;
      spr.rotation = facing + Math.PI / 2;
      S.uiLayer.addChild(spr);
      S.activeSkillState.deployTurrets.push({
        spr,
        x,
        y,
        angle: facing,
        slot,
        life: skill.duration,
        maxLife: skill.duration,
        range: (data.range || 250) + profile.rangeBonus,
        damage: (data.damage || 2.8) * profile.damageMul,
        bossDamage: (data.bossDamage || 1.6) * profile.damageMul,
        fireInterval: Math.max(10, Math.round((data.fireInterval || 24) * profile.fireRateMul)),
        fireCd: 8 + i * 4,
        pulseSeed: Math.random() * Math.PI * 2
      });
      Effects.emitPulse(x, y, 0xff7e72, 24, 8);
      Effects.emitParticle(x, y, 0xff7e72, 7, 0.42);
    }

    return true;
  }

  function makeEscortDroneSprite(tint = 0x8be9ff) {
    const c = new PIXI.Container();

    const wing = new PIXI.Graphics();
    wing.beginFill(0x10192a, 0.98);
    wing.lineStyle(1.5, tint, 0.95);
    wing.drawPolygon([0, -9, 8, -1, 0, 7, -8, -1]);
    wing.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xdffbff, 0.92);
    core.drawCircle(0, -1, 2.4);
    core.endFill();

    const engine = new PIXI.Graphics();
    engine.beginFill(tint, 0.85);
    engine.drawRoundedRect(-1.4, 4.5, 2.8, 5, 1.2);
    engine.endFill();

    c.addChild(wing, core, engine);
    return c;
  }

  function castNovaPulse(skill){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const radius = skill.effectData.radius || 140;
    const bulletClearRadius = skill.effectData.bulletClearRadius || radius + 30;
    const damage = skill.effectData.damage || 6;
    const bossDamage = skill.effectData.bossDamage || Math.max(1, damage - 2);
    const knockback = skill.effectData.knockback || 22;
    const radiusSq = radius * radius;
    const bulletRadiusSq = bulletClearRadius * bulletClearRadius;

    Effects.emitPulse(px, py, 0x7df9ff, radius, 14);
    Effects.emitPulse(px, py, 0xffffff, Math.max(54, radius * 0.62), 9);
    Effects.emitParticle(px, py, 0x7df9ff, 22, 1.35);
    Effects.emitParticle(px, py, 0xff9ae8, 12, 1.0);
    S.shake = Math.min(24, S.shake + 4);

    for (const enemy of [...S.enemies]){
      const hitCircles = enemy && typeof enemy.getHitCircles === "function"
        ? enemy.getHitCircles()
        : [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
      const hitCircle = hitCircles.find((circle) => {
        const rr = radius + circle.radius;
        return Helpers.dist2(px, py, circle.x, circle.y) <= rr * rr;
      });
      if (!hitCircle) continue;

      const dist = Math.max(1, Math.hypot(hitCircle.x - px, hitCircle.y - py));
      const dx = (hitCircle.x - px) / dist;
      const dy = (hitCircle.y - py) / dist;

      if (enemy.x != null) enemy.x += dx * knockback;
      if (enemy.y != null) enemy.y += dy * knockback;
      if (enemy.spr) {
        enemy.spr.x = enemy.x;
        enemy.spr.y = enemy.y;
      }
      if (enemy.hpText) enemy.hpText.rotation = -enemy.spr.rotation;

      const appliedDamage = enemy.tier === "boss" ? bossDamage : damage;
      CombatSystem.damageEnemy(enemy, appliedDamage, 0x7df9ff, enemy.tier === "boss" ? 16 : 10, 1.0, hitCircle);
    }

    for (let i = S.enemyBullets.length - 1; i >= 0; i--){
      const bullet = S.enemyBullets[i];
      if (Helpers.dist2(px, py, bullet.x, bullet.y) > bulletRadiusSq) continue;
      Effects.emitParticle(bullet.x, bullet.y, 0x7df9ff, 6, 0.7);
      Effects.emitPulse(bullet.x, bullet.y, 0xc18dff, 18, 6);
      S.fx.removeChild(bullet.spr);
      S.enemyBullets.splice(i, 1);
    }

    UI.hudUpdate();
    return true;
  }

  function getEnemyHitCircles(enemy) {
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function getTargetPaintScoreBias(enemy) {
    if (!enemy || enemy.targetPaintT <= 0) return 0;
    return 0.22 + Math.min(0.12, ((enemy.targetPaintAmp || 1.28) - 1) * 0.3);
  }

  function findChainLeadTarget(playerX, playerY, baseAngle, maxRange) {
    const S = GameState;
    const maxRangeSq = maxRange * maxRange;
    let best = null;
    let bestScore = -Infinity;

    for (const enemy of S.enemies) {
      if (!enemy) continue;
      for (const circle of getEnemyHitCircles(enemy)) {
        const dx = circle.x - playerX;
        const dy = circle.y - playerY;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxRangeSq) continue;
        if (
          window.PlanetSystem &&
          PlanetSystem.blocksLineOfSight &&
          PlanetSystem.blocksLineOfSight(playerX, playerY, circle.x, circle.y, Math.max(2, circle.radius * 0.2))
        ) {
          continue;
        }
        const dist = Math.sqrt(distSq) || 1;
        const angle = Math.atan2(dy, dx);
        const angleDelta = Math.atan2(Math.sin(angle - baseAngle), Math.cos(angle - baseAngle));
        const forwardBias = Math.cos(Math.abs(angleDelta));
        const distanceBias = 1 - Helpers.clamp(dist / maxRange, 0, 1);
        const score = forwardBias * 0.58 + distanceBias * 0.42 + getTargetPaintScoreBias(enemy);
        if (score <= bestScore) continue;
        bestScore = score;
        best = { enemy, hitCircle: circle };
      }
    }

    return best;
  }

  function castChainAttack(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.chain_attack || 1);
    const originX = player.spr.x;
    const originY = player.spr.y;
    const aimAngle = Math.atan2(S.mouse.y - originY, S.mouse.x - originX);
    const lead = findChainLeadTarget(originX, originY, aimAngle, data.range || 360);
    if (!lead) return false;

    const chainRange = (data.chainRange || 150) + (level - 1) * 14;
    const chainRangeSq = chainRange * chainRange;
    const targetCount = Math.max(1, (data.targetCount || 5) + (level - 1));
    const baseDamage = (data.damage || 8) + (level - 1) * 2;
    const bossDamage = (data.bossDamage || Math.max(1, (data.damage || 8) - 2)) + (level - 1);
    const falloffRates = Array.isArray(data.falloffRates) ? data.falloffRates : [1, 0.82, 0.64, 0.5, 0.4];
    const used = new Set();
    let current = lead;
    let chainX = originX;
    let chainY = originY;
    let hits = 0;

    Effects.emitPulse(originX, originY, 0x8fe7ff, 44, 10);
    Effects.emitParticle(originX, originY, 0x8fe7ff, 14, 0.9);

    while (current && hits < targetCount) {
      const enemy = current.enemy;
      if (!enemy || used.has(enemy) || !S.enemies.includes(enemy)) break;
      used.add(enemy);

      const falloff = falloffRates[Math.min(hits, falloffRates.length - 1)] ?? 0.4;
      const color = hits % 2 === 0 ? 0x86eaff : 0xd3a0ff;
      const damage = enemy.tier === "boss"
        ? Math.max(1, bossDamage * falloff)
        : Math.max(1, baseDamage * falloff);

      if (window.Effects && Effects.emitElectricArc) {
        Effects.emitElectricArc(chainX, chainY, current.hitCircle.x, current.hitCircle.y, color, 0xffffff, 8, 10);
      } else {
        Effects.emitLineTelegraph(chainX, chainY, current.hitCircle.x, current.hitCircle.y, color, 6, 2);
      }
      Effects.emitParticle(current.hitCircle.x, current.hitCircle.y, color, enemy.tier === "boss" ? 8 : 6, 0.72);
      Effects.emitPulse(current.hitCircle.x, current.hitCircle.y, color, enemy.tier === "boss" ? 28 : 22, 7);
      CombatSystem.damageEnemy(enemy, damage, color, enemy.tier === "boss" ? 10 : 8, 0.62, current.hitCircle);
      hits += 1;
      chainX = current.hitCircle.x;
      chainY = current.hitCircle.y;

      let next = null;
      let nextDistSq = Infinity;
      for (const candidate of S.enemies) {
        if (!candidate || used.has(candidate)) continue;
        for (const circle of getEnemyHitCircles(candidate)) {
          const dx = circle.x - chainX;
          const dy = circle.y - chainY;
          const distSq = dx * dx + dy * dy;
          if (distSq > chainRangeSq || distSq >= nextDistSq) continue;
          if (
            window.PlanetSystem &&
            PlanetSystem.blocksLineOfSight &&
            PlanetSystem.blocksLineOfSight(chainX, chainY, circle.x, circle.y, Math.max(2, circle.radius * 0.2))
          ) {
            continue;
          }
          next = { enemy: candidate, hitCircle: circle };
          nextDistSq = distSq;
        }
      }
      current = next;
    }

    S.shake = Math.min(24, S.shake + 3);
    return hits > 0;
  }

  function castCrossfireMissiles(skill){
    if (!window.CombatSystem || typeof CombatSystem.launchCrossfireMissiles !== "function") return false;
    return CombatSystem.launchCrossfireMissiles(skill.effectData || {});
  }

  function castOmniBurst(skill){
    if (!window.CombatSystem || typeof CombatSystem.launchOmniBurst !== "function") return false;
    return CombatSystem.launchOmniBurst(skill.effectData || {});
  }

  function redrawMagneticField(field) {
    const lifeRatio = Math.max(0, Math.min(1, field.life / Math.max(1, field.maxLife)));
    const pulse = 0.96 + Math.sin(performance.now() / 120 + field.seed) * 0.06;
    const g = field.spr;
    g.clear();
    g.lineStyle(3, 0x86b8ff, 0.44 + lifeRatio * 0.2);
    g.beginFill(0x6d4fff, 0.08 + lifeRatio * 0.1);
    g.drawRoundedRect(-field.width * 0.5, -field.height * 0.5, field.width, field.height, 18);
    g.endFill();
    g.lineStyle(1, 0xffffff, 0.22 + lifeRatio * 0.1);
    g.drawRoundedRect(-field.width * 0.43, -field.height * 0.35, field.width * 0.86, field.height * 0.7, 12);
    g.moveTo(-field.width * 0.18, 0);
    g.lineTo(field.width * 0.18, 0);
    g.moveTo(0, -field.height * 0.2);
    g.lineTo(0, field.height * 0.2);
    g.scale.set(pulse, pulse);
    g.alpha = 0.54 + lifeRatio * 0.18;
  }

  function castMagneticSlowField(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.magnetic_slow_field || 1);
    const angle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const spawnDistance = data.spawnDistance || 132;
    const spawnX = player.spr.x + Math.cos(angle) * spawnDistance;
    const spawnY = player.spr.y + Math.sin(angle) * spawnDistance;
    const spr = new PIXI.Graphics();
    spr.x = spawnX;
    spr.y = spawnY;
    spr.rotation = angle;
    S.fx.addChild(spr);

    const field = {
      spr,
      x: spawnX,
      y: spawnY,
      angle,
      width: (data.width || 176) + (level - 1) * 18,
      height: (data.height || 108) + (level - 1) * 10,
      life: (skill.duration || 120) + (level - 1) * 18,
      maxLife: (skill.duration || 120) + (level - 1) * 18,
      slowRate: Math.max(0.28, (data.slowRate || 0.46) - (level - 1) * 0.06),
      bossSlowRate: Math.max(0.58, (data.bossSlowRate || 0.76) - (level - 1) * 0.05),
      seed: Math.random() * Math.PI * 2
    };

    redrawMagneticField(field);
    S.slowFields.push(field);
    Effects.emitPulse(spawnX, spawnY, 0x7f9cff, Math.max(field.width * 0.5, field.height * 0.9), 14);
    Effects.emitPulse(spawnX, spawnY, 0xb69cff, Math.max(field.width * 0.32, field.height * 0.58), 10);
    Effects.emitParticle(spawnX, spawnY, 0x8eb9ff, 16, 0.95);
    return true;
  }

  function makeSwarmDroneSprite(tint = 0xffc56e) {
    const c = new PIXI.Container();

    const wing = new PIXI.Graphics();
    wing.beginFill(0x121a28, 0.98);
    wing.lineStyle(1.4, tint, 0.95);
    wing.drawPolygon([0, -10, 8, -2, 0, 8, -8, -2]);
    wing.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xffffff, 0.9);
    core.drawCircle(0, -1, 2.2);
    core.endFill();

    const engine = new PIXI.Graphics();
    engine.beginFill(tint, 0.86);
    engine.drawRoundedRect(-1.2, 4.2, 2.4, 4.8, 1);
    engine.endFill();

    c.addChild(wing, core, engine);
    return c;
  }

  function resetSwarmDrones() {
    const drones = GameState.activeSkillState.swarmDrones || [];
    for (const drone of drones) {
      if (drone && drone.spr && drone.spr.parent) drone.spr.parent.removeChild(drone.spr);
    }
    GameState.activeSkillState.swarmDrones = [];
  }

  function castSwarmCommand(skill) {
    const S = GameState;
    const level = Math.max(1, S.activeSkillState.levels.swarm_command || 1);
    const data = skill.effectData || {};
    const count = Math.max(2, (data.count || 4) + (level - 1));

    resetSwarmDrones();

    for (let i = 0; i < count; i++) {
      const tint = i % 2 === 0 ? 0xffc56e : 0x8ce8ff;
      const spr = makeSwarmDroneSprite(tint);
      spr.x = S.player.spr.x;
      spr.y = S.player.spr.y;
      S.uiLayer.addChild(spr);
      S.activeSkillState.swarmDrones.push({
        spr,
        tint,
        x: S.player.spr.x,
        y: S.player.spr.y,
        orbitAngle: (Math.PI * 2 * i) / count,
        orbitRadius: 42 + (i % 3) * 6,
        fireCd: 4 + i * 2,
        life: (skill.duration || 210) + (level - 1) * 24,
        maxLife: (skill.duration || 210) + (level - 1) * 24,
        range: (data.range || 228) + (level - 1) * 18,
        damage: (data.damage || 1.95) + (level - 1) * 0.45,
        bossDamage: (data.bossDamage || 1.2) + (level - 1) * 0.24,
        fireInterval: Math.max(10, (data.fireInterval || 18) - (level - 1) * 2),
        pulseSeed: Math.random() * Math.PI * 2
      });
    }

    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0xffc56e, 54, 10);
    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0x8ce8ff, 42, 8);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xffc56e, 10, 0.6);
    return true;
  }

  function redrawTrapPrism(prism) {
    const lifeRatio = Math.max(0, Math.min(1, prism.life / Math.max(1, prism.maxLife)));
    const pulse = 0.94 + Math.sin(performance.now() / 140 + prism.seed) * 0.08;
    const g = prism.spr;
    g.clear();
    g.lineStyle(2.2, 0xffb56a, 0.28 + lifeRatio * 0.18);

    for (let i = 0; i < prism.nodes.length; i++) {
      const node = prism.nodes[i];
      const next = prism.nodes[(i + 1) % prism.nodes.length];
      g.moveTo(node.x, node.y);
      g.lineTo(next.x, next.y);
    }

    for (const node of prism.nodes) {
      g.beginFill(0x1a1622, 0.86);
      g.lineStyle(2, 0xffd27a, 0.7 + lifeRatio * 0.16);
      g.drawCircle(node.x, node.y, prism.radius * pulse);
      g.endFill();
      g.beginFill(0xfff3d8, 0.26 + lifeRatio * 0.18);
      g.drawCircle(node.x, node.y, prism.radius * 0.32);
      g.endFill();
    }

    g.alpha = 0.48 + lifeRatio * 0.26;
  }

  function resetTrapPrisms() {
    const prisms = GameState.activeSkillState.trapPrisms || [];
    for (const prism of prisms) {
      if (prism && prism.spr && prism.spr.parent) prism.spr.parent.removeChild(prism.spr);
    }
    GameState.activeSkillState.trapPrisms = [];
  }

  function castTrapPrism(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.trap_prism || 1);
    const angle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const sideX = -sin;
    const sideY = cos;
    const distance = (data.placementDistance || 126) + (level - 1) * 8;
    const sideSpacing = (data.sideSpacing || 58) + (level - 1) * 6;
    const forwardOffset = 26 + (level - 1) * 4;
    const baseX = player.spr.x + cos * distance;
    const baseY = player.spr.y + sin * distance;
    const spr = new PIXI.Graphics();
    spr.x = 0;
    spr.y = 0;
    S.fx.addChild(spr);

    const prism = {
      spr,
      nodes: [
        { x: baseX + cos * forwardOffset, y: baseY + sin * forwardOffset },
        { x: baseX - cos * forwardOffset * 0.55 + sideX * sideSpacing, y: baseY - sin * forwardOffset * 0.55 + sideY * sideSpacing },
        { x: baseX - cos * forwardOffset * 0.55 - sideX * sideSpacing, y: baseY - sin * forwardOffset * 0.55 - sideY * sideSpacing }
      ],
      radius: (data.radius || 34) + (level - 1) * 4,
      pulseInterval: Math.max(10, (data.pulseInterval || 20) - (level - 1) * 2),
      pulseCd: 6,
      damage: (data.damage || 3.2) + (level - 1) * 0.75,
      bossDamage: (data.bossDamage || 1.7) + (level - 1) * 0.35,
      slowRate: Math.max(0.45, (data.slowRate || 0.68) - (level - 1) * 0.06),
      bossSlowRate: Math.max(0.72, (data.bossSlowRate || 0.86) - (level - 1) * 0.04),
      life: (skill.duration || 210) + (level - 1) * 24,
      maxLife: (skill.duration || 210) + (level - 1) * 24,
      seed: Math.random() * Math.PI * 2
    };

    redrawTrapPrism(prism);
    S.activeSkillState.trapPrisms.push(prism);
    for (const node of prism.nodes) {
      Effects.emitPulse(node.x, node.y, 0xffb56a, prism.radius * 1.5, 8);
      Effects.emitParticle(node.x, node.y, 0xffd27a, 4, 0.3);
    }
    return true;
  }

  function findPaintTargets(originX, originY, aimAngle, range, targetCount) {
    const S = GameState;
    const rangeSq = range * range;
    const hits = [];

    for (const enemy of S.enemies) {
      if (!enemy) continue;
      let bestCircle = null;
      let bestScore = -Infinity;
      for (const circle of getEnemyHitCircles(enemy)) {
        const dx = circle.x - originX;
        const dy = circle.y - originY;
        const distSq = dx * dx + dy * dy;
        if (distSq > rangeSq) continue;
        if (
          window.PlanetSystem &&
          PlanetSystem.blocksLineOfSight &&
          PlanetSystem.blocksLineOfSight(originX, originY, circle.x, circle.y, Math.max(2, circle.radius * 0.2))
        ) {
          continue;
        }
        const dist = Math.sqrt(distSq) || 1;
        const angle = Math.atan2(dy, dx);
        const angleDelta = Math.abs(Math.atan2(Math.sin(angle - aimAngle), Math.cos(angle - aimAngle)));
        const forwardBias = Math.max(0, Math.cos(angleDelta));
        const distanceBias = 1 - Helpers.clamp(dist / range, 0, 1);
        const score = forwardBias * 0.62 + distanceBias * 0.38 + getTargetPaintScoreBias(enemy) * 0.4;
        if (score <= bestScore) continue;
        bestCircle = circle;
        bestScore = score;
      }
      if (bestCircle) hits.push({ enemy, hitCircle: bestCircle, score: bestScore });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, targetCount);
  }

  function castTargetPainter(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.target_painter || 1);
    const originX = player.spr.x;
    const originY = player.spr.y;
    const aimAngle = Math.atan2(S.mouse.y - originY, S.mouse.x - originX);
    const range = (data.range || 360) + (level - 1) * 26;
    const targetCount = Math.max(1, (data.targetCount || 4) + (level - 1));
    const amp = (data.damageAmp || 1.32) + (level - 1) * 0.08;
    const markDuration = (data.markDuration || 180) + (level - 1) * 30;
    const targets = findPaintTargets(originX, originY, aimAngle, range, targetCount);
    if (!targets.length) return false;

    for (const target of targets) {
      target.enemy.targetPaintT = Math.max(target.enemy.targetPaintT || 0, markDuration);
      target.enemy.targetPaintAmp = Math.max(target.enemy.targetPaintAmp || 1, amp);
      if (target.enemy.targetPaintMarker) {
        target.enemy.targetPaintMarker.visible = true;
        target.enemy.targetPaintMarker.alpha = 0.92;
      }
      Effects.emitLineTelegraph(originX, originY, target.hitCircle.x, target.hitCircle.y, 0xffb56a, 10, 2);
      Effects.emitPulse(target.hitCircle.x, target.hitCircle.y, 0xffb56a, target.hitCircle.radius + 18, 9);
      Effects.emitParticle(target.hitCircle.x, target.hitCircle.y, 0xffb56a, 5, 0.36);
    }

    Effects.emitPulse(originX, originY, 0xffb56a, 40, 8);
    return true;
  }

  function redrawRepulsorField(field) {
    const lifeRatio = Math.max(0, Math.min(1, field.life / Math.max(1, field.maxLife)));
    const pulse = 0.98 + Math.sin(performance.now() / 90 + field.seed) * 0.04;
    const g = field.spr;
    const span = field.span;
    const depth = field.depth;
    const capRadius = Math.max(7, depth * 0.3);
    g.clear();
    g.lineStyle(2.4, 0xff8f70, 0.4 + lifeRatio * 0.24);
    g.beginFill(0xffb56a, 0.1 + lifeRatio * 0.08);
    g.drawRoundedRect(-depth * 0.5, -span * 0.5, depth, span, Math.max(10, depth * 0.48));
    g.endFill();
    g.lineStyle(1.4, 0xfff2d6, 0.24 + lifeRatio * 0.12);
    g.drawRoundedRect(-depth * 0.32, -span * 0.45, depth * 0.64, span * 0.9, Math.max(7, depth * 0.3));
    g.lineStyle(3.2, 0xfff7de, 0.38 + lifeRatio * 0.18);
    g.moveTo(0, -span * 0.45);
    g.lineTo(0, span * 0.45);
    g.lineStyle(2, 0xffcf92, 0.32 + lifeRatio * 0.14);
    g.moveTo(-depth * 0.28, -span * 0.28);
    g.lineTo(depth * 0.28, -span * 0.28);
    g.moveTo(-depth * 0.28, span * 0.28);
    g.lineTo(depth * 0.28, span * 0.28);
    g.beginFill(0xfff1c7, 0.22 + lifeRatio * 0.14);
    g.drawCircle(0, -span * 0.5 + capRadius * 1.05, capRadius);
    g.drawCircle(0, span * 0.5 - capRadius * 1.05, capRadius);
    g.endFill();
    g.scale.set(pulse, pulse);
    g.alpha = 0.58 + lifeRatio * 0.18;
  }

  function castRepulsorNet(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.repulsor_net || 1);
    const angle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const spawnDistance = (data.spawnDistance || 118) + (level - 1) * 8;
    const spawnX = player.spr.x + Math.cos(angle) * spawnDistance;
    const spawnY = player.spr.y + Math.sin(angle) * spawnDistance;
    const spr = new PIXI.Graphics();
    spr.x = spawnX;
    spr.y = spawnY;
    spr.rotation = angle;
    S.fx.addChild(spr);

    const field = {
      spr,
      x: spawnX,
      y: spawnY,
      angle,
      span: (data.span || 224) + (level - 1) * 24,
      depth: (data.depth || 44) + (level - 1) * 6,
      life: (skill.duration || 126) + (level - 1) * 18,
      maxLife: (skill.duration || 126) + (level - 1) * 18,
      slowRate: Math.max(0.54, (data.slowRate || 0.74) - (level - 1) * 0.05),
      bossSlowRate: Math.max(0.78, (data.bossSlowRate || 0.9) - (level - 1) * 0.04),
      knockback: (data.knockback || 14) + (level - 1) * 2,
      pulseInterval: Math.max(6, (data.pulseInterval || 12) - (level - 1) * 1.5),
      pulseCd: 0,
      seed: Math.random() * Math.PI * 2
    };

    redrawRepulsorField(field);
    S.activeSkillState.repulsorFields.push(field);
    Effects.emitPulse(spawnX, spawnY, 0xff9a70, Math.max(field.span * 0.44, field.depth * 1.5), 12);
    Effects.emitParticle(spawnX, spawnY, 0xffc27f, 14, 0.7);
    return true;
  }

  function drawArcBand(g, innerRadius, outerRadius, startAngle, endAngle) {
    g.moveTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
    g.arc(0, 0, outerRadius, startAngle, endAngle);
    g.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
    g.arc(0, 0, innerRadius, endAngle, startAngle, true);
    g.lineTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
  }

  function redrawStasisArcField(field) {
    const lifeRatio = Math.max(0, Math.min(1, field.life / Math.max(1, field.maxLife)));
    const pulse = 0.98 + Math.sin(performance.now() / 110 + field.seed) * 0.035;
    const g = field.spr;
    const outerRadius = field.radius;
    const innerRadius = field.innerRadius;
    const startAngle = -field.arcAngle * 0.5;
    const endAngle = field.arcAngle * 0.5;
    const midRadius = innerRadius + (outerRadius - innerRadius) * 0.54;
    g.clear();

    g.lineStyle(1.6, 0x8de6ff, 0.14 + lifeRatio * 0.08);
    g.beginFill(0x4ee3ff, 0.09 + lifeRatio * 0.09);
    drawArcBand(g, innerRadius, outerRadius, startAngle, endAngle);
    g.endFill();

    g.lineStyle(1.8, 0xbef8ff, 0.18 + lifeRatio * 0.1);
    g.arc(0, 0, outerRadius - 5, startAngle, endAngle);
    g.lineStyle(1.2, 0x9edcff, 0.18 + lifeRatio * 0.08);
    g.arc(0, 0, innerRadius + 5, startAngle, endAngle);
    g.lineStyle(1, 0xb9ffff, 0.16 + lifeRatio * 0.06);
    g.arc(0, 0, midRadius, startAngle, endAngle);

    const ribCount = 5;
    g.lineStyle(0.9, 0xefffff, 0.08 + lifeRatio * 0.04);
    for (let i = 0; i <= ribCount; i++) {
      const t = i / ribCount;
      const ang = startAngle + (endAngle - startAngle) * t;
      g.moveTo(Math.cos(ang) * (innerRadius + 3), Math.sin(ang) * (innerRadius + 3));
      g.lineTo(Math.cos(ang) * (outerRadius - 7), Math.sin(ang) * (outerRadius - 7));
    }

    const swirlCount = 4;
    g.lineStyle(1.1, 0x7fe7ff, 0.12 + lifeRatio * 0.05);
    for (let i = 0; i < swirlCount; i++) {
      const t = swirlCount === 1 ? 0.5 : i / (swirlCount - 1);
      const ang = startAngle + (endAngle - startAngle) * t;
      const baseRadius = innerRadius + (outerRadius - innerRadius) * (0.32 + t * 0.18);
      const start = ang - 0.12;
      const end = ang + 0.12;
      g.arc(0, 0, baseRadius, start, end);
    }

    g.scale.set(pulse, pulse);
    g.alpha = 0.46 + lifeRatio * 0.14;
  }

  function castStasisArc(skill) {
    const S = GameState;
    const player = S.player;
    const data = skill.effectData || {};
    const level = Math.max(1, S.activeSkillState.levels.stasis_arc || 1);
    const angle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const spawnDistance = data.spawnDistance || 138;
    const spawnX = player.spr.x + Math.cos(angle) * spawnDistance;
    const spawnY = player.spr.y + Math.sin(angle) * spawnDistance;
    const spr = new PIXI.Graphics();
    spr.x = spawnX;
    spr.y = spawnY;
    spr.rotation = angle;
    S.fx.addChild(spr);

    const field = {
      spr,
      x: spawnX,
      y: spawnY,
      angle,
      radius: (data.radius || 154) + (level - 1) * 26,
      innerRadius: data.innerRadius == null ? 10 : data.innerRadius,
      arcAngle: ((data.arcDegrees || 180) * Math.PI) / 180,
      life: skill.duration || 192,
      maxLife: skill.duration || 192,
      slowRate: Math.max(0.3, (data.slowRate || 0.62) - (level - 1) * 0.12),
      bossSlowRate: Math.max(0.68, (data.bossSlowRate || 0.88) - (level - 1) * 0.06),
      pulseInterval: Math.max(8, (data.pulseInterval || 18) - (level - 1) * 2),
      damagePerPulse: data.damagePerPulse || 0,
      bossDamagePerPulse: data.bossDamagePerPulse || 0,
      pulseCd: 0,
      seed: Math.random() * Math.PI * 2
    };

    redrawStasisArcField(field);
    S.activeSkillState.stasisArcFields.push(field);
    Effects.emitPulse(field.x, field.y, 0x72ecff, field.radius * 0.76, 10);
    Effects.emitParticle(field.x, field.y, 0x9cecff, 12, 0.5);
    return true;
  }

  function getRecallTurretOffset(index, count) {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / Math.max(1, count));
    return {
      x: Math.cos(angle) * 72,
      y: Math.sin(angle) * 56,
      angle
    };
  }

  function castRecallBeacon(skill, slot = null) {
    const S = GameState;
    const player = S.player;
    const level = Math.max(1, S.activeSkillState.levels.recall_beacon || 1);
    const data = skill.effectData || {};
    const escortDrones = S.activeSkillState.escortDrones || [];
    const swarmDrones = S.activeSkillState.swarmDrones || [];
    const turrets = S.activeSkillState.deployTurrets || [];
    const summonCount = escortDrones.length + swarmDrones.length + turrets.length;
    if (summonCount <= 0) {
      if (slot && window.UI && typeof UI.showActiveSlotHint === "function") {
        UI.showActiveSlotHint(slot.key, "NO ACTIVE SUMMONS");
      }
      return false;
    }

    const fireRateMul = Math.max(0.44, (data.fireRateMultiplier || 0.68) - (level - 1) * 0.06);
    const damageMul = (data.damageMultiplier || 1.16) + (level - 1) * 0.08;
    const duration = (skill.duration || 180) + (level - 1) * 30;
    S.activeSkillState.recallBoostT = Math.max(S.activeSkillState.recallBoostT || 0, duration);
    S.activeSkillState.recallFireRateMul = Math.min(S.activeSkillState.recallFireRateMul || 1, fireRateMul);
    S.activeSkillState.recallDamageMul = Math.max(S.activeSkillState.recallDamageMul || 1, damageMul);

    for (const drone of escortDrones) {
      drone.fireCd = 0;
      drone.x = player.spr.x;
      drone.y = player.spr.y;
      drone.orbitRadius = Math.max(20, (drone.orbitRadius || 30) - 10);
      if (drone.spr) {
        drone.spr.x = player.spr.x;
        drone.spr.y = player.spr.y;
      }
    }

    for (const drone of swarmDrones) {
      drone.fireCd = 0;
      drone.x = player.spr.x;
      drone.y = player.spr.y;
      drone.orbitRadius = Math.max(24, (drone.orbitRadius || 40) - 14);
      if (drone.spr) {
        drone.spr.x = player.spr.x;
        drone.spr.y = player.spr.y;
      }
    }

    for (let i = 0; i < turrets.length; i++) {
      const turret = turrets[i];
      const offset = getRecallTurretOffset(i, turrets.length);
      turret.x = player.spr.x + offset.x;
      turret.y = player.spr.y + offset.y;
      turret.angle = offset.angle;
      turret.fireCd = 0;
      if (turret.spr) {
        turret.spr.x = turret.x;
        turret.spr.y = turret.y;
        turret.spr.rotation = turret.angle + Math.PI / 2;
      }
      Effects.emitPulse(turret.x, turret.y, 0xffbf80, 22, 8);
    }

    Effects.emitPulse(player.spr.x, player.spr.y, 0xffbf80, 58, 10);
    Effects.emitPulse(player.spr.x, player.spr.y, 0x8ce8ff, 42, 9);
    Effects.emitParticle(player.spr.x, player.spr.y, 0xffbf80, 16, 0.8);
    return true;
  }

  function castStealthField(skill){
    const S = GameState;
    const level = Math.max(1, S.activeSkillState.levels.stealth_field || 1);
    const duration = (skill.duration || 180) + (level - 1) * 60;
    S.activeSkillState.stealthT = Math.max(S.activeSkillState.stealthT, duration);
    S.activeSkillState.stealthAlpha = skill.effectData.alpha || 0.42;
    S.activeSkillState.stealthLastKnownX = S.player.spr.x;
    S.activeSkillState.stealthLastKnownY = S.player.spr.y;
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0x6cf5ff, 8, 0.55);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xc595ff, 4, 0.45);
    UI.hudUpdate();
    return true;
  }

  function makeSmokePuff(x, y, radius, alpha, color){
    const puff = new PIXI.Graphics();
    puff.beginFill(color, alpha);
    puff.drawCircle(0, 0, radius);
    puff.endFill();
    puff.filters = [new PIXI.filters.BlurFilter(12)];
    puff.x = x;
    puff.y = y;
    return puff;
  }

  function castSmokeScreen(skill){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const data = skill.effectData || {};
    const radius = data.radius || 118;
    const c = new PIXI.Container();
    c.x = px;
    c.y = py;

    const puffs = data.puffs || 11;
    for (let i=0; i<puffs; i++){
      const angle = Helpers.rand(0, Math.PI * 2);
      const dist = i === 0 ? 0 : Helpers.rand(10, radius * 0.48);
      const puffRadius = Helpers.rand(radius * 0.34, radius * 0.58);
      const color = Math.random() < 0.45 ? 0x8f9aa8 : 0x566170;
      c.addChild(makeSmokePuff(Math.cos(angle) * dist, Math.sin(angle) * dist, puffRadius, Helpers.rand(0.18, 0.28), color));
    }

    const veil = new PIXI.Graphics();
    veil.beginFill(0x10141b, 0.16);
    veil.drawCircle(0, 0, radius);
    veil.endFill();
    veil.filters = [new PIXI.filters.BlurFilter(18)];
    c.addChild(veil);
    S.fx.addChild(c);

    S.smokeClouds.push({
      spr: c,
      x: px,
      y: py,
      radius,
      life: skill.duration,
      maxLife: skill.duration,
      slowMul: data.slowMul || 0.42,
      bossSlowMul: data.bossSlowMul || 0.82,
      hiddenX: px,
      hiddenY: py,
      driftX: Helpers.rand(-0.08, 0.08),
      driftY: Helpers.rand(-0.08, 0.08),
      swirl: Helpers.rand(-0.004, 0.004)
    });

    Effects.emitParticle(px, py, 0x9aa5ad, 18, 0.8);
    if (window.SoundSystem) SoundSystem.play("radio_out", { playbackRate: 0.78 });
    return true;
  }

  function breakStealth(reason="attack"){
    const S = GameState;
    if (S.activeSkillState.stealthT <= 0) return false;
    S.activeSkillState.stealthT = 0;
    S.activeSkillState.stealthAlpha = 1;
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, reason === "attack" ? 0xff8a66 : 0x6cf5ff, 5, 0.42);
    UI.hudUpdate();
    return true;
  }

  function updateDecoys(dt){
    const S = GameState;
    for (let i=S.decoys.length-1; i>=0; i--){
      const d = S.decoys[i];
      d.life -= dt;
      d.spr.rotation += 0.02 * dt;
      d.spr.alpha = 0.78 + Math.sin(performance.now() / 180 + i) * 0.18;
      if (d.life <= 0 || d.hp <= 0){
        Effects.emitParticle(d.x, d.y, 0xffd27a, 14, 1.0);
        S.uiLayer.removeChild(d.spr);
        S.decoys.splice(i, 1);
      }
    }
  }

  function getEscortDroneTarget(drone, range, taken = null) {
    const S = GameState;
    const rangeSq = range * range;
    let best = null;
    let bestScore = -Infinity;

    for (const enemy of S.enemies) {
      if (!enemy || (taken && taken.has(enemy))) continue;
      const circles = getEnemyHitCircles(enemy);
      for (const circle of circles) {
        const dx = circle.x - drone.x;
        const dy = circle.y - drone.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > rangeSq) continue;
        if (
          window.PlanetSystem &&
          PlanetSystem.blocksLineOfSight &&
          PlanetSystem.blocksLineOfSight(drone.x, drone.y, circle.x, circle.y, Math.max(2, circle.radius * 0.2))
        ) {
          continue;
        }
        const dist = Math.sqrt(distSq) || 1;
        const hpBias = enemy.tier === "boss" ? 0.12 : 0;
        const score = (1 - Helpers.clamp(dist / range, 0, 1)) + hpBias + getTargetPaintScoreBias(enemy);
        if (score <= bestScore) continue;
        best = { enemy, hitCircle: circle, dist };
        bestScore = score;
      }
    }

    return best;
  }

  function getDeployTurretTarget(turret, range) {
    const S = GameState;
    const rangeSq = range * range;
    let best = null;
    let bestScore = -Infinity;

    for (const enemy of S.enemies) {
      if (!enemy) continue;
      for (const circle of getEnemyHitCircles(enemy)) {
        const dx = circle.x - turret.x;
        const dy = circle.y - turret.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > rangeSq) continue;
        if (
          window.PlanetSystem &&
          PlanetSystem.blocksLineOfSight &&
          PlanetSystem.blocksLineOfSight(turret.x, turret.y, circle.x, circle.y, Math.max(2, circle.radius * 0.2))
        ) {
          continue;
        }
        const dist = Math.sqrt(distSq) || 1;
        const angle = Math.atan2(dy, dx);
        const angleDelta = Math.abs(Math.atan2(Math.sin(angle - turret.angle), Math.cos(angle - turret.angle)));
        const forwardScore = 1 - Helpers.clamp(angleDelta / Math.PI, 0, 1);
        const distScore = 1 - Helpers.clamp(dist / range, 0, 1);
        const score = forwardScore * 0.42 + distScore * 0.58 + getTargetPaintScoreBias(enemy);
        if (score <= bestScore) continue;
        bestScore = score;
        best = { enemy, hitCircle: circle, angle };
      }
    }

    return best;
  }

  function updateDeployTurrets(dt) {
    const S = GameState;
    const turrets = S.activeSkillState.deployTurrets || [];
    const recallDamageMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallDamageMul || 1) : 1;
    const recallFireRateMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallFireRateMul || 1) : 1;
    for (let i = turrets.length - 1; i >= 0; i--) {
      const turret = turrets[i];
      turret.life -= dt;
      turret.fireCd = Math.max(0, (turret.fireCd || 0) - dt);
      const lifeRatio = Math.max(0, Math.min(1, turret.life / Math.max(1, turret.maxLife)));
      turret.spr.alpha = 0.52 + lifeRatio * 0.4;

      if (turret.life <= 0) {
        Effects.emitParticle(turret.x, turret.y, 0xff867a, 5, 0.3);
        if (turret.spr && turret.spr.parent) turret.spr.parent.removeChild(turret.spr);
        turrets.splice(i, 1);
        continue;
      }

      const target = getDeployTurretTarget(turret, turret.range);
      if (target) {
        turret.angle = target.angle;
      }

      const pulse = 1 + Math.sin(performance.now() / 170 + turret.pulseSeed) * 0.04;
      turret.spr.scale.set(pulse, pulse);
      turret.spr.rotation = Helpers.lerp(turret.spr.rotation, turret.angle + Math.PI / 2, 0.18 * dt);

      if (!target || turret.fireCd > 0 || !window.CombatSystem || typeof CombatSystem.damageEnemy !== "function") continue;

      const damage = (target.enemy.tier === "boss" ? turret.bossDamage : turret.damage) * recallDamageMul;
      CombatSystem.damageEnemy(target.enemy, damage, 0xffd7b8, target.enemy.tier === "boss" ? 6 : 4, 0.34, target.hitCircle);
      emitDeployTurretShot(turret, target, 0xffd7b8);
      turret.fireCd = turret.fireInterval * recallFireRateMul;
    }
  }

  function syncEscortDrones(level) {
    const S = GameState;
    if (!S.player || !S.player.spr || !S.uiLayer) return;
    const drones = S.activeSkillState.escortDrones || (S.activeSkillState.escortDrones = []);
    const desiredCount = level <= 0 ? 0 : level >= 5 ? 4 : level >= 4 ? 3 : level >= 2 ? 2 : 1;

    while (drones.length > desiredCount) {
      const drone = drones.pop();
      if (drone && drone.spr && drone.spr.parent) drone.spr.parent.removeChild(drone.spr);
    }

    while (drones.length < desiredCount) {
      const index = drones.length;
      const spr = makeEscortDroneSprite(index % 2 === 0 ? 0x86e7ff : 0xc6a4ff);
      spr.x = S.player.spr.x;
      spr.y = S.player.spr.y;
      S.uiLayer.addChild(spr);
      drones.push({
        spr,
        index,
        x: S.player.spr.x,
        y: S.player.spr.y,
        orbitAngle: (Math.PI * 2 * index) / Math.max(1, desiredCount),
        orbitRadius: 34 + index * 4,
        fireCd: Helpers.randi(6, 14),
        pulseSeed: Math.random() * Math.PI * 2
      });
      Effects.emitParticle(S.player.spr.x, S.player.spr.y, index % 2 === 0 ? 0x8be9ff : 0xc6a4ff, 7, 0.5);
    }

    for (let i = 0; i < drones.length; i++) {
      const drone = drones[i];
      drone.index = i;
      drone.orbitRadius = 34 + i * 4;
    }
  }

  function updateEscortDrones(dt) {
    const S = GameState;
    if (!S.player || !S.player.spr) return;
    const level = Math.max(0, Math.min(5, S.stats.escortDroneLevel || 0));
    syncEscortDrones(level);
    const drones = S.activeSkillState.escortDrones || [];
    if (!drones.length) return;

    const attackRange = level >= 5 ? 280 : level >= 4 ? 262 : level >= 3 ? 246 : level >= 2 ? 220 : 190;
    const baseDamage = level >= 5 ? 1.7 : level >= 4 ? 1.58 : level >= 3 ? 1.42 : level >= 2 ? 1.15 : 0.9;
    const bossDamage = level >= 5 ? 1.18 : level >= 4 ? 1.08 : level >= 3 ? 0.98 : level >= 2 ? 0.85 : 0.7;
    const fireInterval = level >= 5 ? 16 : level >= 4 ? 18 : level >= 3 ? 22 : level >= 2 ? 28 : 36;
    const recallDamageMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallDamageMul || 1) : 1;
    const recallFireRateMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallFireRateMul || 1) : 1;
    const player = S.player;
    const aimAngle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);
    const taken = new Set();
    const radialFormation = level >= 4;
    const formationCount = Math.max(1, drones.length);

    for (let i = drones.length - 1; i >= 0; i--) {
      const drone = drones[i];
      drone.orbitAngle += (0.025 + i * 0.002) * dt;
      const sideOffset = i % 2 === 0 ? -0.9 : 0.9;
      const slotAngle = radialFormation
        ? aimAngle + ((Math.PI * 2 * i) / formationCount)
        : aimAngle + sideOffset;
      const sway = Math.sin(performance.now() / 340 + drone.pulseSeed) * (radialFormation ? 0.04 : 0.08);
      const anchorAngle = slotAngle + sway;
      const orbitSwing = radialFormation ? drone.orbitAngle * 0.08 : drone.orbitAngle * 0.22;
      const recallOrbitMul = S.activeSkillState.recallBoostT > 0 ? 0.72 : 1;
      const desiredX = player.spr.x + Math.cos(anchorAngle + orbitSwing) * drone.orbitRadius * recallOrbitMul;
      const desiredY = player.spr.y + Math.sin(anchorAngle + orbitSwing) * (drone.orbitRadius - (radialFormation ? 2 : 6)) * recallOrbitMul;
      drone.x = Helpers.lerp(drone.x != null ? drone.x : player.spr.x, desiredX, 0.16 * dt);
      drone.y = Helpers.lerp(drone.y != null ? drone.y : player.spr.y, desiredY, 0.16 * dt);
      drone.spr.x = drone.x;
      drone.spr.y = drone.y;
      drone.spr.alpha = 0.76 + Math.sin(performance.now() / 180 + drone.pulseSeed) * 0.16;
      drone.fireCd = Math.max(0, (drone.fireCd || 0) - dt);

      const target = getEscortDroneTarget(drone, attackRange, taken);
      if (target) {
        taken.add(target.enemy);
        const angle = Math.atan2(target.hitCircle.y - drone.y, target.hitCircle.x - drone.x);
        drone.spr.rotation = angle + Math.PI / 2;

        if (drone.fireCd <= 0 && window.CombatSystem && typeof CombatSystem.damageEnemy === "function") {
          const damage = (target.enemy.tier === "boss" ? bossDamage : baseDamage) * recallDamageMul;
          CombatSystem.damageEnemy(target.enemy, damage, 0x8be9ff, target.enemy.tier === "boss" ? 6 : 4, 0.36, target.hitCircle);
          if (window.Effects && Effects.emitLineTelegraph) {
            Effects.emitLineTelegraph(drone.x, drone.y, target.hitCircle.x, target.hitCircle.y, i % 2 === 0 ? 0x8be9ff : 0xc6a4ff, 2, 2);
          }
          Effects.emitParticle(drone.x, drone.y, 0x8be9ff, 3, 0.25);
          Effects.emitParticle(target.hitCircle.x, target.hitCircle.y, i % 2 === 0 ? 0x8be9ff : 0xc6a4ff, 3, 0.28);
          drone.fireCd = fireInterval * recallFireRateMul + i * 2;
        }
      } else {
        drone.spr.rotation = Helpers.lerp(drone.spr.rotation, anchorAngle + Math.PI / 2, 0.12 * dt);
      }
    }
  }

  function updateSwarmDrones(dt) {
    const S = GameState;
    if (!S.player || !S.player.spr) return;
    const drones = S.activeSkillState.swarmDrones || [];
    if (!drones.length) return;
    const recallDamageMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallDamageMul || 1) : 1;
    const recallFireRateMul = S.activeSkillState.recallBoostT > 0 ? (S.activeSkillState.recallFireRateMul || 1) : 1;
    const player = S.player;
    const aimAngle = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);

    for (let i = drones.length - 1; i >= 0; i--) {
      const drone = drones[i];
      drone.life -= dt;
      drone.fireCd = Math.max(0, (drone.fireCd || 0) - dt);
      drone.orbitAngle += (0.036 + i * 0.002) * dt;

      if (drone.life <= 0) {
        Effects.emitParticle(drone.x, drone.y, drone.tint, 4, 0.24);
        if (drone.spr && drone.spr.parent) drone.spr.parent.removeChild(drone.spr);
        drones.splice(i, 1);
        continue;
      }

      const lifeRatio = Math.max(0, Math.min(1, drone.life / Math.max(1, drone.maxLife)));
      const radialAngle = aimAngle + drone.orbitAngle + (Math.PI * 2 * i) / Math.max(1, drones.length);
      const recallOrbitMul = S.activeSkillState.recallBoostT > 0 ? 0.66 : 1;
      const anchorX = player.spr.x + Math.cos(radialAngle) * drone.orbitRadius * recallOrbitMul;
      const anchorY = player.spr.y + Math.sin(radialAngle) * drone.orbitRadius * recallOrbitMul;
      drone.x = Helpers.lerp(drone.x != null ? drone.x : player.spr.x, anchorX, 0.18 * dt);
      drone.y = Helpers.lerp(drone.y != null ? drone.y : player.spr.y, anchorY, 0.18 * dt);
      drone.spr.x = drone.x;
      drone.spr.y = drone.y;
      drone.spr.alpha = 0.42 + lifeRatio * 0.5 + Math.sin(performance.now() / 180 + drone.pulseSeed) * 0.08;

      const target = getEscortDroneTarget(drone, drone.range);
      if (target) {
        const angle = Math.atan2(target.hitCircle.y - drone.y, target.hitCircle.x - drone.x);
        drone.spr.rotation = angle + Math.PI / 2;
        if (drone.fireCd <= 0 && window.CombatSystem && typeof CombatSystem.damageEnemy === "function") {
          const damage = (target.enemy.tier === "boss" ? drone.bossDamage : drone.damage) * recallDamageMul;
          CombatSystem.damageEnemy(target.enemy, damage, drone.tint, target.enemy.tier === "boss" ? 5 : 3, 0.28, target.hitCircle);
          Effects.emitLineTelegraph(drone.x, drone.y, target.hitCircle.x, target.hitCircle.y, drone.tint, 4, 1.5);
          Effects.emitParticle(drone.x, drone.y, drone.tint, 2, 0.18);
          drone.fireCd = drone.fireInterval * recallFireRateMul;
        }
      } else {
        drone.spr.rotation = Helpers.lerp(drone.spr.rotation, radialAngle + Math.PI / 2, 0.12 * dt);
      }
    }
  }

  function resetEscortDrones() {
    const drones = GameState.activeSkillState.escortDrones || [];
    for (const drone of drones) {
      if (drone && drone.spr && drone.spr.parent) drone.spr.parent.removeChild(drone.spr);
    }
    GameState.activeSkillState.escortDrones = [];
  }

  function updateTrapPrisms(dt) {
    const S = GameState;
    const prisms = S.activeSkillState.trapPrisms || [];
    for (let i = prisms.length - 1; i >= 0; i--) {
      const prism = prisms[i];
      prism.life -= dt;
      prism.pulseCd = Math.max(0, prism.pulseCd - dt);
      redrawTrapPrism(prism);

      if (prism.life <= 0) {
        if (prism.spr && prism.spr.parent) prism.spr.parent.removeChild(prism.spr);
        prisms.splice(i, 1);
        continue;
      }

      if (prism.pulseCd > 0) continue;
      prism.pulseCd = prism.pulseInterval;

      const hits = new Set();
      const radiusSq = prism.radius * prism.radius;
      for (const node of prism.nodes) {
        Effects.emitPulse(node.x, node.y, 0xffb56a, prism.radius * 1.24, 8);

        for (let bulletIndex = S.enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
          const bullet = S.enemyBullets[bulletIndex];
          if (Helpers.dist2(node.x, node.y, bullet.x, bullet.y) > radiusSq) continue;
          Effects.emitParticle(bullet.x, bullet.y, 0xffd27a, 4, 0.35);
          if (bullet.spr && bullet.spr.parent) bullet.spr.parent.removeChild(bullet.spr);
          S.enemyBullets.splice(bulletIndex, 1);
        }

        for (const enemy of S.enemies) {
          if (!enemy || hits.has(enemy)) continue;
          const hitCircle = getEnemyHitCircles(enemy).find((circle) => {
            const rr = prism.radius + circle.radius;
            return Helpers.dist2(node.x, node.y, circle.x, circle.y) <= rr * rr;
          });
          if (!hitCircle) continue;
          hits.add(enemy);
          enemy.slowMul = Math.min(enemy.slowMul || 1, enemy.tier === "boss" ? prism.bossSlowRate : prism.slowRate);
          enemy.slowT = Math.max(enemy.slowT || 0, 16);
          if (window.CombatSystem && typeof CombatSystem.damageEnemy === "function") {
            CombatSystem.damageEnemy(
              enemy,
              enemy.tier === "boss" ? prism.bossDamage : prism.damage,
              0xffd27a,
              enemy.tier === "boss" ? 6 : 4,
              0.34,
              hitCircle
            );
          }
        }
      }
    }
  }

  function resetRepulsorFields() {
    const fields = GameState.activeSkillState.repulsorFields || [];
    for (const field of fields) {
      if (field && field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
    }
    GameState.activeSkillState.repulsorFields = [];
  }

  function resetStasisArcFields() {
    const fields = GameState.activeSkillState.stasisArcFields || [];
    for (const field of fields) {
      if (field && field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
    }
    GameState.activeSkillState.stasisArcFields = [];
  }

  function getRectFieldHitCircle(field, enemy, forwardHalf, sideHalf) {
    const cos = Math.cos(field.angle);
    const sin = Math.sin(field.angle);
    for (const circle of getEnemyHitCircles(enemy)) {
      const rx = circle.x - field.x;
      const ry = circle.y - field.y;
      const forward = rx * cos + ry * sin;
      const side = rx * -sin + ry * cos;
      if (Math.abs(forward) > forwardHalf + circle.radius) continue;
      if (Math.abs(side) > sideHalf + circle.radius) continue;
      return { circle, forward, side };
    }
    return null;
  }

  function getSectorFieldHitCircle(field, enemy) {
    const halfArc = field.arcAngle * 0.5;
    for (const circle of getEnemyHitCircles(enemy)) {
      const dx = circle.x - field.x;
      const dy = circle.y - field.y;
      const dist = Math.hypot(dx, dy);
      if (dist > field.radius + circle.radius) continue;
      if (dist + circle.radius < field.innerRadius) continue;
      const angle = Math.atan2(dy, dx);
      const angleDelta = Math.abs(Math.atan2(Math.sin(angle - field.angle), Math.cos(angle - field.angle)));
      const anglePadding = Math.asin(Math.min(1, circle.radius / Math.max(dist, circle.radius + 1)));
      if (angleDelta > halfArc + anglePadding) continue;
      return { circle, dist, angleDelta };
    }
    return null;
  }

  function updateRepulsorFields(dt) {
    const S = GameState;
    const fields = S.activeSkillState.repulsorFields || [];
    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i];
      field.life -= dt;
      field.pulseCd = Math.max(0, field.pulseCd - dt);
      redrawRepulsorField(field);

      if (field.life <= 0) {
        if (field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
        fields.splice(i, 1);
        continue;
      }

      const pulseNow = field.pulseCd <= 0;
      const cos = Math.cos(field.angle);
      const sin = Math.sin(field.angle);
      const forwardHalf = field.depth * 0.5;
      const sideHalf = field.span * 0.5;
      if (pulseNow) field.pulseCd = field.pulseInterval;

      for (const enemy of S.enemies) {
        if (!enemy) continue;
        const hit = getRectFieldHitCircle(field, enemy, forwardHalf, sideHalf);
        if (!hit) continue;

        enemy.slowMul = Math.min(enemy.slowMul || 1, enemy.tier === "boss" ? field.bossSlowRate : field.slowRate);
        enemy.slowT = Math.max(enemy.slowT || 0, 6);

        if (pulseNow) {
          const push = enemy.tier === "boss" ? field.knockback * 0.35 : field.knockback;
          enemy.x += cos * push;
          enemy.y += sin * push;
          if (enemy.spr) {
            enemy.spr.x = enemy.x;
            enemy.spr.y = enemy.y;
          }
          Effects.emitParticle(hit.circle.x, hit.circle.y, 0xffb56a, 2, 0.18);
        }
      }

      if (pulseNow) {
        const sparkleCount = 6;
        for (let j = 0; j < sparkleCount; j++) {
          const t = sparkleCount === 1 ? 0.5 : j / (sparkleCount - 1);
          const sideOffset = (t - 0.5) * field.span * 0.88;
          const px = field.x + (-sin * sideOffset) + (cos * Helpers.rand(-field.depth * 0.16, field.depth * 0.16));
          const py = field.y + (cos * sideOffset) + (sin * Helpers.rand(-field.depth * 0.16, field.depth * 0.16));
          Effects.emitParticle(px, py, 0xffcf8d, 2, 0.22);
        }
      }

      for (let bulletIndex = S.enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = S.enemyBullets[bulletIndex];
        const rx = bullet.x - field.x;
        const ry = bullet.y - field.y;
        const forward = rx * cos + ry * sin;
        const side = rx * -sin + ry * cos;
        if (Math.abs(forward) > forwardHalf || Math.abs(side) > sideHalf) continue;
        Effects.emitParticle(bullet.x, bullet.y, 0xffcf8d, 3, 0.26);
        if (bullet.spr && bullet.spr.parent) bullet.spr.parent.removeChild(bullet.spr);
        S.enemyBullets.splice(bulletIndex, 1);
      }
    }
  }

  function updateStasisArcFields(dt) {
    const S = GameState;
    const fields = S.activeSkillState.stasisArcFields || [];
    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i];
      field.life -= dt;
      field.pulseCd = Math.max(0, field.pulseCd - dt);
      redrawStasisArcField(field);

      if (field.life <= 0) {
        if (field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
        fields.splice(i, 1);
        continue;
      }

      const pulseNow = field.pulseCd <= 0;
      if (pulseNow) field.pulseCd = field.pulseInterval;

      for (const enemy of S.enemies) {
        if (!enemy) continue;
        const hit = getSectorFieldHitCircle(field, enemy);
        if (!hit) continue;

        const slowMul = enemy.tier === "boss" ? field.bossSlowRate : field.slowRate;
        enemy.slowMul = Math.min(enemy.slowMul || 1, slowMul);
        enemy.slowT = Math.max(enemy.slowT || 0, 7);

        if (pulseNow) {
          Effects.emitParticle(hit.circle.x, hit.circle.y, enemy.tier === "boss" ? 0xb6f7ff : 0x78ebff, 2, 0.2);
          const damage = enemy.tier === "boss" ? field.bossDamagePerPulse : field.damagePerPulse;
          if (damage > 0 && window.CombatSystem && typeof CombatSystem.damageEnemy === "function") {
            CombatSystem.damageEnemy(
              enemy,
              damage,
              0x78ebff,
              enemy.tier === "boss" ? 7 : 4,
              0.28,
              hit.circle
            );
          }
        }
      }

      if (!pulseNow) continue;
      const arcSteps = 7;
      for (let j = 0; j < arcSteps; j++) {
        const t = arcSteps === 1 ? 0.5 : j / (arcSteps - 1);
        const localAngle = (-field.arcAngle * 0.5) + field.arcAngle * t;
        const worldAngle = field.angle + localAngle;
        const radius = Helpers.rand(field.innerRadius + 8, field.radius - 8);
        const px = field.x + Math.cos(worldAngle) * radius;
        const py = field.y + Math.sin(worldAngle) * radius;
        Effects.emitParticle(px, py, 0x97efff, 2, 0.22);
      }
    }
  }

  function updateSmokeClouds(dt){
    const S = GameState;
    for (let i=S.smokeClouds.length-1; i>=0; i--){
      const smoke = S.smokeClouds[i];
      smoke.life -= dt;
      smoke.x += smoke.driftX * dt;
      smoke.y += smoke.driftY * dt;
      smoke.spr.x = smoke.x;
      smoke.spr.y = smoke.y;
      smoke.spr.rotation += smoke.swirl * dt;
      smoke.spr.alpha = Math.max(0, Math.min(0.96, smoke.life / Math.max(1, smoke.maxLife) * 1.12));

      const radiusSq = smoke.radius * smoke.radius;
      for (const enemy of S.enemies){
        if (Helpers.dist2(enemy.x, enemy.y, smoke.x, smoke.y) > radiusSq) continue;
        const slow = enemy.tier === "boss" ? smoke.bossSlowMul : smoke.slowMul;
        enemy.slowMul = Math.min(enemy.slowMul || 1, slow);
        enemy.slowT = Math.max(enemy.slowT || 0, 8);
      }

      if (smoke.life <= 0){
        S.fx.removeChild(smoke.spr);
        S.smokeClouds.splice(i, 1);
      }
    }
  }

  function updateMagneticSlowFields(dt) {
    const S = GameState;
    for (let i = S.slowFields.length - 1; i >= 0; i--) {
      const field = S.slowFields[i];
      field.life -= dt;
      redrawMagneticField(field);

      if (field.life <= 0) {
        if (field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
        S.slowFields.splice(i, 1);
        continue;
      }

      const cos = Math.cos(field.angle);
      const sin = Math.sin(field.angle);
      const halfWidth = field.width * 0.5;
      const halfHeight = field.height * 0.5;

      for (const enemy of S.enemies) {
        if (!enemy) continue;
        const rx = enemy.x - field.x;
        const ry = enemy.y - field.y;
        const along = rx * cos + ry * sin;
        const side = Math.abs(rx * -sin + ry * cos);
        const hitRadius = enemy.r || 0;
        if (Math.abs(along) > halfWidth + hitRadius || side > halfHeight + hitRadius) continue;
        const slowMul = enemy.tier === "boss" ? field.bossSlowRate : field.slowRate;
        enemy.slowMul = Math.min(enemy.slowMul || 1, slowMul);
        enemy.slowT = Math.max(enemy.slowT || 0, 4);
        if ((performance.now() | 0) % 10 === 0) {
          Effects.emitParticle(enemy.x, enemy.y, enemy.tier === "boss" ? 0xb69cff : 0x8eb9ff, 1, 0.2);
        }
      }
    }
  }

  function update(dt){
    const S = GameState;
    for (const slot of S.activeSkillState.slots){
      if (slot.cooldown > 0) slot.cooldown = Math.max(0, slot.cooldown - dt);
    }

    if (S.activeSkillState.boostT > 0){
      S.activeSkillState.boostT = Math.max(0, S.activeSkillState.boostT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const ang = S.activeSkillState.boostDir || (S.player.spr.rotation - Math.PI / 2);
        const p = Effects.makeTrailSprite(
          S.player.spr.x - Math.cos(ang) * 16 + Helpers.rand(-2, 2),
          S.player.spr.y - Math.sin(ang) * 16 + Helpers.rand(-2, 2),
          0x8be9ff,
          Helpers.rand(0.12, 0.2),
          0.18
        );
        S.fx.addChild(p);
        S.particles.push({
          spr:p,
          x:p.x,
          y:p.y,
          vx:Helpers.rand(-0.3, 0.3) - Math.cos(ang) * 0.6,
          vy:Helpers.rand(-0.3, 0.3) - Math.sin(ang) * 0.6,
          life:10,
          drag:0.84
        });
      }
    }
    if (S.activeSkillState.boostMitigationT > 0){
      S.activeSkillState.boostMitigationT = Math.max(0, S.activeSkillState.boostMitigationT - dt);
    } else {
      S.activeSkillState.boostMitigationMul = 1;
    }

    if (S.activeSkillState.afterburnerT > 0){
      S.activeSkillState.afterburnerT = Math.max(0, S.activeSkillState.afterburnerT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const p = Effects.makeTrailSprite(S.player.spr.x, S.player.spr.y + 12, 0xff7a47, Helpers.rand(0.12, 0.22), 0.22);
        S.fx.addChild(p);
        S.particles.push({ spr:p, x:p.x, y:p.y, vx:Helpers.rand(-0.4, 0.4), vy:Helpers.rand(0.6, 1.5), life:10, drag:0.88 });
      }
    }

    if (S.activeSkillState.recallBoostT > 0) {
      S.activeSkillState.recallBoostT = Math.max(0, S.activeSkillState.recallBoostT - dt);
      if (S.activeSkillState.recallBoostT <= 0) {
        S.activeSkillState.recallFireRateMul = 1;
        S.activeSkillState.recallDamageMul = 1;
      }
    }

    if (S.activeSkillState.stealthT > 0){
      S.activeSkillState.stealthT = Math.max(0, S.activeSkillState.stealthT - dt);
      if ((performance.now() | 0) % 4 === 0){
        const p = Effects.makeTrailSprite(
          S.player.spr.x + Helpers.rand(-6, 6),
          S.player.spr.y + Helpers.rand(-6, 6),
          Math.random() < 0.5 ? 0x6cf5ff : 0xc595ff,
          Helpers.rand(0.14, 0.24),
          0.18
        );
        S.fx.addChild(p);
        S.particles.push({ spr:p, x:p.x, y:p.y, vx:Helpers.rand(-0.35, 0.35), vy:Helpers.rand(-0.35, 0.35), life:12, drag:0.86 });
      }
      if (S.activeSkillState.stealthT <= 0) {
        breakStealth("expire");
      }
    }

    updateDecoys(dt);
    updateDeployTurrets(dt);
    updateEscortDrones(dt);
    updateSwarmDrones(dt);
    updateSmokeClouds(dt);
    updateMagneticSlowFields(dt);
    updateTrapPrisms(dt);
    updateRepulsorFields(dt);
    updateStasisArcFields(dt);
  }

  return {
    getDefinition,
    getOwnedSkills,
    getSlotSkill,
    getAssignableSkills,
    assignStartingLoadout,
    unlockSkill,
    clearSlot,
    assignSkillToSlot,
    breakStealth,
    getBoostDirection,
    getBoostDirectionLabel,
    getBoostDirectionIcon,
    setBoostDirection,
    cycleBoostDirection,
    tryUseSlotByKey,
    tryUseBoostDirection,
    resetEscortDrones,
    resetDeployTurrets,
    resetSwarmDrones,
    resetTrapPrisms,
    resetRepulsorFields,
    resetStasisArcFields,
    update
  };
})();
