(function registerKnightBossFactory() {
  const Shared = window.BossFactoryShared;

  function createKnightBoss() {
    const def = BossSystem.getDefinition("knight");
    const boss = Shared.createBaseBoss(def, { contactDamage: 18, collisionPush: 8.8 });

    boss.phase = 1;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.blade = new PIXI.Graphics();
    boss.crest = Shared.makeShieldSilhouette(def.radius + 4, 0x9a7dff, { fillAlpha: 0.14, lineAlpha: 0.86 });
    boss.spikeRing = BossVisuals.buildSpikeRing(def.radius, 0xff8be4, 8, 10, { fillAlpha: 0.06, lineAlpha: 0.72 });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 190);
    boss.core.silhouette.addChild(boss.crest);
    boss.spikeRing.visible = false;
    boss.spr.addChild(boss.core, boss.spikeRing, boss.blade);

    boss.state = "APPROACH";
    boss.stateTime = 0;
    boss.stateDuration = 34;
    boss.lockAngle = 0;
    boss.attackPattern = "FORWARD_SLASH";
    boss.attackSide = 1;
    boss.afterSlash = 0;
    boss.attackFxPlayed = false;
    boss.dashTelegraphShown = false;
    boss.sm = Shared.createStateMachine(boss);

    function drawBlade() {
      boss.blade.clear();
      if (!(boss.state === "CHARGE" || boss.state === "ATTACK")) return;

      const facing = boss.lockAngle || 0;
      let bladeLen = boss.state === "CHARGE" ? 28 + Math.sin(boss.stateTime * 0.4) * 6 : 48;
      if (boss.phase === 2) bladeLen += 6;

      let bladeAngle = boss.state === "CHARGE"
        ? facing + 0.55
        : facing - 0.2 + Math.sin(boss.stateTime * 0.5) * 0.28;
      if (boss.attackPattern === "LEFT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing - 0.9 : facing - 0.95 + Math.sin(boss.stateTime * 0.55) * 0.16;
      } else if (boss.attackPattern === "RIGHT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing + 0.9 : facing + 0.95 - Math.sin(boss.stateTime * 0.55) * 0.16;
      }

      const bladeX1 = Math.cos(bladeAngle) * 10;
      const bladeY1 = Math.sin(bladeAngle) * 10;
      const bladeX2 = bladeX1 + Math.cos(bladeAngle) * bladeLen;
      const bladeY2 = bladeY1 + Math.sin(bladeAngle) * bladeLen;
      const glowColor = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
      const nx = -Math.sin(bladeAngle);
      const ny = Math.cos(bladeAngle);

      boss.blade.beginFill(glowColor, 0.2);
      boss.blade.lineStyle(2, 0xffffff, 0.88);
      boss.blade.drawPolygon([
        bladeX1 + nx * 10, bladeY1 + ny * 10,
        bladeX1 - nx * 10, bladeY1 - ny * 10,
        bladeX2 - nx * 3, bladeY2 - ny * 3,
        bladeX2 + nx * 3, bladeY2 + ny * 3
      ]);
      boss.blade.endFill();
      boss.blade.lineStyle(6, glowColor, 0.16);
      boss.blade.moveTo(bladeX1, bladeY1);
      boss.blade.lineTo(bladeX2, bladeY2);
    }

    boss.updateBoss = (dt) => {
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;

      Shared.updateMeleeChaser(boss, dt, {
        moveSpeed: boss.phase === 1 ? 3.2 : 4.1,
        targetDist: boss.phase === 1 ? 170 : 145,
        dashDistance: 240,
        strafeDuration: boss.phase === 1 ? 24 : 18,
        chargeDuration: boss.phase === 1 ? 14 : 10,
        attackDuration: boss.phase === 1 ? 10 : 8,
        recoveryDuration: boss.phase === 1 ? 16 : 12,
        approachDuration: boss.phase === 1 ? 28 : 20,
        strafeSpeedMul: 0.85,
        recoveryBackoffMul: 0.55,
        attackMoveSpeed: boss.phase === 1 ? 16 : 20,
        telegraphColor: boss.phase === 1 ? 0xff6a72 : 0xff4f66,
        telegraphLife: boss.phase === 1 ? 16 : 14,
        telegraphWidth: boss.phase === 1 ? 22 : 24,
        telegraphStyle: "warningWide",
        forwardThreshold: boss.phase === 1 ? 165 : 185,
        onAttackFx(entity) {
          const slash = Shared.getSlashAngles(entity);
          const arcRadius = boss.phase === 1 ? 60 : 68;
          const accent = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
          const arcX = entity.x + Math.cos(entity.lockAngle) * 32;
          const arcY = entity.y + Math.sin(entity.lockAngle) * 32;
          Effects.emitSlashArc(arcX, arcY, slash.start, slash.end, 0xffffff, 9, arcRadius, 8);
          Effects.emitSlashArc(arcX - Math.cos(entity.lockAngle) * 8, arcY - Math.sin(entity.lockAngle) * 8, slash.start + 0.06, slash.end - 0.06, accent, 8, arcRadius - 6, 5);
        },
        onAttackTick(entity, delta) {
          if (entity.afterSlash <= 0) {
            entity.afterSlash = boss.phase === 1 ? 4 : 3;
            const spread = boss.phase === 1 ? 1 : 3;
            BossBullets.aimSpread(entity.x, entity.y, spread, {
              color: boss.phase === 1 ? 0x7df9ff : 0xff8be4,
              speed: boss.phase === 1 ? 5.6 : 6.4,
              damage: boss.phase === 1 ? 8 : 10,
              radius: 7,
              aimAngle: entity.lockAngle
            });
            Effects.emitPulse(entity.x, entity.y, boss.phase === 1 ? 0x7df9ff : 0xff8be4, boss.phase === 1 ? 34 : 42, 8);
          } else {
            entity.afterSlash -= delta;
          }
        }
      });

      const view = Shared.getCombatView();
      boss.x = Helpers.clamp(boss.x, view.left + 28, view.right - 28);
      boss.y = Helpers.clamp(boss.y, view.top + 44, view.bottom - 40);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      const glowColor = boss.state === "ATTACK" || boss.state === "CHARGE"
        ? (boss.phase === 1 ? 0x7df9ff : 0xff9be8)
        : (boss.phase === 1 ? 0x9a7dff : 0xff6bd6);

      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, glowColor);
      BossVisuals.setFrameValue(boss.core, boss.hp);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.02) * 0.02);
      boss.core.alpha = boss.state === "RECOVERY" ? 0.82 : 1;
      boss.spikeRing.visible = boss.phase === 2;
      boss.spikeRing.alpha = boss.state === "ATTACK" ? 0.92 : 0.58;
      boss.spikeRing.rotation += dt * 0.012;
      drawBlade();
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 140, 22);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 28, 1.8);
      Effects.emitParticle(boss.x, boss.y, 0xff8be4, 24, 1.5);
    };

    return boss;
  }

  BossSystem.registerFactory("knight", createKnightBoss);
})();
