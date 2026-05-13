(function registerWeaverBossFactory() {
  const Shared = window.BossFactoryShared;

  function createWeaverBoss() {
    const def = BossSystem.getDefinition("weaver");
    const boss = Shared.createBaseBoss(def, { contactDamage: 14, collisionPush: 6.6 });

    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x88b8ff, glowColor: 0x7ee7ff });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 190);
    boss.scheduler = BossScheduler.create();
    boss.aiCd = 22;
    boss.attackIndex = 0;
    boss.currentAction = "IDLE";
    boss.weaveT = Math.random() * Math.PI * 2;
    boss.web = new PIXI.Graphics();
    boss.nodeRing = BossVisuals.buildOrbitOrbs(def.radius, 0xff9ef6, 3, { offset: 28, orbRadius: 3, fillAlpha: 0.82 });
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 5, 0x7ee7ff, false, { alpha: 0.1, lineAlpha: 0.5 }));
    boss.spr.addChild(boss.core, boss.web);
    boss.core.orbitContainer.addChild(boss.nodeRing);

    function getNodePositions() {
      const result = [];
      const radius = def.radius + 28;
      for (let i = 0; i < 3; i++) {
        const ang = boss.weaveT + (Math.PI * 2 * i) / 3;
        result.push({
          x: boss.x + Math.cos(ang) * radius,
          y: boss.y + Math.sin(ang) * radius,
          ang
        });
      }
      return result;
    }

    function ribbonSweep() {
      boss.currentAction = "RIBBON";
      const steps = boss.phase === 1 ? 15 : 21;
      for (let i = 0; i < steps; i++) {
        boss.scheduler.schedule(i * 2, () => {
          const nodes = getNodePositions();
          for (let n = 0; n < nodes.length; n++) {
            const node = nodes[n];
            const sweep = Math.sin((i * 0.42) + n * 1.4 + boss.weaveT) * (boss.phase === 1 ? 0.62 : 0.84);
            const aim = Shared.getAngleToTrackedPlayer(node.x, node.y) + sweep;
            GameState.enemyBullets.push(BossBullets.make(node.x, node.y, aim, {
              color: n === 0 ? 0x7ee7ff : (n === 1 ? 0xff9ef6 : 0xb8f4ff),
              speed: boss.phase === 1 ? 6.2 : 7.0,
              damage: boss.phase === 1 ? 7 : 8,
              radius: 6,
              life: boss.phase === 1 ? 140 : 156
            }));
          }
        });
      }
    }

    function braidBurst() {
      boss.currentAction = "BRAID";
      for (let i = 0; i < (boss.phase === 1 ? 3 : 4); i++) {
        boss.scheduler.schedule(i * 6, () => {
          const nodes = getNodePositions();
          for (let n = 0; n < nodes.length; n++) {
            BossBullets.radialBurst(
              nodes[n].x,
              nodes[n].y,
              boss.phase === 1 ? 8 : 10,
              boss.phase === 1 ? 4.8 : 5.4,
              n === 1 ? 0xff9ef6 : 0x7ee7ff,
              boss.phase === 1 ? 7 : 8,
              nodes[n].ang + i * 0.22,
              6
            );
          }
        });
      }
    }

    function latticeFan() {
      boss.currentAction = "LATTICE";
      for (let i = 0; i < (boss.phase === 1 ? 4 : 5); i++) {
        boss.scheduler.schedule(i * 5, () => {
          const nodes = getNodePositions();
          for (let n = 0; n < nodes.length; n++) {
            const targetAngle = Shared.getAngleToTrackedPlayer(nodes[n].x, nodes[n].y) + (n - 1) * 0.2;
            BossBullets.aimSpread(nodes[n].x, nodes[n].y, boss.phase === 1 ? 1 : 2, {
              color: n === 2 ? 0xbffcff : 0x7ee7ff,
              speed: boss.phase === 1 ? 5.8 : 6.5,
              damage: boss.phase === 1 ? 8 : 9,
              radius: 7,
              aimAngle: targetAngle
            });
          }
        });
      }
    }

    boss.updateBoss = (dt) => {
      boss.scheduler.update(dt);
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        boss.aiCd = Math.min(boss.aiCd, 16);
        Effects.emitPulse(boss.x, boss.y, 0xff9ef6, 88, 16);
        Effects.emitParticle(boss.x, boss.y, 0x7ee7ff, 16, 1.2);
      }

      const view = Shared.getCombatView();
      boss.weaveT += dt * (boss.phase === 1 ? 0.014 : 0.019);
      const targetX = view.centerX + Math.sin(boss.weaveT * 1.6) * (boss.phase === 1 ? 128 : 156);
      const targetY = view.top + 112 + Math.sin(boss.weaveT * 2.5) * (boss.phase === 1 ? 22 : 30);
      boss.x = Helpers.lerp(boss.x, targetX, 0.054 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.054 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        const actions = [ribbonSweep, braidBurst, latticeFan];
        actions[boss.attackIndex % actions.length]();
        boss.aiCd = boss.phase === 1 ? 30 : 24;
        boss.attackIndex += 1;
      }
      if (!boss.scheduler.hasPending() && boss.aiCd > 8) {
        boss.currentAction = "IDLE";
      }

      const nodes = getNodePositions();
      boss.web.clear();
      boss.web.lineStyle(2, 0x8fd9ff, 0.18 + Math.sin(performance.now() * 0.01) * 0.04);
      boss.web.moveTo(nodes[0].x - boss.x, nodes[0].y - boss.y);
      boss.web.lineTo(nodes[1].x - boss.x, nodes[1].y - boss.y);
      boss.web.lineTo(nodes[2].x - boss.x, nodes[2].y - boss.y);
      boss.web.lineTo(nodes[0].x - boss.x, nodes[0].y - boss.y);
      boss.web.lineStyle(1.2, 0xffb8fb, 0.14);
      for (const node of nodes) {
        boss.web.moveTo(0, 0);
        boss.web.lineTo(node.x - boss.x, node.y - boss.y);
      }

      boss.core.orbitContainer.rotation += dt * (boss.phase === 1 ? 0.026 : 0.04);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.016) * 0.028 + (boss.phase === 2 ? 0.02 : 0));
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x7ee7ff : 0xff9ef6);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  BossSystem.registerFactory("weaver", createWeaverBoss);
})();
