(() => {
  function balanceStep(id, level, fallback = null) {
    const table = window.UPGRADE_BALANCE ? UPGRADE_BALANCE[id] : null;
    if (!Array.isArray(table) || !table.length) return fallback;
    const index = Math.max(0, Math.min(table.length - 1, Math.max(1, level) - 1));
    return table[index] ?? fallback;
  }

  function getUpgradeLevel(id) {
    const levels = (GameState.upgrades && GameState.upgrades.levels) || {};
    return Math.max(0, levels[id] || 0);
  }

  function getCloseDefenseLevels(S) {
    const levels = (S.upgrades && S.upgrades.levels) || {};
    return {
      flak: levels.flak_burst || 0,
      arc: levels.arc_defender || 0
    };
  }

  function syncWeaponStats() {
    if (window.CombatSystem && typeof CombatSystem.syncWeaponStats === "function") {
      CombatSystem.syncWeaponStats();
    }
  }

  function applyMineStats(level) {
    const step = balanceStep("proximity_mine", level, { cooldown: 420, maxCount: 2, radius: 55, damage: 12 });
    GameState.stats.mineLevel = Math.min(3, getUpgradeLevel("proximity_mine"));
    GameState.stats.mineCdMax = step.cooldown;
    GameState.stats.mineCd = Math.min(GameState.stats.mineCd || 0, step.cooldown);
    GameState.stats.mineMaxCount = step.maxCount;
    GameState.stats.mineRadius = step.radius;
    GameState.stats.mineDamage = step.damage;
  }

  function defineUpgrade(definition) {
    return {
      category: definition.category || definition.upgradeType || "passive",
      subCategory: definition.subCategory || "utility",
      maxLevel: Object.prototype.hasOwnProperty.call(definition, "maxLevel") ? definition.maxLevel : 1,
      baseWeight: Object.prototype.hasOwnProperty.call(definition, "baseWeight") ? definition.baseWeight : 8,
      minLevel: Object.prototype.hasOwnProperty.call(definition, "minLevel") ? definition.minLevel : 1,
      tags: definition.tags || [],
      ...definition
    };
  }

  window.UPGRADE_DEFINITIONS = [
    defineUpgrade({
      id: "deploy_turret",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 5,
      baseWeight: 4,
      minLevel: 2,
      tags: ["offense", "turret", "deploy"],
      name: "Sentry Turrets",
      desc: "Deploy auto-turrets. Levels add front, side, and rear coverage, with Lv5 boosting firepower and attack speed.",
      apply: (level) => {
        ActiveSkillSystem.unlockSkill("deploy_turret");
        GameState.activeSkillState.levels.deploy_turret = Math.max(1, Math.min(5, level));
      }
    }),
    defineUpgrade({
      id: "boost_tuning",
      category: "active",
      upgradeType: "active",
      subCategory: "mobility",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["mobility", "boost", "upgrade"],
      name: "Boost Tuning",
      desc: "Improve Boost speed, sustain, and damage mitigation. Boost keeps full 4-way control from Lv1.",
      requires: (S) => S.activeSkillState.ownedSkillIds.includes("boost"),
      apply: (level) => {
        GameState.activeSkillState.levels.boost = Math.max(1, Math.min(4, level + 1));
      }
    }),
    defineUpgrade({
      id: "active_afterburner_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 1,
      baseWeight: 4,
      minLevel: 2,
      tags: ["offense", "unlock"],
      name: "Unlock Afterburner",
      desc: "Gain Afterburner. If a slot is empty, it is mapped automatically.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("afterburner"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("afterburner");
      }
    }),
    defineUpgrade({
      id: "active_decoy_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "survival",
      maxLevel: 1,
      baseWeight: 4,
      minLevel: 2,
      tags: ["survival", "unlock"],
      name: "Unlock Decoy Drone",
      desc: "Gain Decoy Drone. Extra active skills stay owned even when every slot is full.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("decoy_drone"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("decoy_drone");
      }
    }),
    defineUpgrade({
      id: "escort_drones",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 5,
      baseWeight: 4,
      minLevel: 2,
      tags: ["auxiliary", "drone", "synergy"],
      name: "Escort Drones",
      desc: "Mount support drones as a sub-weapon. Lv1 starts with one drone, Lv2-4 add more coverage, and Lv5 completes a four-direction escort screen.",
      apply: (level) => {
        GameState.stats.escortDroneLevel = Math.max(0, Math.min(5, level));
      }
    }),
    defineUpgrade({
      id: "active_nova_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 1,
      baseWeight: 3,
      minLevel: 3,
      tags: ["close-range", "unlock", "rare"],
      name: "Unlock Nova Pulse",
      desc: "Gain Nova Pulse, a close-range emergency shockwave for clearing pressure.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("nova_pulse"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("nova_pulse");
      }
    }),
    defineUpgrade({
      id: "active_crossfire_missiles_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 1,
      baseWeight: 3,
      minLevel: 4,
      tags: ["offense", "missile", "unlock", "rare"],
      name: "Unlock Crossfire Missiles",
      desc: "Gain Crossfire Missiles, a short-range side barrage that curves into the aimed area.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("crossfire_missiles"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("crossfire_missiles");
      }
    }),
    defineUpgrade({
      id: "active_omni_burst_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 1,
      baseWeight: 3,
      minLevel: 4,
      tags: ["offense", "aoe", "unlock", "rare"],
      name: "Unlock Omni Burst",
      desc: "Gain Omni Burst, a 360-degree short-range explosive scatter.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("omni_burst"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("omni_burst");
      }
    }),
    defineUpgrade({
      id: "active_stealth_unlock",
      category: "active",
      upgradeType: "active",
      subCategory: "mobility",
      maxLevel: 1,
      baseWeight: 3,
      minLevel: 3,
      tags: ["mobility", "unlock", "rare"],
      name: "Unlock Stealth Field",
      desc: "Gain Stealth Field for short repositioning. It ends immediately when you attack.",
      requires: (S) => !S.activeSkillState.ownedSkillIds.includes("stealth_field"),
      apply: () => {
        ActiveSkillSystem.unlockSkill("stealth_field");
      }
    }),
    // Smoke Screen unlock is disabled with the skill prototype.
    // The current visual implementation causes large frame drops because it
    // renders a wide blurred translucent smoke field in real time.
    // defineUpgrade({
    //   id: "active_smoke_screen_unlock",
    //   category: "active",
    //   upgradeType: "active",
    //   subCategory: "survival",
    //   maxLevel: 1,
    //   baseWeight: 3,
    //   minLevel: 3,
    //   tags: ["survival", "control", "unlock", "rare"],
    //   name: "Unlock Smoke Screen",
    //   desc: "Gain Smoke Screen, a sight-blocking cloud that slows enemies inside it.",
    //   requires: (S) => !S.activeSkillState.ownedSkillIds.includes("smoke_screen"),
    //   apply: () => {
    //     ActiveSkillSystem.unlockSkill("smoke_screen");
    //   }
    // }),
    defineUpgrade({
      id: "weapon_machinegun",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: null,
      baseWeight: 2,
      minLevel: 3,
      tags: ["weapon-switch", "rare"],
      name: "Equip Machinegun",
      desc: "Switch weapon type to Machinegun. Shared weapon stats stay the same.",
      requires: (S) => S.weaponState.current !== "machinegun",
      apply: () => {
        CombatSystem.setWeaponType("machinegun");
      }
    }),
    defineUpgrade({
      id: "weapon_laser",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: null,
      baseWeight: 2,
      minLevel: 3,
      tags: ["weapon-switch", "rare"],
      name: "Equip Laser",
      desc: "Switch weapon type to Laser. Shared weapon stats stay the same.",
      requires: (S) => S.weaponState.current !== "laser",
      apply: () => {
        CombatSystem.setWeaponType("laser");
      }
    }),
    defineUpgrade({
      id: "weapon_shotgun",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: null,
      baseWeight: 2,
      minLevel: 3,
      tags: ["weapon-switch", "rare"],
      name: "Equip Shotgun",
      desc: "Switch weapon type to Shotgun. Shared weapon stats stay the same.",
      requires: (S) => S.weaponState.current !== "shotgun",
      apply: () => {
        CombatSystem.setWeaponType("shotgun");
      }
    }),
    defineUpgrade({
      id: "firerate",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 5,
      baseWeight: 10,
      minLevel: 1,
      tags: ["common", "dps"],
      name: "Fire Rate",
      desc: "Fire interval improves with diminishing scaling per level.",
      apply: (level) => {
        const S = GameState;
        const step = balanceStep("firerate", level, 0.95);
        S.stats.fireRate = Math.max(
          GAME_BALANCE.PLAYER.FIRE_RATE_MIN,
          Math.floor(S.stats.fireRate * step)
        );
      }
    }),
    defineUpgrade({
      id: "weapon_level",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 6,
      baseWeight: 10,
      minLevel: 1,
      tags: ["common", "dps", "core"],
      name: "Weapon Level",
      desc: "Raise shared weapon level. Each weapon gains its own damage and projectile growth curve up to Lv7.",
      apply: (level) => {
        GameState.stats.weaponLevel = Math.max(1, Math.min(7, level + 1));
        syncWeaponStats();
      }
    }),
    defineUpgrade({
      id: "defense",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 5,
      baseWeight: 8,
      minLevel: 1,
      tags: ["common", "survival"],
      name: "Defense Up",
      desc: "Incoming hit damage is reduced with softer late scaling.",
      apply: (level) => {
        GameState.stats.defense += balanceStep("defense", level, 1);
      }
    }),
    defineUpgrade({
      id: "speed",
      category: "passive",
      upgradeType: "passive",
      subCategory: "mobility",
      maxLevel: 4,
      baseWeight: 7,
      minLevel: 1,
      tags: ["mobility", "common"],
      name: "Thruster Tune",
      desc: "Move speed scales up, with smaller gains after early levels.",
      apply: (level) => {
        GameState.stats.speed *= balanceStep("speed", level, 1.05);
      }
    }),
    defineUpgrade({
      id: "dash",
      category: "passive",
      upgradeType: "passive",
      subCategory: "mobility",
      maxLevel: 4,
      baseWeight: 6,
      minLevel: 1,
      tags: ["mobility", "cooldown"],
      name: "Thruster Cooling",
      desc: "Shift dash cooldown improves with diminishing returns.",
      apply: (level) => {
        const S = GameState;
        const step = balanceStep("dash", level, 0.95);
        S.stats.dashCdMax = Math.max(25, Math.floor(S.stats.dashCdMax * step));
      }
    }),
    defineUpgrade({
      id: "pierce",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 3,
      baseWeight: 5,
      minLevel: 2,
      tags: ["pierce", "rare"],
      name: "Pierce",
      desc: "Bullet pierce +1",
      apply: (level) => {
        GameState.stats.bulletPierce += balanceStep("pierce", level, 1);
      }
    }),
    defineUpgrade({
      id: "range_extender",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 3,
      baseWeight: 5,
      minLevel: 2,
      tags: ["range", "utility"],
      name: "Range Extender",
      desc: "Extend primary weapon reach. Lv3 max.",
      apply: (level) => {
        GameState.stats.rangeMultiplier = balanceStep("range_extender", level, 1);
      }
    }),
    defineUpgrade({
      id: "shield",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 3,
      baseWeight: 6,
      minLevel: 2,
      tags: ["shield", "survival"],
      name: "Shield Matrix",
      desc: "Shield max and regen improve from a data-driven table.",
      apply: (level) => {
        const S = GameState;
        const step = balanceStep("shield", level, { shieldMax: 25, shieldRegen: 3 });
        S.stats.shieldMax += step.shieldMax;
        S.stats.shield = S.stats.shieldMax;
        S.stats.shieldRegen += step.shieldRegen;
        S.stats.shieldRegenDelay = 0;
      }
    }),
    defineUpgrade({
      id: "flak_burst",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["close-defense", "survival"],
      name: "Flak Burst",
      desc: "Auto-fire short-range flak shots at enemies that get too close. Up to Lv3. Locks out Arc Defender once chosen.",
      requires: (S) => {
        const closeDefense = getCloseDefenseLevels(S);
        return closeDefense.flak < 3 && (closeDefense.arc <= 0 || closeDefense.flak > 0);
      },
      apply: () => {
        GameState.stats.flakLevel = Math.min(3, getUpgradeLevel("flak_burst"));
      }
    }),
    defineUpgrade({
      id: "arc_defender",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["close-defense", "control"],
      name: "Arc Defender",
      desc: "Auto-snap tiny lightning arcs into nearby enemies to slow and stagger them. Up to Lv3. Locks out Flak Burst once chosen.",
      requires: (S) => {
        const closeDefense = getCloseDefenseLevels(S);
        return closeDefense.arc < 3 && (closeDefense.flak <= 0 || closeDefense.arc > 0);
      },
      apply: () => {
        GameState.stats.arcLevel = Math.min(3, getUpgradeLevel("arc_defender"));
      }
    }),
    defineUpgrade({
      id: "proximity_mine",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["trap", "area-control", "survival"],
      name: "Proximity Mine",
      desc: "Auto-drop proximity mines behind your route. Up to Lv3.",
      apply: (level) => {
        applyMineStats(level);
      }
    }),
    defineUpgrade({
      id: "chain_attack",
      category: "active",
      upgradeType: "active",
      subCategory: "dps",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["chain", "multi-target", "offense", "unlock"],
      name: "Unlock Chain Surge",
      desc: "Gain Chain Surge, a casted chain strike that jumps through clustered enemies. Further levels strengthen the strike.",
      apply: (level) => {
        ActiveSkillSystem.unlockSkill("chain_attack");
        GameState.activeSkillState.levels.chain_attack = Math.max(1, level);
      }
    }),
    defineUpgrade({
      id: "magnetic_slow_field",
      category: "active",
      upgradeType: "active",
      subCategory: "control",
      maxLevel: 3,
      baseWeight: 4,
      minLevel: 2,
      tags: ["control", "area-control", "survival", "unlock"],
      name: "Unlock Magnetic Snare",
      desc: "Gain Magnetic Snare, a casted forward field that heavily slows enemies inside. Further levels expand and strengthen it.",
      apply: (level) => {
        ActiveSkillSystem.unlockSkill("magnetic_slow_field");
        GameState.activeSkillState.levels.magnetic_slow_field = Math.max(1, level);
      }
    }),
    defineUpgrade({
      id: "homingmissile",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 4,
      baseWeight: 4,
      minLevel: 2,
      tags: ["missile", "synergy"],
      name: "Homing Missile",
      desc: "Unlocks tracking missiles. Further picks improve output.",
      apply: (level) => {
        const S = GameState;
        const step = balanceStep("homingmissile", level, {
          damage: S.stats.homingMissileDamage,
          damageDelta: 0.5,
          cooldownMul: 0.94,
          cooldownMin: 84
        });
        const firstPickup = S.stats.homingMissileLevel <= 0;
        S.stats.homingMissileLevel = level;
        if (firstPickup) {
          S.stats.homingMissileDamage = Math.max(step.damage || 2, S.stats.homingMissileDamage);
        } else {
          S.stats.homingMissileDamage += step.damageDelta || 0.5;
        }
        S.stats.homingMissileCdMax = Math.max(
          step.cooldownMin || 84,
          Math.floor(S.stats.homingMissileCdMax * (step.cooldownMul || 0.94))
        );
      }
    }),
    defineUpgrade({
      id: "hardpoint_guns",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 3,
      baseWeight: 5,
      minLevel: 2,
      tags: ["auxiliary", "synergy"],
      name: "Wing Guns",
      desc: "Mount thin wing machineguns. Lv1 adds one gun per wing, Lv2 expands to two per wing, Lv3 tightens the quad-gun formation.",
      apply: (level) => {
        GameState.stats.hardpointLevel = Math.max(0, Math.min(3, level));
      }
    }),
    defineUpgrade({
      id: "hp",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 4,
      baseWeight: 7,
      minLevel: 1,
      tags: ["hp", "survival"],
      name: "Max HP",
      desc: "Max HP grows with staged increments.",
      apply: (level) => {
        const S = GameState;
        const amount = balanceStep("hp", level, 20);
        S.stats.maxHp += amount;
        S.stats.hp += amount;
      }
    }),
    defineUpgrade({
      id: "regen",
      category: "passive",
      upgradeType: "passive",
      subCategory: "survival",
      maxLevel: 4,
      baseWeight: 5,
      minLevel: 2,
      tags: ["regen", "survival"],
      name: "Regen",
      desc: "HP regen improves, but late stacks are intentionally softer.",
      apply: (level) => {
        GameState.stats.regen += balanceStep("regen", level, 0.3);
      }
    }),
    defineUpgrade({
      id: "bulletspeed",
      category: "weapon",
      upgradeType: "weapon",
      subCategory: "dps",
      maxLevel: 4,
      baseWeight: 5,
      minLevel: 1,
      tags: ["velocity", "synergy"],
      name: "Velocity",
      desc: "Bullet speed improves with diminishing returns.",
      apply: (level) => {
        GameState.stats.bulletSpeed *= balanceStep("bulletspeed", level, 1.05);
      }
    })
  ];
})();
