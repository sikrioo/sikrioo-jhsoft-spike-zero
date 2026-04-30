(function registerAdvancedBossFactory() {
  const Shared = window.BossFactoryShared;

  function createAdvancedBoss() {
    const def = BossSystem.getDefinition("advanced");
    const boss = Shared.createBaseBoss(def, { contactDamage: 15, collisionPush: 7.6 });

    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 200);
    boss.starLayer = new PIXI.Container();
    boss.orbitOrbs = BossVisuals.buildOrbitOrbs(def.radius, 0xc6a8ff, 3, { offset: 26, orbRadius: 3.5, fillAlpha: 0.74 });
    boss.phaseNoise = new PIXI.Graphics();
    boss.core.silhouette.addChild(boss.starLayer);
    boss.starLayer.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 3, 0x9a7dff, false, { alpha: 0.12, lineAlpha: 0.72 }));
    boss.starLayer.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 3, 0xff8fab, false, { alpha: 0.08, lineAlpha: 0.54, rotation: Math.PI / 2 }));
    boss.core.orbitContainer.addChild(boss.orbitOrbs);
    boss.core.stateLayer.addChild(boss.phaseNoise);
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.aiCd = 28;
    boss.attackIndex = 0;
    boss.currentAction = "IDLE";
    boss.scheduler = BossScheduler.create();
    boss.spr.addChild(boss.core);

    function radialBurst(x, y, count, speed, color, damage, angleOffset = 0, radius = 7) {
      BossBullets.radialBurst(x, y, count, speed, color, damage, angleOffset, radius);
    }

    function trackingZone() {
      const player = Shared.getStealthAwarePlayerTarget();
      boss.currentAction = "TRACKING";
      Effects.emitGroundTelegraph(player.x, player.y, boss.phase === 1 ? 54 : 64, 0xffb347, 16);
      boss.scheduler.schedule(16, () => {
        radialBurst(player.x, player.y, boss.phase === 1 ? 10 : 14, boss.phase === 1 ? 5.0 : 5.8, 0xffb347, 8, performance.now() * 0.002);
        Effects.emitPulse(player.x, player.y, 0xffb347, boss.phase === 1 ? 48 : 62, 12);
      });
    }

    function rotatingBurst() {
      boss.currentAction = "ROTATING";
      Effects.emitGroundTelegraph(boss.x, boss.y, 68, 0x9a7dff, 12);
      boss.scheduler.schedule(12, () => {
        radialBurst(boss.x, boss.y, 14, 5.2, 0x9a7dff, 8, boss.orbitT * 0.8);
      });
    }

    function doubleRing() {
      boss.currentAction = "DOUBLE";
      Effects.emitGroundTelegraph(boss.x, boss.y, 76, 0xff6bb5, 12);
      boss.scheduler.schedule(12, () => radialBurst(boss.x, boss.y, 10, 4.7, 0xff8fab, 8, performance.now() * 0.002));
      boss.scheduler.schedule(26, () => radialBurst(boss.x, boss.y, 14, 5.5, 0xff6bb5, 9, performance.now() * 0.003));
    }

    function teleportBlast() {
      const player = Shared.getStealthAwarePlayerTarget();
      boss.currentAction = "TELEPORT";
      Effects.emitGroundTelegraph(player.x, player.y, 72, 0xff6bb5, 14);
      boss.scheduler.schedule(14, () => {
        Shared.makeTeleportAfterImage(boss.x, boss.y, def.radius + 10, 0xff8fab);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + Math.PI / 2;
        const view = Shared.getCombatView();
        boss.x = Helpers.clamp(player.x + Math.cos(angle) * 250, view.left + 42, view.right - 42);
        boss.y = Helpers.clamp(player.y + Math.sin(angle) * 156, view.top + 54, view.top + view.height * 0.52);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;
        Shared.makeTeleportAfterImage(boss.x, boss.y, def.radius + 12, 0xff6bb5);
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 62, 10);
        radialBurst(boss.x, boss.y, 10, 5.0, 0xff6bb5, 8, performance.now() * 0.0025);
      });
    }

    function checkPhaseTransition() {
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 90, 18);
        Effects.emitParticle(boss.x, boss.y, 0xff8fab, 20, 1.5);
        boss.aiCd = Math.min(boss.aiCd, 22);
        boss.starLayer.addChild(BossVisuals.buildPolygonSilhouette(def.radius * 0.92, 3, 0xd6b7ff, false, { alpha: 0.05, lineAlpha: 0.38, rotation: 0 }));
      }
    }

    boss.updateBoss = (dt) => {
      boss.scheduler.update(dt);
      checkPhaseTransition();

      if (boss.phase === 1) {
        const view = Shared.getCombatView();
        boss.orbitT += dt * 0.014;
        const targetX = view.centerX + Math.cos(boss.orbitT) * 110;
        const targetY = view.top + 112 + Math.sin(boss.orbitT * 2) * 24;
        boss.x = Helpers.lerp(boss.x, targetX, 0.06 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.06 * dt);
      } else {
        const player = Shared.getStealthAwarePlayerTarget();
        const view = Shared.getCombatView();
        boss.orbitT += dt * 0.01;
        const desired = Math.atan2(player.y - boss.y, player.x - boss.x) + Math.PI / 2;
        const targetX = player.x + Math.cos(desired) * 290;
        const targetY = Helpers.clamp(player.y + Math.sin(desired) * 172, view.top + 88, view.top + view.height * 0.48);
        boss.x = Helpers.lerp(boss.x, targetX, 0.03 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.03 * dt);
      }
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        if (boss.phase === 1) {
          const actions = [
            rotatingBurst,
            trackingZone,
            () => BossBullets.safeLaneBurst(boss.x, boss.y, { randomize: false, onSchedule: boss.scheduler.schedule, laneAngle: Shared.getAngleToTrackedPlayer(boss.x, boss.y) })
          ];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 34 : 30;
        } else {
          const actions = [
            doubleRing,
            () => BossBullets.safeLaneBurst(boss.x, boss.y, { randomize: true, onSchedule: boss.scheduler.schedule, laneAngle: Shared.getAngleToTrackedPlayer(boss.x, boss.y) }),
            teleportBlast
          ];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 44 : 40;
        }
        boss.attackIndex += 1;
      }

      while (boss.orbitOrbs.children.length < (boss.phase === 1 ? 3 : 6)) {
        const orb = BossVisuals.buildOrbitOrbs(def.radius, boss.phase === 1 ? 0xc6a8ff : 0xffd6fa, 1, {
          offset: 26 + boss.orbitOrbs.children.length * 1.5,
          orbRadius: boss.phase === 1 ? 3.5 : 3,
          fillAlpha: 0.72
        }).children[0];
        boss.orbitOrbs.addChild(orb);
      }

      boss.orbitOrbs.rotation += dt * (boss.phase === 1 ? 0.022 : 0.034);
      boss.starLayer.rotation += dt * (boss.phase === 1 ? 0.01 : 0.02);
      boss.core.alpha = boss.currentAction === "TELEPORT" ? 0.82 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.012) * 0.03 + (boss.phase === 2 ? Helpers.rand(-0.02, 0.02) : 0));
      boss.phaseNoise.clear();
      if (boss.currentAction === "TRACKING" || boss.currentAction === "DOUBLE" || boss.currentAction === "TELEPORT") {
        const color = boss.currentAction === "TRACKING" ? 0xffb347 : 0xff8fab;
        boss.phaseNoise.lineStyle(2, color, 0.32);
        boss.phaseNoise.drawCircle(0, 0, def.radius + 10 + Math.sin(performance.now() * 0.01) * 3);
        boss.phaseNoise.lineStyle(1, 0xffffff, 0.16);
        boss.phaseNoise.drawCircle(0, 0, def.radius - 4);
      }
      BossVisuals.setFrameValue(boss.core, boss.hp);
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x9a7dff : 0xff8fab);
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 150, 24);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 22, 1.5);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 24, 1.8);
    };

    return boss;
  }

  BossSystem.registerFactory("advanced", createAdvancedBoss);
})();
