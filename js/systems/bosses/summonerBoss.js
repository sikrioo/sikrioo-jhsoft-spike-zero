(function registerSummonerBossFactory() {
  const Shared = window.BossFactoryShared;

  function createSummonerBoss() {
    const def = BossSystem.getDefinition("summoner");
    const boss = Shared.createBaseBoss(def, { contactDamage: 13, collisionPush: 6.2 });

    boss.phase = 1;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x8a91ff, glowColor: 0x6e78ff });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 190);
    boss.spr.addChild(boss.core);
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.aiCd = 24;
    boss.minions = [];
    boss.totalSummons = 0;
    boss.maxSummons = 5;
    boss.phase2SummonBonusApplied = false;
    boss.shieldRing = new PIXI.Graphics();
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 5, 0x8a91ff, true, { alpha: 0.12, lineAlpha: 0.74 }));
    boss.spr.addChild(boss.shieldRing);

    function createMinion(role, angle) {
      const isShooter = role === "shooter";
      const minion = {
        role,
        x: boss.x + Math.cos(angle) * 52,
        y: boss.y + Math.sin(angle) * 32,
        orbit: angle,
        distX: isShooter ? 76 : 58,
        distY: isShooter ? 42 : 30,
        r: isShooter ? 15 : 17,
        hp: isShooter ? 18 : 24,
        maxHp: isShooter ? 18 : 24,
        fireCd: isShooter ? 28 : 0,
        dashCd: isShooter ? 0 : 46,
        dashTelegraphShown: false,
        frame: BossVisuals.buildFrame({
          radius: isShooter ? 15 : 17,
          code: isShooter ? "S" : "C",
          bodyColor: isShooter ? 0xd8dcff : 0xff8be4,
          glowColor: isShooter ? 0xa2a8ff : 0xd85cf0,
          useGlow: false,
          showValue: false
        }),
        hpBar: null,
        glowColor: isShooter ? 0xa2a8ff : 0xd85cf0
      };
      minion.hpBar = BossVisuals.attachMiniHpBar(minion.frame, 28, -24);
      boss.spr.addChild(minion.frame);
      return minion;
    }

    function pruneMinions() {
      boss.minions = boss.minions.filter((minion) => {
        if (minion.hp > 0) return true;
        if (minion.frame && minion.frame.parent) minion.frame.parent.removeChild(minion.frame);
        return false;
      });
    }

    function spawnWave() {
      const limit = boss.phase === 1 ? 2 : 3;
      if (boss.minions.length >= limit || boss.totalSummons >= boss.maxSummons) return false;
      const missing = Math.min(limit - boss.minions.length, boss.maxSummons - boss.totalSummons);
      const roles = boss.phase === 1 ? ["shooter", "chaser"] : ["shooter", "chaser", "shooter"];
      for (let i = 0; i < missing; i++) {
        const role = roles[(boss.minions.length + i) % roles.length];
        const angle = boss.orbitT + (Math.PI * 2 * (i + 1)) / (missing + 1);
        Shared.makeSummonRune(boss.x + Math.cos(angle) * 52, boss.y + Math.sin(angle) * 32, boss.phase === 1 ? 18 : 24, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6);
        boss.minions.push(createMinion(role, angle));
        boss.totalSummons += 1;
      }
      Effects.emitPulse(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 64, 12);
      Effects.emitParticle(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 16, 1.1);
      return true;
    }

    function checkPhaseTransition() {
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phase2SummonBonusApplied) {
        boss.phase2SummonBonusApplied = true;
        boss.maxSummons += 2;
      }
    }

    function fireShooterLaser(minion, aim) {
      const color = boss.phase === 1 ? 0xd8dcff : 0xffd6fa;
      const speed = boss.phase === 1 ? 8.8 : 9.8;
      const damage = boss.phase === 1 ? 6 : 7;
      for (let i = 0; i < 4; i++) {
        const ox = Math.cos(aim) * 18 * i;
        const oy = Math.sin(aim) * 18 * i;
        GameState.enemyBullets.push(BossBullets.make(minion.x + ox, minion.y + oy, aim, {
          color,
          speed: speed + i * 0.2,
          damage,
          radius: 7 + (i > 1 ? 1 : 0),
          life: 90,
          scaleX: 1.2,
          scaleY: 1.45
        }));
      }
      Effects.emitPulse(minion.x, minion.y, color, 24, 8);
    }

    boss.getHitCircles = () => {
      const circles = [{ x: boss.x, y: boss.y, radius: boss.r, bossCore: true }];
      for (const minion of boss.minions) {
        circles.push({ x: minion.x, y: minion.y, radius: minion.r, minion });
      }
      return circles;
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (ctx.hitCircle && ctx.hitCircle.minion) {
        ctx.hitCircle.minion.hp = Math.max(0, ctx.hitCircle.minion.hp - damage);
        pruneMinions();
        return true;
      }
      if (boss.minions.length > 0) return false;
      boss.hp = Math.max(0, boss.hp - damage);
      checkPhaseTransition();
      return true;
    };

    boss.onDefeat = () => {
      for (const minion of boss.minions) {
        Effects.emitParticle(minion.x, minion.y, minion.glowColor, 12, 1.0);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xa2a8ff, 30, 1.7);
      Effects.emitParticle(boss.x, boss.y, 0xff6bd6, 18, 1.3);
    };

    boss.updateBoss = (dt) => {
      boss.orbitT += dt * (boss.phase === 1 ? 0.011 : 0.016);
      const view = Shared.getCombatView();
      const targetX = view.centerX + Math.cos(boss.orbitT) * (boss.phase === 1 ? 84 : 132);
      const targetY = view.top + 110 + Math.sin(boss.orbitT * 2) * (boss.phase === 1 ? 20 : 30);
      boss.x = Helpers.lerp(boss.x, targetX, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 14 && boss.aiCd + dt > 14) {
        if (boss.minions.length < (boss.phase === 1 ? 2 : 3) && boss.totalSummons < boss.maxSummons) {
          Effects.emitGroundTelegraph(boss.x, boss.y, boss.phase === 1 ? 56 : 68, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14);
        } else {
          const aim = Shared.getAngleToTrackedPlayer(boss.x, boss.y);
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * (boss.phase === 1 ? 420 : 520), boss.y + Math.sin(aim) * (boss.phase === 1 ? 420 : 520), boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14, 6);
        }
      }
      if (boss.aiCd <= 0) {
        const didSummon = spawnWave();
        if (!didSummon) {
          const shotCount = boss.phase === 1 ? 3 : 5;
          BossBullets.aimSpread(boss.x, boss.y, Math.floor(shotCount / 2), {
            color: boss.phase === 1 ? 0xa2a8ff : 0xff6bd6,
            speed: boss.phase === 1 ? 7.8 : 8.6,
            damage: boss.phase === 1 ? 8 : 9,
            radius: 8,
            life: boss.phase === 1 ? 210 : 240,
            aimAngle: Shared.getAngleToTrackedPlayer(boss.x, boss.y)
          });
        }
        boss.aiCd = didSummon ? (boss.phase === 1 ? 72 : 58) : (boss.phase === 1 ? 34 : 28);
      }

      for (const minion of boss.minions) {
        minion.orbit += dt * (minion.role === "shooter" ? 0.02 : 0.028);
        const orbitX = Math.cos(minion.orbit) * minion.distX;
        const orbitY = Math.sin(minion.orbit * 1.3) * minion.distY;

        if (minion.role === "shooter") {
          minion.x = boss.x + orbitX;
          minion.y = boss.y + orbitY;
          minion.fireCd -= dt;
          if (minion.fireCd <= 10 && minion.fireCd + dt > 10) {
            const aim = Shared.getAngleToTrackedPlayer(minion.x, minion.y);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(aim) * 240, minion.y + Math.sin(aim) * 240, boss.phase === 1 ? 0xd8dcff : 0xffd6fa, 10, 5);
          }
          if (minion.fireCd <= 0) {
            fireShooterLaser(minion, Shared.getAngleToTrackedPlayer(minion.x, minion.y));
            minion.fireCd = boss.phase === 1 ? 32 : 24;
          }
        } else {
          minion.dashCd -= dt;
          if (!minion.dashTelegraphShown && minion.dashCd <= 12) {
            const angle = Shared.getAngleToTrackedPlayer(minion.x, minion.y);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(angle) * 140, minion.y + Math.sin(angle) * 140, 0xd85cf0, 12, 5);
            minion.dashTelegraphShown = true;
          }
          if (minion.dashCd <= 0) {
            const angle = Shared.getAngleToTrackedPlayer(minion.x, minion.y);
            minion.x += Math.cos(angle) * (boss.phase === 1 ? 46 : 70);
            minion.y += Math.sin(angle) * (boss.phase === 1 ? 46 : 70);
            Effects.emitPulse(minion.x, minion.y, 0xd85cf0, 28, 8);
            minion.dashCd = boss.phase === 1 ? 38 : 28;
            minion.dashTelegraphShown = false;
          } else {
            minion.x = boss.x + orbitX * 0.8 + Math.cos(minion.orbit * 2.2) * 24;
            minion.y = boss.y + orbitY * 0.8 + Math.sin(minion.orbit * 1.7) * 18;
          }
        }

        minion.frame.x = minion.x - boss.x;
        minion.frame.y = minion.y - boss.y;
        minion.frame.alpha = minion.hp / minion.maxHp;
        BossVisuals.redrawMiniHpBar(minion.hpBar, minion.hp / minion.maxHp, minion.role === "shooter" ? 0xd8dcff : 0xff8be4);
        BossVisuals.setFrameValue(minion.frame, minion.hp);
      }

      boss.core.alpha = boss.minions.length > 0 ? 0.58 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.01) * 0.03);
      boss.shieldRing.clear();
      if (boss.minions.length > 0) {
        const shieldAlpha = Math.min(0.42, 0.12 + boss.minions.length * 0.08);
        boss.shieldRing.lineStyle(3 + boss.minions.length * 0.5, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, shieldAlpha);
        boss.shieldRing.drawCircle(0, 0, def.radius + 12 + Math.sin(performance.now() * 0.01) * 2);
        boss.shieldRing.lineStyle(1.5, 0xffffff, shieldAlpha * 0.7);
        boss.shieldRing.drawCircle(0, 0, def.radius + 4);
        boss.shieldRing.x = boss.x;
        boss.shieldRing.y = boss.y;
      }
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x8a91ff : 0xff8be4);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  BossSystem.registerFactory("summoner", createSummonerBoss);
})();
