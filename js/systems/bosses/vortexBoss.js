(function registerVortexBossFactory() {
  const Shared = window.BossFactoryShared;

  function createVortexBoss() {
    const def = BossSystem.getDefinition("vortex");
    const boss = Shared.createBaseBoss(def, { contactDamage: 15, collisionPush: 7.1 });

    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x4f8dff, glowColor: 0x7ee7ff });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 200);
    boss.scheduler = BossScheduler.create();
    boss.aiCd = 24;
    boss.attackIndex = 0;
    boss.currentAction = "IDLE";
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.pullFieldT = 0;
    boss.pullRadius = 0;
    boss.pullStrength = 0;
    boss.mawRing = new PIXI.Graphics();
    boss.phaseRing = new PIXI.Graphics();
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 6, 0x64c6ff, true, { alpha: 0.1, lineAlpha: 0.56 }));
    boss.core.orbitContainer.addChild(BossVisuals.buildOrbitOrbs(def.radius, 0xbef7ff, 4, { offset: 24, orbRadius: 3, fillAlpha: 0.72 }));
    boss.spr.addChild(boss.core, boss.mawRing, boss.phaseRing);

    function emitSpiralSalvo(steps, interval, count, speed, color) {
      for (let i = 0; i < steps; i++) {
        boss.scheduler.schedule(i * interval, () => {
          BossBullets.radialBurst(
            boss.x,
            boss.y,
            count,
            speed + i * 0.14,
            color,
            boss.phase === 1 ? 8 : 9,
            boss.orbitT * 0.9 + i * 0.34,
            7
          );
          Effects.emitParticle(boss.x, boss.y, color, 4, 0.32);
        });
      }
    }

    function gravityWell() {
      boss.currentAction = "GRAVITY";
      const radius = boss.phase === 1 ? 110 : 136;
      Effects.emitGroundTelegraph(boss.x, boss.y, radius, 0x64c6ff, 18);
      boss.scheduler.schedule(18, () => {
        boss.pullFieldT = boss.phase === 1 ? 34 : 46;
        boss.pullRadius = radius;
        boss.pullStrength = boss.phase === 1 ? 0.26 : 0.34;
        Effects.emitPulse(boss.x, boss.y, 0x7ee7ff, radius, 14);
        BossBullets.radialBurst(boss.x, boss.y, boss.phase === 1 ? 12 : 16, boss.phase === 1 ? 4.4 : 5.1, 0x7ee7ff, boss.phase === 1 ? 8 : 9, boss.orbitT * 0.7, 7);
      });
    }

    function spiralCage() {
      boss.currentAction = "SPIRAL";
      emitSpiralSalvo(boss.phase === 1 ? 5 : 7, 5, boss.phase === 1 ? 12 : 14, boss.phase === 1 ? 4.5 : 5.0, boss.phase === 1 ? 0x64c6ff : 0x7ee7ff);
    }

    function tidalLances() {
      boss.currentAction = "LANCES";
      for (let i = 0; i < (boss.phase === 1 ? 3 : 4); i++) {
        boss.scheduler.schedule(i * 6, () => {
          const aim = Shared.getAngleToTrackedPlayer(boss.x, boss.y) + Math.sin(boss.orbitT + i * 0.8) * 0.12;
          const offsets = [-1, 1];
          for (const side of offsets) {
            const px = boss.x + Math.cos(aim + Math.PI / 2) * side * 34;
            const py = boss.y + Math.sin(aim + Math.PI / 2) * side * 34;
            BossBullets.aimSpread(px, py, boss.phase === 1 ? 1 : 2, {
              color: side < 0 ? 0x9edcff : 0x5bb3ff,
              speed: boss.phase === 1 ? 6.2 : 6.8,
              damage: boss.phase === 1 ? 8 : 9,
              radius: 7,
              aimAngle: aim
            });
          }
        });
      }
    }

    function applyGravityPull(dt) {
      if (boss.pullFieldT <= 0) return;
      boss.pullFieldT = Math.max(0, boss.pullFieldT - dt);
      const player = GameState.player;
      const dx = boss.x - player.spr.x;
      const dy = boss.y - player.spr.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < boss.pullRadius) {
        const falloff = 1 - Helpers.clamp(dist / Math.max(1, boss.pullRadius), 0, 1);
        player.vx += (dx / dist) * boss.pullStrength * falloff * dt;
        player.vy += (dy / dist) * boss.pullStrength * falloff * dt;
        if (((performance.now() + player.spr.x * 3 + player.spr.y * 5) | 0) % 10 === 0) {
          Effects.emitParticle(player.spr.x, player.spr.y, 0x7ee7ff, 1, 0.16);
        }
      }
      if (((performance.now() + boss.x * 2) | 0) % 5 === 0) {
        const ang = Helpers.rand(0, Math.PI * 2);
        const ringR = Helpers.rand(boss.pullRadius * 0.18, boss.pullRadius * 0.92);
        Effects.emitParticle(boss.x + Math.cos(ang) * ringR, boss.y + Math.sin(ang) * ringR, 0x7ee7ff, 1, 0.12);
      }
    }

    boss.updateBoss = (dt) => {
      boss.scheduler.update(dt);
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        boss.aiCd = Math.min(boss.aiCd, 18);
        Effects.emitPulse(boss.x, boss.y, 0x7ee7ff, 96, 16);
        Effects.emitParticle(boss.x, boss.y, 0x64c6ff, 18, 1.3);
      }

      const view = Shared.getCombatView();
      boss.orbitT += dt * (boss.phase === 1 ? 0.012 : 0.016);
      const targetX = view.centerX + Math.cos(boss.orbitT * 0.9) * (boss.phase === 1 ? 126 : 156);
      const targetY = view.top + 108 + Math.sin(boss.orbitT * 1.8) * (boss.phase === 1 ? 26 : 34);
      boss.x = Helpers.lerp(boss.x, targetX, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      applyGravityPull(dt);

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        const actions = [gravityWell, spiralCage, tidalLances];
        actions[boss.attackIndex % actions.length]();
        boss.aiCd = boss.phase === 1 ? 34 : 28;
        boss.attackIndex += 1;
      }
      if (!boss.scheduler.hasPending() && boss.pullFieldT <= 0 && boss.aiCd > 10) {
        boss.currentAction = "IDLE";
      }

      const pullAlpha = boss.pullFieldT > 0 ? 0.18 + (boss.pullFieldT / Math.max(1, boss.phase === 1 ? 34 : 46)) * 0.18 : 0;
      boss.mawRing.clear();
      boss.mawRing.lineStyle(4, 0x64c6ff, 0.12 + pullAlpha);
      boss.mawRing.drawCircle(0, 0, def.radius + 10 + Math.sin(performance.now() * 0.012) * 2);
      boss.mawRing.lineStyle(1.5, 0xffffff, 0.16 + pullAlpha * 0.45);
      boss.mawRing.drawCircle(0, 0, def.radius - 4);
      if (boss.pullFieldT > 0) {
        boss.phaseRing.clear();
        boss.phaseRing.lineStyle(10, 0x64c6ff, pullAlpha * 0.18);
        boss.phaseRing.drawCircle(0, 0, boss.pullRadius);
        boss.phaseRing.lineStyle(2.5, 0xbef7ff, pullAlpha * 0.58);
        boss.phaseRing.drawCircle(0, 0, boss.pullRadius * 0.96);
      } else {
        boss.phaseRing.clear();
      }

      boss.core.orbitContainer.rotation -= dt * (boss.phase === 1 ? 0.025 : 0.04);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.015) * 0.03 + (boss.phase === 2 ? 0.03 : 0));
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x64c6ff : 0x7ee7ff);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  BossSystem.registerFactory("vortex", createVortexBoss);
})();
