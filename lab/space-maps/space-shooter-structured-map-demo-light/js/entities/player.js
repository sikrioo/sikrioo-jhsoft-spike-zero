window.Player = (() => {
  function create(x, y) {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 15,
      lightOn: false,
      lightEnergy: 100,
      lightEnergyMax: 100,
      lightRechargeDelay: 0,
      impactSpin: 0,
      impactFlash: 0,
      laserHitCooldown: 0
    };
  }

  function update(player, state) {
    const U = Utils;
    const left = state.keys.has("ArrowLeft") || state.keys.has("KeyA");
    const right = state.keys.has("ArrowRight") || state.keys.has("KeyD");
    const up = state.keys.has("ArrowUp") || state.keys.has("KeyW");
    const down = state.keys.has("ArrowDown") || state.keys.has("KeyS");

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);

    const accel = 0.34;
    const drag = 0.91;
    const maxSpeed = 5.2;

    if (ax || ay) {
      const len = Math.hypot(ax, ay) || 1;
      player.vx += (ax / len) * accel;
      player.vy += (ay / len) * accel;
      player.angle = Math.atan2(ay, ax) + Math.PI / 2;
    }

    player.vx *= drag;
    player.vy *= drag;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > maxSpeed) {
      player.vx = (player.vx / speed) * maxSpeed;
      player.vy = (player.vy / speed) * maxSpeed;
    }

    player.x = U.clamp(player.x + player.vx, 28, state.width - 28);
    player.y = U.clamp(player.y + player.vy, 28, state.height - 28);

    if (Math.abs(player.impactSpin) > 0.001) {
      player.angle += player.impactSpin;
      player.impactSpin *= 0.88;
    }

    if (player.impactFlash > 0) {
      player.impactFlash--;
    }

    if (player.laserHitCooldown > 0) {
      player.laserHitCooldown--;
    }

    if (state.stageId === "nebula" && player.lightOn) {
      player.lightEnergy = Math.max(0, player.lightEnergy - 0.18);
      player.lightRechargeDelay = 60;
      if (player.lightEnergy <= 0) player.lightOn = false;
    } else {
      if (player.lightRechargeDelay > 0) player.lightRechargeDelay--;
      else player.lightEnergy = Math.min(player.lightEnergyMax, player.lightEnergy + 0.08);
    }

    if (state.stageId !== "nebula") {
      player.lightOn = false;
    }
  }

  function render(ctx, player) {
    const thrust = Math.hypot(player.vx, player.vy);
    const lightOn = !!player.lightOn;
    const impacted = player.impactFlash > 0;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flame = ctx.createRadialGradient(0, 20, 0, 0, 24, 24 + thrust * 3);
    flame.addColorStop(0, "rgba(120,220,255,.62)");
    flame.addColorStop(.45, "rgba(70,150,255,.28)");
    flame.addColorStop(1, "rgba(70,150,255,0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(0, 24, 8 + thrust, 20 + thrust * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fog 위에서도 기체가 보이도록 본체 글로우 강화
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = impacted
      ? "rgba(255,120,90,.95)"
      : (lightOn ? "rgba(120,245,255,.95)" : "rgba(90,215,255,.75)");
    ctx.shadowBlur = impacted ? 26 : (lightOn ? 22 : 14);
    ctx.fillStyle = impacted
      ? "rgba(255,225,205,.98)"
      : (lightOn ? "rgba(220,255,255,.98)" : "rgba(185,232,255,.96)");
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-13, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-13, 14);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "rgba(20,55,80,.95)";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 8);
    ctx.lineTo(0, 5);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();

    if (lightOn) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(150,240,255,.75)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(120,235,255,.95)";
      ctx.beginPath();
      ctx.arc(0, -20, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  return { create, update, render };
})();
