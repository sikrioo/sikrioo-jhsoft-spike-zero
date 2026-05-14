window.ACTIVE_SKILL_DEFINITIONS = [
  {
    id: "deploy_turret",
    name: "Sentry Turrets",
    desc: "Deploy simple auto-turrets ahead of you. Higher levels add more turret positions, then improve damage and fire rate.",
    type: "offense",
    mpCost: 30,
    cooldown: 360,
    duration: 360,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      placementDistance: 88,
      placementSpread: 60,
      range: 250,
      damage: 2.8,
      bossDamage: 1.6,
      fireInterval: 24
    }
  },
  {
    id: "decoy_drone",
    name: "Decoy Drone",
    desc: "Deploy decoy drones that pull enemy aggro. Higher levels increase duration and decoy count.",
    type: "support",
    mpCost: 30,
    cooldown: 240,
    duration: 300,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      hp: 3,
      count: 1,
      sideSpacing: 22,
      forwardOffset: 40
    }
  },
  {
    id: "boost",
    name: "Boost",
    desc: "A 4-way directional burst. Tap C to cycle the stored direction, then fire to dash that way.",
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
    cooldown: 660,
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
    desc: "Release a 360-degree electromagnetic nova. Higher levels expand the field, extend the lingering pulse, and increase damage.",
    type: "offense",
    mpCost: 28,
    cooldown: 300,
    duration: 28,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      radius: 72,
      damage: 8,
      bossDamage: 5,
      bulletClearRadius: 90,
      knockback: 18,
      pulseInterval: 7,
      pulseDamage: 1.5,
      pulseBossDamage: 0.9
    }
  },
  {
    id: "crossfire_missiles",
    name: "Crossfire Missiles",
    desc: "Launch a short-range curved missile barrage from both sides toward the aimed area.",
    type: "offense",
    mpCost: 34,
    cooldown: 420,
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
    cooldown: 420,
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
    id: "chain_attack",
    name: "Chain Surge",
    desc: "Fire a charged chain strike that latches onto a target and rips through nearby enemies.",
    type: "offense",
    mpCost: 26,
    cooldown: 270,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      range: 360,
      chainRange: 150,
      targetCount: 5,
      damage: 8,
      bossDamage: 5,
      falloffRates: [1, 0.82, 0.64, 0.5, 0.4]
    }
  },
  {
    id: "magnetic_slow_field",
    name: "Magnetic Snare",
    desc: "Project a bright forward field that drags hostile ships and slows anything caught inside.",
    type: "utility",
    mpCost: 24,
    cooldown: 210,
    duration: 126,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      width: 176,
      height: 108,
      spawnDistance: 132,
      slowRate: 0.46,
      bossSlowRate: 0.76
    }
  },
  {
    id: "swarm_command",
    name: "Swarm Command",
    desc: "Deploy a temporary strike swarm that circles you and tears into nearby enemies.",
    type: "offense",
    mpCost: 32,
    cooldown: 420,
    duration: 228,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      count: 4,
      range: 228,
      damage: 1.95,
      bossDamage: 1.2,
      fireInterval: 18
    }
  },
  {
    id: "trap_prism",
    name: "Trap Prism",
    desc: "Deploy a forward triangular trap lattice that slows, chips, and intercepts hostile shots.",
    type: "utility",
    mpCost: 28,
    cooldown: 330,
    duration: 210,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      trapCount: 3,
      placementDistance: 126,
      sideSpacing: 58,
      radius: 34,
      damage: 3.2,
      bossDamage: 1.7,
      pulseInterval: 20,
      slowRate: 0.68,
      bossSlowRate: 0.86
    }
  },
  {
    id: "target_painter",
    name: "Target Painter",
    desc: "Mark priority targets ahead of you. Marked enemies take bonus damage and draw allied fire.",
    type: "support",
    mpCost: 22,
    cooldown: 270,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      range: 360,
      targetCount: 4,
      damageAmp: 1.32,
      markDuration: 180
    }
  },
  {
    id: "repulsor_net",
    name: "Repulsor Net",
    desc: "Raise a short-lived forward barrier that shoves enemies back and strips hostile shots on contact.",
    type: "utility",
    mpCost: 26,
    cooldown: 300,
    duration: 126,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      span: 224,
      depth: 44,
      spawnDistance: 118,
      slowRate: 0.74,
      bossSlowRate: 0.9,
      knockback: 14,
      pulseInterval: 12
    }
  },
  {
    id: "stasis_arc",
    name: "Stasis Arc",
    desc: "Deploy a drag field that slows enemies passing through the area.",
    type: "utility",
    mpCost: 28,
    cooldown: 270,
    duration: 192,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      radius: 154,
      spawnDistance: 138,
      arcDegrees: 360,
      slowRate: 0.62,
      bossSlowRate: 0.88,
      pulseInterval: 18
    }
  },
  {
    id: "recall_beacon",
    name: "Recall Beacon",
    desc: "Recall active drones and turrets into a close guard ring, refreshing their fire and boosting output briefly.",
    type: "support",
    mpCost: 24,
    cooldown: 330,
    duration: 180,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      fireRateMultiplier: 0.68,
      damageMultiplier: 1.16
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
