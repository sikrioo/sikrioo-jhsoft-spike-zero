(function registerSplitBossFactory() {
  const Shared = window.BossFactoryShared;

  function createSplitBoss() {
    const def = BossSystem.getDefinition("split");
    const boss = Shared.createBaseBoss(def, { contactDamage: 16, collisionPush: 8.2 });

    boss.phase = 1;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0xffd166, glowColor: 0xffb347 });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 200);
    boss.aiCd = 26;
    boss.phaseT = 0;
    boss.children = [];
    boss.splitShell = Shared.makeSplitCoreSilhouette(def.radius);
    boss.core.silhouette.addChild(boss.splitShell);
    boss.spr.addChild(boss.core);

    function makeChild(role, ox, oy) {
      const isBlue = role === "blue";
      const child = {
        role,
        x: boss.x + ox,
        y: boss.y + oy,
        r: 22,
        hp: def.maxHp * 0.25,
        maxHp: def.maxHp * 0.25,
        dashCd: isBlue ? 0 : 58,
        fireCd: isBlue ? 32 : 0,
        pulse: Math.random() * Math.PI * 2,
        dashTelegraphShown: false,
        state: isBlue ? "ORBIT" : "APPROACH",
        stateTime: 0,
        stateDuration: isBlue ? 0 : 18,
        lockAngle: 0,
        attackPattern: "FORWARD_SLASH",
        attackSide: 1,
        attackFxPlayed: false,
        afterSlash: 0,
        frame: BossVisuals.buildFrame({
          radius: 22,
          code: isBlue ? "B" : "R",
          bodyColor: isBlue ? 0x7df9ff : 0xff8fab,
          glowColor: isBlue ? 0x54d6ff : 0xff5f90,
          useGlow: false,
          showValue: false
        }),
        hpBar: null,
        glowColor: isBlue ? 0x54d6ff : 0xff5f90
      };
      child.sm = isBlue ? null : Shared.createStateMachine(child);
      if (!isBlue) {
        child.arrowSilhouette = BossVisuals.buildPolygonSilhouette(20, 3, 0xff8fab, false, { alpha: 0.16, lineAlpha: 0.82, rotation: Math.PI / 2 });
        child.frame.silhouette.addChild(child.arrowSilhouette);
      }
      child.hpBar = BossVisuals.attachMiniHpBar(child.frame, 34, -31);
      boss.spr.addChild(child.frame);
      return child;
    }

    function enterSplitPhase() {
      if (boss.phase === 2) return;
      boss.phase = 2;
      boss.core.visible = false;
      if (boss.hpBar) {
        boss.hpBar.barBg.visible = false;
        boss.hpBar.barFill.visible = false;
      }
      boss.children = [
        makeChild("blue", -120, 18),
        makeChild("red", 120, -14)
      ];
      Effects.emitPulse(boss.x, boss.y, 0xffd166, 90, 16);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 16, 1.3);
      Effects.emitParticle(boss.x, boss.y, 0x7df9ff, 16, 1.3);
      boss.hp = boss.children.reduce((sum, c) => sum + c.hp, 0);
    }

    function removeDeadChildren() {
      boss.children = boss.children.filter((child) => {
        if (child.hp > 0) return true;
        if (child.frame && child.frame.parent) child.frame.parent.removeChild(child.frame);
        return false;
      });
    }

    function updateRedKnightChild(child, dt, alone) {
      Shared.updateMeleeChaser(child, dt, {
        moveSpeed: alone ? 3.2 : 2.48,
        targetDist: alone ? 136 : 154,
        dashDistance: alone ? 176 : 152,
        strafeDuration: alone ? 14 : 19,
        chargeDuration: alone ? 11 : 14,
        attackDuration: alone ? 9 : 11,
        recoveryDuration: alone ? 12 : 14,
        approachDuration: alone ? 22 : 26,
        strafeSpeedMul: 0.75,
        recoveryBackoffMul: 0.45,
        attackMoveSpeed: (alone ? 176 : 152) / (alone ? 9 : 11),
        telegraphColor: 0xff5f90,
        telegraphLife: alone ? 10 : 12,
        telegraphWidth: 6,
        forwardThreshold: 170,
        approachSnap: 10,
        pulseOffset: child.pulse,
        onAttackFx(entity) {
          const slash = Shared.getSlashAngles(entity);
          const arcX = entity.x + Math.cos(entity.lockAngle) * 34;
          const arcY = entity.y + Math.sin(entity.lockAngle) * 34;
          Effects.emitSlashArc(arcX, arcY, slash.start, slash.end, 0xffffff, 7, alone ? 52 : 46, 8);
          Effects.emitSlashArc(arcX - Math.cos(entity.lockAngle) * 7, arcY - Math.sin(entity.lockAngle) * 7, slash.start + 0.05, slash.end - 0.05, 0xff5f90, 6, alone ? 46 : 40, 5);
        },
        onAttackTick(entity, delta) {
          if (entity.afterSlash <= 0) {
            entity.afterSlash = alone ? 5 : 6;
            BossBullets.aimSpread(entity.x, entity.y, alone ? 1 : 0, {
              color: 0xff8fab,
              speed: alone ? 5.8 : 5.0,
              damage: alone ? 9 : 7,
              radius: 6
            });
          } else {
            entity.afterSlash -= delta;
          }
        }
      });
    }

    boss.getHitCircles = () => {
      if (boss.phase === 1) return [{ x: boss.x, y: boss.y, radius: boss.r }];
      return boss.children.map((child) => ({ x: child.x, y: child.y, radius: child.r, child }));
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (boss.phase === 1) {
        boss.hp = Math.max(0, boss.hp - damage);
        if (boss.hp <= boss.maxHp * 0.5) enterSplitPhase();
        return true;
      }
      const target = (ctx.hitCircle && ctx.hitCircle.child) ? ctx.hitCircle.child : boss.children[0];
      if (!target) return false;
      target.hp = Math.max(0, target.hp - damage);
      removeDeadChildren();
      boss.hp = boss.children.reduce((sum, c) => sum + c.hp, 0);
      return true;
    };

    boss.updateBoss = (dt) => {
      boss.phaseT += dt * 0.015;
      const view = Shared.getCombatView();

      if (boss.phase === 1) {
        boss.x = Helpers.lerp(boss.x, view.centerX + Math.cos(boss.phaseT) * 90, 0.045 * dt);
        boss.y = Helpers.lerp(boss.y, view.top + 110 + Math.sin(boss.phaseT * 2) * 24, 0.045 * dt);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;
        const splitProgress = Helpers.clamp(1 - (boss.hp / Math.max(1, boss.maxHp) - 0.5) / 0.5, 0, 1);
        boss.splitShell.leftHalf.x = -splitProgress * 7;
        boss.splitShell.rightHalf.x = splitProgress * 7;
        boss.splitShell.crack.scale.x = 1 + splitProgress * 5;

        boss.aiCd -= dt;
        const useRadial = (((performance.now() / 220) | 0) % 2) === 0;
        if (boss.aiCd <= 10 && boss.aiCd + dt > 10) {
          if (useRadial) {
            Effects.emitGroundTelegraph(boss.x, boss.y, 80, 0xffd166, 10);
          } else {
            const aim = Shared.getAngleToTrackedPlayer(boss.x, boss.y);
            Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, 0xff8fab, 10, 6);
          }
        }
        if (boss.aiCd <= 0) {
          if (useRadial) {
            BossBullets.radialBurst(boss.x, boss.y, 12, 5.4, 0xffd166, 8, boss.phaseT * 0.8, 7);
            boss.aiCd = 54;
          } else {
            BossBullets.aimSpread(boss.x, boss.y, 1, { color: 0xff8fab, speed: 6.4, damage: 9, radius: 8, aimAngle: Shared.getAngleToTrackedPlayer(boss.x, boss.y) });
            boss.aiCd = 32;
          }
        }
      } else {
        for (const child of boss.children) {
          child.pulse += dt * 0.018;
          if (child.role === "blue") {
            child.targetX = view.left + view.width * 0.36 + Math.cos(child.pulse) * 70;
            child.targetY = view.top + 148 + Math.sin(child.pulse * 2) * 30;
            child.x = Helpers.lerp(child.x, child.targetX, 0.06 * dt);
            child.y = Helpers.lerp(child.y, child.targetY, 0.06 * dt);
            child.fireCd -= dt;
            const alone = boss.children.length === 1;
            if (child.fireCd <= 10 && child.fireCd + dt > 10) {
              Effects.emitGroundTelegraph(child.x, child.y, alone ? 68 : 52, 0x7df9ff, 10);
            }
            if (child.fireCd <= 0) {
              BossBullets.radialBurst(child.x, child.y, alone ? 14 : 9, alone ? 6.4 : 5.5, 0x7df9ff, 8, child.pulse, 7);
              child.fireCd = alone ? 34 : 52;
            }
          } else {
            updateRedKnightChild(child, dt, boss.children.length === 1);
          }
        }

        if (boss.children.length > 0) {
          boss.x = boss.children.reduce((sum, c) => sum + c.x, 0) / boss.children.length;
          boss.y = boss.children.reduce((sum, c) => sum + c.y, 0) / boss.children.length;
          boss.spr.x = boss.x;
          boss.spr.y = boss.y;
          for (const child of boss.children) {
            child.frame.x = child.x - boss.x;
            child.frame.y = child.y - boss.y;
            child.frame.rotation = child.role === "red" ? (child.lockAngle || 0) : 0;
            BossVisuals.redrawMiniHpBar(child.hpBar, child.hp / child.maxHp, child.role === "blue" ? 0x7df9ff : 0xff8fab);
            BossVisuals.setFrameValue(child.frame, child.hp);
          }
        }
      }

      if (boss.phase === 1 && boss.hpBar) {
        boss.hpBar.barBg.visible = true;
        boss.hpBar.barFill.visible = true;
        BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, 0xffd166);
      }
      if (boss.core.visible) BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    boss.onDefeat = () => {
      for (const child of boss.children) {
        Effects.emitParticle(child.x, child.y, child.glowColor, 16, 1.2);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xffd166, 26, 1.8);
    };

    return boss;
  }

  BossSystem.registerFactory("split", createSplitBoss);
})();
