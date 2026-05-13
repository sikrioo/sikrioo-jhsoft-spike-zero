window.EnemySystem = (() => {
  const STAGE_FOUR_SATELLITE_LAYOUT = [
    [0.20, 0.22, "h", 90, true, 28],
    [0.45, 0.28, "v", 75, false, 22],
    [0.74, 0.22, "h", 110, true, 36],
    [0.32, 0.58, "v", 95, true, 28],
    [0.62, 0.55, "h", 85, false, 30],
    [0.84, 0.67, "v", 70, true, 22],
    [0.52, 0.78, "h", 115, false, 32]
  ];

  const SLOW_FIELD_SPECS = [
    null,
    { interval: 180, duration: 108, width: 160, height: 90, spawnDistance: 120, slowRate: 0.62, bossSlowRate: 0.86, maxFields: 1, color: 0x72a8ff, accent: 0xc9a2ff },
    { interval: 180, duration: 108, width: 160, height: 90, spawnDistance: 120, slowRate: 0.55, bossSlowRate: 0.8, maxFields: 1, color: 0x6f9cff, accent: 0xbf92ff },
    { interval: 180, duration: 114, width: 172, height: 96, spawnDistance: 126, slowRate: 0.48, bossSlowRate: 0.74, maxFields: 2, color: 0x6b8fff, accent: 0xb782ff }
  ];

  function getTargetForEnemy(enemy){
    const S = GameState;
    let bestDecoy = null;
    let bestDist = Infinity;
    for (const decoy of S.decoys){
      const d2 = Helpers.dist2(enemy.x, enemy.y, decoy.x, decoy.y);
      if (d2 < bestDist){
        bestDist = d2;
        bestDecoy = decoy;
      }
    }
    if (bestDecoy) return { x: bestDecoy.x, y: bestDecoy.y, r: bestDecoy.r, decoy: bestDecoy };
    if (S.activeSkillState.stealthT > 0){
      return {
        x: S.activeSkillState.stealthLastKnownX || S.player.spr.x,
        y: S.activeSkillState.stealthLastKnownY || S.player.spr.y,
        r: S.player.r,
        hidden: true
      };
    }
    for (const smoke of S.smokeClouds || []){
      const rr = smoke.radius + S.player.r;
      if (Helpers.dist2(S.player.spr.x, S.player.spr.y, smoke.x, smoke.y) <= rr * rr){
        const angle = Math.atan2(S.player.spr.y - smoke.y, S.player.spr.x - smoke.x) + Math.PI + Math.sin(performance.now() / 420) * 0.8;
        const hiddenDist = smoke.radius * 0.55;
        return {
          x: smoke.x + Math.cos(angle) * hiddenDist,
          y: smoke.y + Math.sin(angle) * hiddenDist,
          r: S.player.r,
          obscured: true
        };
      }
    }
    return { x: S.player.spr.x, y: S.player.spr.y, r: S.player.r, player: S.player };
  }

  function drawTargetPaintMarker(marker, radius) {
    marker.clear();
    marker.lineStyle(2, 0xffc46c, 0.92);
    marker.drawCircle(0, 0, radius + 9);
    marker.moveTo(-radius - 13, 0);
    marker.lineTo(-radius - 5, 0);
    marker.moveTo(radius + 5, 0);
    marker.lineTo(radius + 13, 0);
    marker.moveTo(0, -radius - 13);
    marker.lineTo(0, -radius - 5);
    marker.moveTo(0, radius + 5);
    marker.lineTo(0, radius + 13);
  }

  function updateTargetPaintState(enemy, dt) {
    if (!enemy) return;
    if (enemy.targetPaintT > 0) {
      enemy.targetPaintT = Math.max(0, enemy.targetPaintT - dt);
    } else {
      enemy.targetPaintAmp = 1;
    }

    if (!enemy.targetPaintMarker) return;
    if (enemy.targetPaintT > 0) {
      enemy.targetPaintMarker.visible = true;
      enemy.targetPaintMarker.rotation += 0.014 * dt;
      enemy.targetPaintMarker.alpha = 0.54 + Math.sin(performance.now() / 110) * 0.18;
      const pulse = 0.96 + Math.sin(performance.now() / 160) * 0.06;
      enemy.targetPaintMarker.scale.set(pulse, pulse);
      return;
    }
    enemy.targetPaintMarker.visible = false;
    enemy.targetPaintMarker.alpha = 0;
    enemy.targetPaintMarker.rotation = 0;
    enemy.targetPaintMarker.scale.set(1, 1);
  }

  function applyEnemyStatusVisuals(enemy) {
    if (!enemy || !enemy.bodySpr || enemy.bodySpr.tint == null) return;
    if (enemy.staggerT > 0) {
      enemy.bodySpr.tint = ((performance.now() | 0) % 6 < 3) ? 0xc9fbff : 0xe1c7ff;
      return;
    }
    if (enemy.slowT > 0 && (enemy.slowMul || 1) < 0.98) {
      enemy.bodySpr.tint = ((performance.now() | 0) % 10 < 5) ? 0x8fe9ff : 0xdffcff;
      if (((performance.now() + enemy.x * 7 + enemy.y * 5) | 0) % 18 === 0) {
        Effects.emitParticle(
          enemy.x + Helpers.rand(-enemy.r * 0.45, enemy.r * 0.45),
          enemy.y + Helpers.rand(-enemy.r * 0.45, enemy.r * 0.45),
          0x8fe9ff,
          1,
          0.12
        );
      }
      return;
    }
    enemy.bodySpr.tint = 0xffffff;
  }

  function clearSlowField(field) {
    if (field && field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
  }

  function redrawSlowField(field) {
    const g = field.spr;
    const lifeRatio = Math.max(0, Math.min(1, field.life / Math.max(1, field.maxLife)));
    const pulse = 0.82 + Math.sin(performance.now() / 180 + field.seed) * 0.08;
    const edgeAlpha = 0.36 + lifeRatio * 0.18;
    const fillAlpha = 0.08 + lifeRatio * 0.08;
    g.clear();
    g.lineStyle(2, field.color, edgeAlpha);
    g.beginFill(field.accent, fillAlpha);
    g.drawRoundedRect(-field.width * 0.5, -field.height * 0.5, field.width, field.height, 14);
    g.endFill();
    g.lineStyle(1, 0xffffff, 0.12 + lifeRatio * 0.08);
    g.drawRoundedRect(-field.width * 0.44, -field.height * 0.38, field.width * 0.88, field.height * 0.76, 10);
    g.scale.set(pulse, pulse);
    g.alpha = Math.max(0, Math.min(0.92, 0.46 + lifeRatio * 0.28));
  }

  function spawnSlowField(spec) {
    const S = GameState;
    const player = S.player;
    if (!player || !player.spr) return;

    const angle = player.spr.rotation - Math.PI / 2;
    const spawnX = player.spr.x + Math.cos(angle) * spec.spawnDistance;
    const spawnY = player.spr.y + Math.sin(angle) * spec.spawnDistance;
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
      width: spec.width,
      height: spec.height,
      life: spec.duration,
      maxLife: spec.duration,
      slowRate: spec.slowRate,
      bossSlowRate: spec.bossSlowRate,
      color: spec.color,
      accent: spec.accent,
      seed: Math.random() * Math.PI * 2
    };

    redrawSlowField(field);
    Effects.emitPulse(spawnX, spawnY, spec.color, Math.max(spec.width * 0.46, spec.height), 10);
    S.slowFields.push(field);
  }

  function updateSlowFields(dt) {
    const S = GameState;
    const level = Math.max(0, Math.min(3, S.stats.slowFieldLevel || 0));
    const spec = SLOW_FIELD_SPECS[level];

    if (!spec || !S.player || !S.player.spr) {
      S.stats.slowFieldCooldown = 0;
      for (let i = S.slowFields.length - 1; i >= 0; i--) {
        clearSlowField(S.slowFields[i]);
        S.slowFields.splice(i, 1);
      }
      return;
    }

    S.stats.slowFieldCooldown = Math.max(0, (S.stats.slowFieldCooldown || 0) - dt);
    if (S.stats.slowFieldCooldown <= 0) {
      while (S.slowFields.length >= spec.maxFields) {
        clearSlowField(S.slowFields[0]);
        S.slowFields.shift();
      }
      spawnSlowField(spec);
      S.stats.slowFieldCooldown = spec.interval;
    }

    for (let i = S.slowFields.length - 1; i >= 0; i--) {
      const field = S.slowFields[i];
      field.life -= dt;
      redrawSlowField(field);

      if (field.life <= 0) {
        clearSlowField(field);
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
      }
    }
  }

  function getTierByWaveAndRoll(){
    const wave = GameState.progression.wave;
    const stage = Math.max(1, GameState.progression.stage || 1);
    const difficulty = GAME_BALANCE.DIFFICULTY[GameState.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    const bossRoll = Math.random();
    const roll = Math.min(0.999, bossRoll + (difficulty.specialThreatBonus || 0));

    if (window.WaveSystem && WaveSystem.isAsteroidMapTestStage && WaveSystem.isAsteroidMapTestStage(stage)) return "satellite";
    if (stage >= 3 && wave >= 10 && bossRoll > 0.985) return "boss";
    if (stage >= 3 && wave >= 6  && bossRoll > 0.94)  return "midboss";
    if (stage >= 3 && wave >= 6  && roll > 0.89)  return "turret_laser";
    if (stage >= 3 && wave >= 5  && roll > 0.84)  return "turret_sniper";
    if (stage >= 3 && wave >= 7  && roll > 0.88)  return "tank";
    if (stage >= 3 && wave >= 4  && roll > 0.70)  return "spin_lancer";
    if (stage >= 3 && wave >= 3  && roll > 0.62)  return "lancer";

    if (stage >= 2 && wave >= 4  && roll > 0.80)  return "turret_mg";
    if (stage >= 2 && wave >= 5  && roll > 0.82)  return "rusher";
    if (stage >= 2 && wave >= 4  && roll > 0.74)  return "flanker";
    if (stage >= 2 && wave >= 4  && roll > 0.66)  return "spin_lancer";
    if (stage >= 2 && wave >= 3  && roll > 0.58)  return "lancer";

    if (wave >= 3  && roll > 0.66)  return "elite";
    if (wave >= 2  && roll > 0.58)  return "bomber";
    if (wave >= 2  && roll > 0.48)  return "gunner";
    return "normal";
  }

  function getEnemyBulletSpeedMultiplier(){
    const difficulty = GAME_BALANCE.DIFFICULTY[GameState.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    return difficulty.enemyBulletSpeedMultiplier || 1;
  }

  function drawBomberSignal(enemy, alpha=0.24){
    if (!enemy.signalSpr || !enemy.enemyState) return;
    const g = enemy.signalSpr;
    const radius = enemy.enemyState.explosionRadius;
    g.clear();
    g.lineStyle(2, 0xff7b39, Math.min(0.85, alpha + 0.25));
    g.beginFill(0xff6a3d, alpha);
    g.drawCircle(0, 0, radius);
    g.endFill();
  }

  function tryShootGunner(enemy, target){
    const state = enemy.enemyState;
    if (!state || state.fireCd > 0) return;
    const ang = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const bullet = EnemyCombat.makeEnemyBullet(
      enemy.x + Math.cos(ang) * (enemy.r + 8),
      enemy.y + Math.sin(ang) * (enemy.r + 8),
      ang,
      enemy.dmg
    );
    GameState.enemyBullets.push(bullet);
    state.fireCd = state.fireInterval;
    Effects.emitParticle(enemy.x + Math.cos(ang) * enemy.r, enemy.y + Math.sin(ang) * enemy.r, 0xffcc59, 5, 0.55);
  }

  function updateGunnerEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const moveTarget = getEnemyApproachPoint(enemy, target, state, dt);
    const toMoveX = moveTarget.x - enemy.x;
    const toMoveY = moveTarget.y - enemy.y;
    const moveDist = Math.hypot(toMoveX, toMoveY) || 1;
    let moveDx = toMoveX / moveDist;
    let moveDy = toMoveY / moveDist;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    if (dist < state.retreatDistance){
      moveDx *= -1;
      moveDy *= -1;
      moveSpeed *= 0.92;
      body.tint = 0xffe7a6;
    } else if (dist < state.preferredDistance){
      moveDx = 0;
      moveDy = 0;
      moveSpeed = 0;
      body.tint = 0xffffff;
    } else {
      body.tint = 0xfff1c9;
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(toPlayerY, toPlayerX);
    enemy.hpText.rotation = -enemy.spr.rotation;

    if (dist <= state.attackDistance){
      tryShootGunner(enemy, target);
    }
  }

  function getTargetFacingAngle(enemy, target) {
    const player = GameState.player;
    if (target.player && player && player.spr) return player.spr.rotation - Math.PI / 2;
    return Math.atan2(target.y - enemy.y, target.x - enemy.x);
  }

  function rollApproachMode(state) {
    const modes = state && Array.isArray(state.approachModes) && state.approachModes.length
      ? state.approachModes
      : ["front", "side_left", "side_right", "back"];
    return modes[Helpers.randi(0, modes.length - 1)];
  }

  function refreshApproachState(enemy, target, state) {
    if (!state) return;
    state.approachMode = rollApproachMode(state);
    state.approachTimer = Helpers.randi(state.retargetMin || 36, state.retargetMax || 90);
    state.approachRadius = Helpers.rand(state.radiusMin || 90, state.radiusMax || 170);
    const facing = getTargetFacingAngle(enemy, target);
    const baseRadius = state.approachRadius;
    let angle = facing;
    if (state.approachMode === "side_left") angle = facing - Math.PI / 2;
    if (state.approachMode === "side_right") angle = facing + Math.PI / 2;
    if (state.approachMode === "back") angle = facing + Math.PI;
    state.approachAngle = angle;
    state.approachX = target.x + Math.cos(angle) * baseRadius;
    state.approachY = target.y + Math.sin(angle) * baseRadius;
  }

  function getEnemyApproachPoint(enemy, target, state, dt = 1) {
    if (!state || !state.ambushStyle) return target;
    state.approachTimer = Math.max(0, (state.approachTimer || 0) - dt);
    const directDist = Math.hypot(target.x - enemy.x, target.y - enemy.y) || 1;
    const closeDistance = state.refreshCloseDistance || 96;
    if (directDist <= closeDistance) {
      return target;
    }
    if (
      !state.approachMode ||
      state.approachTimer <= 0
    ) {
      refreshApproachState(enemy, target, state);
    }

    const desiredX = state.approachX != null ? state.approachX : target.x;
    const desiredY = state.approachY != null ? state.approachY : target.y;
    const blend = Helpers.clamp(state.approachWeight || 0.72, 0, 1);
    return {
      x: Helpers.lerp(target.x, desiredX, blend),
      y: Helpers.lerp(target.y, desiredY, blend)
    };
  }

  function fireTurretMachinegun(enemy, target, accuracy = 0.08, count = 1, speed = 6.2, spread = 0.12) {
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * spread;
      const ang = baseAngle + offset + Helpers.rand(-accuracy, accuracy);
      const bullet = EnemyCombat.makeEnemyBullet(
        enemy.x + Math.cos(ang) * (enemy.r + 10),
        enemy.y + Math.sin(ang) * (enemy.r + 10),
        ang,
        enemy.dmg
      );
      const speedMul = getEnemyBulletSpeedMultiplier();
      bullet.vx = Math.cos(ang) * speed * speedMul;
      bullet.vy = Math.sin(ang) * speed * speedMul;
      bullet.color = 0xffcf74;
      bullet.spr.tint = 0xffcf74;
      GameState.enemyBullets.push(bullet);
    }
    Effects.emitParticle(enemy.x + Math.cos(baseAngle) * enemy.r, enemy.y + Math.sin(baseAngle) * enemy.r, 0xffcf74, 7 + count, 0.7);
  }

  function fireTurretLaser(enemy, target, options = {}) {
    const S = GameState;
    const state = enemy.enemyState;
    const color = options.color || 0xff84da;
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const length = options.length || 420;
    const width = options.width || 9;
    const life = options.life || 12;

    EnemyVisuals.clearTurretLaserFx(enemy);

    const laser = new PIXI.Graphics();
    S.fx.addChild(laser);
    state.laserSpr = laser;
    state.laserLife = life;
    state.laserAngle = angle;
    state.laserLength = length;
    state.laserWidth = width;
    state.laserDamage = options.damage || enemy.dmg;
    state.laserDamageCd = 0;

    const endX = enemy.x + Math.cos(angle) * length;
    const endY = enemy.y + Math.sin(angle) * length;
    Effects.emitPulse(enemy.x, enemy.y, color, width * 5.5, 10);
    Effects.emitParticle(enemy.x, enemy.y, color, enemy.tier === "turret_laser" ? 14 : 8, enemy.tier === "turret_laser" ? 1.2 : 0.8);
    Effects.emitLineTelegraph(enemy.x, enemy.y, endX, endY, color, 6, width + 2);
  }

  function redrawTurretLaser(enemy) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    const g = state.laserSpr;
    const alpha = Math.max(0, Math.min(1, state.laserLife / Math.max(1, state.laserMaxLife || state.laserLife)));
    const cos = Math.cos(state.laserAngle);
    const sin = Math.sin(state.laserAngle);
    const endX = cos * state.laserLength;
    const endY = sin * state.laserLength;
    g.x = enemy.x;
    g.y = enemy.y;
    g.clear();
    g.lineStyle(state.laserWidth + 8, 0xff84da, 0.08 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(state.laserWidth + 3, 0xff84da, 0.22 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(state.laserWidth, 0xff84da, 0.92 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(Math.max(2, state.laserWidth * 0.4), 0xffffff, 0.85 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
  }

  function applyTurretLaserDamage(enemy, dt) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    state.laserDamageCd -= dt;
    if (state.laserDamageCd > 0) return;
    state.laserDamageCd = enemy.tier === "turret_laser" ? 3 : 5;

    const player = GameState.player;
    const cos = Math.cos(state.laserAngle);
    const sin = Math.sin(state.laserAngle);
    const rx = player.spr.x - enemy.x;
    const ry = player.spr.y - enemy.y;
    const along = rx * cos + ry * sin;
    const side = Math.abs(rx * -sin + ry * cos);
    if (along < 0 || along > state.laserLength || side > state.laserWidth + player.r) return;

    EnemyCombat.hitPlayerWithEnemyDamage(state.laserDamage, 0xff84da, cos, sin, {
      invFrames: enemy.tier === "turret_laser" ? 16 : 14,
      push: enemy.tier === "turret_laser" ? 5.4 : 4.2,
      particleCount: enemy.tier === "turret_laser" ? 14 : 10,
      particlePower: enemy.tier === "turret_laser" ? 1.05 : 0.82,
      pulseRadius: enemy.tier === "turret_laser" ? 34 : 24,
      pulseLife: 8
    });
  }

  function drawSatelliteLaserWarning(enemy) {
    const state = enemy.enemyState;
    if (!state) return;
    if (!state.warningSpr) {
      state.warningSpr = new PIXI.Graphics();
      GameState.fx.addChild(state.warningSpr);
    }
    const len = state.laserLength || 1200;
    const endX = enemy.x + Math.cos(state.laserAngle) * len;
    const endY = enemy.y + Math.sin(state.laserAngle) * len;
    const alpha = 0.18 + (state.warn / Math.max(1, state.warnMax || 1)) * 0.2;
    const g = state.warningSpr;
    g.clear();
    g.lineStyle(1.4, 0xff5a6e, alpha);
    g.moveTo(enemy.x, enemy.y);
    g.lineTo(endX, endY);
  }

  function clearSatelliteWarning(state) {
    if (!state || !state.warningSpr) return;
    if (state.warningSpr.parent) state.warningSpr.parent.removeChild(state.warningSpr);
    state.warningSpr = null;
  }

  function fireSatelliteLaser(enemy) {
    const state = enemy.enemyState;
    if (!state) return;
    clearSatelliteWarning(state);
    EnemyVisuals.clearTurretLaserFx(enemy);
    const laser = new PIXI.Graphics();
    GameState.fx.addChild(laser);
    state.laserSpr = laser;
    state.laserLife = state.fire;
    state.laserMaxLife = state.fire;
    state.laserDamageCd = 0;
    Effects.emitPulse(enemy.x, enemy.y, 0xff4258, 34, 10);
    Effects.emitParticle(enemy.x, enemy.y, 0xff4258, 10, 0.8);
  }

  function redrawSatelliteLaser(enemy) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    const g = state.laserSpr;
    const alpha = Math.max(0, Math.min(1, state.laserLife / Math.max(1, state.laserMaxLife || state.laserLife)));
    const endX = Math.cos(state.laserAngle) * (state.laserLength || 1200);
    const endY = Math.sin(state.laserAngle) * (state.laserLength || 1200);
    g.x = enemy.x;
    g.y = enemy.y;
    g.clear();
    g.lineStyle(8, 0xff2543, 0.16 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(4, 0xff3b55, 0.34 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(1.6, 0xffffff, 0.88 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
  }

  function applySatelliteLaserDamage(enemy, dt) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    state.laserDamageCd -= dt;
    if (state.laserDamageCd > 0) return;
    state.laserDamageCd = 4;

    const player = GameState.player;
    const cos = Math.cos(state.laserAngle);
    const sin = Math.sin(state.laserAngle);
    const rx = player.spr.x - enemy.x;
    const ry = player.spr.y - enemy.y;
    const along = rx * cos + ry * sin;
    const side = Math.abs(rx * -sin + ry * cos);
    if (along < 0 || along > (state.laserLength || 1200) || side > (state.laserWidth || 5) + player.r) return;

    EnemyCombat.hitPlayerWithEnemyDamage(state.laserDamage || enemy.dmg, 0xff4258, cos, sin, {
      invFrames: 18,
      push: 4.4,
      particleCount: 12,
      particlePower: 0.9,
      pulseRadius: 28,
      pulseLife: 8
    });
  }

  function applySatelliteContactPush(enemy) {
    const player = GameState.player;
    if (!player || !player.spr) return;
    const rr = enemy.r + player.r;
    const dx = player.spr.x - enemy.x;
    const dy = player.spr.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist >= rr) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const pushOut = rr - dist + 1;
    player.spr.x += nx * pushOut;
    player.spr.y += ny * pushOut;
    player.vx += nx * 1.8;
    player.vy += ny * 1.8;
  }

  function updateSatelliteEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    state.phaseT += dt;
    const motion = Math.sin(state.phaseT * state.speed + state.phase) * state.range;
    enemy.x = state.baseX + (state.moveType === "h" ? motion : 0);
    enemy.y = state.baseY + (state.moveType === "v" ? motion : 0);
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    applySatelliteContactPush(enemy);

    if (state.canLaser) {
      if (state.fire > 0) {
        state.fire = Math.max(0, state.fire - dt);
        if (!state.laserSpr) fireSatelliteLaser(enemy);
        state.laserLife = state.fire;
        redrawSatelliteLaser(enemy);
        applySatelliteLaserDamage(enemy, dt);
        if (state.fire <= 0) EnemyVisuals.clearTurretLaserFx(enemy);
      } else if (state.warn > 0) {
        state.warn = Math.max(0, state.warn - dt);
        state.laserAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        drawSatelliteLaserWarning(enemy);
        if (state.warn <= 0) {
          state.fire = Helpers.randi(30, 54);
          fireSatelliteLaser(enemy);
        }
      } else {
        clearSatelliteWarning(state);
        state.timer -= dt;
        if (state.timer <= 0) {
          state.warn = Helpers.randi(30, 64);
          state.warnMax = state.warn;
          state.laserAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
          state.timer = Helpers.randi(140, 320);
        }
      }
    }

    EnemyVisuals.updateSatelliteVisuals(enemy);
  }

  function updateTurretMachinegunEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist > state.preferredDistance + 36) {
        enemy.x += moveDx * moveSpeed * dt;
        enemy.y += moveDy * moveSpeed * dt;
      } else if (dist < state.preferredDistance - 28) {
        enemy.x -= moveDx * moveSpeed * 0.68 * dt;
        enemy.y -= moveDy * moveSpeed * 0.68 * dt;
      }

      if (dist <= state.attackDistance && state.fireCd <= 0) {
        fireTurretMachinegun(enemy, target, 0.24, 1, 5.6, 0);
        state.fireCd = 42;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "lock";
        state.stateTime = 0;
      }
    } else if (state.mode === "lock") {
      if (state.stateTime === 0 || state.stateTime <= dt) {
        Effects.emitPulse(enemy.x, enemy.y, 0xffd879, 42, 10);
      }
      if (state.stateTime >= state.lockTime) {
        state.mode = "fixed";
        state.stateTime = 0;
        state.fireCd = 8;
      }
    } else if (state.mode === "fixed") {
      if (state.fireCd <= 0) {
        fireTurretMachinegun(enemy, target, 0.04, 3, 7.2, 0.11);
        state.fireCd = 10;
      }
      if (state.stateTime >= state.fixedTime) {
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 72;
      }
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    EnemyVisuals.updateTurretVisuals(enemy, target, dt);
  }

  function updateTurretLaserEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist > state.preferredDistance + 42) {
        enemy.x += moveDx * moveSpeed * dt;
        enemy.y += moveDy * moveSpeed * dt;
      } else if (dist < state.preferredDistance - 36) {
        enemy.x -= moveDx * moveSpeed * 0.64 * dt;
        enemy.y -= moveDy * moveSpeed * 0.64 * dt;
      }

      if (dist <= state.shortAttackDistance && state.fireCd <= 0) {
        const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        Effects.emitLineTelegraph(enemy.x, enemy.y, enemy.x + Math.cos(aim) * 170, enemy.y + Math.sin(aim) * 170, 0xffa6e8, 12, 5);
        fireTurretLaser(enemy, target, { length: 180, width: 5, life: 8, damage: Math.max(6, enemy.dmg - 4), color: 0xffa6e8 });
        state.laserMaxLife = 8;
        state.fireCd = 96;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "charge";
        state.stateTime = 0;
        const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        Effects.emitLineTelegraph(enemy.x, enemy.y, enemy.x + Math.cos(aim) * state.longAttackDistance, enemy.y + Math.sin(aim) * state.longAttackDistance, 0xff84da, state.chargeTime, 7);
      }
    } else if (state.mode === "charge") {
      if (state.stateTime >= state.chargeTime) {
        state.mode = "firing";
        state.stateTime = 0;
        fireTurretLaser(enemy, target, {
          length: state.longAttackDistance,
          width: 11,
          life: state.fireTime,
          damage: enemy.dmg,
          color: 0xff84da
        });
        state.laserMaxLife = state.fireTime;
      }
    } else if (state.mode === "firing") {
      if (state.stateTime >= state.fireTime) {
        EnemyVisuals.clearTurretLaserFx(enemy);
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 110;
        state.fireCd = 78;
      }
    }

    if (state.laserSpr) {
      state.laserLife -= dt;
      redrawTurretLaser(enemy);
      applyTurretLaserDamage(enemy, dt);
      if (state.laserLife <= 0) EnemyVisuals.clearTurretLaserFx(enemy);
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    EnemyVisuals.updateTurretVisuals(enemy, target, dt);
  }

  function fireTurretSniperShot(enemy, target, options = {}) {
    const color = options.color || 0xbfe9ff;
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const bullet = EnemyCombat.makeEnemyBullet(
      enemy.x + Math.cos(angle) * (enemy.r + 12),
      enemy.y + Math.sin(angle) * (enemy.r + 12),
      angle,
      options.damage || enemy.dmg
    );
    const speedMul = getEnemyBulletSpeedMultiplier();
    bullet.vx = Math.cos(angle) * (options.speed || 9.8) * speedMul;
    bullet.vy = Math.sin(angle) * (options.speed || 9.8) * speedMul;
    bullet.r = options.radius || 10;
    bullet.life = options.life || 124;
    bullet.color = color;
    bullet.spr.tint = color;
    bullet.spr.scale.set(options.scaleX || 1.3, options.scaleY || 1.85);
    GameState.enemyBullets.push(bullet);

    const endX = enemy.x + Math.cos(angle) * 240;
    const endY = enemy.y + Math.sin(angle) * 240;
    Effects.emitLineTelegraph(enemy.x, enemy.y, endX, endY, color, 6, 4);
    Effects.emitPulse(enemy.x, enemy.y, color, 46, 10);
    Effects.emitParticle(enemy.x, enemy.y, color, 12, 1.05);
    Effects.emitParticle(enemy.x + Math.cos(angle) * (enemy.r + 18), enemy.y + Math.sin(angle) * (enemy.r + 18), 0xffffff, 8, 0.75);
  }

  function updateTurretSniperEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist < state.preferredDistance - 36) {
        enemy.x -= moveDx * moveSpeed * 0.9 * dt;
        enemy.y -= moveDy * moveSpeed * 0.9 * dt;
      } else if (dist > state.preferredDistance + 42) {
        enemy.x += moveDx * moveSpeed * 0.46 * dt;
        enemy.y += moveDy * moveSpeed * 0.46 * dt;
      }

      if (dist <= state.skirmishDistance && state.fireCd <= 0) {
        fireTurretSniperShot(enemy, target, {
          damage: Math.max(8, enemy.dmg - 7),
          speed: 7.4,
          radius: 8.5,
          scaleX: 1.1,
          scaleY: 1.55,
          color: 0xd6f2ff
        });
        state.fireCd = 92;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "charge";
        state.stateTime = 0;
      }
    } else if (state.mode === "charge") {
      const ratio = Math.min(1, state.stateTime / state.chargeTime);
      const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      const length = state.shotDistance;
      const telegraphWidth = 11 - ratio * 8;
      Effects.emitLineTelegraph(
        enemy.x,
        enemy.y,
        enemy.x + Math.cos(aim) * length,
        enemy.y + Math.sin(aim) * length,
        0xbfe9ff,
        3,
        Math.max(2, telegraphWidth)
      );
      if (state.stateTime >= state.chargeTime) {
        state.mode = "firing";
        state.stateTime = 0;
        fireTurretSniperShot(enemy, target, {
          damage: enemy.dmg,
          speed: 11.8,
          radius: 11,
          scaleX: 1.45,
          scaleY: 2.2,
          life: 136,
          color: 0xbfe9ff
        });
      }
    } else if (state.mode === "firing") {
      if (state.stateTime <= dt) {
        Effects.emitPulse(enemy.x, enemy.y, 0xf4fbff, 56, 8);
      }
      if (state.stateTime >= state.recoveryTime) {
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 116;
        state.fireCd = 88;
      }
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    EnemyVisuals.updateTurretVisuals(enemy, target, dt);
  }

  function detonateBomber(enemy){
    const S = GameState;
    const P = S.progression;
    const state = enemy.enemyState;
    const explosionRadius = state.explosionRadius;
    const explosionRadiusSq = explosionRadius * explosionRadius;

    if (enemy.signalSpr) enemy.signalSpr.visible = false;
    Effects.emitPulse(enemy.x, enemy.y, 0xff8740, explosionRadius, 16);
    Effects.emitParticle(enemy.x, enemy.y, 0xff8740, 18, 1.35);
    Effects.emitParticle(enemy.x, enemy.y, 0xffe0a1, 12, 0.9);

    const target = getTargetForEnemy(enemy);
    if (target.decoy && Helpers.dist2(enemy.x, enemy.y, target.x, target.y) <= explosionRadiusSq){
      target.decoy.hp -= 2;
      Effects.emitParticle(target.x, target.y, 0xffc479, 12, 1.0);
    } else if (Helpers.dist2(enemy.x, enemy.y, S.player.spr.x, S.player.spr.y) <= explosionRadiusSq){
      const ang = Math.atan2(S.player.spr.y - enemy.y, S.player.spr.x - enemy.x);
      EnemyCombat.hitPlayerWithEnemyDamage(enemy.dmg, 0xff8740, Math.cos(ang), Math.sin(ang), {
        invFrames: 26,
        push: 7.5,
        particleCount: 18,
        particlePower: 1.25,
        pulseRadius: 42,
        pulseLife: 10
      });
      S.shake = Math.min(24, S.shake + 8);
    }

    S.uiLayer.removeChild(enemy.spr);
    const enemyIndex = S.enemies.indexOf(enemy);
    if (enemyIndex >= 0) S.enemies.splice(enemyIndex, 1);
    P.waveAlive--;
  }

  function updateBomberEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const signal = enemy.signalSpr;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    let moveDx = toPlayerX / dist;
    let moveDy = toPlayerY / dist;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    if (state.state === "approach"){
      signal.visible = false;
      body.tint = 0xffffff;
      if (dist <= state.triggerDistance){
        state.state = "arming";
        state.timer = state.armTime;
        signal.visible = true;
        drawBomberSignal(enemy, 0.22);
      }
    } else if (state.state === "arming"){
      state.timer -= dt;
      moveSpeed = 0;
      signal.visible = true;
      signal.alpha = 0.12 + (Math.sin((state.timer / state.armTime) * Math.PI * 6) * 0.10 + 0.18);
      drawBomberSignal(enemy, signal.alpha);
      body.tint = state.timer % 6 < 3 ? 0xffb37b : 0xffffff;
      if (state.timer <= 0){
        detonateBomber(enemy);
        return;
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
  }

  function getHitCircles(enemy){
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function beginFlankerOrbit(enemy, target){
    const state = enemy.enemyState;
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const side = state.side || (Math.random() < 0.5 ? -1 : 1);
    state.side = side;
    state.state = "flank";
    state.timer = Helpers.randi(28, 52);
    state.orbitAngle = baseAngle + side * state.flankAngle;
  }

  function updateFlankerEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    const chaseDx = toPlayerX / dist;
    const chaseDy = toPlayerY / dist;
    let moveDx = chaseDx;
    let moveDy = chaseDy;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.timer -= dt;

    if (state.state === "flank"){
      if (state.timer <= 0 || dist < state.commitDistance){
        state.state = "commit";
        state.timer = Helpers.randi(20, 34);
      } else {
        const targetAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x) + state.side * state.flankAngle;
        state.orbitAngle = Helpers.lerp(state.orbitAngle, targetAngle, 0.1);
        const goalX = target.x + Math.cos(state.orbitAngle) * state.orbitRadius;
        const goalY = target.y + Math.sin(state.orbitAngle) * state.orbitRadius;
        const gx = goalX - enemy.x;
        const gy = goalY - enemy.y;
        const gd = Math.hypot(gx, gy) || 1;
        moveDx = gx / gd;
        moveDy = gy / gd;
        moveSpeed *= 1.12;
      }
      body.tint = 0xb9fff0;
    } else if (state.state === "commit"){
      moveSpeed *= 1.22;
      body.tint = 0xffffff;
      if (dist < state.closeDistance || state.timer <= 0){
        state.state = "pressure";
        state.timer = Helpers.randi(20, 34);
      }
    } else if (state.state === "pressure"){
      moveSpeed *= 0.96;
      body.tint = 0x9dffe8;
      if (dist > state.resetDistance || state.timer <= 0){
        state.side *= -1;
        beginFlankerOrbit(enemy, target);
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
  }

  function drawRusherSignal(enemy, alpha=0.32){
    if (!enemy.signalSpr || !enemy.enemyState) return;
    const g = enemy.signalSpr;
    const state = enemy.enemyState;
    const width = enemy.r * 1.35;
    const length = state.dashDistance;
    g.clear();
    g.beginFill(0xff4d4d, alpha);
    g.drawRoundedRect(0, -width * 0.42, length, width * 0.84, width * 0.24);
    g.endFill();
    g.beginFill(0xff9b9b, alpha * 0.9);
    g.drawPolygon([
      length, -width * 0.58,
      length + width * 0.95, 0,
      length, width * 0.58
    ]);
    g.endFill();
  }

  function beginRusherTelegraph(enemy, target){
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    enemy.enemyState.state = "telegraph";
    enemy.enemyState.timer = enemy.enemyState.telegraphTime;
    enemy.enemyState.dashDx = dx / d;
    enemy.enemyState.dashDy = dy / d;
    enemy.enemyState.cooldown = enemy.enemyState.postDashCooldown;
    enemy.signalSpr.visible = true;
    drawRusherSignal(enemy, 0.28);
  }

  function updateRusherEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const signal = enemy.signalSpr;
    const body = enemy.bodySpr;
    const targetDx = target.x - enemy.x;
    const targetDy = target.y - enemy.y;
    const dist = Math.hypot(targetDx, targetDy) || 1;
    const chaseDx = targetDx / dist;
    const chaseDy = targetDy / dist;
    let moveDx = chaseDx;
    let moveDy = chaseDy;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    if (state.cooldown > 0) state.cooldown -= dt;

    if (state.state === "chase"){
      if (dist < state.triggerDistance && state.cooldown <= 0){
        beginRusherTelegraph(enemy, target);
      }
      signal.visible = false;
      body.tint = 0xffffff;
    } else if (state.state === "telegraph"){
      state.timer -= dt;
      moveSpeed *= 0.18;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      signal.visible = true;
      signal.alpha = 0.18 + (Math.sin((state.timer / state.telegraphTime) * Math.PI * 5) * 0.12 + 0.18);
      drawRusherSignal(enemy, signal.alpha);
      body.tint = state.timer % 8 < 4 ? 0xff8c8c : 0xffffff;
      if (state.timer <= 0){
        state.state = "dash";
        state.timer = state.dashTime;
        signal.visible = false;
        body.tint = 0xff7c7c;
        Effects.emitParticle(enemy.x, enemy.y, 0xff6b6b, 10, 0.95);
      }
    } else if (state.state === "dash"){
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = state.dashSpeed * (enemy.slowMul || 1);
      body.tint = 0xff8f8f;
      if ((performance.now() | 0) % 3 === 0){
        const t = Effects.makeTrailSprite(enemy.x - moveDx * 10, enemy.y - moveDy * 10, 0xff6262, 0.28, 0.22);
        GameState.fx.addChild(t);
        GameState.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:10 });
      }
      if (state.timer <= 0){
        state.state = "recovery";
        state.timer = state.recoveryTime;
      }
    } else if (state.state === "recovery"){
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = enemy.sp * 0.22;
      body.tint = 0xffd0d0;
      if (state.timer <= 0){
        state.state = "chase";
        body.tint = 0xffffff;
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
    if (signal){
      signal.rotation = 0;
    }
  }

  function getLancerDashMode(tierKey) {
    const stage = Math.max(1, GameState.progression.stage || 1);
    if (tierKey === "lancer" || stage <= 1) return "straight";
    const modes = stage >= 3 ? ["left", "right", "back"] : ["left", "right"];
    return modes[Helpers.randi(0, modes.length - 1)];
  }

  function getLancerDashVector(enemy, target, mode) {
    const baseDx = target.x - enemy.x;
    const baseDy = target.y - enemy.y;
    const baseDist = Math.hypot(baseDx, baseDy) || 1;
    const toTargetX = baseDx / baseDist;
    const toTargetY = baseDy / baseDist;
    let aimX = target.x;
    let aimY = target.y;

    if (mode === "left" || mode === "right" || mode === "back") {
      const player = GameState.player;
      const facing = target.player && player && player.spr
        ? player.spr.rotation - Math.PI / 2
        : Math.atan2(toTargetY, toTargetX);
      const sideX = -Math.sin(facing);
      const sideY = Math.cos(facing);
      const forwardX = Math.cos(facing);
      const forwardY = Math.sin(facing);
      const offset = mode === "back" ? 96 : 108;

      if (mode === "left") {
        aimX += sideX * offset;
        aimY += sideY * offset;
      } else if (mode === "right") {
        aimX -= sideX * offset;
        aimY -= sideY * offset;
      } else {
        aimX -= forwardX * offset;
        aimY -= forwardY * offset;
      }
    }

    const dx = aimX - enemy.x;
    const dy = aimY - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    return {
      dx: dx / d,
      dy: dy / d,
      angle: ang
    };
  }

  function drawLancerSignal(enemy, alpha = 0.22) {
    if (!enemy.signalSpr || !enemy.enemyState) return;
    const g = enemy.signalSpr;
    const state = enemy.enemyState;
    const length = state.dashDistance || 210;
    const width = enemy.r * 1.1;
    g.clear();
    g.lineStyle(2, enemy.glowColor, Math.min(0.75, alpha + 0.14));
    g.beginFill(enemy.glowColor, alpha);
    g.drawRoundedRect(0, -width * 0.35, length, width * 0.7, width * 0.22);
    g.endFill();
    g.beginFill(0xffffff, alpha * 0.8);
    g.drawCircle(enemy.r * 0.25, 0, Math.max(3, enemy.r * 0.16));
    g.endFill();
  }

  function beginLancerCharge(enemy, target) {
    const state = enemy.enemyState;
    const mode = getLancerDashMode(enemy.tier);
    const vec = getLancerDashVector(enemy, target, mode);
    state.state = "charge";
    state.mode = mode;
    state.timer = state.chargeTime;
    state.dashDx = vec.dx;
    state.dashDy = vec.dy;
    state.dashAngle = vec.angle;
    state.cooldown = state.postDashCooldown;
    enemy.signalSpr.visible = true;
    enemy.signalSpr.rotation = vec.angle - enemy.spr.rotation;
    drawLancerSignal(enemy, 0.24);
  }

  function updateLancerEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const signal = enemy.signalSpr;
    const body = enemy.bodySpr;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    let moveDx = dx / dist;
    let moveDy = dy / dist;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    if (state.cooldown > 0) state.cooldown -= dt;

    if (state.state === "approach") {
      signal.visible = false;
      body.tint = 0xffffff;
      if (dist <= state.triggerDistance && state.cooldown <= 0) {
        beginLancerCharge(enemy, target);
      }
    } else if (state.state === "charge") {
      state.timer -= dt;
      moveSpeed *= 0.08;
      moveDx = 0;
      moveDy = 0;
      enemy.spr.rotation += (enemy.tier === "spin_lancer" ? 0.18 : 0.08) * dt;
      signal.visible = true;
      signal.rotation = state.dashAngle - enemy.spr.rotation;
      signal.alpha = 0.18 + Math.abs(Math.sin((state.timer / state.chargeTime) * Math.PI * 4)) * 0.28;
      drawLancerSignal(enemy, signal.alpha);
      body.tint = state.timer % 7 < 3.5 ? 0xffd09a : 0xffffff;
      if ((performance.now() | 0) % 4 === 0) {
        Effects.emitParticle(enemy.x, enemy.y, enemy.glowColor, 2, 0.35);
      }
      if (state.timer <= 0) {
        state.state = "dash";
        state.timer = state.dashTime;
        signal.visible = false;
        body.tint = 0xffb06a;
        Effects.emitParticle(enemy.x, enemy.y, enemy.glowColor, 12, 1.0);
      }
    } else if (state.state === "dash") {
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = state.dashSpeed * (enemy.slowMul || 1);
      body.tint = 0xffc07a;
      if ((performance.now() | 0) % 3 === 0) {
        const t = Effects.makeTrailSprite(enemy.x - moveDx * 12, enemy.y - moveDy * 12, enemy.glowColor, 0.25, 0.18);
        GameState.fx.addChild(t);
        GameState.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:9 });
      }
      if (state.timer <= 0) {
        state.state = "recover";
        state.timer = state.recoveryTime;
      }
    } else if (state.state === "recover") {
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = enemy.sp * 0.18;
      body.tint = 0xffdfbd;
      if (state.timer <= 0) {
        state.state = "approach";
        body.tint = 0xffffff;
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    if (state.state !== "charge") {
      enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    }
    enemy.hpText.rotation = -enemy.spr.rotation;
  }

  function makeEnemy(tierKey="normal"){
    const S = GameState;
    const tier = ENEMY_TIERS[tierKey];
    const view = Helpers.getViewBounds();

    const side = Helpers.randi(0,3);
    let x = 0;
    let y = 0;
    const pad = 60;
    if (side === 0){ x = view.left - pad; y = Helpers.rand(view.top, view.bottom); }
    if (side === 1){ x = view.right + pad; y = Helpers.rand(view.top, view.bottom); }
    if (side === 2){ x = Helpers.rand(view.left, view.right); y = view.top - pad; }
    if (side === 3){ x = Helpers.rand(view.left, view.right); y = view.bottom + pad; }

    const r = tier.radius;
    const difficulty = GAME_BALANCE.DIFFICULTY[S.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    const hits = Math.max(1, Math.ceil(Helpers.randi(tier.hitsMin, tier.hitsMax) * (difficulty.enemyHpMultiplier || 1)));
    const c = new PIXI.Container();
    const signal = (tierKey === "rusher" || tierKey === "bomber" || tierKey === "lancer" || tierKey === "spin_lancer") ? new PIXI.Graphics() : null;
    const isTurret = tierKey === "turret_mg" || tierKey === "turret_laser" || tierKey === "turret_sniper";
    const isSatellite = tierKey === "satellite";
    const body = (isTurret || isSatellite) ? new PIXI.Container() : EnemyVisuals.makeEnemySprite(tierKey, tier, 0, 0);

    const hpText = new PIXI.Text(String(hits), {
      fontFamily: "Arial",
      fontSize: tier.numberFontSize,
      fontWeight: "900",
      fill: 0xffffff,
      align: "center",
      stroke: 0x000000,
      strokeThickness: tierKey === "boss" ? 5 : 4
    });
    hpText.anchor.set(0.5);
    if (isSatellite) {
      hpText.visible = false;
    }
    const targetPaintMarker = new PIXI.Graphics();
    drawTargetPaintMarker(targetPaintMarker, r);
    targetPaintMarker.visible = false;
    targetPaintMarker.alpha = 0;

    if (signal){
      signal.visible = false;
      signal.alpha = 0;
      c.addChild(signal);
    }
    c.addChild(body, targetPaintMarker, hpText);
    c.x = x;
    c.y = y;
    S.uiLayer.addChild(c);

    const enemy = {
      type: "enemy",
      tier: tierKey,
      spr: c,
      x, y, r,
      hp: hits,
      maxHp: hits,
      sp: Helpers.rand(tier.moveSpeedMin, tier.moveSpeedMax) * (difficulty.enemySpeedMultiplier || 1),
      dmg: Math.ceil(tier.damage * (difficulty.enemyDamageMultiplier || 1)),
      xp: tier.xpBase,
      hitT: 0,
      staggerT: 0,
      slowT: 0,
      slowMul: 1,
      targetPaintT: 0,
      targetPaintAmp: 1,
      targetPaintMarker,
      hpText,
      bodySpr: body,
      signalSpr: signal,
      scoreBase: tier.scoreBase,
      glowColor: tier.glowColor
    };

    if (isTurret) {
      enemy.visuals = EnemyVisuals.makeTurretVisual(enemy, tierKey, tier);
      enemy.destroyVisuals = () => {
        EnemyVisuals.clearTurretLaserFx(enemy);
        if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
      };
      enemy.takeDamage = (damage) => {
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitT = 6;
        enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
        const state = enemy.enemyState;
        if (state && (state.mode === "fixed" || state.mode === "charge" || state.mode === "firing")) {
          state.mode = "move";
          state.stateTime = 0;
          state.anchorCd = tierKey === "turret_laser" ? 96 : 54;
          EnemyVisuals.clearTurretLaserFx(enemy);
        }
        return true;
      };
    }
    if (isSatellite) {
      enemy.visuals = EnemyVisuals.makeSatelliteVisual(enemy, tier);
      enemy.destroyVisuals = () => {
        EnemyVisuals.clearTurretLaserFx(enemy);
        clearSatelliteWarning(enemy.enemyState);
        if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
      };
      enemy.takeDamage = (damage) => {
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitT = 6;
        enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
        return true;
      };
    }

    if (tierKey === "flanker"){
      enemy.enemyState = {
        state: "flank",
        timer: Helpers.randi(28, 52),
        side: Math.random() < 0.5 ? -1 : 1,
        flankAngle: Helpers.rand(0.7, 1.0),
        orbitAngle: 0,
        orbitRadius: Helpers.rand(110, 180),
        commitDistance: 128,
        closeDistance: 88,
        resetDistance: 188
      };
      beginFlankerOrbit(enemy, getTargetForEnemy(enemy));
    }
    if (tierKey === "gunner"){
      enemy.enemyState = {
        state: "gunner",
        fireCd: Helpers.randi(10, 30),
        fireInterval: 30,
        preferredDistance: 260,
        retreatDistance: 150,
        attackDistance: 420,
        ambushStyle: true,
        approachModes: ["side_left", "side_right", "back"],
        approachWeight: 0.76,
        radiusMin: 120,
        radiusMax: 190,
        retargetMin: 34,
        retargetMax: 82,
        refreshCloseDistance: 130
      };
    }
    if (tierKey === "turret_mg"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(10, 26),
        anchorCd: Helpers.randi(34, 72),
        preferredDistance: 220,
        attackDistance: 360,
        lockDistance: 250,
        minMoveTime: 32,
        lockTime: 16,
        fixedTime: 72
      };
    }
    if (tierKey === "turret_laser"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(28, 52),
        anchorCd: Helpers.randi(64, 110),
        preferredDistance: 270,
        shortAttackDistance: 300,
        longAttackDistance: 520,
        lockDistance: 320,
        minMoveTime: 40,
        chargeTime: 28,
        fireTime: 14,
        laserSpr: null,
        laserLife: 0,
        laserMaxLife: 0,
        laserAngle: 0,
        laserLength: 0,
        laserWidth: 0,
        laserDamage: 0,
        laserDamageCd: 0
      };
    }
    if (tierKey === "turret_sniper"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(34, 66),
        anchorCd: Helpers.randi(72, 120),
        preferredDistance: 320,
        skirmishDistance: 360,
        lockDistance: 420,
        shotDistance: 620,
        minMoveTime: 46,
        chargeTime: 34,
        recoveryTime: 18
      };
    }
    if (tierKey === "bomber"){
      enemy.enemyState = {
        state: "approach",
        timer: 0,
        triggerDistance: 108,
        armTime: 24,
        explosionRadius: 82
      };
      drawBomberSignal(enemy, 0.22);
    }
    if (tierKey === "tank"){
      enemy.sp *= 0.92;
      enemy.enemyState = {
        state: "tank",
        turnBias: Helpers.rand(-0.2, 0.2),
        ambushStyle: true,
        approachModes: ["front", "side_left", "side_right"],
        approachWeight: 0.42,
        radiusMin: 70,
        radiusMax: 150,
        retargetMin: 72,
        retargetMax: 128,
        refreshCloseDistance: 108
      };
    }
    if (tierKey === "normal"){
      enemy.enemyState = {
        ambushStyle: true,
        approachModes: ["side_left", "side_right", "back"],
        approachWeight: 0.56,
        radiusMin: 96,
        radiusMax: 176,
        retargetMin: 64,
        retargetMax: 120,
        refreshCloseDistance: 104
      };
    }
    if (tierKey === "elite"){
      enemy.enemyState = {
        ambushStyle: true,
        approachModes: ["side_left", "side_right", "back", "front"],
        approachWeight: 0.52,
        radiusMin: 110,
        radiusMax: 186,
        retargetMin: 68,
        retargetMax: 124,
        refreshCloseDistance: 110
      };
    }
    if (tierKey === "rusher"){
      enemy.enemyState = {
        state: "chase",
        timer: 0,
        cooldown: Helpers.randi(36, 72),
        triggerDistance: 260,
        telegraphTime: 34,
        dashTime: 16,
        recoveryTime: 22,
        dashSpeed: 12.8,
        dashDistance: 240,
        postDashCooldown: 54,
        dashDx: 1,
        dashDy: 0
      };
      drawRusherSignal(enemy, 0.28);
    }
    if (tierKey === "lancer" || tierKey === "spin_lancer"){
      enemy.enemyState = {
        state: "approach",
        mode: "straight",
        timer: 0,
        cooldown: Helpers.randi(42, 78),
        triggerDistance: tierKey === "spin_lancer" ? 644 : 588,
        chargeTime: tierKey === "spin_lancer" ? 34 : 30,
        dashTime: tierKey === "spin_lancer" ? 22 : 20,
        recoveryTime: 20,
        dashSpeed: tierKey === "spin_lancer" ? 14.0 : 13.4,
        dashDistance: tierKey === "spin_lancer" ? 546 : 490,
        postDashCooldown: tierKey === "spin_lancer" ? 62 : 54,
        dashDx: 1,
        dashDy: 0,
        dashAngle: 0
      };
      drawLancerSignal(enemy, 0.24);
    }
    if (tierKey === "satellite") {
      const arena = Helpers.getArenaBounds();
      enemy.enemyState = {
        state: "satellite",
        baseX: arena.left + arena.width * 0.5,
        baseY: arena.top + arena.height * 0.5,
        moveType: "h",
        range: 90,
        canLaser: true,
        phase: Math.random() * Math.PI * 2,
        phaseT: 0,
        speed: Helpers.rand(0.008, 0.013),
        timer: Helpers.randi(100, 250),
        warn: 0,
        warnMax: 0,
        fire: 0,
        laserAngle: 0,
        laserLength: Math.max(arena.width, arena.height) * 1.3,
        laserWidth: 5,
        laserDamage: enemy.dmg,
        laserSpr: null,
        laserLife: 0,
        laserMaxLife: 0,
        laserDamageCd: 0,
        warningSpr: null
      };
    }

    return enemy;
  }

  function spawnEnemy(){
    const S = GameState;
    const P = S.progression;
    const tier = getTierByWaveAndRoll();
    const enemy = makeEnemy(tier);

    S.enemies.push(enemy);
    P.waveAlive++;
    P.spawnedCount++;

    if (tier === "boss") UI.triggerBossWarning();
  }

  function spawnStageFourSatellites() {
    const S = GameState;
    const arena = Helpers.getArenaBounds();
    const difficulty = GAME_BALANCE.DIFFICULTY[S.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    for (const config of STAGE_FOUR_SATELLITE_LAYOUT) {
      const enemy = makeEnemy("satellite");
      const radius = config[5];
      enemy.r = radius;
      enemy.x = arena.left + arena.width * config[0];
      enemy.y = arena.top + arena.height * config[1];
      enemy.spr.x = enemy.x;
      enemy.spr.y = enemy.y;
      enemy.hp = enemy.maxHp = Math.max(1, Math.ceil((radius <= 22 ? 10 : radius >= 34 ? 18 : 14) * (difficulty.enemyHpMultiplier || 1)));
      enemy.hpText.text = String(enemy.hp);
      enemy.dmg = Math.ceil((radius >= 32 ? 16 : 12) * (difficulty.enemyDamageMultiplier || 1));
      enemy.scoreBase = radius >= 32 ? 420 : 320;
      enemy.xp = radius >= 32 ? 10 : 8;
      enemy.enemyState.baseX = enemy.x;
      enemy.enemyState.baseY = enemy.y;
      enemy.enemyState.moveType = config[2];
      enemy.enemyState.range = config[3];
      enemy.enemyState.canLaser = config[4];
      enemy.enemyState.phase = Math.random() * Math.PI * 2;
      enemy.enemyState.speed = Helpers.rand(0.008, 0.013);
      enemy.enemyState.timer = Helpers.randi(100, 250);
      enemy.enemyState.laserLength = Math.max(arena.width, arena.height) * 1.3;
      enemy.enemyState.laserDamage = enemy.dmg;
      S.enemies.push(enemy);
    }
  }

  function getPracticeEnemyOptions() {
    return [
      { id: "normal", name: "Normal Fighter" },
      { id: "elite", name: "Elite Fighter" },
      { id: "gunner", name: "Gunner" },
      { id: "flanker", name: "Flanker" },
      { id: "rusher", name: "Rusher" },
      { id: "lancer", name: "Lancer" },
      { id: "spin_lancer", name: "Spin Lancer" },
      { id: "tank", name: "Tank" },
      { id: "turret_mg", name: "MG Turret" },
      { id: "turret_laser", name: "Laser Turret" },
      { id: "turret_sniper", name: "Sniper Turret" },
      { id: "satellite", name: "Relay Satellite" }
    ];
  }

  function spawnPracticeEnemies(tierKey = "normal", count = 3) {
    const S = GameState;
    const arena = Helpers.getArenaBounds();
    const safeCount = Math.max(1, Math.min(12, Math.floor(count || 1)));
    const cols = Math.min(4, safeCount);
    const rows = Math.ceil(safeCount / cols);
    const spacingX = Math.max(96, arena.width * 0.16);
    const spacingY = Math.max(84, arena.height * 0.16);
    const originX = arena.left + arena.width * 0.68;
    const originY = arena.top + arena.height * 0.28;

    for (let i = 0; i < safeCount; i++) {
      const enemy = makeEnemy(tierKey);
      const col = i % cols;
      const row = Math.floor(i / cols);
      enemy.x = originX + (col - (cols - 1) * 0.5) * spacingX;
      enemy.y = originY + row * spacingY;
      enemy.spr.x = enemy.x;
      enemy.spr.y = enemy.y;
      if (tierKey === "satellite" && enemy.enemyState) {
        enemy.enemyState.baseX = enemy.x;
        enemy.enemyState.baseY = enemy.y;
        enemy.enemyState.range = 56 + (i % 3) * 18;
      }
      S.enemies.push(enemy);
    }
  }

  function updateEnemies(dt){
    const S = GameState;
    const p = S.player;
    const now = performance.now() / 1000;

    for (let i=S.enemies.length-1; i>=0; i--){
      const e = S.enemies[i];
      if (typeof e.updateBoss === "function"){
        updateTargetPaintState(e, dt);
        if (e.slowT > 0){
          e.slowT -= dt;
        } else {
          e.slowMul = 1;
        }
        e.updateBoss(dt);

        let renderAlpha = 1;
        if (e.hitT > 0){
          e.hitT -= dt;
          renderAlpha = 0.82;
        }
        if (window.BossSystem && typeof BossSystem.tickSpawnIntro === "function") {
          renderAlpha = Math.min(renderAlpha, BossSystem.tickSpawnIntro(e, dt));
        }
        e.spr.alpha = renderAlpha;
        applyEnemyStatusVisuals(e);

        for (const hitCircle of getHitCircles(e)){
          const rr = hitCircle.radius + p.r;
          if (Helpers.dist2(hitCircle.x, hitCircle.y, p.spr.x, p.spr.y) < rr * rr){
            const ang = Math.atan2(p.spr.y - hitCircle.y, p.spr.x - hitCircle.x);
            if (typeof e.onPlayerCollide === "function"){
              e.onPlayerCollide({
                player: p,
                hitCircle,
                dx: Math.cos(ang),
                dy: Math.sin(ang)
              });
            }
            break;
          }
        }
        continue;
      }
      const target = getTargetForEnemy(e);
      let dx = target.x - e.x;
      let dy = target.y - e.y;
      const d = Math.hypot(dx,dy) || 1;
      dx /= d;
      dy /= d;
      updateTargetPaintState(e, dt);

      if (e.slowT > 0){
        e.slowT -= dt;
      } else {
        e.slowMul = 1;
      }
      if (e.staggerT > 0) e.staggerT = Math.max(0, e.staggerT - dt);

      if (e.tier === "rusher"){
        updateRusherEnemy(e, target, dt);
      } else if (e.tier === "lancer" || e.tier === "spin_lancer"){
        updateLancerEnemy(e, target, dt);
      } else if (e.tier === "bomber"){
        updateBomberEnemy(e, target, dt);
      } else if (e.tier === "gunner"){
        updateGunnerEnemy(e, target, dt);
      } else if (e.tier === "turret_mg"){
        updateTurretMachinegunEnemy(e, target, dt);
      } else if (e.tier === "turret_laser"){
        updateTurretLaserEnemy(e, target, dt);
      } else if (e.tier === "turret_sniper"){
        updateTurretSniperEnemy(e, target, dt);
      } else if (e.tier === "satellite"){
        updateSatelliteEnemy(e, target, dt);
      } else if (e.tier === "flanker"){
        updateFlankerEnemy(e, target, dt);
      } else {
        if (e.staggerT > 0){
          e.spr.x = e.x;
          e.spr.y = e.y;
          e.spr.rotation += 0.05 * dt;
          e.hpText.rotation = -e.spr.rotation;
        } else {
        const moveTarget = getEnemyApproachPoint(e, target, e.enemyState, dt);
        dx = moveTarget.x - e.x;
        dy = moveTarget.y - e.y;
        const moveDist = Math.hypot(dx, dy) || 1;
        dx /= moveDist;
        dy /= moveDist;
        if (e.tier === "normal"){
          const wig = Math.sin(now * 5 + i) * 0.18;
          const ca = Math.cos(wig);
          const sa = Math.sin(wig);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }
        if (e.tier === "elite"){
          const wig = Math.sin(now * 6 + i) * 0.28;
          const ca = Math.cos(wig);
          const sa = Math.sin(wig);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }
        if (e.tier === "tank"){
          const driftAmp = Math.max(0.03, 0.06 + (e.enemyState ? e.enemyState.turnBias : 0));
          const drift = Math.sin(now * 1.8 + i * 0.35) * driftAmp;
          const ca = Math.cos(drift);
          const sa = Math.sin(drift);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }

        const moveSpeed = e.tier === "tank"
          ? e.sp * Math.max(0.72, e.slowMul || 1)
          : e.sp * (e.slowMul || 1);
        e.x += dx * moveSpeed * dt;
        e.y += dy * moveSpeed * dt;
        e.spr.x = e.x;
        e.spr.y = e.y;
        e.spr.rotation = Math.atan2(dy, dx);
        e.hpText.rotation = -e.spr.rotation;
        }
      }

      if (e.hitT > 0){
        e.hitT -= dt;
        e.spr.alpha = 0.7;
      } else {
        e.spr.alpha = 1;
      }
      if (window.PlanetSystem && e.tier !== "boss") {
        PlanetSystem.resolveShipCollision(e, e.r);
      }
      applyEnemyStatusVisuals(e);

      if (e.tier === "bomber") continue;

      if (e.tier === "satellite") continue;
      const targetRadius = target.decoy ? target.r : p.r;
      const targetX = target.decoy ? target.x : p.spr.x;
      const targetY = target.decoy ? target.y : p.spr.y;
      const rr = e.r + targetRadius;
      if (Helpers.dist2(e.x, e.y, targetX, targetY) < rr * rr){
        const isDashHit = (e.tier === "rusher" || e.tier === "lancer" || e.tier === "spin_lancer") && e.enemyState && e.enemyState.state === "dash";
        const hitDx = isDashHit && e.enemyState ? e.enemyState.dashDx : dx;
        const hitDy = isDashHit && e.enemyState ? e.enemyState.dashDy : dy;
        if (target.decoy){
          target.decoy.hp -= 1;
          e.hitT = 8;
          Effects.emitParticle(target.x, target.y, isDashHit ? 0xff6b6b : 0xffd27a, isDashHit ? 16 : 10, isDashHit ? 1.15 : 0.8);
          if (isDashHit){
            e.enemyState.state = "recovery";
            e.enemyState.timer = e.enemyState.recoveryTime;
            e.signalSpr.visible = false;
          }
        } else if (p.inv <= 0){
          let baseDamage = isDashHit ? e.dmg * 1.8 : e.dmg;
          if (e.tier === "tank") baseDamage *= 1.15;
          const playerPush = e.tier === "tank" ? 6.5 : (isDashHit ? 9 : 4.2);
          const didHit = EnemyCombat.hitPlayerWithEnemyDamage(baseDamage, e.glowColor, hitDx, hitDy, {
            invFrames: 30,
            push: playerPush,
            particleCount: isDashHit ? 26 : (e.tier === "tank" ? 24 : 18),
            particlePower: isDashHit ? 1.55 : (e.tier === "tank" ? 1.45 : 1.2)
          });
          if (didHit && isDashHit){
            Effects.emitPulse(p.spr.x, p.spr.y, 0xff6b6b, 54, 12);
            S.shake = Math.min(24, S.shake + 10);
            e.enemyState.state = "recovery";
            e.enemyState.timer = e.enemyState.recoveryTime;
            e.signalSpr.visible = false;
          } else if (didHit && e.tier === "tank"){
            Effects.emitPulse(p.spr.x, p.spr.y, 0xc18dff, 42, 10);
            S.shake = Math.min(24, S.shake + 6);
          }
        } else {
          const grazePush = e.tier === "tank" ? 5.5 : (isDashHit ? 8 : 4.6);
          p.vx += hitDx * grazePush;
          p.vy += hitDy * grazePush;
        }
      }
    }
  }

  return {
    spawnEnemy,
    spawnStageFourSatellites,
    getPracticeEnemyOptions,
    spawnPracticeEnemies,
    updateEnemies,
    updateEnemyBullets: EnemyCombat.updateEnemyBullets,
    hitPlayerWithEnemyDamage: EnemyCombat.hitPlayerWithEnemyDamage
  };
})();
