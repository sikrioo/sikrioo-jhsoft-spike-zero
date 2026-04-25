window.EnemyCombat = (() => {
  function makeEnemyBullet(x, y, ang, damage){
    const difficulty = GAME_BALANCE.DIFFICULTY[GameState.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    const speedMultiplier = difficulty.enemyBulletSpeedMultiplier || 1;
    const spr = Effects.makeBulletSprite(x, y, ang, 0xffcc59);
    spr.scale.set(0.95, 0.95);
    GameState.fx.addChild(spr);
    return {
      spr,
      x, y,
      vx: Math.cos(ang) * 5.8 * speedMultiplier,
      vy: Math.sin(ang) * 5.8 * speedMultiplier,
      r: 8,
      dmg: damage,
      life: 90,
      color: 0xffcc59
    };
  }

  function hitPlayerWithEnemyDamage(damage, color, hitDx, hitDy, options={}){
    const S = GameState;
    const p = S.player;
    if (p.inv > 0) return false;

    let remainingDamage = Math.max(1, Math.ceil(damage - S.stats.defense));
    if (S.activeSkillState.boostMitigationT > 0){
      remainingDamage = Math.max(1, Math.ceil(remainingDamage * S.activeSkillState.boostMitigationMul));
    }
    if (S.stats.shield > 0){
      const absorbed = Math.min(S.stats.shield, remainingDamage);
      S.stats.shield -= absorbed;
      remainingDamage -= absorbed;
      S.stats.shieldRegenDelay = S.stats.shieldRegenDelayMax;
      Effects.emitParticle(p.spr.x, p.spr.y, 0x7fe7ff, 16, 1.15);
    }
    if (remainingDamage > 0) S.stats.hp -= remainingDamage;

    p.inv = options.invFrames || 24;
    p.vx += hitDx * (options.push || 3.5);
    p.vy += hitDy * (options.push || 3.5);
    if (window.SoundSystem) {
      SoundSystem.play("player_hit", { playbackRate: 0.96 + Helpers.rand(-0.05, 0.04) });
      SoundSystem.play("armor_hit", { playbackRate: 0.9 + Helpers.rand(-0.04, 0.04), volume: 0.14, cooldownMs: 0 });
    }
    Effects.emitParticle(p.spr.x, p.spr.y, color, options.particleCount || 12, options.particlePower || 0.9);
    Effects.emitParticle(p.spr.x, p.spr.y, 0xff4d4d, Math.max(10, Math.round((options.particleCount || 12) * 0.8)), (options.particlePower || 0.9) * 1.05);
    Effects.emitPulse(p.spr.x, p.spr.y, 0xff5a5a, options.impactRadius || 34, options.impactLife || 8);
    S.shake = Math.min(24, S.shake + (options.impactShake || 4));
    if (options.pulseRadius) Effects.emitPulse(p.spr.x, p.spr.y, color, options.pulseRadius, options.pulseLife || 10);
    if (S.stats.hp <= 0){
      S.stats.hp = 0;
      Boot.gameOver();
    }
    return true;
  }

  function updateEnemyBullets(dt){
    const S = GameState;
    const p = S.player;
    for (let i=S.enemyBullets.length-1; i>=0; i--){
      const b = S.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.x = b.x;
      b.spr.y = b.y;
      if (b.vx || b.vy) b.spr.rotation = Math.atan2(b.vy, b.vx) + Math.PI / 2;

      const highQuality = window.Effects && Effects.isHighQuality && Effects.isHighQuality();
      if ((performance.now() | 0) % (highQuality ? 4 : 6) === 0){
        const isLinear = b.trailKind === "linear";
        const t = Effects.makeTrailSprite(
          b.x - b.vx * 0.18,
          b.y - b.vy * 0.18,
          b.color,
          isLinear ? 0.22 : 0.12,
          isLinear ? 0.14 : 0.12,
          { kind: isLinear ? "linear" : "default" }
        );
        S.fx.addChild(t);
        if (isLinear) t.rotation = Math.atan2(b.vy, b.vx) + Math.PI;
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:6, drag:0.9 });
      }

      const view = Helpers.getViewBounds();
      const out = b.life <= 0
        || b.x < view.left - 40 || b.x > view.right + 40
        || b.y < view.top - 40 || b.y > view.bottom + 40;
      if (out){
        S.fx.removeChild(b.spr);
        S.enemyBullets.splice(i, 1);
        continue;
      }

      const rr = b.r + p.r;
      if (Helpers.dist2(b.x, b.y, p.spr.x, p.spr.y) < rr * rr){
        const ang = Math.atan2(p.spr.y - b.y, p.spr.x - b.x);
        hitPlayerWithEnemyDamage(b.dmg, b.color, Math.cos(ang), Math.sin(ang), {
          invFrames: 18,
          push: 3.8,
          particleCount: 10,
          particlePower: 0.8,
          pulseRadius: 28,
          pulseLife: 8
        });
        S.fx.removeChild(b.spr);
        S.enemyBullets.splice(i, 1);
      }
    }
  }

  return {
    makeEnemyBullet,
    hitPlayerWithEnemyDamage,
    updateEnemyBullets
  };
})();
