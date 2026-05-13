(function registerBulwarkBossFactory() {
  const Shared = window.BossFactoryShared;

  function createBulwarkBoss() {
    const def = BossSystem.getDefinition("bulwark");
    const boss = Shared.createBaseBoss(def, { contactDamage: 17, collisionPush: 7.8 });

    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0xffa85c, glowColor: 0xffd27a });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 220);
    boss.scheduler = BossScheduler.create();
    boss.aiCd = 26;
    boss.attackIndex = 0;
    boss.currentAction = "IDLE";
    boss.moveT = Math.random() * Math.PI * 2;
    boss.batteryLeft = new PIXI.Graphics();
    boss.batteryRight = new PIXI.Graphics();
    boss.keel = new PIXI.Graphics();
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 4, 0xffa85c, false, { alpha: 0.1, lineAlpha: 0.52, rotation: Math.PI / 4 }));
    boss.spr.addChild(boss.core, boss.batteryLeft, boss.batteryRight, boss.keel);

    function drawHull() {
      const drawBattery = (g, side) => {
        g.clear();
        const x = side * (def.radius + 12);
        g.beginFill(0x16181f, 0.96);
        g.lineStyle(2, 0xffb56a, 0.76);
        g.drawRoundedRect(x - side * 8 - 10, -16, 20, 32, 6);
        g.endFill();
        g.beginFill(0xffd27a, 0.16);
        g.drawRoundedRect(x - side * 8 - 6, -10, 12, 20, 4);
        g.endFill();
      };
      drawBattery(boss.batteryLeft, -1);
      drawBattery(boss.batteryRight, 1);
      boss.keel.clear();
      boss.keel.beginFill(0xffd27a, 0.12);
      boss.keel.lineStyle(2, 0xffa85c, 0.48);
      boss.keel.drawPolygon([
        0, def.radius + 8,
        16, def.radius + 28,
        -16, def.radius + 28
      ]);
      boss.keel.endFill();
    }

    function firePortVolley(baseAngle, spread, speed, damage) {
      const ports = [
        { x: boss.x - (def.radius + 18), y: boss.y - 8, color: 0xffd27a },
        { x: boss.x + (def.radius + 18), y: boss.y + 8, color: 0xffa85c }
      ];
      for (const port of ports) {
        BossBullets.aimSpread(port.x, port.y, spread, {
          color: port.color,
          speed,
          damage,
          radius: 8,
          aimAngle: baseAngle + Helpers.rand(-0.08, 0.08)
        });
        Effects.emitParticle(port.x, port.y, port.color, 4, 0.34);
      }
    }

    function broadside() {
      boss.currentAction = "BROADSIDE";
      for (let i = 0; i < (boss.phase === 1 ? 4 : 5); i++) {
        boss.scheduler.schedule(i * 4, () => {
          firePortVolley(
            Shared.getAngleToTrackedPlayer(boss.x, boss.y) + Math.sin(boss.moveT + i * 0.5) * 0.18,
            boss.phase === 1 ? 1 : 2,
            boss.phase === 1 ? 6.0 : 6.6,
            boss.phase === 1 ? 8 : 9
          );
        });
      }
    }

    function wallBarrage() {
      boss.currentAction = "WALL";
      const view = Shared.getCombatView();
      for (let wave = 0; wave < (boss.phase === 1 ? 2 : 3); wave++) {
        boss.scheduler.schedule(wave * 8, () => {
          const tracked = Shared.getStealthAwarePlayerTarget();
          const gapCenter = Helpers.clamp(tracked.x, view.left + 80, view.right - 80);
          const gapWidth = boss.phase === 1 ? 100 : 84;
          const count = boss.phase === 1 ? 17 : 21;
          for (let i = 0; i < count; i++) {
            const x = view.left + (view.width * i) / Math.max(1, count - 1);
            if (Math.abs(x - gapCenter) < gapWidth * 0.5) continue;
            GameState.enemyBullets.push(BossBullets.make(x, view.top - 20, Math.PI / 2, {
              color: wave % 2 === 0 ? 0xffa85c : 0xffd27a,
              speed: boss.phase === 1 ? 5.2 : 5.8,
              damage: boss.phase === 1 ? 8 : 9,
              radius: 7,
              life: 150
            }));
          }
          Effects.emitPulse(gapCenter, view.top + 40, 0xffa85c, gapWidth * 0.55, 8);
        });
      }
    }

    function siegeCross() {
      boss.currentAction = "SIEGE";
      for (let i = 0; i < (boss.phase === 1 ? 3 : 4); i++) {
        boss.scheduler.schedule(i * 6, () => {
          const base = Shared.getAngleToTrackedPlayer(boss.x, boss.y) + i * 0.12;
          const guns = [
            { x: boss.x, y: boss.y - def.radius - 4, aim: base },
            { x: boss.x - def.radius - 10, y: boss.y + 4, aim: base + 0.18 },
            { x: boss.x + def.radius + 10, y: boss.y + 4, aim: base - 0.18 },
            { x: boss.x, y: boss.y + def.radius + 18, aim: base + Math.PI }
          ];
          for (const gun of guns) {
            BossBullets.aimSpread(gun.x, gun.y, boss.phase === 1 ? 1 : 2, {
              color: gun.y > boss.y ? 0xfff0bf : 0xffb56a,
              speed: boss.phase === 1 ? 5.4 : 6.0,
              damage: boss.phase === 1 ? 7 : 8,
              radius: 7,
              aimAngle: gun.aim
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
        boss.aiCd = Math.min(boss.aiCd, 18);
        Effects.emitPulse(boss.x, boss.y, 0xffd27a, 104, 16);
        Effects.emitParticle(boss.x, boss.y, 0xffa85c, 22, 1.4);
      }

      const view = Shared.getCombatView();
      boss.moveT += dt * (boss.phase === 1 ? 0.011 : 0.014);
      const targetX = view.centerX + Math.sin(boss.moveT) * (boss.phase === 1 ? 186 : 220);
      const targetY = view.top + 108 + Math.sin(boss.moveT * 2.2) * (boss.phase === 1 ? 18 : 26);
      boss.x = Helpers.lerp(boss.x, targetX, 0.048 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.048 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        const actions = [broadside, wallBarrage, siegeCross];
        actions[boss.attackIndex % actions.length]();
        boss.aiCd = boss.phase === 1 ? 34 : 28;
        boss.attackIndex += 1;
      }
      if (!boss.scheduler.hasPending() && boss.aiCd > 8) {
        boss.currentAction = "IDLE";
      }

      drawHull();
      boss.batteryLeft.alpha = boss.currentAction === "BROADSIDE" ? 0.96 : 0.82;
      boss.batteryRight.alpha = boss.batteryLeft.alpha;
      boss.keel.alpha = boss.currentAction === "SIEGE" ? 0.92 : 0.64;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.012) * 0.024 + (boss.phase === 2 ? 0.025 : 0));
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0xffa85c : 0xffd27a);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  BossSystem.registerFactory("bulwark", createBulwarkBoss);
})();
