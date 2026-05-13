window.WEAPON_DEFINITIONS = {
  machinegun: {
    id: "machinegun",
    name: "Machinegun",
    projectileSpeedMul: 1,
    levels: [
      { damage: 1.0, shots: 1, spread: 0.00, projectileLife: 48 },
      { damage: 1.2, shots: 2, spread: 0.08, projectileLife: 52 },
      { damage: 1.4, shots: 3, spread: 0.16, projectileLife: 56 },
      { damage: 1.6, shots: 4, spread: 0.24, projectileLife: 60 },
      { damage: 1.85, shots: 5, spread: 0.31, projectileLife: 63 },
      { damage: 2.1, shots: 6, spread: 0.38, projectileLife: 66 },
      { damage: 2.35, shots: 7, spread: 0.44, projectileLife: 68 }
    ]
  },
  laser: {
    id: "laser",
    name: "Laser",
    color: 0x9fe4ff,
    levels: [
      { damage: 1.2, width: 3.0, range: 520, channelFrames: 28, damageMul: 1.55 },
      { damage: 1.42, width: 3.9, range: 560, channelFrames: 32, damageMul: 1.62 },
      { damage: 1.66, width: 4.9, range: 600, channelFrames: 36, damageMul: 1.7 },
      { damage: 1.92, width: 6.0, range: 640, channelFrames: 40, damageMul: 1.78 },
      { damage: 2.2, width: 7.2, range: 680, channelFrames: 44, damageMul: 1.86 },
      { damage: 2.5, width: 8.5, range: 715, channelFrames: 48, damageMul: 1.96 },
      { damage: 2.85, width: 10.0, range: 744, channelFrames: 52, damageMul: 2.08 }
    ]
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    projectileSpeedMul: 1.02,
    levels: [
      { damage: 0.95, pellets: 8, spread: 0.26, pelletDamageMul: 0.92, projectileLife: 15 },
      { damage: 1.08, pellets: 10, spread: 0.275, pelletDamageMul: 0.95, projectileLife: 16 },
      { damage: 1.22, pellets: 12, spread: 0.29, pelletDamageMul: 0.98, projectileLife: 17 },
      { damage: 1.38, pellets: 16, spread: 0.315, pelletDamageMul: 1.0, projectileLife: 18 },
      { damage: 1.54, pellets: 18, spread: 0.335, pelletDamageMul: 1.03, projectileLife: 19 },
      { damage: 1.72, pellets: 20, spread: 0.355, pelletDamageMul: 1.06, projectileLife: 20 },
      { damage: 1.92, pellets: 24, spread: 0.38, pelletDamageMul: 1.1, projectileLife: 21 }
    ]
  }
};
