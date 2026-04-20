window.DefenseSystem = (() => {
  const FLAK_SPECS = [
    null,
    { range: 72, cooldown: 12, damage: 1.25, bossDamageMul: 0.34, maxTargets: 1, shots: 2, tracerLife: 4 },
    { range: 80, cooldown: 10, damage: 1.4, bossDamageMul: 0.35, maxTargets: 2, shots: 3, tracerLife: 4 },
    { range: 88, cooldown: 8, damage: 1.65, bossDamageMul: 0.38, maxTargets: 2, shots: 4, tracerLife: 5 }
  ];

  const ARC_SPECS = [
    null,
    { range: 80, cooldown: 18, damage: 0.9, staggerTime: 6, maxTargets: 1, slowMul: 0.24, bossSlowMul: 0.94, arcLife: 5, arcJitter: 7 },
    { range: 88, cooldown: 16, damage: 1.0, staggerTime: 8, maxTargets: 2, slowMul: 0.2, bossSlowMul: 0.92, arcLife: 5, arcJitter: 8 },
    { range: 96, cooldown: 13, damage: 1.2, staggerTime: 10, maxTargets: 2, slowMul: 0.16, bossSlowMul: 0.89, arcLife: 6, arcJitter: 9 }
  ];

  const MINE_ARM_DELAY = 30;
  const MINE_LIFE = 600;

  function getEnemyHitCircles(enemy) {
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function findNearbyTargets(range) {
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const hits = [];

    for (const enemy of S.enemies) {
      const hitCircle = getEnemyHitCircles(enemy).find((circle) => {
        const rr = range + circle.radius;
        return Helpers.dist2(px, py, circle.x, circle.y) <= rr * rr;
      });
      if (!hitCircle) continue;
      hits.push({
        enemy,
        hitCircle,
        dist2: Helpers.dist2(px, py, hitCircle.x, hitCircle.y)
      });
    }

    hits.sort((a, b) => a.dist2 - b.dist2);
    return hits;
  }

  function getMountPoint(shotIndex) {
    const player = GameState.player;
    const facing = player.spr.rotation - Math.PI / 2;
    const side = shotIndex % 2 === 0 ? -1 : 1;
    const sideAngle = facing + Math.PI / 2;
    return {
      x: player.spr.x + Math.cos(facing) * 10 + Math.cos(sideAngle) * 8 * side,
      y: player.spr.y + Math.sin(facing) * 10 + Math.sin(sideAngle) * 8 * side
    };
  }

  function emitFlakShot(fromX, fromY, toX, toY, spec) {
    Effects.emitLineTelegraph(fromX, fromY, toX, toY, 0xffd27a, spec.tracerLife, 1.4);
    Effects.emitParticle(fromX, fromY, 0xffd27a, 3, 0.32);
    Effects.emitParticle(toX, toY, 0xffa34d, 4, 0.42);
  }

  function interruptEnemy(enemy) {
    if (!enemy || enemy.tier === "boss") return;
    const state = enemy.enemyState;
    if (!state) return;

    if (enemy.tier === "rusher") {
      state.state = "recovery";
      state.timer = state.recoveryTime || 18;
      if (enemy.signalSpr) enemy.signalSpr.visible = false;
      return;
    }

    if (enemy.tier === "turret_mg" || enemy.tier === "turret_laser" || enemy.tier === "turret_sniper") {
      state.mode = "move";
      state.stateTime = 0;
      state.anchorCd = Math.max(state.anchorCd || 0, 26);
    }
  }

  function applyFlak(dt) {
    const S = GameState;
    const level = Math.max(0, S.stats.flakLevel || 0);
    if (level <= 0 || !S.player) return;

    S.stats.flakCooldown = Math.max(0, (S.stats.flakCooldown || 0) - dt);
    if (S.stats.flakCooldown > 0) return;

    const spec = FLAK_SPECS[Math.min(level, 3)];
    const targets = findNearbyTargets(spec.range);
    if (!targets.length) return;

    S.stats.flakCooldown = spec.cooldown;

    const selected = targets.slice(0, spec.maxTargets);
    for (let shotIndex = 0; shotIndex < spec.shots; shotIndex++) {
      const target = selected[shotIndex % selected.length];
      if (!target || !S.enemies.includes(target.enemy)) continue;

      const { enemy, hitCircle } = target;
      const mount = getMountPoint(shotIndex);
      emitFlakShot(mount.x, mount.y, hitCircle.x, hitCircle.y, spec);

      const damage = enemy.tier === "boss"
        ? Math.max(0.45, spec.damage * spec.bossDamageMul)
        : spec.damage;
      CombatSystem.damageEnemy(
        enemy,
        damage,
        0xffd27a,
        enemy.tier === "boss" ? 6 : 4,
        enemy.tier === "boss" ? 0.45 : 0.35,
        hitCircle
      );
    }
  }

  function applyArc(dt) {
    const S = GameState;
    const level = Math.max(0, S.stats.arcLevel || 0);
    if (level <= 0 || !S.player) return;

    S.stats.arcCooldown = Math.max(0, (S.stats.arcCooldown || 0) - dt);
    if (S.stats.arcCooldown > 0) return;

    const spec = ARC_SPECS[Math.min(level, 3)];
    const targets = findNearbyTargets(spec.range).slice(0, spec.maxTargets);
    if (!targets.length) return;

    S.stats.arcCooldown = spec.cooldown;

    for (let idx = 0; idx < targets.length; idx++) {
      const { enemy, hitCircle } = targets[idx];
      const isBoss = enemy.tier === "boss";
      const color = Math.random() < 0.5 ? 0x6cf5ff : 0xc595ff;
      const mount = getMountPoint(idx);
      Effects.emitElectricArc(mount.x, mount.y, hitCircle.x, hitCircle.y, color, 0xffffff, spec.arcLife, spec.arcJitter);
      Effects.emitParticle(mount.x, mount.y, color, 2, 0.2);
      CombatSystem.damageEnemy(
        enemy,
        spec.damage,
        color,
        isBoss ? 5 : 4,
        isBoss ? 0.35 : 0.28,
        hitCircle
      );

      if (isBoss) {
        enemy.slowMul = Math.min(enemy.slowMul || 1, spec.bossSlowMul);
        enemy.slowT = Math.max(enemy.slowT || 0, Math.max(4, spec.staggerTime * 0.5));
        continue;
      }

      enemy.slowMul = Math.min(enemy.slowMul || 1, spec.slowMul);
      enemy.slowT = Math.max(enemy.slowT || 0, spec.staggerTime);
      enemy.staggerT = Math.max(enemy.staggerT || 0, spec.staggerTime);
      enemy.hitT = Math.max(enemy.hitT || 0, spec.staggerTime * 0.75);
      interruptEnemy(enemy);
    }
  }

  function makeMineVisual() {
    const spr = new PIXI.Container();
    const body = new PIXI.Graphics();
    const ring = new PIXI.Graphics();
    const lifeBarBg = new PIXI.Graphics();
    const lifeBarFill = new PIXI.Graphics();
    spr.addChild(ring, body, lifeBarBg, lifeBarFill);
    return { spr, body, ring, lifeBarBg, lifeBarFill };
  }

  function redrawMine(mine) {
    const armed = mine.armDelay <= 0;
    const color = armed ? 0xff2222 : 0xff8800;
    const alpha = armed ? 0.72 : 0.55;
    const ringRadius = mine.radius * (armed ? 0.5 : 0.45);
    const lifeRatio = Math.max(0, Math.min(1, mine.life / MINE_LIFE));

    mine.body.clear();
    mine.body.beginFill(0x220606, 0.95);
    mine.body.lineStyle(2, color, 0.96);
    mine.body.drawRoundedRect(-4, -4, 8, 8, 2);
    mine.body.endFill();
    mine.body.beginFill(color, armed ? 0.9 : 0.75);
    mine.body.drawCircle(0, 0, armed ? 1.6 : 1.3);
    mine.body.endFill();

    mine.ring.clear();
    mine.ring.lineStyle(2, color, alpha);
    mine.ring.beginFill(color, armed ? 0.06 : 0.03);
    mine.ring.drawCircle(0, 0, ringRadius);
    mine.ring.endFill();

    mine.lifeBarBg.clear();
    mine.lifeBarBg.beginFill(0x140606, 0.8);
    mine.lifeBarBg.drawRoundedRect(-8, 7, 16, 3, 1.5);
    mine.lifeBarBg.endFill();

    mine.lifeBarFill.clear();
    mine.lifeBarFill.beginFill(color, 0.95);
    mine.lifeBarFill.drawRoundedRect(-8, 7, 16 * lifeRatio, 3, 1.5);
    mine.lifeBarFill.endFill();
  }

  function removeMine(index) {
    const mine = GameState.mines[index];
    if (!mine) return;
    if (mine.spr && mine.spr.parent) mine.spr.parent.removeChild(mine.spr);
    GameState.mines.splice(index, 1);
  }

  function spawnMine() {
    const S = GameState;
    if (!S.player || S.stats.mineLevel <= 0) return;
    const visual = makeMineVisual();
    const mine = {
      ...visual,
      x: S.player.spr.x,
      y: S.player.spr.y,
      radius: S.stats.mineRadius,
      damage: S.stats.mineDamage,
      life: MINE_LIFE,
      armDelay: MINE_ARM_DELAY
    };
    mine.spr.x = mine.x;
    mine.spr.y = mine.y;
    redrawMine(mine);
    S.uiLayer.addChild(mine.spr);
    S.mines.push(mine);
    Effects.emitParticle(mine.x, mine.y, 0xff8800, 5, 0.28);

    while (S.mines.length > S.stats.mineMaxCount) {
      removeMine(0);
    }
  }

  function explodeMine(index, target = null, hitCircle = null) {
    const S = GameState;
    const mine = S.mines[index];
    if (!mine) return;
    Effects.emitPulse(mine.x, mine.y, 0xff5522, mine.radius * 0.88, 12);
    Effects.emitParticle(mine.x, mine.y, 0xff5522, 12, 0.9);
    if (target) {
      CombatSystem.damageEnemy(
        target,
        mine.damage,
        0xff5522,
        target.tier === "boss" ? 14 : 8,
        target.tier === "boss" ? 0.9 : 0.55,
        hitCircle
      );
    }
    removeMine(index);
  }

  function updateProximityMines(dt) {
    const S = GameState;
    if (!S.player || S.stats.mineLevel <= 0) return;

    S.stats.mineCd = Math.max(0, (S.stats.mineCd || 0) - dt);
    if (S.stats.mineCd <= 0) {
      spawnMine();
      S.stats.mineCd = S.stats.mineCdMax || 420;
    }

    for (let i = S.mines.length - 1; i >= 0; i--) {
      const mine = S.mines[i];
      mine.life -= dt;
      mine.armDelay = Math.max(0, mine.armDelay - dt);
      mine.spr.x = mine.x;
      mine.spr.y = mine.y;
      mine.spr.alpha = 0.9 + Math.sin((performance.now() + i * 37) * 0.01) * (mine.armDelay <= 0 ? 0.06 : 0.03);
      redrawMine(mine);

      if (mine.life <= 0) {
        removeMine(i);
        continue;
      }
      if (mine.armDelay > 0) continue;

      let targetInfo = null;
      for (const enemy of S.enemies) {
        const hitCircle = getEnemyHitCircles(enemy).find((circle) => {
          const rr = mine.radius + circle.radius;
          return Helpers.dist2(mine.x, mine.y, circle.x, circle.y) <= rr * rr;
        });
        if (hitCircle) {
          targetInfo = { enemy, hitCircle };
          break;
        }
      }

      if (targetInfo) {
        explodeMine(i, targetInfo.enemy, targetInfo.hitCircle);
      }
    }
  }

  function update(dt) {
    applyFlak(dt);
    applyArc(dt);
    updateProximityMines(dt);
  }

  return { update };
})();
