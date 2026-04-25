window.GAME_BALANCE = {
  PLAYER: {
    FIRE_RATE_BASE: 25,
    FIRE_RATE_MIN: 3,
    MOVE_SPEED: 3.68,
    DASH_SPEED: 14,
    DASH_CD_MAX: 70,
    BULLET_SPEED: 9.6,
    BULLET_DAMAGE: 1,
    BULLET_COUNT: 1,
    DEFENSE: 0,
    MP_MAX: 100,
    MP_REGEN: 10,
    SHIELD_REGEN_DELAY_MAX: 180,
    HOMING_MISSILE_DAMAGE: 2,
    HOMING_MISSILE_CD_MAX: 140
  },

  XP: {
    BASE_TO_NEXT: 16,
    GROWTH: 1.384
  },

  DIFFICULTY: {
    easy: {
      waveCountMultiplier: 0.75,
      spawnRateMultiplier: 1,
      enemyHpMultiplier: 1,
      enemySpeedMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemyBulletSpeedMultiplier: 1,
      xpMultiplier: 1,
      specialThreatBonus: 0
    },
    normal: {
      waveCountMultiplier: 1,
      spawnRateMultiplier: 1,
      enemyHpMultiplier: 1,
      enemySpeedMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemyBulletSpeedMultiplier: 1,
      xpMultiplier: 1,
      specialThreatBonus: 0
    },
    hard: {
      waveCountMultiplier: 1.3,
      spawnRateMultiplier: 0.85,
      enemyHpMultiplier: 1.15,
      enemySpeedMultiplier: 1.08,
      enemyDamageMultiplier: 1.1,
      enemyBulletSpeedMultiplier: 1.08,
      xpMultiplier: 1.1,
      specialThreatBonus: 0.08
    }
  },

  SHIPS: {
    standard: {
      starterActiveSkills: ["boost"],
      particleTint: 0x7df9ff
    },
    power: {
      starterActiveSkills: ["omni_burst"],
      particleTint: 0xff7a47
    },
    agility: {
      starterActiveSkills: ["afterburner"],
      particleTint: 0xc084fc
    }
  },

  TEST: {
    STARTING_UPGRADES: [
      "shield",
      "homingmissile",
      "weapon_level",
      "flak_burst",      
      "arc_defender",
      "proximity_mine",
      "proximity_mine",
      "proximity_mine"
    ],
    STARTING_ACTIVE_SKILL_LEVELS: {
      boost: 3
    },
    STARTING_WEAPON: "machinegun",
    STARTING_ACTIVE_SKILLS: [
      "decoy_drone",
      "boost",
      "afterburner",
      "nova_pulse",
      "crossfire_missiles",
      "omni_burst",
      "stealth_field"
      // Smoke Screen is disabled until its visual effect is optimized.
      // "smoke_screen"
    ]
  }
};
