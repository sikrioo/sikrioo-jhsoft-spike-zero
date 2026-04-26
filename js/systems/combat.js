window.CombatSystem = (() => {
  function getWeaponDef(){
    return WEAPON_DEFINITIONS[GameState.weaponState.current];
  }

  function getWeaponLevel() {
    return Math.max(1, Math.min(7, GameState.stats.weaponLevel || 1));
  }

  function getWeaponProfile(type = GameState.weaponState.current, level = getWeaponLevel()) {
    const def = WEAPON_DEFINITIONS[type];
    if (!def) return null;
    const steps = def.levels || [];
    const index = Math.max(0, Math.min(steps.length - 1, level - 1));
    return {
      ...def,
      level,
      ...(steps[index] || {})
    };
  }

  function getRangeMultiplier() {
    return Math.max(0.5, GameState.stats.rangeMultiplier || 1);
  }

  function syncWeaponStats() {
    const S = GameState;
    const profile = getWeaponProfile();
    if (!profile) return false;
    S.stats.weaponLevel = profile.level;
    S.stats.bulletDamage = profile.damage || GAME_BALANCE.PLAYER.BULLET_DAMAGE;
    S.stats.bulletCount = profile.shots || profile.pellets || 1;
    UI.hudUpdate();
    return true;
  }

  function setWeaponType(type){
    if (!WEAPON_DEFINITIONS[type]) return false;
    GameState.weaponState.current = type;
    syncWeaponStats();
    return true;
  }

  function applyStartingWeaponLoadout(testMode=false){
    GameState.weaponState.current = testMode
      ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_WEAPON) || "machinegun")
      : "machinegun";
    syncWeaponStats();
  }

  function findNearestEnemy(x, y, takenSet=null){
    const S = GameState;
    let best = null;
    let bestDist = Infinity;
    for (let i=0; i<S.enemies.length; i++){
      const enemy = S.enemies[i];
      if (takenSet && takenSet.has(enemy)) continue;
      const d2 = Helpers.dist2(x, y, enemy.x, enemy.y);
      if (d2 < bestDist){
        best = enemy;
        bestDist = d2;
      }
    }
    return best;
  }

  function makeBullet(x, y, ang, damage, speed, pierce, options={}){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, ang, options.color || 0x32f6ff, {
      kind: options.spriteKind || options.kind || "default"
    });
    if (options.scaleX || options.scaleY) spr.scale.set(options.scaleX || 1, options.scaleY || 1);
    S.fx.addChild(spr);

    return {
      type:"bullet",
      kind: options.kind || "machinegun",
      spr,
      x, y,
      vx:Math.cos(ang) * speed,
      vy:Math.sin(ang) * speed,
      r:options.radius || 7,
      dmg:damage,
      pierce,
      color: options.color || 0x32f6ff,
      life:options.life || 120,
      trailAlpha: options.trailAlpha || 0.18,
      trailKind: options.trailKind || "default"
    };
  }

  function makeBeam(x, y, ang, length, width, color){
    const g = new PIXI.Graphics();
    g.x = x;
    g.y = y;
    GameState.fx.addChild(g);
    const beam = { spr:g, x, y, ang, length, width, color, life:7, maxLife:7 };
    redrawBeam(beam, 1);
    return beam;
  }

  function redrawBeam(beam, alpha=1){
    const g = beam.spr;
    g.x = beam.x;
    g.y = beam.y;
    g.clear();
    const cos = Math.cos(beam.ang);
    const sin = Math.sin(beam.ang);
    const nx = -sin;
    const ny = cos;
    const flicker = Math.sin(performance.now() * 0.05) * 1.6;
    const arcJitter = beam.width * 0.45 + flicker;
    const endX = cos * beam.length;
    const endY = sin * beam.length;

    g.lineStyle(beam.width + 14, beam.color, 0.06 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);

    g.lineStyle(beam.width + 8, beam.color, 0.14 * alpha);
    g.moveTo(nx * arcJitter, ny * arcJitter);
    g.quadraticCurveTo(endX * 0.38 + nx * arcJitter * 1.8, endY * 0.38 + ny * arcJitter * 1.8, endX - nx * arcJitter * 0.7, endY - ny * arcJitter * 0.7);
    g.moveTo(-nx * arcJitter, -ny * arcJitter);
    g.quadraticCurveTo(endX * 0.42 - nx * arcJitter * 1.9, endY * 0.42 - ny * arcJitter * 1.9, endX + nx * arcJitter * 0.7, endY + ny * arcJitter * 0.7);

    g.lineStyle(beam.width + 3, beam.color, 0.26 * alpha);
    g.moveTo(nx * (arcJitter * 0.45), ny * (arcJitter * 0.45));
    g.lineTo(endX + nx * (arcJitter * 0.3), endY + ny * (arcJitter * 0.3));
    g.moveTo(-nx * (arcJitter * 0.45), -ny * (arcJitter * 0.45));
    g.lineTo(endX - nx * (arcJitter * 0.3), endY - ny * (arcJitter * 0.3));

    g.lineStyle(beam.width + 1, beam.color, 0.78 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);

    g.lineStyle(Math.max(2, beam.width * 0.36), 0xffffff, 0.96 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);

    g.beginFill(beam.color, 0.18 * alpha);
    g.drawCircle(0, 0, beam.width * 1.7);
    g.endFill();
    g.beginFill(0xffffff, 0.82 * alpha);
    g.drawCircle(0, 0, Math.max(2, beam.width * 0.46));
    g.endFill();
  }

  function makeMissile(x, y, target, damageMul=1){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, -Math.PI / 2, 0xffb347, { kind: "missile" });
    spr.scale.set(1.25, 1.4);
    S.fx.addChild(spr);

    return {
      type:"missile",
      spr,
      x, y,
      vx:0,
      vy:-2.4,
      r:12,
      dmg:S.stats.homingMissileDamage * damageMul,
      color: 0xffb347,
      target,
      life:180,
      trailKind:"linear"
    };
  }

  function makeStrikeMissile(target, damageMultiplier=2, bonusDamageMul=1){
    const S = GameState;
    const startX = target ? target.x + Helpers.rand(-120, 120) : S.player.spr.x + Helpers.rand(-180, 180);
    const startY = -40 - Helpers.rand(0, 90);
    const spr = Effects.makeBulletSprite(startX, startY, Math.PI / 2, 0xffd27a, { kind: "missileHeavy" });
    spr.scale.set(1.55, 2.2);
    S.fx.addChild(spr);

    return {
      type:"missile",
      spr,
      x:startX,
      y:startY,
      vx:0,
      vy:6.8,
      r:16,
      dmg:Math.max(2, S.stats.bulletDamage * damageMultiplier * bonusDamageMul),
      color:0xffd27a,
      target,
      heavy:true,
      life:150,
      trailKind:"linear"
    };
  }

  function makeCrossfireMissile(startX, startY, targetPoint, side, index, effectData, bonusDamageMul=1){
    const S = GameState;
    const angle = Math.atan2(targetPoint.y - startY, targetPoint.x - startX);
    const sideSign = side === "left" ? -1 : 1;
    const spr = Effects.makeBulletSprite(startX, startY, angle + Math.PI / 2, sideSign < 0 ? 0xffb347 : 0x7df9ff, { kind: "missile" });
    spr.scale.set(1.1, 1.45);
    S.fx.addChild(spr);

    const curveAngle = angle + sideSign * Helpers.rand(Math.PI / 2.75, Math.PI / 1.95);
    const speed = Helpers.rand(4.9, 6.7) + Math.min(1.4, index * 0.08);
    return {
      type:"missile",
      pattern:"crossfire",
      spr,
      x:startX,
      y:startY,
      vx:Math.cos(curveAngle) * speed,
      vy:Math.sin(curveAngle) * speed,
      r:11,
      dmg:Math.max(2, S.stats.bulletDamage * (effectData.damageMultiplier || 2.1) * bonusDamageMul),
      color: sideSign < 0 ? 0xffb347 : 0x7df9ff,
      target:null,
      targetPoint,
      life:Helpers.rand(62, 78),
      delay:index * (effectData.cadence || 4) + Helpers.rand(0, 2.5),
      age:0,
      baseSpeed:Helpers.rand(7.5, 9.2),
      steer:Helpers.rand(0.072, 0.103),
      wobblePhase:Helpers.rand(0, Math.PI * 2),
      wobbleAmp:Helpers.rand(0.10, 0.28),
      blastRadius:(effectData.blastRadius || 76) + Helpers.rand(-10, 8),
      trailEvery:2,
      launched:false,
      trailKind:"linear"
    };
  }

  function makeOmniBurstShot(x, y, angle, index, effectData, bonusDamageMul=1){
    const S = GameState;
    const color = index % 2 === 0 ? 0xffd27a : 0xff7a47;
    const spr = Effects.makeBulletSprite(x, y, angle + Math.PI / 2, color, { kind: "missile" });
    spr.scale.set(0.95, 1.25);
    S.fx.addChild(spr);

    const speed = Helpers.rand(6.4, 8.4);
    const range = (effectData.range || 170) + Helpers.rand(-18, 24);
    return {
      type:"missile",
      pattern:"omni_burst",
      spr,
      x,
      y,
      vx:Math.cos(angle) * speed,
      vy:Math.sin(angle) * speed,
      r:10,
      dmg:Math.max(1.5, S.stats.bulletDamage * (effectData.damageMultiplier || 2.15) * bonusDamageMul),
      color,
      target:null,
      originX:x,
      originY:y,
      maxDistance:range,
      life:Helpers.rand(22, 32),
      delay:index * (effectData.cadence || 1.25) + Helpers.rand(0, 1.5),
      age:0,
      blastRadius:(effectData.blastRadius || 68) + Helpers.rand(-8, 8),
      spin:Helpers.rand(-0.045, 0.045),
      launched:false,
      trailKind:"linear"
    };
  }

  function destroyProjectile(list, index){
    const S = GameState;
    const projectile = list[index];
    S.fx.removeChild(projectile.spr);
    list.splice(index, 1);
  }

  function getEnemyHitCircles(enemy){
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function removeEnemy(enemy){
    const S = GameState;
    if (typeof enemy.onDefeat === "function") enemy.onDefeat();
    if (typeof enemy.destroyVisuals === "function") enemy.destroyVisuals();
    else S.uiLayer.removeChild(enemy.spr);
    const enemyIndex = S.enemies.indexOf(enemy);
    if (enemyIndex >= 0) S.enemies.splice(enemyIndex, 1);
  }

  function rewardEnemyKill(enemy){
    const P = GameState.progression;
    P.waveAlive--;
    P.combo = Math.min(6, P.combo + (enemy.tier === "boss" ? 0.55 : enemy.tier === "midboss" ? 0.28 : 0.12));
    P.comboT = 120;
    P.score += enemy.scoreBase * P.combo;
    SkillSystem.gainXp(enemy.xp);
    if (enemy.tier === "boss") {
      P.score += Math.round(enemy.scoreBase * 0.35);
      SkillSystem.gainXp(Math.round(enemy.xp * 0.35));
      P.bossFinishTimer = Math.max(P.bossFinishTimer || 0, 42);
      Effects.emitPulse(enemy.x, enemy.y, 0xffffff, 140, 24);
      if (window.SoundSystem) {
        SoundSystem.play("boss_destroy", { playbackRate: 0.84 });
        SoundSystem.play("low_explosion", { playbackRate: 0.76, volume: 0.34, cooldownMs: 0 });
        SoundSystem.play("debris_glass", { playbackRate: 0.9, volume: 0.16, cooldownMs: 0 });
      }
    } else if (window.SoundSystem) {
      SoundSystem.play("enemy_destroy", {
        playbackRate: enemy.tier === "midboss" ? 0.86 : 0.96 + Helpers.rand(-0.05, 0.03)
      });
      if (enemy.tier === "midboss") {
        SoundSystem.play("low_explosion", { playbackRate: 0.86, volume: 0.18, cooldownMs: 0 });
      }
    }
    Effects.emitParticle(enemy.x, enemy.y, enemy.glowColor, enemy.tier === "boss" ? 36 : 22, 1.5);
  }

  function damageEnemy(enemy, damage, hitColor, particleCount=10, particlePower=1, hitCircle=null){
    const S = GameState;
    const P = S.progression;

    const effectX = hitCircle ? hitCircle.x : enemy.x;
    const effectY = hitCircle ? hitCircle.y : enemy.y;

    if (typeof enemy.takeDamage === "function"){
      const didDamage = enemy.takeDamage(damage, { hitCircle, hitColor, particleCount, particlePower });
      if (!didDamage) return false;
      enemy.hitT = 6;
    } else {
      enemy.hp -= damage;
      enemy.hitT = 6;
      enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
    }
    Effects.emitParticle(effectX, effectY, hitColor || enemy.glowColor, particleCount, particlePower);

    if (enemy.hp <= 0){
      removeEnemy(enemy);
      rewardEnemyKill(enemy);
      UI.hudUpdate();
      return true;
    }

    P.score += 4 * P.combo;
    UI.hudUpdate();
    return false;
  }

  function getAfterburnerMultipliers(){
    const S = GameState;
    const afterburnerSkill = window.ActiveSkillSystem && ActiveSkillSystem.getDefinition("afterburner");
    return {
      damageMul: S.activeSkillState.afterburnerT > 0 && afterburnerSkill ? (afterburnerSkill.effectData.damageMultiplier || 1) : 1,
      fireRateMul: S.activeSkillState.afterburnerT > 0 && afterburnerSkill ? afterburnerSkill.effectData.fireRateMultiplier : 1,
      bulletSpeedMul: S.activeSkillState.afterburnerT > 0 && afterburnerSkill ? afterburnerSkill.effectData.bulletSpeedMultiplier : 1
    };
  }

  function getShipParticleTint(fallback){
    const shipConfig = GAME_BALANCE.SHIPS && GAME_BALANCE.SHIPS[GameState.playerType || "standard"];
    return (shipConfig && shipConfig.particleTint) || fallback;
  }

  function getHardpointBarrels(ang) {
    const S = GameState;
    const level = Math.max(0, Math.min(3, S.stats.hardpointLevel || 0));
    if (level <= 0) return [];

    const forwardX = Math.cos(ang);
    const forwardY = Math.sin(ang);
    const sideX = -forwardY;
    const sideY = forwardX;

    const barrels = [
      {
        muzzleX: S.player.spr.x + forwardX * 8 - sideX * 12,
        muzzleY: S.player.spr.y + forwardY * 8 - sideY * 12,
        angle: ang - Math.PI / 2
      }
    ];

    if (level >= 2) {
      barrels.push({
        muzzleX: S.player.spr.x + forwardX * 8 + sideX * 12,
        muzzleY: S.player.spr.y + forwardY * 8 + sideY * 12,
        angle: ang + Math.PI / 2
      });
    }

    if (level >= 3) {
      barrels.push({
        muzzleX: S.player.spr.x - forwardX * 16,
        muzzleY: S.player.spr.y - forwardY * 16,
        angle: ang + Math.PI
      });
    }

    return barrels;
  }

  function tryShootHardpoints(ang, bulletSpeedMul, damageMul=1) {
    const S = GameState;
    if ((S.stats.hardpointLevel || 0) <= 0) return;
    if (S.stats.hardpointCooldown > 0) return;

    const level = Math.max(1, Math.min(3, S.stats.hardpointLevel || 1));
    const barrels = getHardpointBarrels(ang);
    if (!barrels.length) return;

    const baseDamageMul = 0.58 + (level - 1) * 0.08;
    for (const barrel of barrels) {
      const bullet = makeBullet(
        barrel.muzzleX,
        barrel.muzzleY,
        barrel.angle,
        Math.max(0.8, S.stats.bulletDamage * damageMul * baseDamageMul),
        S.stats.bulletSpeed * WEAPON_DEFINITIONS.machinegun.projectileSpeedMul * bulletSpeedMul * 0.92,
        0,
        {
          color: 0x7fd9ff,
          radius: 5.5,
          kind: "hardpoint",
          spriteKind: "hardpoint",
          scaleX: 0.78,
          scaleY: 0.84,
          life: 54,
          trailAlpha: 0.14,
          trailKind: "linear"
        }
      );
      S.bullets.push(bullet);
      Effects.emitParticle(barrel.muzzleX, barrel.muzzleY, getShipParticleTint(0x7fd9ff), 4, 0.55);
    }

    S.stats.hardpointCooldown = Math.max(8, S.stats.fireRate * 1.08);
    if (window.SoundSystem) {
      SoundSystem.play("player_fire", { playbackRate: 1.18 + Helpers.rand(-0.04, 0.03), volume: 0.34, cooldownMs: 0 });
    }
  }

  function tryShoot(){
    const S = GameState;
    const player = S.player;
    if (S.stats.hardpointCooldown > 0) S.stats.hardpointCooldown -= 1;
    if (player.fireCd > 0) return;
    const wantsFire = S.autoFire || S.mouse.down || S.keys.has("Space");
    if (!wantsFire) return;
    if (S.activeSkillState.stealthT > 0 && window.ActiveSkillSystem) {
      ActiveSkillSystem.breakStealth("attack");
    }

    const { damageMul, fireRateMul, bulletSpeedMul } = getAfterburnerMultipliers();
    const ang = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);

    if (S.weaponState.current === "machinegun") fireMachinegun(ang, bulletSpeedMul, damageMul);
    if (S.weaponState.current === "laser") fireLaser(ang, damageMul);
    if (S.weaponState.current === "shotgun") fireShotgun(ang, bulletSpeedMul, damageMul);
    tryShootHardpoints(ang, bulletSpeedMul, damageMul);

    if (S.weaponState.current !== "laser"){
      player.fireCd = S.stats.fireRate * fireRateMul;
    }
  }

  function fireMachinegun(ang, bulletSpeedMul, damageMul=1){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const spec = getWeaponProfile("machinegun");
    const count = Math.min(7, Math.max(1, spec.shots || 1));
    const spread = count === 1 ? 0 : Math.min(0.52, spec.spread || (0.08 * (count - 1)));

    for (let i=0; i<count; i++){
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const shotAng = ang + t * spread;
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        (spec.damage || S.stats.bulletDamage) * damageMul,
        S.stats.bulletSpeed * WEAPON_DEFINITIONS.machinegun.projectileSpeedMul * bulletSpeedMul,
        S.stats.bulletPierce,
        {
          color:0x32f6ff,
          radius:7,
          kind:"machinegun",
          spriteKind:"default",
          scaleX:1,
          scaleY:1.05,
          life:(spec.projectileLife || 68) * getRangeMultiplier(),
          trailKind:"linear"
        }
      );
      S.bullets.push(bullet);
    }

    Effects.emitParticle(px + Math.cos(ang) * 18, py + Math.sin(ang) * 18, getShipParticleTint(0x32f6ff), 6 + count, 0.9);
    if (window.SoundSystem) SoundSystem.play("player_fire", { playbackRate: 1 + Helpers.rand(-0.04, 0.04) });
  }

  function fireLaser(ang, damageMul=1){
    const S = GameState;
    if (S.weaponState.laserChannel) return;
    if (S.player.fireCd > 0) return;
    const def = getWeaponProfile("laser");
    const color = def.color;
    const width = def.width || 5;
    const originX = S.player.spr.x + Math.cos(ang) * 18;
    const originY = S.player.spr.y + Math.sin(ang) * 18;
    const laserRange = (def.range || 520) * getRangeMultiplier();
    const beam = makeBeam(originX, originY, ang, laserRange, width, color);
    Effects.emitParticle(originX, originY, getShipParticleTint(color), 12, 1.1);
    if (window.SoundSystem) SoundSystem.play("laser_fire", { playbackRate: 1 + Helpers.rand(-0.03, 0.03) });
    S.weaponState.laserChannel = {
      beam,
      damageMul,
      remaining: def.channelFrames || 28,
      maxRemaining: def.channelFrames || 28,
      damageTick: 0,
      damageInterval: 4,
      color,
      width,
      length: laserRange,
      weaponDamageMul: def.damageMul || 1.55
    };
  }

  function damageLaserChannel(channel){
    const S = GameState;
    const damage = S.stats.bulletDamage * (channel.damageMul || 1) * (channel.weaponDamageMul || 1.55);
    const cos = Math.cos(channel.beam.ang);
    const sin = Math.sin(channel.beam.ang);
    const originX = channel.beam.x;
    const originY = channel.beam.y;
    for (const enemy of [...S.enemies]){
      const hitCircles = getEnemyHitCircles(enemy);
      for (const hitCircle of hitCircles){
        const rx = hitCircle.x - originX;
        const ry = hitCircle.y - originY;
        const along = rx * cos + ry * sin;
        const side = Math.abs(rx * -sin + ry * cos);
        if (along >= 0 && along <= channel.length && side <= channel.width + hitCircle.radius){
          damageEnemy(enemy, damage, channel.color, enemy.tier === "boss" ? 12 : 8, 0.75, hitCircle);
          break;
        }
      }
    }
  }

  function finishLaserChannel(interrupted=false){
    const S = GameState;
    const channel = S.weaponState.laserChannel;
    if (!channel) return;
    channel.beam.life = interrupted ? 5 : 8;
    channel.beam.maxLife = channel.beam.life;
    S.beams.push(channel.beam);
    S.weaponState.laserChannel = null;
    S.player.fireCd = S.stats.fireRate;
  }

  function fireShotgun(ang, bulletSpeedMul, damageMul=1){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const spec = getWeaponProfile("shotgun");
    const pelletCount = Math.min(12, Math.max(4, spec.pellets || 4));
    const spread = spec.spread || 0.24;
    const pelletDamage = Math.max(0.72, (spec.damage || S.stats.bulletDamage) * damageMul * (spec.pelletDamageMul || 1));

    for (let i=0; i<pelletCount; i++){
      const shotAng = ang + Helpers.rand(-spread, spread);
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        pelletDamage,
        S.stats.bulletSpeed * WEAPON_DEFINITIONS.shotgun.projectileSpeedMul * bulletSpeedMul,
        0,
        {
          color:0xffbf7a,
          radius:8.5,
          life:(spec.projectileLife || 24) * getRangeMultiplier(),
          kind:"shotgun",
          spriteKind:"shotgun",
          scaleX:1.25,
          scaleY:1.3,
          trailAlpha:0.26
        }
      );
      S.bullets.push(bullet);
    }

    Effects.emitParticle(px + Math.cos(ang) * 18, py + Math.sin(ang) * 18, getShipParticleTint(0xffbf7a), 15, 1.2);
    if (window.SoundSystem) SoundSystem.play("shotgun_fire", { playbackRate: 0.96 + Helpers.rand(-0.03, 0.03) });
  }

  function tryShootMissiles(){
    const S = GameState;
    if (S.stats.homingMissileLevel <= 0) return;
    if (S.stats.homingMissileCd > 0) return;
    if (S.activeSkillState.stealthT > 0) return;
    if (S.enemies.length <= 0) return;

    const { damageMul } = getAfterburnerMultipliers();
    const taken = new Set();
    const spawnCount = Math.min(1 + Math.floor(Math.max(0, S.stats.homingMissileLevel - 1) / 2), S.enemies.length);
    for (let i=0; i<spawnCount; i++){
      const target = findNearestEnemy(S.player.spr.x, S.player.spr.y, taken);
      if (!target) break;
      taken.add(target);
      const missile = makeMissile(S.player.spr.x, S.player.spr.y - 12, target, damageMul);
      S.missiles.push(missile);
      Effects.emitParticle(missile.x, missile.y, getShipParticleTint(0xffb347), 6, 0.8);
    }

    if (spawnCount > 0 && window.SoundSystem) {
      SoundSystem.play("missile_launch", { playbackRate: 1.04 });
    }

    S.stats.homingMissileCd = S.stats.homingMissileCdMax;
  }

  function launchMissileVolley(count=4, damageMultiplier=2.2){
    const S = GameState;
    if (S.enemies.length <= 0) return false;
    const { damageMul } = getAfterburnerMultipliers();
    const taken = new Set();
    for (let i=0; i<count; i++){
      const target = findNearestEnemy(S.player.spr.x + Helpers.rand(-40, 40), S.player.spr.y, taken) || findNearestEnemy(S.player.spr.x, S.player.spr.y);
      if (!target) break;
      taken.add(target);
      const missile = makeStrikeMissile(target, damageMultiplier, damageMul);
      S.missiles.push(missile);
    }
    return true;
  }

  function launchCrossfireMissiles(effectData={}){
    const S = GameState;
    const p = S.player;
    const range = effectData.range || 280;
    const count = effectData.count || 10;
    const px = p.spr.x;
    const py = p.spr.y;
    const aimAngle = Math.atan2(S.mouse.y - py, S.mouse.x - px);
    const aimDist = Math.min(range, Math.max(80, Math.hypot(S.mouse.x - px, S.mouse.y - py) || range));
    const centerPoint = {
      x: px + Math.cos(aimAngle) * aimDist,
      y: py + Math.sin(aimAngle) * aimDist
    };
    const { damageMul } = getAfterburnerMultipliers();
    const sideOffset = 30;
    const backOffset = -10;
    const impactSpread = effectData.impactSpread || 58;
    const lengthSpread = effectData.lengthSpread || 30;

    for (let i=0; i<count; i++){
      const sideSign = i % 2 === 0 ? -1 : 1;
      const side = sideSign < 0 ? "left" : "right";
      const laneOffset = sideOffset + Helpers.rand(-12, 18) + Math.floor(i / 2) * Helpers.rand(1.5, 4.5);
      const forwardJitter = backOffset + Helpers.rand(-18, 18);
      const targetForwardJitter = Helpers.rand(-lengthSpread, lengthSpread);
      const targetSideJitter = Helpers.rand(-impactSpread, impactSpread);
      const targetPoint = {
        x: centerPoint.x + Math.cos(aimAngle) * targetForwardJitter - Math.sin(aimAngle) * targetSideJitter,
        y: centerPoint.y + Math.sin(aimAngle) * targetForwardJitter + Math.cos(aimAngle) * targetSideJitter
      };
      const startX = px + Math.cos(aimAngle) * forwardJitter - Math.sin(aimAngle) * laneOffset * sideSign;
      const startY = py + Math.sin(aimAngle) * forwardJitter + Math.cos(aimAngle) * laneOffset * sideSign;
      const missile = makeCrossfireMissile(startX, startY, targetPoint, side, i, effectData, damageMul);
      S.missiles.push(missile);
    }

    Effects.emitPulse(centerPoint.x, centerPoint.y, 0xffb347, 58, 10);
    Effects.emitParticle(px, py, 0xffb347, 8, 0.75);
    Effects.emitParticle(px, py, 0x7df9ff, 8, 0.75);
    if (window.SoundSystem) SoundSystem.play("missile_launch", { playbackRate: 1.16 });
    return true;
  }

  function launchOmniBurst(effectData={}){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const count = effectData.count || 16;
    const { damageMul } = getAfterburnerMultipliers();
    const baseAngle = Helpers.rand(0, Math.PI * 2);

    for (let i=0; i<count; i++){
      const angle = baseAngle + (Math.PI * 2 * i) / count + Helpers.rand(-0.08, 0.08);
      const spawnOffset = Helpers.rand(8, 20);
      const shot = makeOmniBurstShot(
        px + Math.cos(angle) * spawnOffset,
        py + Math.sin(angle) * spawnOffset,
        angle,
        i,
        effectData,
        damageMul
      );
      S.missiles.push(shot);
    }

    S.shake = Math.min(24, S.shake + 3);
    if (window.SoundSystem) SoundSystem.play("missile_launch", { playbackRate: 0.88 });
    return true;
  }

  function explodeMissile(m, index, options={}){
    const S = GameState;
    const blastRadius = options.blastRadius || m.blastRadius || 0;
    const splashMultiplier = options.splashMultiplier || 0.55;

    if (blastRadius > 0){
      const radiusSq = blastRadius * blastRadius;
      for (const enemy of [...S.enemies]){
        const hitCircle = getEnemyHitCircles(enemy).find((circle) => {
          const rr = blastRadius + circle.radius;
          return Helpers.dist2(m.x, m.y, circle.x, circle.y) < rr * rr;
        });
        if (!hitCircle) continue;
        const directMul = enemy === options.directTarget ? 1 : splashMultiplier;
        damageEnemy(enemy, Math.max(1, m.dmg * directMul), m.color || 0xffb347, enemy.tier === "boss" ? 18 : 10, 1.05, hitCircle);
      }
      Effects.emitPulse(m.x, m.y, m.color || 0xffb347, blastRadius, options.pulseLife || 20);
    }

    Effects.emitParticle(m.x, m.y, m.color || 0xffb347, options.heavy ? 22 : 14, options.heavy ? 1.8 : 1.25);
    destroyProjectile(S.missiles, index);
  }

  function updateBullets(dt){
    const S = GameState;
    const view = Helpers.getViewBounds();

    for (let i=S.bullets.length-1; i>=0; i--){
      const b = S.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.x = b.x;
      b.spr.y = b.y;

      if (window.PlanetSystem && PlanetSystem.blocksProjectile(b)){
        Effects.emitParticle(b.x, b.y, b.color || 0x9eb8ff, 4, 0.35);
        destroyProjectile(S.bullets, i);
        continue;
      }

      if (b.life <= 0 || b.x < view.left - 80 || b.x > view.right + 80 || b.y < view.top - 80 || b.y > view.bottom + 80){
        destroyProjectile(S.bullets, i);
        continue;
      }

      for (let j=S.enemies.length-1; j>=0; j--){
        const e = S.enemies[j];
        const hitCircle = getEnemyHitCircles(e).find((circle) => {
          const rr = b.r + circle.radius;
          return Helpers.dist2(b.x, b.y, circle.x, circle.y) < rr * rr;
        });
        if (hitCircle){
          const particleCount = b.kind === "shotgun" ? 14 : (e.tier === "boss" ? 18 : 10);
          const particlePower = b.kind === "shotgun" ? 1.35 : (e.tier === "boss" ? 1.3 : 1.0);
          damageEnemy(e, b.dmg, b.color || e.glowColor, particleCount, particlePower, hitCircle);
          if (b.pierce > 0){
            b.pierce -= 1;
          } else {
            destroyProjectile(S.bullets, i);
          }
          break;
        }
      }

      if ((performance.now() | 0) % 2 === 0){
        const highQuality = window.Effects && Effects.isHighQuality && Effects.isHighQuality();
        const spawnEvery = b.kind === "shotgun"
          ? (highQuality ? 2 : 3)
          : b.trailKind === "linear"
            ? (highQuality ? 4 : 6)
            : (highQuality ? 3 : 5);
        if ((performance.now() | 0) % spawnEvery !== 0) continue;
        const t = Effects.makeTrailSprite(
          b.x - b.vx * 0.2,
          b.y - b.vy * 0.2,
          b.color || 0x32f6ff,
          b.kind === "shotgun" ? Helpers.rand(0.14, 0.22) : b.trailKind === "linear" ? Helpers.rand(0.26, 0.42) : Helpers.rand(0.1, 0.18),
          Math.min(0.18, b.trailAlpha || 0.18),
          { kind: b.trailKind === "linear" ? "linear" : "default" }
        );
        S.fx.addChild(t);
        if (b.trailKind === "linear") t.rotation = Math.atan2(b.vy, b.vx) + Math.PI;
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:b.kind === "shotgun" ? 8 : 10, drag:0.9 });
      }
    }
  }

  function updateBeams(dt){
    const S = GameState;
    const channel = S.weaponState.laserChannel;
    if (channel){
      const wantsFire = S.autoFire || S.mouse.down || S.keys.has("Space");
      if (!wantsFire || channel.remaining <= 0){
        finishLaserChannel(channel.remaining > 0 ? true : false);
      } else {
        const ang = Math.atan2(S.mouse.y - S.player.spr.y, S.mouse.x - S.player.spr.x);
        channel.beam.x = S.player.spr.x + Math.cos(ang) * 18;
        channel.beam.y = S.player.spr.y + Math.sin(ang) * 18;
        channel.beam.ang = ang;
        channel.beam.width = channel.width;
        channel.beam.length = channel.length;
        redrawBeam(channel.beam, 1);
        channel.remaining -= dt;
        channel.damageTick -= dt;
        if ((performance.now() | 0) % 2 === 0){
          const sparkDist = Helpers.rand(26, channel.length * 0.55);
          const sparkSpread = Helpers.rand(-channel.width * 1.2, channel.width * 1.2);
          const sparkX = channel.beam.x + Math.cos(ang) * sparkDist - Math.sin(ang) * sparkSpread;
          const sparkY = channel.beam.y + Math.sin(ang) * sparkDist + Math.cos(ang) * sparkSpread;
          Effects.emitParticle(sparkX, sparkY, channel.color, 2, 0.38);
        }
        if (channel.damageTick <= 0){
          channel.damageTick = channel.damageInterval;
          damageLaserChannel(channel);
          if ((performance.now() | 0) % 3 === 0){
            const endX = channel.beam.x + Math.cos(ang) * (channel.length * 0.25);
            const endY = channel.beam.y + Math.sin(ang) * (channel.length * 0.25);
            Effects.emitParticle(endX, endY, channel.color, 6, 0.5);
          }
        }
      }
    }

    for (let i=S.beams.length-1; i>=0; i--){
      const beam = S.beams[i];
      beam.life -= dt;
      redrawBeam(beam, Math.max(0, beam.life / beam.maxLife));
      if (beam.life <= 0){
        S.fx.removeChild(beam.spr);
        S.beams.splice(i, 1);
      }
    }
  }

  function updateMissiles(dt){
    const S = GameState;
    if (S.stats.homingMissileCd > 0) S.stats.homingMissileCd -= dt;

    for (let i=S.missiles.length-1; i>=0; i--){
      const m = S.missiles[i];
      if (m.delay && m.delay > 0){
        m.delay -= dt;
        if (m.delay > 0){
          m.spr.visible = false;
          continue;
        }
        m.spr.visible = true;
        if (!m.launched){
          m.launched = true;
          Effects.emitParticle(m.x, m.y, m.color || 0xffb347, 5, 0.55);
          if (window.SoundSystem) SoundSystem.play("missile_launch", { playbackRate: 1.22 + Helpers.rand(-0.04, 0.04) });
        }
        continue;
      }
      m.spr.visible = true;

      if (m.pattern === "crossfire"){
        const dx = m.targetPoint.x - m.x;
        const dy = m.targetPoint.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d;
        const ny = dx / d;
        const wobble = Math.sin((m.age || 0) * 0.22 + m.wobblePhase) * (m.wobbleAmp || 0);
        const desiredX = (dx / d) * (m.baseSpeed || 8.4);
        const desiredY = (dy / d) * (m.baseSpeed || 8.4);
        m.vx = Helpers.lerp(m.vx, desiredX, m.steer || 0.085);
        m.vy = Helpers.lerp(m.vy, desiredY, m.steer || 0.085);
        m.vx += nx * wobble;
        m.vy += ny * wobble;

        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
        m.age = (m.age || 0) + dt;
        m.spr.x = m.x;
        m.spr.y = m.y;
        m.spr.rotation = Math.atan2(m.vy, m.vx) + Math.PI / 2;

        for (let j=S.enemies.length-1; j>=0; j--){
          const target = S.enemies[j];
          const hitCircle = getEnemyHitCircles(target).find((circle) => {
            const rr = m.r + circle.radius;
            return Helpers.dist2(m.x, m.y, circle.x, circle.y) < rr * rr;
          });
          if (hitCircle){
            explodeMissile(m, i, { directTarget: target, blastRadius: m.blastRadius });
            break;
          }
        }
        if (S.missiles[i] !== m) continue;

        if (d < 18 || m.life <= 0){
          explodeMissile(m, i, { blastRadius: m.blastRadius });
          continue;
        }

        const highQuality = window.Effects && Effects.isHighQuality && Effects.isHighQuality();
        if ((performance.now() | 0) % Math.max(highQuality ? 3 : 5, (m.trailEvery || 2) + (highQuality ? 1 : 3)) === 0){
          const t = Effects.makeTrailSprite(m.x - m.vx * 0.3, m.y - m.vy * 0.3, m.color || 0xffb347, Helpers.rand(0.3, 0.48), 0.2, { kind: "linear" });
          S.fx.addChild(t);
          t.rotation = Math.atan2(m.vy, m.vx) + Math.PI;
          S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:10, drag:0.9 });
        }
        continue;
      }

      if (m.pattern === "omni_burst"){
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
        m.age = (m.age || 0) + dt;
        m.vx *= Math.pow(0.985, dt);
        m.vy *= Math.pow(0.985, dt);
        m.spr.x = m.x;
        m.spr.y = m.y;
        m.spr.rotation = Math.atan2(m.vy, m.vx) + Math.PI / 2 + (m.spin || 0) * m.age;

        for (let j=S.enemies.length-1; j>=0; j--){
          const target = S.enemies[j];
          const hitCircle = getEnemyHitCircles(target).find((circle) => {
            const rr = m.r + circle.radius;
            return Helpers.dist2(m.x, m.y, circle.x, circle.y) < rr * rr;
          });
          if (hitCircle){
            explodeMissile(m, i, { directTarget: target, blastRadius: m.blastRadius, splashMultiplier: 0.58, pulseLife: 24 });
            break;
          }
        }
        if (S.missiles[i] !== m) continue;

        const traveled = Math.hypot(m.x - m.originX, m.y - m.originY);
        if (traveled >= m.maxDistance || m.life <= 0){
          explodeMissile(m, i, { blastRadius: m.blastRadius, splashMultiplier: 0.58, pulseLife: 24 });
          continue;
        }

        const highQuality = window.Effects && Effects.isHighQuality && Effects.isHighQuality();
        if ((performance.now() | 0) % (highQuality ? 3 : 5) === 0){
          const t = Effects.makeTrailSprite(m.x - m.vx * 0.35, m.y - m.vy * 0.35, m.color || 0xffd27a, Helpers.rand(0.28, 0.42), 0.18, { kind: "linear" });
          S.fx.addChild(t);
          t.rotation = Math.atan2(m.vy, m.vx) + Math.PI;
          S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:8, drag:0.9 });
        }
        continue;
      }

      if (!m.target || S.enemies.indexOf(m.target) < 0){
        m.target = findNearestEnemy(m.x, m.y);
      }

      if (m.target){
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const baseSpeed = m.heavy ? 10.0 : 7.6;
        const steer = m.heavy ? 0.11 : 0.12;
        const desiredX = (dx / d) * baseSpeed;
        const desiredY = (dy / d) * baseSpeed;
        m.vx = Helpers.lerp(m.vx, desiredX, steer);
        m.vy = Helpers.lerp(m.vy, desiredY, steer);
        m.spr.rotation = Math.atan2(m.vy, m.vx) + Math.PI / 2;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      m.spr.x = m.x;
      m.spr.y = m.y;
      const highQuality = window.Effects && Effects.isHighQuality && Effects.isHighQuality();
      if ((performance.now() | 0) % (m.heavy ? (highQuality ? 3 : 5) : (highQuality ? 4 : 6)) === 0){
        const trail = Effects.makeTrailSprite(m.x - m.vx * 0.28, m.y - m.vy * 0.28, m.color || 0xffb347, m.heavy ? Helpers.rand(0.34, 0.5) : Helpers.rand(0.26, 0.4), m.heavy ? 0.22 : 0.18, { kind: "linear" });
        S.fx.addChild(trail);
        trail.rotation = Math.atan2(m.vy, m.vx) + Math.PI;
        S.particles.push({ spr:trail, x:trail.x, y:trail.y, vx:0, vy:0, life:m.heavy ? 10 : 8, drag:0.9 });
      }

      const target = m.target;
      if (target){
        const hitCircle = getEnemyHitCircles(target).find((circle) => {
          const rr = m.r + circle.radius;
          return Helpers.dist2(m.x, m.y, circle.x, circle.y) < rr * rr;
        });
        if (hitCircle){
          damageEnemy(target, m.dmg, m.color || 0xffb347, target.tier === "boss" ? 24 : 14, m.heavy ? 1.7 : 1.25, hitCircle);
          Effects.emitParticle(m.x, m.y, 0xffd27a, m.heavy ? 22 : 14, m.heavy ? 1.8 : 1.4);
          if (m.heavy){
            for (const enemy of S.enemies){
              const splashCircle = getEnemyHitCircles(enemy)[0];
              if (enemy !== target && splashCircle && Helpers.dist2(m.x, m.y, splashCircle.x, splashCircle.y) < 110 * 110){
                damageEnemy(enemy, Math.max(1, m.dmg * 0.45), 0xffb347, 8, 0.9, splashCircle);
              }
            }
            Effects.emitPulse(m.x, m.y, 0xffb347, 110, 18);
          }
          destroyProjectile(S.missiles, i);
          continue;
        }
      }

      if (m.life <= 0){
        Effects.emitParticle(m.x, m.y, 0xffb347, 8, 0.8);
        destroyProjectile(S.missiles, i);
      }
    }
  }

  return {
    damageEnemy,
    tryShoot,
    tryShootMissiles,
    launchMissileVolley,
    launchCrossfireMissiles,
    launchOmniBurst,
    setWeaponType,
    syncWeaponStats,
    applyStartingWeaponLoadout,
    updateBullets,
    updateBeams,
    updateMissiles
  };
})();
