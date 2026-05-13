(function registerOvermindBossFactory() {
  const Shared = window.BossFactoryShared;

  function makeSolarPanel(side) {
    const root = new PIXI.Container();
    const panel = new PIXI.Graphics();
    panel.beginFill(0x2f6aa4, 0.96);
    panel.lineStyle(2, 0xd8f1ff, 0.38);
    panel.drawRoundedRect(-34, -10, 68, 20, 4);
    panel.endFill();
    panel.lineStyle(1, 0xa8dbff, 0.2);
    for (let i = -2; i <= 2; i++) {
      panel.moveTo(i * 11, -8);
      panel.lineTo(i * 11, 8);
    }

    const frame = new PIXI.Graphics();
    frame.lineStyle(2.2, 0x9ec0d8, 0.78);
    frame.moveTo(0, -13);
    frame.lineTo(0, 13);
    frame.moveTo(-36, 0);
    frame.lineTo(36, 0);

    const hub = new PIXI.Graphics();
    hub.beginFill(0x89d8ff, 0.74);
    hub.drawCircle(0, 0, 3.4);
    hub.endFill();

    root.addChild(panel, frame, hub);
    root.x = side * 66;
    root.scale.x = side;
    root.panelSpr = panel;
    root.hubSpr = hub;
    return root;
  }

  function createOvermindBoss() {
    const def = BossSystem.getDefinition("overmind");
    const boss = Shared.createBaseBoss(def, { contactDamage: 18, collisionPush: 8.1 });

    boss.phase = 1;
    boss.phaseShiftPlayed = { 2: false, 3: false };
    boss.scheduler = BossScheduler.create();
    boss.aiCd = 26;
    boss.attackIndex = 0;
    boss.currentAction = "IDLE";
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.beamT = 0;
    boss.beamMaxT = 0;
    boss.beamChargeT = 0;
    boss.beamChargeMaxT = 0;
    boss.beamAngle = 0;
    boss.beamWidth = 12;
    boss.beamColor = 0xff5e72;
    boss.beamDamage = 10;
    boss.beamDamageCd = 0;
    boss.beamPulseCd = 0;
    boss.beamChargePulseCd = 0;
    boss.beamCount = 1;
    boss.beamSpread = 0;
    boss.beamLength = 1360;
    boss.core = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x9bb8d4, glowColor: 0x86d6ff });
    boss.hpBar = BossVisuals.attachHpBar(boss.spr, 224);
    boss.stateRing = new PIXI.Graphics();
    boss.beamFx = new PIXI.Graphics();
    boss.haloFx = new PIXI.Graphics();
    boss.chargeOrbFx = new PIXI.Graphics();
    boss.panelRoot = new PIXI.Container();
    boss.panelLeft = makeSolarPanel(-1);
    boss.panelRight = makeSolarPanel(1);
    boss.panelRoot.addChild(boss.panelLeft, boss.panelRight);
    boss.innerSigil = new PIXI.Graphics();
    boss.core.silhouette.addChild(BossVisuals.buildPolygonSilhouette(def.radius, 8, 0x9ad7ff, false, {
      alpha: 0.08,
      lineAlpha: 0.42,
      scaleOuter: 0.92
    }));
    boss.core.silhouette.addChild(BossVisuals.buildSpikeRing(def.radius - 2, 0xd6ecff, 8, 10, {
      fillAlpha: 0.05,
      lineAlpha: 0.24,
      innerOffset: -4,
      baseHalfWidth: 3
    }));
    boss.core.stateLayer.addChild(boss.innerSigil);
    boss.core.orbitContainer.addChild(BossVisuals.buildOrbitOrbs(def.radius, 0xbfe9ff, 4, { offset: 24, orbRadius: 3.5, fillAlpha: 0.76 }));
    boss.core.addChildAt(boss.panelRoot, 3);
    boss.spr.addChild(boss.haloFx, boss.beamFx, boss.chargeOrbFx, boss.stateRing, boss.core);

    function getPanelMuzzles() {
      return [
        { x: boss.x - 100, y: boss.y, tint: 0x8fd8ff, side: -1 },
        { x: boss.x + 100, y: boss.y, tint: 0x8fd8ff, side: 1 }
      ];
    }

    function getRelayNodes(count) {
      const nodes = [];
      const radius = def.radius + 34 + (boss.phase - 1) * 6;
      for (let i = 0; i < count; i++) {
        const angle = boss.orbitT * 0.9 + (Math.PI * 2 * i) / count;
        nodes.push({
          x: boss.x + Math.cos(angle) * radius,
          y: boss.y + Math.sin(angle) * (radius * 0.7),
          angle
        });
      }
      return nodes;
    }

    function startBeamBurst(config = {}) {
      const aim = Shared.getAngleToTrackedPlayer(boss.x, boss.y);
      const count = 1;
      const leadAngle = config.leadAngle != null ? config.leadAngle : 0;
      const spread = 0;
      const chargeDelay = config.delay || 72;
      boss.currentAction = "CHARGE";
      boss.beamChargeT = chargeDelay;
      boss.beamChargeMaxT = chargeDelay;
      boss.beamChargePulseCd = 0;
      boss.beamAngle = aim + leadAngle;
      Effects.emitPulse(boss.x, boss.y, config.color || 0xff5e72, def.radius + 18, 12);
      boss.scheduler.schedule(chargeDelay, () => {
        boss.currentAction = "BEAM";
        boss.beamChargeT = 0;
        boss.beamChargeMaxT = 0;
        boss.beamT = config.life || (boss.phase === 3 ? 88 : boss.phase === 2 ? 76 : 68);
        boss.beamMaxT = boss.beamT;
        boss.beamAngle = aim + leadAngle;
        boss.beamWidth = config.width || (boss.phase === 3 ? 28 : boss.phase === 2 ? 26 : 24);
        boss.beamColor = config.color || 0xff5e72;
        boss.beamDamage = config.damage || (boss.phase === 3 ? 13 : boss.phase === 2 ? 11 : 9);
        boss.beamDamageCd = 0;
        boss.beamPulseCd = 0;
        boss.beamCount = count;
        boss.beamSpread = spread;
        Effects.emitPulse(boss.x, boss.y, boss.beamColor, def.radius + 26, 14);
        Effects.emitParticle(boss.x, boss.y, boss.beamColor, 16, 1.1);
      });
    }

    function updateBeamCharge(dt) {
      if (boss.beamChargeT <= 0) return;
      boss.beamChargeT = Math.max(0, boss.beamChargeT - dt);
      boss.beamChargePulseCd -= dt;
      if (boss.beamChargePulseCd > 0) return;
      boss.beamChargePulseCd = 6;
      const chargeRatio = Helpers.clamp(1 - (boss.beamChargeT / Math.max(1, boss.beamChargeMaxT)), 0, 1);
      const muzzleOffset = 58 + chargeRatio * 10;
      Effects.emitElectricArc(boss.x - muzzleOffset, boss.y, boss.x, boss.y, 0xff93a0, 0xffffff, 5, 5);
      Effects.emitElectricArc(boss.x + muzzleOffset, boss.y, boss.x, boss.y, 0xff93a0, 0xffffff, 5, 5);
      Effects.emitParticle(
        boss.x + Math.cos(boss.orbitT * 2.1) * Helpers.rand(12, def.radius + 10),
        boss.y + Math.sin(boss.orbitT * 1.7) * Helpers.rand(12, def.radius + 10),
        0xff7f8d,
        2,
        0.22 + chargeRatio * 0.12
      );
    }

    function redrawBeam() {
      boss.beamFx.clear();
      if (boss.beamT <= 0) return;
      const alpha = Helpers.clamp(boss.beamT / Math.max(1, boss.beamMaxT), 0, 1);
      for (let i = 0; i < boss.beamCount; i++) {
        const offset = boss.beamCount === 1 ? 0 : (i - (boss.beamCount - 1) * 0.5) * boss.beamSpread;
        const angle = boss.beamAngle + offset;
        const endX = Math.cos(angle) * boss.beamLength;
        const endY = Math.sin(angle) * boss.beamLength;
        boss.beamFx.lineStyle(boss.beamWidth + 18, boss.beamColor, 0.12 * alpha);
        boss.beamFx.moveTo(0, 0);
        boss.beamFx.lineTo(endX, endY);
        boss.beamFx.lineStyle(boss.beamWidth + 8, 0xff9aa5, 0.24 * alpha);
        boss.beamFx.moveTo(0, 0);
        boss.beamFx.lineTo(endX, endY);
        boss.beamFx.lineStyle(Math.max(4, boss.beamWidth * 0.46), 0xffffff, 0.96 * alpha);
        boss.beamFx.moveTo(0, 0);
        boss.beamFx.lineTo(endX, endY);
      }
    }

    function applyBeamDamage(dt) {
      if (boss.beamT <= 0) return;
      boss.beamDamageCd -= dt;
      if (boss.beamDamageCd > 0) return;
      boss.beamDamageCd = 4;
      const player = GameState.player;
      for (let i = 0; i < boss.beamCount; i++) {
        const offset = boss.beamCount === 1 ? 0 : (i - (boss.beamCount - 1) * 0.5) * boss.beamSpread;
        const angle = boss.beamAngle + offset;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = player.spr.x - boss.x;
        const ry = player.spr.y - boss.y;
        const along = rx * cos + ry * sin;
        const side = Math.abs(rx * -sin + ry * cos);
        if (along < 0 || along > boss.beamLength || side > boss.beamWidth + player.r) continue;
        EnemyCombat.hitPlayerWithEnemyDamage(boss.beamDamage, boss.beamColor, cos, sin, {
          invFrames: 20,
          push: 5.4,
          particleCount: 14,
          particlePower: 1.0,
          pulseRadius: 34,
          pulseLife: 10
        });
        break;
      }
    }

    function updateBeam(dt) {
      if (boss.beamT <= 0) {
        boss.beamFx.clear();
        return;
      }
      boss.beamT = Math.max(0, boss.beamT - dt);
      redrawBeam();
      applyBeamDamage(dt);
      boss.beamPulseCd -= dt;
      if (boss.beamPulseCd <= 0) {
        boss.beamPulseCd = 5;
        const angle = boss.beamAngle;
        const pulseX = boss.x + Math.cos(angle) * Helpers.rand(86, 240);
        const pulseY = boss.y + Math.sin(angle) * Helpers.rand(86, 240);
        Effects.emitParticle(pulseX, pulseY, boss.beamColor, 1, 0.22);
      }
    }

    function panelBroadside() {
      boss.currentAction = "BROADSIDE";
      const bursts = boss.phase === 1 ? 3 : boss.phase === 2 ? 4 : 5;
      for (let i = 0; i < bursts; i++) {
        boss.scheduler.schedule(i * 6, () => {
          const muzzles = getPanelMuzzles();
          const target = Shared.getStealthAwarePlayerTarget();
          for (const muzzle of muzzles) {
            const aim = Math.atan2(target.y - muzzle.y, target.x - muzzle.x) + Math.sin(boss.orbitT + i * 0.6 + muzzle.side) * 0.08;
            BossBullets.aimSpread(muzzle.x, muzzle.y, boss.phase === 1 ? 1 : 2, {
              color: boss.phase === 3 ? 0xbcecff : muzzle.tint,
              speed: boss.phase === 3 ? 7.1 : boss.phase === 2 ? 6.6 : 6.0,
              damage: boss.phase === 3 ? 10 : 9,
              radius: 7,
              aimAngle: aim
            });
            Effects.emitElectricArc(boss.x + muzzle.side * 54, boss.y, muzzle.x, muzzle.y, 0x8fe0ff, 0xffffff, 6, 6);
          }
        });
      }
    }

    function orbitalStrike() {
      boss.currentAction = "ORBITAL";
      const target = Shared.getStealthAwarePlayerTarget();
      const count = boss.phase === 1 ? 3 : boss.phase === 2 ? 4 : 5;
      const baseRadius = boss.phase === 3 ? 58 : boss.phase === 2 ? 52 : 46;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + boss.orbitT * 0.35;
        const distance = i === 0 ? 0 : 52 + i * 12;
        const tx = target.x + Math.cos(angle) * distance;
        const ty = target.y + Math.sin(angle) * distance * 0.7;
        Effects.emitGroundTelegraph(tx, ty, baseRadius, 0xff7684, 18);
        boss.scheduler.schedule(18 + i * 2, () => {
          Effects.emitPulse(tx, ty, 0xff7684, baseRadius + 10, 12);
          BossBullets.radialBurst(tx, ty, boss.phase === 1 ? 8 : boss.phase === 2 ? 10 : 12, boss.phase === 1 ? 4.5 : 4.9, 0xff7684, boss.phase === 3 ? 10 : 9, boss.orbitT * 0.8, 6);
        });
      }
    }

    function relaySalvo() {
      boss.currentAction = "RELAY";
      const nodes = getRelayNodes(boss.phase === 1 ? 4 : boss.phase === 2 ? 5 : 6);
      nodes.forEach((node, index) => {
        Effects.emitElectricArc(boss.x, boss.y, node.x, node.y, 0x7fd8ff, 0xffffff, 10, 8);
        boss.scheduler.schedule(8 + index * 2, () => {
          const target = Shared.getStealthAwarePlayerTarget();
          const aim = Math.atan2(target.y - node.y, target.x - node.x);
          for (let burst = 0; burst < (boss.phase === 3 ? 2 : 1); burst++) {
            boss.scheduler.schedule(burst * 5, () => {
              BossBullets.aimSpread(node.x, node.y, boss.phase === 1 ? 1 : 2, {
                color: boss.phase === 3 ? 0xaef2ff : 0x7fd8ff,
                speed: boss.phase === 3 ? 7.0 : boss.phase === 2 ? 6.4 : 5.9,
                damage: boss.phase === 3 ? 10 : 9,
                radius: 6,
                aimAngle: aim + Math.sin(index + burst + boss.orbitT) * 0.05
              });
            });
          }
        });
      });
    }

    function purgeMatrix() {
      boss.currentAction = "PURGE";
      startBeamBurst({ width: 26, life: 84, color: 0xff697d, delay: 84 });
      boss.scheduler.schedule(10, () => {
        BossBullets.safeLaneBurst(boss.x, boss.y, {
          randomize: true,
          onSchedule: boss.scheduler.schedule,
          laneAngle: Shared.getAngleToTrackedPlayer(boss.x, boss.y)
        });
      });
      boss.scheduler.schedule(18, () => relaySalvo());
    }

    function updatePhase() {
      const nextPhase = boss.hp <= boss.maxHp * 0.33 ? 3 : boss.hp <= boss.maxHp * 0.66 ? 2 : 1;
      if (nextPhase === boss.phase) return;
      boss.phase = nextPhase;
      if (!boss.phaseShiftPlayed[nextPhase]) {
        boss.phaseShiftPlayed[nextPhase] = true;
        boss.aiCd = Math.min(boss.aiCd, nextPhase === 3 ? 16 : 20);
        Effects.emitPulse(boss.x, boss.y, nextPhase === 3 ? 0xff7b88 : 0x86d6ff, 108, 18);
        Effects.emitParticle(boss.x, boss.y, nextPhase === 3 ? 0xff95a0 : 0xbcecff, 22, 1.4);
      }
    }

    boss.updateBoss = (dt) => {
      boss.scheduler.update(dt);
      updatePhase();

      const player = Shared.getStealthAwarePlayerTarget();
      const view = Shared.getCombatView();
      boss.orbitT += dt * (boss.phase === 1 ? 0.012 : boss.phase === 2 ? 0.016 : 0.02);
      let targetX = view.centerX + Math.cos(boss.orbitT * 0.92) * (boss.phase === 1 ? 148 : boss.phase === 2 ? 178 : 220);
      let targetY = view.top + 110 + Math.sin(boss.orbitT * (boss.phase === 1 ? 1.8 : 2.2)) * (boss.phase === 1 ? 18 : boss.phase === 2 ? 34 : 46);
      if (boss.phase === 3) {
        const flank = Math.atan2(player.y - boss.y, player.x - boss.x) + Math.sin(boss.orbitT * 1.2) * 0.42;
        targetX = player.x + Math.cos(flank) * 270;
        targetY = Helpers.clamp(player.y + Math.sin(flank) * 156, view.top + 92, view.top + view.height * 0.42);
      }
      boss.x = Helpers.lerp(boss.x, Helpers.clamp(targetX, view.left + 74, view.right - 74), 0.04 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.04 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      updateBeamCharge(dt);
      updateBeam(dt);

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        if (boss.phase === 1) {
          const actionIndex = boss.attackIndex % 3;
          if (actionIndex === 2) {
            startBeamBurst({ life: 68, delay: 72 });
            boss.aiCd = 306;
          } else {
            [panelBroadside, orbitalStrike][actionIndex]();
            boss.aiCd = 34;
          }
        } else if (boss.phase === 2) {
          const actionIndex = boss.attackIndex % 4;
          if (actionIndex === 2) {
            startBeamBurst({ width: 25, life: 76, delay: 78 });
            boss.aiCd = 270;
          } else {
            [relaySalvo, orbitalStrike, null, panelBroadside][actionIndex]();
            boss.aiCd = 30;
          }
        } else {
          const actionIndex = boss.attackIndex % 4;
          if (actionIndex === 0) {
            purgeMatrix();
            boss.aiCd = 234;
          } else if (actionIndex === 3) {
            startBeamBurst({ width: 28, life: 88, delay: 84 });
            boss.aiCd = 234;
          } else {
            [null, relaySalvo, orbitalStrike][actionIndex]();
            boss.aiCd = 26;
          }
        }
        boss.attackIndex += 1;
      }
      if (!boss.scheduler.hasPending() && boss.beamT <= 0 && boss.beamChargeT <= 0 && boss.aiCd > 10) {
        boss.currentAction = "IDLE";
      }

      const panelOpen = boss.currentAction === "BROADSIDE" || boss.currentAction === "RELAY" || boss.currentAction === "PURGE";
      const beamCharge = boss.beamT > 0 ? 1 : 0;
      const chargeGlow = boss.beamChargeT > 0
        ? Helpers.clamp(1 - (boss.beamChargeT / Math.max(1, boss.beamChargeMaxT)), 0, 1)
        : 0;
      const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.03 + (boss.phase - 1) * 0.012;
      boss.core.scale.set(pulse);
      boss.core.orbitContainer.rotation += dt * (boss.phase === 3 ? 0.048 : boss.phase === 2 ? 0.034 : 0.024);
      boss.panelLeft.rotation = Helpers.lerp(boss.panelLeft.rotation, panelOpen ? -0.08 : 0, 0.16);
      boss.panelRight.rotation = Helpers.lerp(boss.panelRight.rotation, panelOpen ? 0.08 : 0, 0.16);
      const panelScaleY = Helpers.lerp(boss.panelLeft.scale.y, panelOpen ? 1.08 : 1, 0.12);
      boss.panelLeft.scale.y = panelScaleY;
      boss.panelRight.scale.y = panelScaleY;
      boss.panelLeft.panelSpr.tint = (beamCharge || chargeGlow > 0.1) ? 0xff9ba3 : boss.phase === 3 ? 0xb7f0ff : 0xffffff;
      boss.panelRight.panelSpr.tint = (beamCharge || chargeGlow > 0.1) ? 0xff9ba3 : boss.phase === 3 ? 0xb7f0ff : 0xffffff;
      boss.panelLeft.hubSpr.alpha = 0.74 + beamCharge * 0.22 + chargeGlow * 0.26;
      boss.panelRight.hubSpr.alpha = 0.74 + beamCharge * 0.22 + chargeGlow * 0.26;

      const nodes = getRelayNodes(boss.phase === 1 ? 4 : boss.phase === 2 ? 5 : 6);
      boss.haloFx.clear();
      nodes.forEach((node, index) => {
        boss.haloFx.lineStyle(1.2, boss.phase === 3 ? 0xbef4ff : 0x7fd8ff, 0.18);
        boss.haloFx.moveTo(0, 0);
        boss.haloFx.lineTo(node.x - boss.x, node.y - boss.y);
        boss.haloFx.beginFill(index % 2 === 0 ? 0xbef4ff : 0x7fd8ff, 0.46);
        boss.haloFx.drawCircle(node.x - boss.x, node.y - boss.y, boss.phase === 3 ? 4.2 : 3.4);
        boss.haloFx.endFill();
      });

      boss.stateRing.clear();
      boss.stateRing.lineStyle(4, boss.phase === 3 ? 0xff7b88 : 0x86d6ff, 0.16 + beamCharge * 0.08 + chargeGlow * 0.12);
      boss.stateRing.drawCircle(0, 0, def.radius + 10 + Math.sin(performance.now() * 0.01) * 2);
      boss.stateRing.lineStyle(1.5, 0xffffff, 0.16 + beamCharge * 0.12 + chargeGlow * 0.18);
      boss.stateRing.drawCircle(0, 0, def.radius - 6);

      boss.chargeOrbFx.clear();
      if (chargeGlow > 0) {
        const orbX = Math.cos(boss.beamAngle) * (def.radius * 0.48);
        const orbY = Math.sin(boss.beamAngle) * (def.radius * 0.48);
        const orbRadius = 8 + chargeGlow * 12;
        boss.chargeOrbFx.beginFill(boss.phase === 3 ? 0xff8d98 : 0xff7f8d, 0.12 + chargeGlow * 0.16);
        boss.chargeOrbFx.drawCircle(orbX, orbY, orbRadius + 6);
        boss.chargeOrbFx.endFill();
        boss.chargeOrbFx.lineStyle(2 + chargeGlow * 2, boss.phase === 3 ? 0xffa7b0 : 0xff93a0, 0.22 + chargeGlow * 0.34);
        boss.chargeOrbFx.drawCircle(orbX, orbY, orbRadius);
        boss.chargeOrbFx.beginFill(0xffffff, 0.72 + chargeGlow * 0.18);
        boss.chargeOrbFx.drawCircle(orbX, orbY, Math.max(3, orbRadius * 0.34));
        boss.chargeOrbFx.endFill();
      }

      boss.innerSigil.clear();
      if (boss.currentAction === "ORBITAL" || boss.currentAction === "BEAM" || boss.currentAction === "PURGE" || boss.currentAction === "CHARGE") {
        boss.innerSigil.lineStyle(2, boss.currentAction === "ORBITAL" ? 0xff8f9a : boss.currentAction === "CHARGE" ? 0xff8d98 : 0x9bdcff, 0.34 + chargeGlow * 0.24);
        boss.innerSigil.drawCircle(0, 0, def.radius - 11 + Math.sin(performance.now() * 0.016) * 2);
        boss.innerSigil.lineStyle(1, 0xffffff, 0.18);
        boss.innerSigil.drawCircle(0, 0, def.radius * 0.44);
      }

      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 3 ? 0xff7b88 : boss.phase === 2 ? 0x86d6ff : 0xbcecff);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    boss.onDefeat = () => {
      boss.beamFx.clear();
      boss.haloFx.clear();
      boss.stateRing.clear();
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 170, 26);
      Effects.emitParticle(boss.x, boss.y, 0x86d6ff, 28, 1.8);
      Effects.emitParticle(boss.x, boss.y, 0xff7b88, 24, 1.6);
    };

    return boss;
  }

  BossSystem.registerFactory("overmind", createOvermindBoss);
})();
