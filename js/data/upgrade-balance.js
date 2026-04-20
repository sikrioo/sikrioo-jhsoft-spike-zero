window.UPGRADE_BALANCE = {
  firerate:    [0.92, 0.92, 0.93, 0.94, 0.95],
  defense:     [2, 2, 2, 1, 1],
  speed:       [1.08, 1.07, 1.06, 1.05],
  dash:        [0.90, 0.92, 0.94, 0.95],
  pierce:      [1, 1, 1],
  range_extender: [1.10, 1.18, 1.25],
  shield: [
    { shieldMax: 35, shieldRegen: 4 },
    { shieldMax: 30, shieldRegen: 3 },
    { shieldMax: 25, shieldRegen: 3 }
  ],
  proximity_mine: [
    { cooldown: 420, maxCount: 2, radius: 42, damage: 12 },
    { cooldown: 360, maxCount: 3, radius: 50, damage: 16 },
    { cooldown: 280, maxCount: 4, radius: 58, damage: 22 }
  ],
  homingmissile: [
    { damage: 2, damageDelta: 0, cooldownMul: 0.96, cooldownMin: 120 },
    { damageDelta: 0.5, cooldownMul: 0.94, cooldownMin: 104 },
    { damageDelta: 0.5, cooldownMul: 0.92, cooldownMin: 92 },
    { damageDelta: 0.75, cooldownMul: 0.90, cooldownMin: 84 }
  ],
  hp:          [25, 25, 20, 20],
  regen:       [0.6, 0.5, 0.4, 0.3],
  bulletspeed: [1.08, 1.07, 1.06, 1.05]
};
