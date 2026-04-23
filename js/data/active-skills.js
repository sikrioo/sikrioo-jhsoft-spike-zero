window.ACTIVE_SKILL_DEFINITIONS = [
  {
    id: "decoy_drone",
    name: "Decoy Drone",
    desc: "Deploy a decoy that pulls enemy aggro for a short time.",
    type: "support",
    mpCost: 30,
    cooldown: 240,
    duration: 210,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      hp: 3
    }
  },
  {
    id: "boost",
    name: "Boost",
    desc: "Directional burst based on movement input, or aim direction when idle.",
    type: "mobility",
    mpCost: 18,
    cooldown: 72,
    duration: 12,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      forward: { speed: 18, drag: 0.93, mitigationMul: 0.9 },
      side: { speed: 16, drag: 0.91, mitigationMul: 0.88 },
      back: { speed: 21, drag: 0.84, mitigationMul: 0.82 }
    }
  },
  {
    id: "afterburner",
    name: "Afterburner",
    desc: "Temporarily enhance movement, fire rate, and bullet speed.",
    type: "support",
    mpCost: 25,
    cooldown: 300,
    duration: 300,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      speedMultiplier: 1.24,
      damageMultiplier: 1.12,
      fireRateMultiplier: 0.84,
      bulletSpeedMultiplier: 1.1
    }
  },
  {
    id: "nova_pulse",
    name: "Nova Pulse",
    desc: "Emit a close-range shockwave that damages nearby enemies and wipes hostile shots.",
    type: "offense",
    mpCost: 28,
    cooldown: 210,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      radius: 56,
      damage: 8,
      bossDamage: 5,
      bulletClearRadius: 68,
      knockback: 18
    }
  },
  {
    id: "crossfire_missiles",
    name: "Crossfire Missiles",
    desc: "Launch a short-range curved missile barrage from both sides toward the aimed area.",
    type: "offense",
    mpCost: 34,
    cooldown: 260,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      count: 10,
      range: 280,
      damageMultiplier: 2.1,
      blastRadius: 76,
      cadence: 4
    }
  },
  {
    id: "omni_burst",
    name: "Omni Burst",
    desc: "Detonate a 360-degree short-range burst that scatters explosive shots around you.",
    type: "offense",
    mpCost: 32,
    cooldown: 230,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      count: 16,
      range: 170,
      damageMultiplier: 2.15,
      blastRadius: 68,
      cadence: 1.25
    }
  },
  {
    id: "stealth_field",
    name: "Stealth Field",
    desc: "Vanish for a short time. Normal enemies lose your position until you attack.",
    type: "utility",
    mpCost: 24,
    cooldown: 260,
    duration: 180,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      alpha: 0.42
    }
  }
  // Smoke Screen prototype is intentionally disabled for now.
  // The large blurred smoke field uses many translucent Graphics + BlurFilter
  // instances, which can cause heavy frame drops during gameplay. Re-enable
  // after replacing it with cached textures or a cheaper particle/mesh effect.
  // {
  //   id: "smoke_screen",
  //   name: "Smoke Screen",
  //   desc: "Vent a dense smoke cloud that blocks sight and slows enemies inside it.",
  //   type: "utility",
  //   mpCost: 26,
  //   cooldown: 240,
  //   duration: 260,
  //   manualCast: true,
  //   autoCast: false,
  //   slotType: "active",
  //   effectData: {
  //     radius: 354,
  //     slowMul: 0.42,
  //     bossSlowMul: 0.82,
  //     puffs: 24
  //   }
  // }
];
