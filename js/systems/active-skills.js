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
    if (skill.id === "boost") casted = castBoost(skill, context);
    if (skill.id === "afterburner") casted = castAfterburner(skill);
    if (skill.id === "nova_pulse") casted = castNovaPulse(skill);
    if (skill.id === "chain_attack") casted = castChainAttack(skill);
    if (skill.id === "crossfire_missiles") casted = castCrossfireMissiles(skill);
    if (skill.id === "omni_burst") casted = castOmniBurst(skill);
    if (skill.id === "magnetic_slow_field") casted = castMagneticSlowField(skill);
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
    const boostSpec = getBoostSpec(skill, facing, level, context.boostDirection || null);

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
    let profile = skill.effectData.forward;

    if (explicitDirection === "forward"){
      angle = facing;
      profile = skill.effectData.forward;
    } else if (explicitDirection === "back" && level >= 3){
      angle = facing + Math.PI;
      profile = skill.effectData.back;
    } else if (explicitDirection === "left" && level >= 2){
      angle = facing - Math.PI / 2;
      profile = skill.effectData.side;
    } else if (explicitDirection === "right" && level >= 2){
      angle = facing + Math.PI / 2;
      profile = skill.effectData.side;
    }

    return { angle, profile };
  }

  function castAfterburner(skill){
    const S = GameState;
    S.activeSkillState.afterburnerT = Math.max(S.activeSkillState.afterburnerT, skill.duration);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xff7a47, 10, 0.75);
    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0xff7a47, 46, 12);
    return true;
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
        const score = forwardBias * 0.58 + distanceBias * 0.42;
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

  function castStealthField(skill){
    const S = GameState;
    S.activeSkillState.stealthT = Math.max(S.activeSkillState.stealthT, skill.duration);
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
    updateSmokeClouds(dt);
    updateMagneticSlowFields(dt);
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
    tryUseSlotByKey,
    tryUseBoostDirection,
    update
  };
})();
