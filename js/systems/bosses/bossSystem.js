window.BossSystem = (() => {
  const PRACTICE_DEFAULT = "basic";
  const STAGE_BOSS_ORDER = ["basic", "knight", "split"];
  const WAVE_BOSS_ORDER = ["basic", "advanced", "knight", "split", "summoner", "vortex", "bulwark", "weaver", "overmind"];
  const BOSS_SPAWN_INTRO_FRAMES = 72;

  const factories = Object.create(null);

  function getDefinitions() {
    return Object.values(window.BOSS_DEFINITIONS || {});
  }

  function getDefinition(id) {
    return (window.BOSS_DEFINITIONS || {})[id] || null;
  }

  function registerFactory(id, factory) {
    if (!id || typeof factory !== "function") return false;
    factories[id] = factory;
    return true;
  }

  function getPracticeBossId() {
    const S = GameState;
    if (!S.practiceBossId || !getDefinition(S.practiceBossId)) {
      S.practiceBossId = PRACTICE_DEFAULT;
    }
    return S.practiceBossId;
  }

  function setPracticeBossId(id) {
    if (!getDefinition(id)) return false;
    GameState.practiceBossId = id;
    return true;
  }

  function hasActiveBoss() {
    return GameState.enemies.some((e) => e && e.isBoss && e.hp > 0);
  }

  function getActiveBoss() {
    return GameState.enemies.find((e) => e && e.isBoss && e.hp > 0) || null;
  }

  function getStealthAwarePlayerTarget() {
    const S = GameState;
    if (S.activeSkillState && S.activeSkillState.stealthT > 0) {
      return {
        x: S.activeSkillState.stealthLastKnownX || S.player.spr.x,
        y: S.activeSkillState.stealthLastKnownY || S.player.spr.y,
        vx: 0,
        vy: 0,
        hidden: true
      };
    }
    return {
      x: S.player.spr.x,
      y: S.player.spr.y,
      vx: S.player.vx || 0,
      vy: S.player.vy || 0,
      hidden: false
    };
  }

  function getAngleToTrackedPlayer(x, y) {
    const target = getStealthAwarePlayerTarget();
    return Math.atan2(target.y - y, target.x - x);
  }

  function getCombatView() {
    return Helpers.getViewBounds();
  }

  function isBossWave(wave = GameState.progression.wave) {
    if (GameState.progression && GameState.progression.stageDuration > 0) return false;
    return !GameState.stats.practice && wave > 0 && wave % 5 === 0;
  }

  function getWaveBossId(wave = GameState.progression.wave) {
    const index = Math.max(0, Math.floor(wave / 5) - 1) % WAVE_BOSS_ORDER.length;
    return WAVE_BOSS_ORDER[index];
  }

  function getStageBossId(stage = GameState.progression.stage || 1) {
    const index = Math.max(0, stage - 1) % STAGE_BOSS_ORDER.length;
    return STAGE_BOSS_ORDER[index];
  }

  function getStageBossLineup() {
    return STAGE_BOSS_ORDER.map((bossId, index) => {
      const def = getDefinition(bossId);
      return {
        stage: index + 1,
        bossId,
        name: def ? def.name : bossId
      };
    });
  }

  function getStageCount() {
    return STAGE_BOSS_ORDER.length;
  }

  function shouldSuppressPracticeSpawns() {
    return !!GameState.stats.practice && GameState.stats.practiceMode === "boss";
  }

  function shouldSuppressEnemySpawns() {
    const stageBossActive = !GameState.stats.practice && GameState.progression.stageState === "boss";
    return shouldSuppressPracticeSpawns() || hasActiveBoss() || stageBossActive || isBossWave();
  }

  function clearCurrentArena() {
    const S = GameState;

    for (const enemy of [...S.enemies]) {
      if (enemy.scheduler) enemy.scheduler.clear();
      if (enemy.destroyVisuals) enemy.destroyVisuals();
      else if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
    }
    S.enemies.length = 0;

    for (const bullet of S.enemyBullets) {
      if (bullet.spr && bullet.spr.parent) bullet.spr.parent.removeChild(bullet.spr);
    }
    S.enemyBullets.length = 0;

    S.progression.waveAlive = 0;
    S.progression.spawnedCount = 0;
  }

  function createBaseBoss(def, options = {}) {
    const root = new PIXI.Container();
    const view = getCombatView();
    const difficulty = GAME_BALANCE.DIFFICULTY[GameState.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    const hpMultiplier = difficulty.enemyHpMultiplier || 1;
    const damageMultiplier = difficulty.enemyDamageMultiplier || 1;
    root.x = view.centerX;
    root.y = view.top + 120;
    GameState.uiLayer.addChild(root);

    const boss = {
      type: "enemy",
      tier: "boss",
      isBoss: true,
      bossId: def.id,
      displayName: def.name,
      spr: root,
      x: root.x,
      y: root.y,
      r: def.radius,
      hp: Math.ceil(def.maxHp * hpMultiplier),
      maxHp: Math.ceil(def.maxHp * hpMultiplier),
      dmg: def.damage || 12,
      scoreBase: def.scoreBase,
      xp: def.xp,
      glowColor: def.glowColor,
      hitT: 0,
      slowT: 0,
      slowMul: 1,
      contactDamage: Math.ceil((options.contactDamage || 12) * damageMultiplier),
      collisionPush: options.collisionPush || 6.5,

      destroyVisuals() {
        if (boss.spr && boss.spr.parent) boss.spr.parent.removeChild(boss.spr);
      },

      getHitCircles() {
        return [{ x: boss.x, y: boss.y, radius: boss.r }];
      },

      takeDamage(damage) {
        boss.hp = Math.max(0, boss.hp - damage);
        return true;
      },

      onDefeat() {
        Effects.emitPulse(boss.x, boss.y, boss.glowColor, 110, 20);
        Effects.emitParticle(boss.x, boss.y, boss.glowColor, 32, 1.8);
      },

      onPlayerCollide({ player, hitCircle, dx, dy }) {
        return EnemySystem.hitPlayerWithEnemyDamage(
          boss.contactDamage,
          boss.glowColor,
          dx, dy,
          {
            invFrames: 32,
            push: boss.collisionPush,
            particleCount: 18,
            particlePower: 1.3,
            pulseRadius: hitCircle.radius + player.r + 10,
            pulseLife: 12
          }
        );
      }
    };

    boss._ctx = {
      getTarget: getStealthAwarePlayerTarget,
      getAngleTo: getAngleToTrackedPlayer,
      getView: getCombatView
    };

    return boss;
  }

  function createStateMachine(entity) {
    return {
      set(next, duration) {
        entity.state = next;
        entity.stateTime = 0;
        entity.stateDuration = duration;
        entity.attackFxPlayed = false;
        if (next !== "CHARGE") entity.dashTelegraphShown = false;
      },
      tick(dt) {
        entity.stateTime += dt;
      },
      elapsed() {
        return entity.stateTime >= entity.stateDuration;
      }
    };
  }

  function chooseMeleeAttackPattern(entity, distToPlayer, forwardThreshold) {
    if (distToPlayer > forwardThreshold) return "FORWARD_SLASH";
    entity.attackSide *= -1;
    return entity.attackSide > 0 ? "LEFT_STEP_SLASH" : "RIGHT_STEP_SLASH";
  }

  function getSlashAngles(entity) {
    if (entity.attackPattern === "LEFT_STEP_SLASH") return { start: entity.lockAngle - Math.PI * 1.05, end: entity.lockAngle - Math.PI * 0.12 };
    if (entity.attackPattern === "RIGHT_STEP_SLASH") return { start: entity.lockAngle + Math.PI * 0.12, end: entity.lockAngle + Math.PI * 1.05 };
    return { start: entity.lockAngle - Math.PI * 0.75, end: entity.lockAngle + Math.PI * 0.15 };
  }

  function updateMeleeChaser(entity, dt, options = {}) {
    const player = (options.getTarget || getStealthAwarePlayerTarget)();
    const angleToPlayer = Math.atan2(player.y - entity.y, player.x - entity.x);
    const distToPlayer = Math.hypot(player.x - entity.x, player.y - entity.y) || 1;
    const sm = entity.sm;
    if (sm) sm.tick(dt);
    else entity.stateTime += dt;
    const stateTime = entity.stateTime;
    const stateDuration = entity.stateDuration || 0;

    if (entity.state === "APPROACH") {
      if (distToPlayer > options.targetDist) {
        entity.x += Math.cos(angleToPlayer) * options.moveSpeed * dt;
        entity.y += Math.sin(angleToPlayer) * options.moveSpeed * dt;
      } else {
        entity.x -= Math.cos(angleToPlayer) * options.moveSpeed * (options.backoffMul || 0.22) * dt;
        entity.y -= Math.sin(angleToPlayer) * options.moveSpeed * (options.backoffMul || 0.22) * dt;
      }
      if (stateTime >= stateDuration || distToPlayer < options.targetDist + (options.approachSnap || 20)) {
        sm.set("STRAFE", options.strafeDuration);
      }
      return;
    }

    if (entity.state === "STRAFE") {
      const side = Math.sin(performance.now() * 0.004 + (options.pulseOffset || 0)) > 0 ? 1 : -1;
      entity.x += Math.cos(angleToPlayer + Math.PI / 2 * side) * options.moveSpeed * options.strafeSpeedMul * dt;
      entity.y += Math.sin(angleToPlayer + Math.PI / 2 * side) * options.moveSpeed * options.strafeSpeedMul * dt;
      if (stateTime >= stateDuration) {
        entity.lockAngle = angleToPlayer;
        entity.attackPattern = chooseMeleeAttackPattern(entity, distToPlayer, options.forwardThreshold);
        sm.set("CHARGE", options.chargeDuration);
      }
      return;
    }

    if (entity.state === "CHARGE") {
      entity.lockAngle = angleToPlayer;
      if (!entity.dashTelegraphShown) {
        Effects.emitLineTelegraph(
          entity.x,
          entity.y,
          entity.x + Math.cos(entity.lockAngle) * options.dashDistance,
          entity.y + Math.sin(entity.lockAngle) * options.dashDistance,
          options.telegraphColor,
          options.telegraphLife,
          options.telegraphWidth,
          { style: options.telegraphStyle || "default" }
        );
        entity.dashTelegraphShown = true;
      }
      if (stateTime >= stateDuration) sm.set("ATTACK", options.attackDuration);
      return;
    }

    if (entity.state === "ATTACK") {
      entity.x += Math.cos(entity.lockAngle) * options.attackMoveSpeed * dt;
      entity.y += Math.sin(entity.lockAngle) * options.attackMoveSpeed * dt;
      if (!entity.attackFxPlayed && typeof options.onAttackFx === "function") {
        entity.attackFxPlayed = true;
        options.onAttackFx(entity, { angleToPlayer, distToPlayer });
      }
      if (typeof options.onAttackTick === "function") {
        options.onAttackTick(entity, dt, { angleToPlayer, distToPlayer });
      }
      if (stateTime >= stateDuration) {
        entity.afterSlash = 0;
        sm.set("RECOVERY", options.recoveryDuration);
      }
      return;
    }

    if (entity.state === "RECOVERY") {
      entity.x -= Math.cos(angleToPlayer) * options.moveSpeed * options.recoveryBackoffMul * dt;
      entity.y -= Math.sin(angleToPlayer) * options.moveSpeed * options.recoveryBackoffMul * dt;
      if (stateTime >= stateDuration) sm.set("APPROACH", options.approachDuration);
    }
  }

  function makeShieldSilhouette(radius, color, options = {}) {
    const g = new PIXI.Graphics();
    const top = radius * 0.96;
    const mid = radius * 0.8;
    const tip = radius * 1.18;
    g.beginFill(color, options.fillAlpha != null ? options.fillAlpha : 0.16);
    g.lineStyle(options.lineWidth || 2, color, options.lineAlpha != null ? options.lineAlpha : 0.82);
    g.drawPolygon([
      -top * 0.8, -top * 0.72,
      top * 0.8, -top * 0.72,
      mid, 0,
      radius * 0.48, radius * 0.82,
      0, tip,
      -radius * 0.48, radius * 0.82,
      -mid, 0
    ]);
    g.endFill();
    return g;
  }

  function makeSplitCoreSilhouette(radius) {
    const root = new PIXI.Container();
    const left = new PIXI.Graphics();
    const right = new PIXI.Graphics();
    const crack = new PIXI.Graphics();
    left.beginFill(0x8ed4ff, 0.2);
    left.lineStyle(2, 0x8ed4ff, 0.65);
    left.arc(0, 0, radius * 1.02, Math.PI / 2, Math.PI * 1.5);
    left.lineTo(0, -radius * 1.02);
    left.lineTo(0, radius * 1.02);
    left.endFill();
    right.beginFill(0xff9da8, 0.2);
    right.lineStyle(2, 0xff9da8, 0.65);
    right.arc(0, 0, radius * 1.02, -Math.PI / 2, Math.PI / 2);
    right.lineTo(0, radius * 1.02);
    right.lineTo(0, -radius * 1.02);
    right.endFill();
    crack.lineStyle(1.5, 0xffffff, 0.7);
    crack.moveTo(0, -radius * 0.84);
    crack.lineTo(0, radius * 0.84);
    root.addChild(left, right, crack);
    root.leftHalf = left;
    root.rightHalf = right;
    root.crack = crack;
    return root;
  }

  function makeTeleportAfterImage(x, y, radius, color) {
    const ghost = new PIXI.Graphics();
    ghost.beginFill(color, 0.08);
    ghost.lineStyle(2, color, 0.24);
    ghost.drawCircle(0, 0, radius);
    ghost.endFill();
    ghost.x = x;
    ghost.y = y;
    GameState.fx.addChild(ghost);
    for (let i = 0; i < 3; i++) {
      const ring = new PIXI.Graphics();
      ring.lineStyle(1.5, color, 0.12 - i * 0.02);
      ring.drawCircle(0, 0, radius + 6 + i * 8);
      ring.x = x;
      ring.y = y;
      GameState.fx.addChild(ring);
      GameState.particles.push({ spr: ring, x, y, vx: 0, vy: 0, life: 14 + i * 3, drag: 0.92 });
    }
    GameState.particles.push({ spr: ghost, x, y, vx: 0, vy: 0, life: 18, drag: 0.92 });
  }

  function makeSummonRune(x, y, radius, color) {
    const rune = new PIXI.Graphics();
    const pentagon = BossVisuals.buildPolygonSilhouette(radius, 5, color, true, {
      alpha: 0.08,
      lineAlpha: 0.52,
      lineWidth: 2
    });
    rune.addChild(pentagon);
    rune.x = x;
    rune.y = y;
    GameState.fx.addChild(rune);
    GameState.particles.push({ spr: rune, x, y, vx: 0, vy: 0, life: 24, drag: 0.94 });
  }

  function applySpawnIntro(boss) {
    if (!boss || !boss.spr) return;
    boss.spawnIntroT = BOSS_SPAWN_INTRO_FRAMES;
    boss.spawnIntroAlpha = 0.12;
    boss.spawnIntroScale = 0.86;
    boss.spr.alpha = 0;
    boss.spr.scale.set(0.86);
  }

  function tickSpawnIntro(boss, dt) {
    if (!boss || !boss.spr) return 1;
    if (!boss.spawnIntroT || boss.spawnIntroT <= 0) {
      boss.spawnIntroAlpha = 1;
      boss.spawnIntroScale = 1;
      return 1;
    }
    boss.spawnIntroT = Math.max(0, boss.spawnIntroT - dt);
    const t = 1 - (boss.spawnIntroT / BOSS_SPAWN_INTRO_FRAMES);
    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
    boss.spawnIntroAlpha = 0.12 + eased * 0.88;
    const scale = 0.86 + eased * 0.14;
    boss.spawnIntroScale = scale;
    boss.spr.scale.set(scale);
    if (boss.spawnIntroT <= 0) {
      boss.spawnIntroAlpha = 1;
      boss.spawnIntroScale = 1;
      boss.spr.scale.set(1);
    }
    return boss.spawnIntroAlpha;
  }

  function spawnBoss(id, options = {}) {
    const factory = factories[id];
    if (!factory) return null;
    const replacingExisting = options.replaceExisting !== false;
    if (replacingExisting) clearCurrentArena();
    const boss = factory();
    if (boss && boss.spr) {
      applySpawnIntro(boss);
      Effects.emitPulse(boss.x, boss.y, boss.glowColor || 0xffffff, (boss.r || 60) * 1.8, 18);
      Effects.emitParticle(boss.x, boss.y, boss.glowColor || 0xffffff, 18, 1.15);
    }
    GameState.enemies.push(boss);
    if (replacingExisting) {
      GameState.progression.waveAlive = 1;
      GameState.progression.spawnedCount = 1;
    } else {
      GameState.progression.waveAlive += 1;
      GameState.progression.spawnedCount += 1;
    }
    if (options.playWarning !== false) {
      if (window.SoundSystem) SoundSystem.play("boss_alarm");
      UI.triggerBossWarning();
    }
    UI.hudUpdate();
    return boss;
  }

  function spawnSelectedPracticeBoss() {
    if (!GameState.stats.practice) return null;
    return spawnBoss(getPracticeBossId(), { replaceExisting: true, playWarning: false });
  }

  function spawnWaveBoss(wave = GameState.progression.wave) {
    return spawnBoss(getWaveBossId(wave), { replaceExisting: false });
  }

  function spawnStageBoss(stage = GameState.progression.stage || 1) {
    return spawnBoss(getStageBossId(stage), { replaceExisting: false, playWarning: false });
  }

  window.BossFactoryShared = {
    createBaseBoss,
    createStateMachine,
    chooseMeleeAttackPattern,
    getSlashAngles,
    updateMeleeChaser,
    getStealthAwarePlayerTarget,
    getAngleToTrackedPlayer,
    getCombatView,
    makeShieldSilhouette,
    makeSplitCoreSilhouette,
    makeTeleportAfterImage,
    makeSummonRune
  };

  return {
    getActiveBoss,
    getDefinitions,
    getDefinition,
    getStageBossLineup,
    getStageCount,
    getPracticeBossId,
    setPracticeBossId,
    hasActiveBoss,
    isBossWave,
    getWaveBossId,
    getStageBossId,
    shouldSuppressPracticeSpawns,
    shouldSuppressEnemySpawns,
    registerFactory,
    applySpawnIntro,
    tickSpawnIntro,
    spawnBoss,
    spawnSelectedPracticeBoss,
    spawnWaveBoss,
    spawnStageBoss
  };
})();
