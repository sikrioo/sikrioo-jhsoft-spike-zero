window.SkillSystem = (() => {
  const SLOT_PROFILES = [
    {
      id: "offense",
      preferred: (upgrade) => {
        const category = upgrade.category || upgrade.upgradeType;
        return category === "weapon" || upgrade.subCategory === "dps";
      }
    },
    {
      id: "survival",
      preferred: (upgrade) => upgrade.subCategory === "survival" || upgrade.subCategory === "mobility"
    },
    {
      id: "wildcard",
      preferred: () => true
    }
  ];

  function ensureUpgradeState() {
    if (!GameState.upgrades) {
      GameState.upgrades = {
        levels: {},
        pickedIds: [],
        categoryCounts: { weapon: 0, passive: 0, active: 0 }
      };
    }
    GameState.upgrades.levels ||= {};
    GameState.upgrades.pickedIds ||= [];
    GameState.upgrades.categoryCounts ||= { weapon: 0, passive: 0, active: 0 };
    GameState.upgrades.categoryCounts.weapon ||= 0;
    GameState.upgrades.categoryCounts.passive ||= 0;
    GameState.upgrades.categoryCounts.active ||= 0;
    return GameState.upgrades;
  }

  function getUpgradeById(id) {
    return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id) || null;
  }

  function applyUpgradeById(id) {
    const upgrade = getUpgradeById(id);
    if (!upgrade) return false;

    const upgradeState = ensureUpgradeState();
    const currentLevel = upgradeState.levels[id] || 0;
    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return false;

    const nextLevel = currentLevel + 1;
    upgradeState.levels[id] = nextLevel;
    upgradeState.pickedIds.push(id);

    const category = upgrade.category || upgrade.upgradeType || "passive";
    upgradeState.categoryCounts[category] = (upgradeState.categoryCounts[category] || 0) + 1;

    if (typeof upgrade.apply === "function") upgrade.apply(nextLevel, GameState);
    return true;
  }

  function applyStartingLoadout(testMode = false) {
    const starting = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_UPGRADES) || []) : [];
    for (const id of starting) applyUpgradeById(id);
  }

  function resetDerivedUpgradeState(options = {}) {
    const S = GameState;
    const keepTestActives = options.keepTestActives !== false;

    S.stats.maxHp = 100;
    S.stats.speed = GAME_BALANCE.PLAYER.MOVE_SPEED;
    S.stats.dashCd = 0;
    S.stats.dashCdMax = GAME_BALANCE.PLAYER.DASH_CD_MAX;
    S.stats.fireRate = GAME_BALANCE.PLAYER.FIRE_RATE_BASE;
    S.stats.bulletSpeed = GAME_BALANCE.PLAYER.BULLET_SPEED;
    S.stats.bulletDamage = GAME_BALANCE.PLAYER.BULLET_DAMAGE;
    S.stats.bulletCount = GAME_BALANCE.PLAYER.BULLET_COUNT;
    S.stats.weaponLevel = 1;
    S.stats.bulletPierce = 0;
    S.stats.rangeMultiplier = 1;
    S.stats.hardpointLevel = 0;
    S.stats.hardpointCooldown = 0;
    S.stats.escortDroneLevel = 0;
    S.stats.defense = GAME_BALANCE.PLAYER.DEFENSE;
    S.stats.regen = 0;
    S.stats.shield = 0;
    S.stats.shieldMax = 0;
    S.stats.shieldRegen = 0;
    S.stats.shieldRegenDelay = 0;
    S.stats.homingMissileLevel = 0;
    S.stats.homingMissileDamage = GAME_BALANCE.PLAYER.HOMING_MISSILE_DAMAGE;
    S.stats.homingMissileCd = 0;
    S.stats.homingMissileCdMax = GAME_BALANCE.PLAYER.HOMING_MISSILE_CD_MAX;
    S.stats.flakLevel = 0;
    S.stats.flakCooldown = 0;
    S.stats.arcLevel = 0;
    S.stats.arcCooldown = 0;
    S.stats.mineLevel = 0;
    S.stats.mineCd = 0;
    S.stats.mineCdMax = 0;
    S.stats.mineMaxCount = 0;
    S.stats.mineRadius = 0;
    S.stats.mineDamage = 0;
    S.stats.chainAttackLevel = 0;
    S.stats.slowFieldLevel = 0;
    S.stats.slowFieldCooldown = 0;
    if (window.PlayerFactory && typeof PlayerFactory.applyShipStats === "function") {
      PlayerFactory.applyShipStats(S.stats, S.playerType || "standard");
    }
    for (const smoke of S.smokeClouds) if (smoke.spr && smoke.spr.parent) smoke.spr.parent.removeChild(smoke.spr);
    S.smokeClouds.length = 0;
    for (const field of S.slowFields) if (field.spr && field.spr.parent) field.spr.parent.removeChild(field.spr);
    S.slowFields.length = 0;
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetEscortDrones === "function") {
      ActiveSkillSystem.resetEscortDrones();
    }
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetDeployTurrets === "function") {
      ActiveSkillSystem.resetDeployTurrets();
    }
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetSwarmDrones === "function") {
      ActiveSkillSystem.resetSwarmDrones();
    }
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetTrapPrisms === "function") {
      ActiveSkillSystem.resetTrapPrisms();
    }
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetRepulsorFields === "function") {
      ActiveSkillSystem.resetRepulsorFields();
    }
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetStasisArcFields === "function") {
      ActiveSkillSystem.resetStasisArcFields();
    }

    CombatSystem.applyStartingWeaponLoadout(S.stats.practice);
    CombatSystem.syncWeaponStats();
    ActiveSkillSystem.assignStartingLoadout(S.stats.practice && keepTestActives);

    S.upgrades.levels = {};
    S.upgrades.pickedIds = [];
    S.upgrades.categoryCounts.weapon = 0;
    S.upgrades.categoryCounts.passive = 0;
    S.upgrades.categoryCounts.active = 0;

    S.activeSkillState.boostDirection = "forward";
    S.activeSkillState.boostDir = 0;
    S.activeSkillState.boostDrag = 0.9;
    S.activeSkillState.boostMitigationT = 0;
    S.activeSkillState.boostMitigationMul = 1;
    S.activeSkillState.boostT = 0;
    S.activeSkillState.afterburnerT = 0;
    S.activeSkillState.escortDrones = [];
    S.activeSkillState.deployTurrets = [];
    S.activeSkillState.swarmDrones = [];
    S.activeSkillState.trapPrisms = [];
    S.activeSkillState.repulsorFields = [];
    S.activeSkillState.stasisArcFields = [];
    S.activeSkillState.recallBoostT = 0;
    S.activeSkillState.recallFireRateMul = 1;
    S.activeSkillState.recallDamageMul = 1;
    S.activeSkillState.stealthT = 0;
    S.activeSkillState.stealthAlpha = 1;
    S.activeSkillState.stealthLastKnownX = 0;
    S.activeSkillState.stealthLastKnownY = 0;
    for (const slot of S.activeSkillState.slots) {
      slot.cooldown = 0;
      slot.autoCast = false;
    }

    S.weaponState.laserChannel = null;
  }

  function rebuildUpgradeState(pickedIds, options = {}) {
    const S = GameState;
    const hp = S.stats.hp;
    const mp = S.stats.mp;
    const shield = S.stats.shield;
    const keepExistingSlots = options.keepExistingSlots !== false;
    const slotAssignments = keepExistingSlots
      ? S.activeSkillState.slots.map((slot) => ({ key: slot.key, skillId: slot.skillId }))
      : [];

    for (const mine of S.mines) {
      if (mine.spr && mine.spr.parent) mine.spr.parent.removeChild(mine.spr);
    }
    S.mines.length = 0;

    resetDerivedUpgradeState(options);
    for (const id of pickedIds) applyUpgradeById(id);

    if (S.player) {
      S.player.vx = 0;
      S.player.vy = 0;
      S.player.inv = 0;
      S.player.fireCd = 0;
      S.player.dashT = 0;
    }

    if (keepExistingSlots) {
      for (const assignment of slotAssignments) {
        if (assignment.skillId && S.activeSkillState.ownedSkillIds.includes(assignment.skillId)) {
          ActiveSkillSystem.assignSkillToSlot(assignment.key, assignment.skillId);
        }
      }
    }

    S.stats.hp = Math.min(S.stats.maxHp, hp);
    S.stats.mp = Math.min(S.stats.mpMax, mp);
    S.stats.shield = Math.min(S.stats.shieldMax, shield);
    UI.hudUpdate();
    return true;
  }

  function setUpgradeLevel(id, targetLevel) {
    const upgrade = getUpgradeById(id);
    if (!upgrade) return false;
    if (typeof upgrade.maxLevel !== "number" || upgrade.maxLevel < 1) return false;

    const upgradeState = ensureUpgradeState();
    const clampedTarget = Math.max(0, Math.min(upgrade.maxLevel, Math.floor(targetLevel || 0)));
    const currentLevel = upgradeState.levels[id] || 0;
    if (clampedTarget === currentLevel) return false;

    const nextPickedIds = [];
    let kept = 0;
    for (const pickedId of upgradeState.pickedIds) {
      if (pickedId !== id) {
        nextPickedIds.push(pickedId);
        continue;
      }
      if (kept < clampedTarget) {
        nextPickedIds.push(pickedId);
        kept += 1;
      }
    }
    while (kept < clampedTarget) {
      nextPickedIds.push(id);
      kept += 1;
    }
    return rebuildUpgradeState(nextPickedIds);
  }

  function isUpgradeAvailable(upgrade) {
    if (!upgrade) return false;
    const upgradeState = ensureUpgradeState();
    const currentLevel = upgradeState.levels[upgrade.id] || 0;
    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return false;
    if (upgrade.minLevel && GameState.progression.level < upgrade.minLevel) return false;
    if (typeof upgrade.requires === "function" && !upgrade.requires(GameState)) return false;
    return true;
  }

  function getUpgradeWeight(upgrade, slotProfile = null) {
    if (!isUpgradeAvailable(upgrade)) return 0;

    const S = GameState;
    const upgradeState = ensureUpgradeState();
    const currentLevel = upgradeState.levels[upgrade.id] || 0;
    const category = upgrade.category || upgrade.upgradeType || "passive";
    const categoryCount = upgradeState.categoryCounts[category] || 0;
    let weight = upgrade.baseWeight ?? 1;

    if (currentLevel > 0) {
      weight *= Math.pow(0.82, currentLevel);
    }

    if (slotProfile && slotProfile.preferred) {
      weight *= slotProfile.preferred(upgrade) ? 1.35 : 0.45;
    }

    if (categoryCount > 0) {
      weight *= 1 / (1 + categoryCount * 0.14);
    }

    if (upgrade.tags && upgrade.tags.includes("rare")) {
      weight *= S.progression.level >= 4 ? 1.1 : 0.75;
    }

    if ((upgradeState.levels.weapon_level || 0) > 0 && ["firerate", "bulletspeed", "pierce", "hardpoint_guns", "homingmissile", "escort_drones"].includes(upgrade.id)) {
      weight *= 1.18;
    }
    if ((upgradeState.levels.hardpoint_guns || 0) > 0 && ["firerate", "bulletspeed", "weapon_level", "escort_drones"].includes(upgrade.id)) {
      weight *= 1.16;
    }
    if ((upgradeState.levels.escort_drones || 0) > 0 && upgrade.id === "escort_drones") {
      weight *= 1.18;
    }
    if ((upgradeState.levels.homingmissile || 0) > 0 && upgrade.id === "homingmissile") {
      weight *= 1.18;
    }
    if (((upgradeState.levels.escort_drones || 0) > 0 || (upgradeState.levels.homingmissile || 0) > 0 || (upgradeState.levels.deploy_turret || 0) > 0) && ["swarm_command", "target_painter"].includes(upgrade.id)) {
      weight *= 1.18;
    }
    if (((upgradeState.levels.proximity_mine || 0) > 0 || (upgradeState.levels.magnetic_slow_field || 0) > 0) && upgrade.id === "trap_prism") {
      weight *= 1.2;
    }
    if (((upgradeState.levels.magnetic_slow_field || 0) > 0 || (upgradeState.levels.trap_prism || 0) > 0 || (upgradeState.levels.nova_pulse || 0) > 0) && upgrade.id === "repulsor_net") {
      weight *= 1.18;
    }
    if (((upgradeState.levels.magnetic_slow_field || 0) > 0 || (upgradeState.levels.trap_prism || 0) > 0 || (upgradeState.levels.repulsor_net || 0) > 0) && upgrade.id === "stasis_arc") {
      weight *= 1.22;
    }
    if (((upgradeState.levels.escort_drones || 0) > 0 || (upgradeState.levels.deploy_turret || 0) > 0 || (upgradeState.levels.swarm_command || 0) > 0) && upgrade.id === "recall_beacon") {
      weight *= 1.24;
    }
    if (((upgradeState.levels.shield || 0) > 0 || (upgradeState.levels.defense || 0) > 0) && ["shield", "regen", "defense", "hp"].includes(upgrade.id)) {
      weight *= 1.18;
    }
    if ((upgradeState.levels.speed || 0) > 0 && upgrade.id === "dash") {
      weight *= 1.14;
    }
    if (S.activeSkillState.ownedSkillIds.includes("boost") && upgrade.id === "boost_tuning") {
      weight *= 1.35;
    }
    if (((upgradeState.levels.flak_burst || 0) > 0 || (upgradeState.levels.arc_defender || 0) > 0) && ["defense", "hp", "dash"].includes(upgrade.id)) {
      weight *= 1.12;
    }
    if (upgrade.category === "active" && S.activeSkillState.ownedSkillIds.length >= 2) {
      weight *= 0.82;
    }

    return Math.max(0, weight);
  }

  function weightedPick(pool, slotProfile, excludedIds) {
    const weighted = pool
      .filter((upgrade) => !excludedIds.has(upgrade.id))
      .map((upgrade) => ({ upgrade, weight: getUpgradeWeight(upgrade, slotProfile) }))
      .filter((entry) => entry.weight > 0);

    if (!weighted.length) return null;

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.upgrade;
    }
    return weighted[weighted.length - 1].upgrade;
  }

  function pickChoices(n = 3) {
    const pool = UPGRADE_DEFINITIONS.filter(isUpgradeAvailable);
    const picks = [];
    const excludedIds = new Set();
    const profiles = SLOT_PROFILES.slice(0, n);

    for (const profile of profiles) {
      let choice = weightedPick(pool, profile, excludedIds);
      if (!choice && profile.id !== "wildcard") {
        choice = weightedPick(pool, SLOT_PROFILES[SLOT_PROFILES.length - 1], excludedIds);
      }
      if (!choice) continue;
      picks.push(choice);
      excludedIds.add(choice.id);
    }

    while (picks.length < n) {
      const fallback = weightedPick(pool, SLOT_PROFILES[SLOT_PROFILES.length - 1], excludedIds);
      if (!fallback) break;
      picks.push(fallback);
      excludedIds.add(fallback.id);
    }
    return picks;
  }

  function openLevelUpIfNeeded() {
    const S = GameState;
    if (S.progression.pendingLevelUps <= 0) return false;
    if (S.progression.waveState !== "running") return false;

    S.progression.waveState = "levelup";
    S.progression.levelUpRerollUsed = false;

    const renderLevelChoices = () => {
      const choices = pickChoices(3);
      if (!choices.length) {
        S.progression.pendingLevelUps = 0;
        S.progression.levelUpRerollUsed = false;
        S.progression.waveState = "running";
        UI.showCard(null);
        return false;
      }

      UI.renderUpgradeChoices(choices, (choice) => {
        applyUpgradeById(choice.id);
        S.progression.pendingLevelUps -= 1;
        S.progression.levelUpRerollUsed = false;
        UI.hudUpdate();

        if (S.progression.pendingLevelUps > 0) {
          openLevelUpIfNeeded();
        } else {
          UI.showCard(null);
          S.progression.waveState = "running";
        }
      }, {
        rerollUsed: S.progression.levelUpRerollUsed,
        onReroll: S.progression.levelUpRerollUsed ? null : () => {
          S.progression.levelUpRerollUsed = true;
          if (window.SoundSystem) SoundSystem.play("ui_hover", { playbackRate: 1.08, cooldownMs: 0 });
          renderLevelChoices();
        }
      });
      return true;
    };

    if (!renderLevelChoices()) {
      return false;
    }
    UI.showCard("upgrade");
    return true;
  }

  function gainXp(amount) {
    const S = GameState;
    const P = S.progression;
    const difficulty = GAME_BALANCE.DIFFICULTY[S.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    const gained = Math.max(0, amount * (difficulty.xpMultiplier || 1));

    P.xp += gained;
    while (P.xp >= P.xpToNext) {
      P.xp -= P.xpToNext;
      P.level += 1;
      P.pendingLevelUps += 1;
      P.xpToNext = Math.ceil(P.xpToNext * GAME_BALANCE.XP.GROWTH);
      if (window.SoundSystem) SoundSystem.play("level_up");
    }

    UI.hudUpdate();
    openLevelUpIfNeeded();
  }

  return {
    gainXp,
    openLevelUpIfNeeded,
    applyUpgradeById,
    applyStartingLoadout,
    getUpgradeById,
    setUpgradeLevel,
    rebuildUpgradeState
  };
})();
