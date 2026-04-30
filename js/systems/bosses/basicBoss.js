(function registerBasicBossFactory() {
  const Shared = window.BossFactoryShared;
  const CONFIG = {
    CONTACT_DAMAGE: 14,
    COLLISION_PUSH: 7.2,
    PHASE_TWO_HP_RATIO: 0.3,
    PHASE_SHIFT_FX: 36,
    FIRE_CD_START: 24,
    FIRE_CD_P1: 41,
    FIRE_CD_P2: 34,
    BLAST_CD: 60
  };

  function createBasicBoss() {
    const def = BossSystem.getDefinition("basic");
    const boss = Shared.createBaseBoss(def, {
      contactDamage: CONFIG.CONTACT_DAMAGE,
      collisionPush: CONFIG.COLLISION_PUSH
    });

    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x79ffbf, glowColor: 0x48ffc5 });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 180);
    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.fireCd = CONFIG.FIRE_CD_START;
    boss.patternIndex = 0;
    boss.orbitT = 0;
    boss.pendingBlast = null;
    boss.phaseShiftFx = 0;
    boss.phaseRing = new PIXI.Graphics();
    boss.phaseCoreTint = new PIXI.Graphics();
    boss.phaseSpikes = BossVisuals.buildSpikeRing(def.radius, 0xffffff, 12, 12, { fillAlpha: 0.08, lineAlpha: 0.82 });
    boss.orbitOrbs = BossVisuals.buildOrbitOrbs(def.radius, 0xffb7b0, 3, { offset: 26, orbRadius: 3.5, fillAlpha: 0.72 });
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 8, 0x79ffbf, false, { alpha: 0.12, lineAlpha: 0.7 }));
    boss.phaseSpikes.visible = false;
    boss.orbitOrbs.visible = false;
    boss.spr.addChild(boss.core);
    boss.spr.addChild(boss.phaseCoreTint);
    boss.spr.addChild(boss.phaseRing);
    boss.spr.addChild(boss.phaseSpikes);
    boss.spr.addChild(boss.orbitOrbs);

    function triggerAreaBlast(blast) {
      if (!blast) return;
      Effects.emitPulse(blast.x, blast.y, blast.color, blast.radius * 0.78, 12);
      Effects.emitParticle(blast.x, blast.y, blast.color, 12, 0.9);
      const player = GameState.player;
      const rr = blast.radius + player.r;
      if (Helpers.dist2(blast.x, blast.y, player.spr.x, player.spr.y) <= rr * rr) {
        const ang = Math.atan2(player.spr.y - blast.y, player.spr.x - blast.x);
        EnemySystem.hitPlayerWithEnemyDamage(blast.damage, blast.color, Math.cos(ang), Math.sin(ang), {
          invFrames: 22,
          push: 5.2,
          particleCount: 14,
          particlePower: 1.0,
          pulseRadius: blast.radius * 0.52,
          pulseLife: 10
        });
      }
    }

    boss.updateBoss = (dt) => {
      const view = Shared.getCombatView();
      if (boss.hp <= boss.maxHp * CONFIG.PHASE_TWO_HP_RATIO) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        boss.phaseShiftFx = CONFIG.PHASE_SHIFT_FX;
        Effects.emitPulse(boss.x, boss.y, 0xff9b8d, 84, 16);
        Effects.emitParticle(boss.x, boss.y, 0xff9b8d, 16, 1.2);
        Effects.emitPulse(boss.x, boss.y, 0xffffff, 62, 10);
        boss.fireCd = Math.min(boss.fireCd, 22);
      }

      boss.orbitT += dt * 0.012;
      boss.x = Helpers.lerp(boss.x, view.centerX + Math.cos(boss.orbitT) * 150, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, view.top + 118 + Math.sin(boss.orbitT * 2) * 28, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.fireCd -= dt;
      if (boss.phaseShiftFx > 0) boss.phaseShiftFx -= dt;

      const pattern = boss.patternIndex % (boss.phase === 1 ? 1 : 2);
      if (pattern !== 0 && !boss.pendingBlast && boss.fireCd <= 48) {
        const player = Shared.getStealthAwarePlayerTarget();
        const tx = Helpers.clamp(player.x + player.vx * 5, view.left + 44, view.right - 44);
        const ty = Helpers.clamp(player.y + player.vy * 5, view.top + 64, view.bottom - 44);
        boss.pendingBlast = { x: tx, y: ty, radius: 50, damage: 11, color: 0xff6b6b };
        Effects.emitGroundTelegraph(tx, ty, 50, 0xff6b6b, 48);
      }

      if (boss.fireCd <= 0) {
        if (pattern === 0) {
          const aim = Shared.getAngleToTrackedPlayer(boss.x, boss.y);
          const spread = boss.phase === 1 ? 1 : 2;
          for (let i = -spread; i <= spread; i++) {
            GameState.enemyBullets.push(BossBullets.make(boss.x, boss.y + 16, aim + i * 0.16, {
              color: 0x79ffbf,
              speed: boss.phase === 1 ? 3.82 : 5.05,
              damage: 8,
              radius: 8
            }));
          }
          boss.fireCd = boss.phase === 1 ? CONFIG.FIRE_CD_P1 : CONFIG.FIRE_CD_P2;
        } else {
          triggerAreaBlast(boss.pendingBlast);
          boss.pendingBlast = null;
          boss.fireCd = CONFIG.BLAST_CD;
        }
        boss.patternIndex += 1;
      }

      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x79ffbf : 0xff9b8d);
      BossVisuals.setFrameValue(boss.core, boss.hp);
      const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.03;
      const shiftBoost = boss.phaseShiftFx > 0 ? (boss.phaseShiftFx / CONFIG.PHASE_SHIFT_FX) * 0.18 : 0;
      boss.core.scale.set(pulse + shiftBoost);
      boss.core.alpha = boss.phase === 1 ? 1 : 0.96;
      boss.orbitOrbs.rotation += dt * (boss.phase === 2 ? -0.03 : 0.012);
      boss.orbitOrbs.visible = boss.phase === 2 || boss.phaseShiftFx > 0;

      boss.phaseCoreTint.clear();
      if (boss.phase === 2 || boss.phaseShiftFx > 0) {
        const tintAlpha = boss.phaseShiftFx > 0 ? 0.14 + (boss.phaseShiftFx / CONFIG.PHASE_SHIFT_FX) * 0.22 : 0.16;
        boss.phaseCoreTint.beginFill(0xff8a8a, tintAlpha);
        boss.phaseCoreTint.drawCircle(0, 0, def.radius - 8);
        boss.phaseCoreTint.endFill();
      }

      boss.phaseRing.clear();
      boss.phaseSpikes.visible = boss.phase === 2 || boss.phaseShiftFx > 0;
      if (boss.phase === 2 || boss.phaseShiftFx > 0) {
        const alpha = boss.phaseShiftFx > 0 ? 0.28 + (boss.phaseShiftFx / CONFIG.PHASE_SHIFT_FX) * 0.5 : 0.24;
        const radius = def.radius + 10 + (boss.phaseShiftFx > 0 ? (1 - boss.phaseShiftFx / CONFIG.PHASE_SHIFT_FX) * 8 : 4);
        boss.phaseRing.lineStyle(3, 0xff9b8d, alpha);
        boss.phaseRing.drawCircle(0, 0, radius);
        boss.phaseRing.lineStyle(1.5, 0xffffff, alpha * 0.8);
        boss.phaseRing.drawCircle(0, 0, Math.max(10, radius - 6));
        const spikeScale = boss.phaseShiftFx > 0 ? 1 - (boss.phaseShiftFx / CONFIG.PHASE_SHIFT_FX) * 0.65 : 1;
        boss.phaseSpikes.scale.set(1, Math.max(0.18, spikeScale));
        boss.phaseSpikes.alpha = Math.max(0.22, alpha + 0.14);
      }
    };

    return boss;
  }

  BossSystem.registerFactory("basic", createBasicBoss);
})();
