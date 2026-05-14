window.UI = (() => {
  const $score = document.getElementById("score");
  const $stage = document.getElementById("stage");
  const $stageTime = document.getElementById("stageTime");
  const $wave = document.getElementById("wave");
  const $level = document.getElementById("level");
  const $xp = document.getElementById("xp");
  const $hp = document.getElementById("hp");
  const $mp = document.getElementById("mp");
  const $speed = document.getElementById("speed");
  const $shield = document.getElementById("shield");
  const $atk = document.getElementById("atk");
  const $def = document.getElementById("def");
  const $fireRate = document.getElementById("fireRate");
  const $bulletSpeed = document.getElementById("bulletSpeed");
  const $shots = document.getElementById("shots");
  const $pierce = document.getElementById("pierce");
  const $combo = document.getElementById("combo");
  const $weaponName = document.getElementById("weaponName");
  const $weaponLevel = document.getElementById("weaponLevel");
  const hudHpText = document.getElementById("hudHpText");
  const hudMpText = document.getElementById("hudMpText");
  const hudXpText = document.getElementById("hudXpText");
  const hudHpFill = document.getElementById("hudHpFill");
  const hudMpFill = document.getElementById("hudMpFill");
  const hudXpFill = document.getElementById("hudXpFill");
  const buffHud = document.getElementById("buffHud");
  const afterburnerTime = document.getElementById("afterburnerTime");
  const hudTimeText = document.getElementById("hudTimeText");
  const hudScoreText = document.getElementById("hudScoreText");

  const overlayRoot = document.getElementById("overlayRoot");
  const startCard = document.getElementById("startCard");
  const upgradeCard = document.getElementById("upgradeCard");
  const gameOverCard = document.getElementById("gameOverCard");
  const stageClearCard = document.getElementById("stageClearCard");
  const stageStartCard = document.getElementById("stageStartCard");
  const pauseCard = document.getElementById("pauseCard");
  const pauseStatsGrid = document.getElementById("pauseStatsGrid");
  const pauseUpgradeList = document.getElementById("pauseUpgradeList");
  const pauseFilterBar = document.getElementById("pauseFilterBar");
  const pauseAdjustActions = document.getElementById("pauseAdjustActions");
  const pauseClearBtn = document.getElementById("btnPauseClearUpgrades");
  const pauseResetBtn = document.getElementById("btnPauseResetUpgrades");
  const stageStartTitle = document.getElementById("stageStartTitle");
  const stageStartSubtitle = document.getElementById("stageStartSubtitle");
  const stageClearLabel = document.getElementById("stageClearLabel");
  const nextStageBtn = document.getElementById("btnNextStage");
  const pauseBtn = document.getElementById("btnPauseMenu");
  const resumePauseBtn = document.getElementById("btnResumePause");
  const upgradeGrid = document.getElementById("upgradeGrid");
  const upgradeRerollBtn = document.getElementById("btnUpgradeReroll");
  const finalScoreEl = document.getElementById("finalScore");
  const warningOverlay = document.getElementById("warningOverlay");
  const activeSlotEls = [...document.querySelectorAll(".activeSlot")];
  const weaponRadioEls = [...document.querySelectorAll("input[name='weaponType']")];
  const practiceTypeEls = [...document.querySelectorAll("input[name='practiceType']")];
  const difficultyEls = [...document.querySelectorAll("input[name='difficulty']")];
  const playerTypeEls = [...document.querySelectorAll("input[name='playerType']")];
  const effectQualityEls = [...document.querySelectorAll("input[name='effectQuality']")];
  const autoFireEls = [...document.querySelectorAll("input[name='autoFire']")];
  const autoAimEls = [...document.querySelectorAll("input[name='autoAim']")];
  const movementModeEls = [...document.querySelectorAll("input[name='movementMode']")];
  const weaponHud = document.getElementById("weaponHud");
  const bossSelect = document.getElementById("bossSelect");
  const spawnBossBtn = document.getElementById("btnSpawnBoss");
  const stageSelect = document.getElementById("stageSelect");
  const stageDurationInput = document.getElementById("stageDurationInput");
  const applyStageTestBtn = document.getElementById("btnApplyStageTest");
  const stageTestPanel = document.getElementById("stageTestPanel");
  const enemyTestPanel = document.getElementById("enemyTestPanel");
  const enemySelect = document.getElementById("enemySelect");
  const enemyCountInput = document.getElementById("enemyCountInput");
  const applyEnemyTestBtn = document.getElementById("btnApplyEnemyTest");
  const bossHud = document.getElementById("bossHud");
  const bossHudName = document.getElementById("bossHudName");
  const bossHudMeta = document.getElementById("bossHudMeta");
  const bossHudFill = document.getElementById("bossHudFill");
  const skillMapPanel = document.getElementById("skillMapPanel");
  const skillMapTitle = document.getElementById("skillMapTitle");
  const skillMapList = document.getElementById("skillMapList");
  const closeSkillMapBtn = document.getElementById("btnCloseSkillMap");
  const dialogueOverlay = document.getElementById("dialogueOverlay");
  const dialogueLog = document.getElementById("dialogueLog");
  let skillMapState = null;
  let pendingStageClearResolve = null;
  let pendingStageStartResolve = null;
  let stageStartTimer = null;
  let stageStartAnimation = null;
  let pauseMenuFilter = "all";
  let upgradeChoiceState = null;

  function getCharacterProfile(characterId) {
    const profiles = window.CHARACTER_PROFILES || {};
    return profiles[characterId] || null;
  }

  function resolveDialogueCharacter(line) {
    const fallbackId = line && line.speaker === "player" ? "player" : "rhea";
    const characterId = line && line.speakerId ? line.speakerId : fallbackId;
    const profile = getCharacterProfile(characterId);
    const role = profile && profile.role ? profile.role : (characterId === "player" ? "player" : "controller");
    return {
      id: characterId,
      role,
      name: profile && profile.name ? profile.name : (role === "player" ? "Player" : "Controller"),
      shortName: profile && profile.shortName ? profile.shortName : (role === "player" ? "P" : "C"),
      avatarSrc: profile ? profile.avatarSrc : null
    };
  }

  function getStageLineup() {
    if (window.BossSystem && BossSystem.getStageBossLineup) {
      return BossSystem.getStageBossLineup();
    }
    return [
      { stage: 1, bossId: "basic", name: "Sentinel Core" },
      { stage: 2, bossId: "knight", name: "Crimson Knight" },
      { stage: 3, bossId: "split", name: "Gemini Splitter" }
    ];
  }

  function getUpgradeTypeMeta(upgrade){
    const type = upgrade && upgrade.upgradeType ? upgrade.upgradeType : "passive";
    if (type === "weapon") return { label: "WEAPON", className: "weapon" };
    if (type === "active") return { label: "ACTIVE", className: "active" };
    return { label: "PASSIVE", className: "passive" };
  }

  function formatStageTime(frames = 0) {
    const totalSeconds = Math.max(0, Math.ceil(frames / 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatStatWithDelta(baseValue, deltaValue=0, digits=1, sign="+") {
    const base = Number(baseValue) || 0;
    const delta = Number(deltaValue) || 0;
    if (Math.abs(delta) < 0.05) return base.toFixed(digits);
    return `${base.toFixed(digits)} ${sign} ${Math.abs(delta).toFixed(digits)}`;
  }

  function formatIntegerStatWithDelta(baseValue, deltaValue=0, sign="+") {
    const base = Math.round(Number(baseValue) || 0);
    const delta = Number(deltaValue) || 0;
    if (Math.abs(delta) < 0.05) return String(base);
    return `${base} ${sign} ${Math.abs(delta).toFixed(1)}`;
  }

  function getActiveHudModifiers() {
    const S = GameState;
    const modifiers = {
      speedBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      fireRateReduction: 0,
      bulletSpeedBonus: 0
    };

    const afterburnerActive = S.activeSkillState && S.activeSkillState.afterburnerT > 0;
    if (afterburnerActive && window.ActiveSkillSystem) {
      const skill = ActiveSkillSystem.getDefinition("afterburner");
      if (skill && skill.effectData) {
        modifiers.speedBonus = S.stats.speed * ((skill.effectData.speedMultiplier || 1) - 1);
        modifiers.attackBonus = S.stats.bulletDamage * ((skill.effectData.damageMultiplier || 1) - 1);
        modifiers.fireRateReduction = S.stats.fireRate - (S.stats.fireRate * (skill.effectData.fireRateMultiplier || 1));
        modifiers.bulletSpeedBonus = S.stats.bulletSpeed * ((skill.effectData.bulletSpeedMultiplier || 1) - 1);
      }
    }

    if (
      Math.abs(modifiers.speedBonus) < 0.05 &&
      Math.abs(modifiers.attackBonus) < 0.05 &&
      Math.abs(modifiers.defenseBonus) < 0.05 &&
      Math.abs(modifiers.fireRateReduction) < 0.05 &&
      Math.abs(modifiers.bulletSpeedBonus) < 0.05
    ) {
      return null;
    }

    return modifiers;
  }

  function hudUpdate() {
    const S = GameState;
    const P = S.progression;
    const isAsteroidMapTest = window.WaveSystem && WaveSystem.isAsteroidMapTestStage && WaveSystem.isAsteroidMapTestStage(P.stage);
    const isEnemyTest = S.stats.practice && S.stats.practiceMode === "enemy";
    const weaponDef = WEAPON_DEFINITIONS[S.weaponState.current];
    const hudModifiers = getActiveHudModifiers();
    const baseSpeed = Math.round(S.stats.speed * 10) / 10;
    const baseAttack = Math.round(S.stats.bulletDamage * 10) / 10;
    const baseDefense = Math.round(S.stats.defense * 10) / 10;
    const baseFireRate = Math.round(S.stats.fireRate * 10) / 10;
    const baseBulletSpeed = Math.round(S.stats.bulletSpeed * 10) / 10;

    const speedBonus = hudModifiers ? Math.round(hudModifiers.speedBonus * 10) / 10 : 0;
    const attackBonus = hudModifiers ? Math.round(hudModifiers.attackBonus * 10) / 10 : 0;
    const defenseBonus = hudModifiers ? Math.round(hudModifiers.defenseBonus * 10) / 10 : 0;
    const fireRateReduction = hudModifiers ? Math.round(hudModifiers.fireRateReduction * 10) / 10 : 0;
    const bulletSpeedBonus = hudModifiers ? Math.round(hudModifiers.bulletSpeedBonus * 10) / 10 : 0;

    $score.textContent = String(Math.floor(P.score));
    $stage.textContent = window.WaveSystem && WaveSystem.getStageHudLabel
      ? WaveSystem.getStageHudLabel(P.stage)
      : String(P.stage || 1);
    $stageTime.textContent = (S.stats.practice && (S.stats.practiceMode === "boss" || S.stats.practiceMode === "enemy")) || isAsteroidMapTest
      ? "TEST"
      : formatStageTime(P.stageTime);
    $wave.textContent = String(P.wave);
    $level.textContent = String(P.level);
    $xp.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $mp.textContent = `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}`;
    $speed.textContent = formatStatWithDelta(baseSpeed, speedBonus, 1, "+");
    $shield.textContent = S.stats.shieldMax > 0
      ? `${Math.max(0, Math.floor(S.stats.shield))} / ${Math.floor(S.stats.shieldMax)}`
      : "-";
    $atk.textContent = formatStatWithDelta(baseAttack, attackBonus, 1, "+");
    $def.textContent = formatStatWithDelta(baseDefense, defenseBonus, 1, "+");
    $fireRate.textContent = formatIntegerStatWithDelta(baseFireRate, fireRateReduction, "-");
    $bulletSpeed.textContent = formatStatWithDelta(baseBulletSpeed, bulletSpeedBonus, 1, "+");
    $shots.textContent = String(Math.max(1, Math.floor(S.stats.bulletCount || 1)));
    $pierce.textContent = String(S.stats.bulletPierce);
    $combo.textContent = "x" + P.combo.toFixed(1).replace(/\.0$/,"");
    $weaponName.textContent = weaponDef ? weaponDef.name : "-";
    $weaponLevel.textContent = `Lv.${Math.max(1, Math.floor(S.stats.weaponLevel || 1))}`;
    if (hudHpText) hudHpText.textContent = `${Math.max(0, Math.floor(S.stats.hp))} / ${Math.floor(S.stats.maxHp)}`;
    if (hudMpText) hudMpText.textContent = `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}`;
    if (hudXpText) hudXpText.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    if (hudHpFill) hudHpFill.style.width = `${Helpers.clamp(S.stats.hp / Math.max(1, S.stats.maxHp), 0, 1) * 100}%`;
    if (hudMpFill) hudMpFill.style.width = `${Helpers.clamp(S.stats.mp / Math.max(1, S.stats.mpMax), 0, 1) * 100}%`;
    if (hudXpFill) hudXpFill.style.width = `${Helpers.clamp(P.xp / Math.max(1, P.xpToNext), 0, 1) * 100}%`;
    if (hudTimeText) hudTimeText.textContent = ((S.stats.practice && (S.stats.practiceMode === "boss" || S.stats.practiceMode === "enemy")) || isAsteroidMapTest) ? "TEST" : formatStageTime(P.stageTime);
    if (hudScoreText) hudScoreText.textContent = String(Math.floor(P.score));
    if (buffHud && afterburnerTime) {
      const active = S.activeSkillState.afterburnerT > 0;
      buffHud.hidden = !active;
      afterburnerTime.textContent = `${Math.max(0, S.activeSkillState.afterburnerT / 60).toFixed(1)}s`;
    }
    for (const radio of weaponRadioEls) radio.checked = radio.value === S.weaponState.current;
    for (const radio of difficultyEls) radio.checked = radio.value === (S.difficulty || "normal");
    for (const radio of effectQualityEls) radio.checked = radio.value === (S.effectQuality || "standard");
    for (const radio of autoFireEls) radio.checked = String(S.autoFire !== false) === radio.value;
    for (const radio of autoAimEls) radio.checked = String(S.autoAim === true) === radio.value;
    for (const radio of movementModeEls) radio.checked = radio.value === (S.movementMode || "keyboard");
    weaponHud.style.display = S.stats.practice ? "block" : "none";
    const isBossTest = S.stats.practice && S.stats.practiceMode === "boss";
    const isStageTest = S.stats.practice && S.stats.practiceMode === "stage";
    if (stageTestPanel) stageTestPanel.style.display = isStageTest ? "block" : "none";
    if (enemyTestPanel) enemyTestPanel.style.display = isEnemyTest ? "block" : "none";
    if (bossSelect && window.BossSystem) {
      bossSelect.value = BossSystem.getPracticeBossId();
    }
    if (stageSelect) stageSelect.value = String(S.practiceStageId || 1);
    if (stageDurationInput) stageDurationInput.value = String(Math.max(10, Math.floor(S.practiceStageDurationSec || 180)));
    for (const radio of practiceTypeEls) radio.checked = radio.value === (S.stats.practiceMode || "boss");
    if (spawnBossBtn) {
      spawnBossBtn.disabled = !isBossTest;
      spawnBossBtn.style.display = isBossTest ? "block" : "none";
    }
    if (bossSelect) bossSelect.style.display = isBossTest ? "block" : "none";
    const bossLabel = document.querySelector("label[for='bossSelect']");
    if (bossLabel) bossLabel.style.display = isBossTest ? "block" : "none";
    renderBossHud();
    renderActiveSlots();
  }

  function populateBossOptions() {
    if (!bossSelect || !window.BossSystem) return;
    const selected = BossSystem.getPracticeBossId();
    bossSelect.innerHTML = "";
    for (const boss of BossSystem.getDefinitions()) {
      const option = document.createElement("option");
      option.value = boss.id;
      option.textContent = boss.name;
      if (boss.id === selected) option.selected = true;
      bossSelect.appendChild(option);
    }

    if (stageSelect) {
      const selectedStage = String(Math.max(1, GameState.practiceStageId || 1));
      stageSelect.innerHTML = "";
      for (const stageInfo of getStageLineup()) {
        const option = document.createElement("option");
        option.value = String(stageInfo.stage);
        option.textContent = `Stage ${stageInfo.stage} - ${stageInfo.name}`;
        if (option.value === selectedStage) option.selected = true;
        stageSelect.appendChild(option);
      }
      const asteroidOption = document.createElement("option");
      asteroidOption.value = "4";
      asteroidOption.textContent = "Stage 4 - Asteroid Map Test";
      if (asteroidOption.value === selectedStage) asteroidOption.selected = true;
      stageSelect.appendChild(asteroidOption);
    }
    populateEnemyOptions();
  }

  function populateEnemyOptions() {
    if (!enemySelect || !window.EnemySystem || !EnemySystem.getPracticeEnemyOptions) return;
    const selectedEnemy = GameState.practiceEnemyTier || "normal";
    enemySelect.innerHTML = "";
    for (const enemy of EnemySystem.getPracticeEnemyOptions()) {
      const option = document.createElement("option");
      option.value = enemy.id;
      option.textContent = enemy.name;
      if (enemy.id === selectedEnemy) option.selected = true;
      enemySelect.appendChild(option);
    }
  }

  function renderActiveSlots(){
    for (const el of activeSlotEls){
      const slot = GameState.activeSkillState.slots.find(item => item.key === el.dataset.key);
      const skill = slot ? ActiveSkillSystem.getSlotSkill(slot) : null;
      const nameEl = el.querySelector(".slotName");
      const typeEl = el.querySelector(".slotType");
      const levelEl = el.querySelector(".slotLevel");
      const costEl = el.querySelector(".slotCost");
      const cdEl = el.querySelector(".slotCd");

      if (!slot || !skill){
        nameEl.textContent = "Empty";
        typeEl.textContent = "-";
        if (levelEl) levelEl.textContent = "Lv.0";
        costEl.textContent = "0 MP";
        cdEl.textContent = "READY";
        el.classList.remove("cooldown");
        el.classList.remove("noMp");
        continue;
      }

      let skillName = skill.name;
      if (skill.id === "boost" && window.ActiveSkillSystem && ActiveSkillSystem.getBoostDirectionIcon) {
        skillName += ` ${ActiveSkillSystem.getBoostDirectionIcon()}`;
      }
      nameEl.textContent = skillName;
      typeEl.textContent = skill.type.toUpperCase();
      if (skill.id === "boost" && window.ActiveSkillSystem && ActiveSkillSystem.getBoostDirectionLabel) {
        typeEl.textContent = `BOOST ${ActiveSkillSystem.getBoostDirectionLabel()}`;
      }
      if (levelEl) {
        const level = Math.max(1, GameState.activeSkillState.levels[skill.id] || 1);
        levelEl.textContent = `Lv.${level}`;
      }
      costEl.textContent = `${skill.mpCost} MP`;
      cdEl.textContent = slot.cooldown > 0 ? `${(slot.cooldown / 60).toFixed(1)}s` : "READY";
      el.classList.toggle("cooldown", slot.cooldown > 0);
      el.classList.toggle("noMp", GameState.stats.mp < skill.mpCost);
    }
  }

  function closeSkillMapPanel(){
    skillMapState = null;
    if (!skillMapPanel) return;
    skillMapPanel.hidden = true;
    skillMapList.innerHTML = "";
  }

  function renderSkillMapPanel(){
    if (!skillMapPanel || !skillMapState) return;
    const slot = GameState.activeSkillState.slots.find(item => item.key === skillMapState.slotKey);
    if (!slot) {
      closeSkillMapPanel();
      return;
    }

    const currentSkill = ActiveSkillSystem.getSlotSkill(slot);
    const assignableSkills = ActiveSkillSystem.getAssignableSkills(slot.key);
    skillMapTitle.textContent = currentSkill
      ? `${slot.label} Slot · ${currentSkill.name}`
      : `${slot.label} Slot · Empty`;
    skillMapList.innerHTML = "";

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "skillMapOption clear";
    clearBtn.innerHTML = `<div class="skillMapOptionTitle">Unequip</div><div class="skillMapOptionMeta">${currentSkill ? `${currentSkill.name} removed from ${slot.label}` : `Slot ${slot.label} is already empty`}</div>`;
    clearBtn.onclick = () => {
      ActiveSkillSystem.clearSlot(slot.key);
      closeSkillMapPanel();
    };
    skillMapList.appendChild(clearBtn);

    if (!assignableSkills.length) {
      const empty = document.createElement("div");
      empty.className = "skillMapOption empty";
      empty.innerHTML = `<div class="skillMapOptionTitle">No Unmapped Skills</div><div class="skillMapOptionMeta">New active skills will auto-fill empty slots in Q > E > R order.</div>`;
      skillMapList.appendChild(empty);
    } else {
      for (const skill of assignableSkills) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skillMapOption";
        btn.innerHTML = `<div class="skillMapOptionTitle">${skill.name}</div><div class="skillMapOptionMeta">${skill.type.toUpperCase()} | ${skill.mpCost} MP | ${skill.desc}</div>`;
        btn.onclick = () => {
          ActiveSkillSystem.assignSkillToSlot(slot.key, skill.id);
          closeSkillMapPanel();
        };
        skillMapList.appendChild(btn);
      }
    }

    skillMapPanel.hidden = false;
  }

  function openSkillMapPanel(slotKey){
    skillMapState = { slotKey };
    renderSkillMapPanel();
  }

  function renderBossHud() {
    if (!bossHud || !window.BossSystem) return;
    const boss = BossSystem.getActiveBoss();
    if (!boss) {
      bossHud.classList.remove("visible");
      bossHudName.textContent = "-";
      bossHudMeta.textContent = "No Active Boss";
      bossHudFill.style.width = "0%";
      return;
    }
    const ratio = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
    const phaseLabel = boss.phase ? `Phase ${boss.phase}` : "Boss";
    let extra = "";
    if (boss.bossId === "summoner" && boss.minions) {
      extra = boss.minions.length > 0 ? ` | Shielded by ${boss.minions.length}` : " | Core Exposed";
    } else if (boss.bossId === "split" && boss.children) {
      extra = ` | Cores ${boss.children.length}`;
    } else if (boss.bossId === "knight" && boss.state) {
      extra = ` | ${boss.state}`;
    } else if (boss.currentAction) {
      extra = ` | ${boss.currentAction}`;
    }
    bossHud.classList.add("visible");
    bossHudName.textContent = boss.displayName || boss.name || boss.bossId || "Boss";
    bossHudMeta.textContent = `${phaseLabel} | CORE ${Math.ceil(Math.max(0, boss.hp))} / ${Math.ceil(boss.maxHp)}${extra}`;
    bossHudFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  function flashActiveSlot(key, reason="cast"){
    const el = activeSlotEls.find(item => item.dataset.key === key);
    if (!el) return;
    const className = reason === "mp" ? "noMp" : "cast";
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 160);
  }

  function showActiveSlotHint(key, text){
    const el = activeSlotEls.find(item => item.dataset.key === key);
    if (!el) return;
    el.dataset.floatLabel = text || "";
    el.classList.remove("dirSet");
    void el.offsetWidth;
    el.classList.add("dirSet");
    setTimeout(() => {
      el.classList.remove("dirSet");
      if (el.dataset.floatLabel === text) delete el.dataset.floatLabel;
    }, 520);
  }

  function showCard(which) {
    if (which !== "clear") pendingStageClearResolve = null;
    startCard.style.display = which === "start" ? "block" : "none";
    upgradeCard.style.display = which === "upgrade" ? "block" : "none";
    gameOverCard.style.display = which === "over" ? "block" : "none";
    if (stageClearCard) stageClearCard.style.display = which === "clear" ? "block" : "none";
    if (stageStartCard) stageStartCard.style.display = "none";
    if (pauseCard) pauseCard.style.display = which === "pause" ? "block" : "none";
    overlayRoot.style.display = which ? "flex" : "none";
  }

  function renderPauseMenu(onAdjustUpgrade=null, onResetUpgrades=null, onClearUpgrades=null) {
    const S = GameState;
    if (!pauseStatsGrid || !pauseUpgradeList) return;

    const escapeHtml = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const formatPercentDelta = (value, inverse=false) => {
      if (typeof value !== "number") return null;
      const delta = inverse ? (1 - value) : (value - 1);
      const sign = delta >= 0 ? "+" : "";
      return `${sign}${Math.round(delta * 100)}%`;
    };

    const formatFrames = (frames) => {
      if (typeof frames !== "number") return null;
      return `${frames}f (${(frames / 60).toFixed(1)}s)`;
    };

    const getActiveSkillMeta = (skillId) => {
      const skill = window.ActiveSkillSystem && ActiveSkillSystem.getDefinition
        ? ActiveSkillSystem.getDefinition(skillId)
        : null;
      if (!skill) return [];
      const activeLevel = Math.max(1, (GameState.activeSkillState.levels && GameState.activeSkillState.levels[skillId]) || 1);
      const data = skill.effectData || {};
      const meta = [];
      const effectiveDuration = skill.id === "stealth_field"
        ? (skill.duration || 180) + (Math.max(1, GameState.activeSkillState.levels.stealth_field || 1) - 1) * 60
        : skill.id === "nova_pulse"
          ? (skill.duration || 28) + (activeLevel - 1) * 10
        : skill.duration;
      if (skill.mpCost != null) meta.push(`${skill.mpCost} MP`);
      if (skill.cooldown != null) meta.push(`CD ${formatFrames(skill.cooldown)}`);
      if (effectiveDuration && effectiveDuration > 1) meta.push(`Duration ${formatFrames(effectiveDuration)}`);
      if (data.radius != null) meta.push(`Radius ${skill.id === "nova_pulse" ? data.radius + (activeLevel - 1) * 16 : data.radius}`);
      if (data.range != null && skill.id !== "deploy_turret") meta.push(`Range ${data.range}`);
      if (data.damage != null) meta.push(`Damage ${skill.id === "nova_pulse" ? (data.damage + (activeLevel - 1) * 2).toFixed(1).replace(/\.0$/, "") : data.damage}`);
      if (data.bossDamage != null) meta.push(`Boss ${skill.id === "nova_pulse" ? (data.bossDamage + (activeLevel - 1) * 1.4).toFixed(1).replace(/\.0$/, "") : data.bossDamage}`);
      if (data.damageMultiplier != null) meta.push(`Damage x${data.damageMultiplier}`);
      if (data.count != null) meta.push(`${data.count} shots`);
      if (data.trapCount != null) meta.push(`${data.trapCount} nodes`);
      if (data.targetCount != null) meta.push(`${data.targetCount} targets`);
      if (data.arcDegrees != null) meta.push(`Arc ${data.arcDegrees}\u00b0`);
      if (data.chainRange != null) meta.push(`Chain ${data.chainRange}`);
      if (data.blastRadius != null) meta.push(`Blast ${data.blastRadius}`);
      if (data.bulletClearRadius != null) meta.push(`Clear ${data.bulletClearRadius}`);
      if (data.knockback != null) meta.push(`Knockback ${data.knockback}`);
      if (data.markDuration != null) meta.push(`Mark ${formatFrames(data.markDuration)}`);
      if (data.damageAmp != null) meta.push(`Amp x${data.damageAmp}`);
      if (data.span != null && data.depth != null) meta.push(`Barrier ${data.span}x${data.depth}`);
      if (data.width != null && data.height != null) meta.push(`Field ${data.width}x${data.height}`);
      if (data.slowRate != null) meta.push(`Slow ${Math.round((1 - data.slowRate) * 100)}%`);
      if (data.bossSlowRate != null) meta.push(`Boss slow ${Math.round((1 - data.bossSlowRate) * 100)}%`);
      if (data.hp != null) meta.push(`HP ${data.hp}`);
      if (skill.id === "deploy_turret") {
        const level = Math.max(1, GameState.activeSkillState.levels.deploy_turret || 1);
        const count = level >= 4 ? 4 : level >= 3 ? 3 : level >= 2 ? 2 : 1;
        meta.push(`${count} turrets`);
        if (data.range != null) meta.push(`Range ${data.range + (level >= 5 ? 18 : level >= 4 ? 10 : level >= 3 ? 6 : level >= 2 ? 2 : 0)}`);
        if (data.fireInterval != null) meta.push(`Rate ${(Math.max(10, Math.round(data.fireInterval * (level >= 5 ? 0.76 : 1))) / 60).toFixed(2)}s`);
      }
      if (data.speedMultiplier != null) meta.push(`Speed ${formatPercentDelta(data.speedMultiplier)}`);
      if (data.fireRateMultiplier != null) meta.push(`Fire rate ${formatPercentDelta(data.fireRateMultiplier, true)}`);
      if (data.bulletSpeedMultiplier != null) meta.push(`Bullet speed ${formatPercentDelta(data.bulletSpeedMultiplier)}`);
      if (data.alpha != null) meta.push(`Opacity ${Math.round(data.alpha * 100)}%`);
      return meta.filter(Boolean);
    };

    const getUpgradeMeta = (upgrade, level) => {
      const meta = [];
      const nextLevel = Math.max(1, (level || 0) + 1);
      const table = window.UPGRADE_BALANCE && UPGRADE_BALANCE[upgrade.id];
      const step = Array.isArray(table)
        ? table[Math.max(0, Math.min(table.length - 1, nextLevel - 1))]
        : null;

      if (upgrade.id === "active_nova_unlock") {
        const nextNovaLevel = Math.max(1, Math.min(3, (level || 0) + 1));
        return [
          `Nova Lv.${nextNovaLevel}`,
          `Radius ${72 + (nextNovaLevel - 1) * 16}`,
          `Damage ${(8 + (nextNovaLevel - 1) * 2).toFixed(1).replace(/\.0$/, "")}`,
          `Duration ${formatFrames(28 + (nextNovaLevel - 1) * 10)}`
        ];
      }
      if (upgrade.id.startsWith("active_")) {
        let skillId = upgrade.id.replace(/^active_/, "").replace(/_unlock$/, "");
        if (skillId === "nova") skillId = "nova_pulse";
        if (skillId === "stealth") skillId = "stealth_field";
        return getActiveSkillMeta(skillId);
      }
      if (upgrade.category === "active" && window.ActiveSkillSystem && ActiveSkillSystem.getDefinition(upgrade.id)) {
        return getActiveSkillMeta(upgrade.id);
      }
      if (upgrade.id === "boost_tuning") {
        const currentLevel = Math.max(1, GameState.activeSkillState.levels.boost || 1);
        const nextBoostLevel = Math.min(4, currentLevel + 1);
        return [
          `Boost Lv.${nextBoostLevel}`,
          `Speed +${(nextBoostLevel - 1) * 1.5}`,
          `Drag +${Math.round((nextBoostLevel - 1) * 1)}%`,
          `Mitigation +${Math.round((nextBoostLevel - 1) * 3)}%`
        ];
      }
      if (upgrade.id === "deploy_turret") {
        const nextLevel = Math.max(1, Math.min(5, (level || 0) + 1));
        const count = nextLevel >= 4 ? 4 : nextLevel >= 3 ? 3 : nextLevel >= 2 ? 2 : 1;
        return [
          `Turret Lv.${nextLevel}`,
          `${count} turrets`,
          nextLevel >= 4 ? "Rear coverage online" : nextLevel >= 3 ? "Front + side coverage" : nextLevel >= 2 ? "Dual front spread" : "Front sentry",
          nextLevel >= 5 ? "Damage + fire rate boost" : "Coverage upgrade"
        ];
      }
      if (upgrade.id === "firerate" && typeof step === "number") meta.push(`Next fire interval ${formatPercentDelta(step, true)}`);
      else if (upgrade.id === "speed" && typeof step === "number") meta.push(`Next speed ${formatPercentDelta(step)}`);
      else if (upgrade.id === "dash" && typeof step === "number") meta.push(`Next dash CD ${formatPercentDelta(step, true)}`);
      else if (upgrade.id === "bulletspeed" && typeof step === "number") meta.push(`Next bullet speed ${formatPercentDelta(step)}`);
      else if (upgrade.id === "range_extender" && typeof step === "number") meta.push(`Range ${Math.round(step * 100)}%`);
      else if (upgrade.id === "defense" && typeof step === "number") meta.push(`Next DEF +${step}`);
      else if (upgrade.id === "pierce" && typeof step === "number") meta.push(`Next pierce +${step}`);
      else if (upgrade.id === "hp" && typeof step === "number") meta.push(`Next max HP +${step}`);
      else if (upgrade.id === "regen" && typeof step === "number") meta.push(`Next regen +${step}/s`);
      else if (upgrade.id === "shield" && step) meta.push(`Shield +${step.shieldMax}`, `Regen +${step.shieldRegen}/s`);
      else if (upgrade.id === "proximity_mine" && step) meta.push(`Damage ${step.damage}`, `Radius ${step.radius}`, `Max ${step.maxCount}`, `CD ${formatFrames(step.cooldown)}`);
      else if (upgrade.id === "homingmissile" && step) {
        if (step.damage != null) meta.push(`Damage ${step.damage}`);
        if (step.damageDelta != null && step.damageDelta > 0) meta.push(`Damage +${step.damageDelta}`);
        if (step.cooldownMul != null) meta.push(`CD ${formatPercentDelta(step.cooldownMul, true)}`);
        if (step.cooldownMin != null) meta.push(`Min CD ${formatFrames(step.cooldownMin)}`);
      } else if (upgrade.id === "weapon_level") meta.push("Unlocks stronger weapon profiles up to Lv.7");
      else if (upgrade.id === "hardpoint_guns") meta.push("Lv1 dual wing guns | Lv2 quad wing guns | Lv3 tighter quad guns");
      else if (upgrade.id === "escort_drones") meta.push("Lv1 single drone | Lv2 twin drones | Lv3 tuned fire | Lv4 tri-cover | Lv5 full 4-way screen");

      return meta.filter(Boolean);
    };

    const statItems = [
      { label: "HP", value: `${Math.floor(S.stats.hp)} / ${Math.floor(S.stats.maxHp)}` },
      { label: "MP", value: `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}` },
      { label: "Speed", value: `${S.stats.speed.toFixed(1)}` },
      { label: "ATK", value: `${S.stats.bulletDamage.toFixed(1)}` },
      { label: "Weapon Lv", value: `Lv.${Math.max(1, S.stats.weaponLevel || 1)}` },
      { label: "Range", value: `${Math.round((S.stats.rangeMultiplier || 1) * 100)}%` },
      { label: "Wing Guns", value: `Lv.${Math.max(0, S.stats.hardpointLevel || 0)}` },
      { label: "Escort Drones", value: `Lv.${Math.max(0, S.stats.escortDroneLevel || 0)}` },
      { label: "DEF", value: `${S.stats.defense.toFixed(1)}` },
      { label: "Fire Rate", value: `${S.stats.fireRate.toFixed(1)}` },
      { label: "Bullet Spd", value: `${S.stats.bulletSpeed.toFixed(1)}` },
      { label: "Shield", value: S.stats.shieldMax > 0 ? `${Math.floor(S.stats.shield)} / ${Math.floor(S.stats.shieldMax)}` : "-" },
      { label: "Dash Cd", value: `${Math.floor(S.stats.dashCdMax)}f` },
      { label: "Level", value: `Lv.${S.progression.level}` }
    ];

    pauseStatsGrid.innerHTML = statItems.map((item) => `
      <div class="pauseInfoItem">
        <div class="pauseInfoLabel">${item.label}</div>
        <div class="pauseInfoValue">${item.value}</div>
      </div>
    `).join("");

    const visibleUpgrades = getPauseMenuEntries()
      .filter((entry) => S.stats.practice || entry.level > 0)
      .filter((entry) => pauseMenuFilter === "all" ? true : entry.category === pauseMenuFilter)
      .sort((a, b) => a.name.localeCompare(b.name));

    pauseUpgradeList.innerHTML = visibleUpgrades.length
      ? visibleUpgrades.map((entry) => {
          const { upgrade, level, adjustable, displayLevel, displayMax } = entry;
          return `
          <div class="pauseInfoRow">
            <div>
              <div class="pauseAdjustName">${entry.name}</div>
              <div class="pauseInfoMeta">${entry.category.toUpperCase()} · Lv.${displayLevel}${displayMax ? ` / ${displayMax}` : ""}</div>
            </div>
            ${adjustable ? `
              <div class="pauseAdjustControls">
                <button type="button" data-upgrade-id="${upgrade.id}" data-adjust="-1" ${level <= 0 ? "disabled" : ""}>-</button>
                <div class="pauseAdjustLevel">Lv.${displayLevel}</div>
                <button type="button" data-upgrade-id="${upgrade.id}" data-adjust="1" ${level >= upgrade.maxLevel ? "disabled" : ""}>+</button>
              </div>
            ` : ""}
          </div>`;
        }).join("")
      : `<div class="pauseInfoRow"><div class="pauseInfoMeta">No upgrades picked yet.</div></div>`;

    if (visibleUpgrades.length) {
      const rows = [...pauseUpgradeList.querySelectorAll(".pauseInfoRow")];
      rows.forEach((row, index) => {
        const entry = visibleUpgrades[index];
        if (!entry) return;
        const desc = entry.desc || "No detailed description.";
        const meta = entry.upgrade ? getUpgradeMeta(entry.upgrade, entry.level) : [];
        row.classList.add("pauseSkillRow");
        row.title = meta.length ? `${desc}\n${meta.join(" | ")}` : desc;

        const detail = document.createElement("div");
        detail.className = "pauseSkillDetail";

        const text = document.createElement("p");
        text.textContent = desc;
        detail.appendChild(text);

        if (meta.length) {
          const stats = document.createElement("div");
          stats.className = "pauseSkillStats";
          stats.textContent = meta.join(" | ");
          detail.appendChild(stats);
        }

        if (Array.isArray(entry.tags) && entry.tags.length) {
          const tags = document.createElement("div");
          tags.className = "pauseSkillTags";
          for (const tag of entry.tags) {
            const chip = document.createElement("span");
            chip.textContent = tag;
            tags.appendChild(chip);
          }
          detail.appendChild(tags);
        }

        row.appendChild(detail);
      });
    }

    if (pauseFilterBar) {
      for (const btn of pauseFilterBar.querySelectorAll("[data-filter]")) {
        btn.classList.toggle("active", btn.dataset.filter === pauseMenuFilter);
        btn.onclick = () => {
          pauseMenuFilter = btn.dataset.filter || "all";
          renderPauseMenu(onAdjustUpgrade, onResetUpgrades, onClearUpgrades);
        };
      }
    }

    if (pauseAdjustActions) pauseAdjustActions.hidden = !S.stats.practice;
    if (pauseClearBtn) {
      pauseClearBtn.onclick = () => onClearUpgrades && onClearUpgrades();
    }
    if (pauseResetBtn) {
      pauseResetBtn.onclick = () => onResetUpgrades && onResetUpgrades();
    }

    if (!S.stats.practice) return;
    for (const btn of pauseUpgradeList.querySelectorAll("[data-upgrade-id][data-adjust]")) {
      btn.onclick = () => {
        const id = btn.dataset.upgradeId;
        const delta = Number(btn.dataset.adjust || 0);
        if (!id || !delta) return;
        onAdjustUpgrade && onAdjustUpgrade(id, delta);
      };
    }
  }

  function showGameOver() {
    finalScoreEl.textContent = String(Math.floor(GameState.progression.score));
    showCard("over");
  }

  function getPauseMenuEntries() {
    const S = GameState;
    const entries = [];

    const resolveActiveSkillId = (upgrade) => {
      if (!upgrade || upgrade.category !== "active") return null;
      if (window.ActiveSkillSystem && typeof ActiveSkillSystem.getDefinition === "function") {
        if (ActiveSkillSystem.getDefinition(upgrade.id)) return upgrade.id;
      }
      if (upgrade.id.startsWith("active_") && upgrade.id.endsWith("_unlock")) {
        return upgrade.id.replace(/^active_/, "").replace(/_unlock$/, "");
      }
      return null;
    };

    for (const upgrade of (window.UPGRADE_DEFINITIONS || [])) {
      const level = S.upgrades.levels[upgrade.id] || 0;
      const adjustable = S.stats.practice && typeof upgrade.maxLevel === "number" && upgrade.maxLevel >= 1;
      if (!S.stats.practice) {
        if (level <= 0) continue;
      } else if (level <= 0) {
        if (!adjustable) continue;
      }

      const activeSkillId = resolveActiveSkillId(upgrade);
      const activeSkill = activeSkillId && window.ActiveSkillSystem && typeof ActiveSkillSystem.getDefinition === "function"
        ? ActiveSkillSystem.getDefinition(activeSkillId)
        : null;
      const slot = activeSkillId
        ? (S.activeSkillState.slots || []).find((entry) => entry.skillId === activeSkillId)
        : null;
      const tags = Array.isArray(upgrade.tags) ? upgrade.tags.slice() : [];
      if (slot) tags.unshift(`slot:${slot.label}`);
      const isBoostTuning = upgrade.id === "boost_tuning";
      const displayLevel = isBoostTuning
        ? Math.max(1, S.activeSkillState.levels.boost || 1)
        : (upgrade.id === "weapon_level" ? Math.max(1, level + 1) : level);
      const displayMax = isBoostTuning
        ? 4
        : (upgrade.id === "weapon_level" ? 7 : upgrade.maxLevel);

      entries.push({
        id: upgrade.id,
        name: activeSkill ? activeSkill.name : upgrade.name,
        desc: activeSkill ? (activeSkill.desc || upgrade.desc || "No detailed description.") : (upgrade.desc || "No detailed description."),
        tags,
        category: upgrade.category,
        level,
        displayLevel,
        displayMax,
        adjustable,
        upgrade
      });
    }

    return entries;
  }

  function renderPauseMenu(onAdjustUpgrade=null, onResetUpgrades=null, onClearUpgrades=null) {
    const S = GameState;
    if (!pauseStatsGrid || !pauseUpgradeList) return;

    const escapeHtml = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const statItems = [
      { label: "HP", value: `${Math.floor(S.stats.hp)} / ${Math.floor(S.stats.maxHp)}` },
      { label: "MP", value: `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}` },
      { label: "Speed", value: `${S.stats.speed.toFixed(1)}` },
      { label: "ATK", value: `${S.stats.bulletDamage.toFixed(1)}` },
      { label: "Weapon Lv", value: `Lv.${Math.max(1, S.stats.weaponLevel || 1)}` },
      { label: "Range", value: `${Math.round((S.stats.rangeMultiplier || 1) * 100)}%` },
      { label: "Wing Guns", value: `Lv.${Math.max(0, S.stats.hardpointLevel || 0)}` },
      { label: "Escort Drones", value: `Lv.${Math.max(0, S.stats.escortDroneLevel || 0)}` },
      { label: "DEF", value: `${S.stats.defense.toFixed(1)}` },
      { label: "Fire Rate", value: `${S.stats.fireRate.toFixed(1)}` },
      { label: "Bullet Spd", value: `${S.stats.bulletSpeed.toFixed(1)}` },
      { label: "Shield", value: S.stats.shieldMax > 0 ? `${Math.floor(S.stats.shield)} / ${Math.floor(S.stats.shieldMax)}` : "-" },
      { label: "Dash Cd", value: `${Math.floor(S.stats.dashCdMax)}f` },
      { label: "Level", value: `Lv.${S.progression.level}` }
    ];

    pauseStatsGrid.innerHTML = statItems.map((item) => `
      <div class="pauseInfoItem">
        <div class="pauseInfoLabel">${item.label}</div>
        <div class="pauseInfoValue">${item.value}</div>
      </div>
    `).join("");

    const visibleUpgrades = getPauseMenuEntries()
      .filter((entry) => pauseMenuFilter === "all" ? true : entry.category === pauseMenuFilter)
      .sort((a, b) => a.name.localeCompare(b.name));

    pauseUpgradeList.innerHTML = visibleUpgrades.length
      ? visibleUpgrades.map((entry) => {
          const { upgrade, level, adjustable, displayLevel, displayMax } = entry;
          const desc = escapeHtml(entry.desc || "No detailed description.");
          const tags = Array.isArray(entry.tags) && entry.tags.length
            ? `<div class="pauseSkillTags">${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
            : "";
          return `
          <div class="pauseInfoRow">
            <div>
              <div class="pauseAdjustName">${entry.name}</div>
              <div class="pauseInfoMeta">${entry.category.toUpperCase()} · Lv.${displayLevel}${displayMax ? ` / ${displayMax}` : ""}</div>
            </div>
            ${adjustable ? `
              <div class="pauseAdjustControls">
                <button type="button" data-upgrade-id="${upgrade.id}" data-adjust="-1" ${level <= 0 ? "disabled" : ""}>-</button>
                <div class="pauseAdjustLevel">Lv.${displayLevel}</div>
                <button type="button" data-upgrade-id="${upgrade.id}" data-adjust="1" ${level >= upgrade.maxLevel ? "disabled" : ""}>+</button>
              </div>
            ` : ""}
          </div>`;
        }).join("")
      : `<div class="pauseInfoRow"><div class="pauseInfoMeta">No upgrades picked yet.</div></div>`;

    if (visibleUpgrades.length) {
      const rows = [...pauseUpgradeList.querySelectorAll(".pauseInfoRow")];
      rows.forEach((row, index) => {
        const entry = visibleUpgrades[index];
        if (!entry) return;
        const desc = entry.desc || "No detailed description.";
        row.classList.add("pauseSkillRow");
        row.title = desc;

        const detail = document.createElement("div");
        detail.className = "pauseSkillDetail";

        const text = document.createElement("p");
        text.textContent = desc;
        detail.appendChild(text);

        if (Array.isArray(entry.tags) && entry.tags.length) {
          const tags = document.createElement("div");
          tags.className = "pauseSkillTags";
          for (const tag of entry.tags) {
            const chip = document.createElement("span");
            chip.textContent = tag;
            tags.appendChild(chip);
          }
          detail.appendChild(tags);
        }

        row.appendChild(detail);
      });
    }

    if (pauseFilterBar) {
      for (const btn of pauseFilterBar.querySelectorAll("[data-filter]")) {
        btn.classList.toggle("active", btn.dataset.filter === pauseMenuFilter);
        btn.onclick = () => {
          pauseMenuFilter = btn.dataset.filter || "all";
          renderPauseMenu(onAdjustUpgrade, onResetUpgrades, onClearUpgrades);
        };
      }
    }

    if (pauseAdjustActions) pauseAdjustActions.hidden = !S.stats.practice;
    if (pauseClearBtn) {
      pauseClearBtn.onclick = () => onClearUpgrades && onClearUpgrades();
    }
    if (pauseResetBtn) {
      pauseResetBtn.onclick = () => onResetUpgrades && onResetUpgrades();
    }

    if (!S.stats.practice) return;
    for (const btn of pauseUpgradeList.querySelectorAll("[data-upgrade-id][data-adjust]")) {
      btn.onclick = () => {
        const id = btn.dataset.upgradeId;
        const delta = Number(btn.dataset.adjust || 0);
        if (!id || !delta) return;
        onAdjustUpgrade && onAdjustUpgrade(id, delta);
      };
    }
  }

  function triggerBossWarning(duration = 2800, pulseDuration = 700) {
    if (!warningOverlay) return;
    warningOverlay.style.display = "flex";
    warningOverlay.animate(
      [
        { opacity: 0.18, transform: "scale(0.98)" },
        { opacity: 1, transform: "scale(1)" , offset: 0.28 },
        { opacity: 0.42, transform: "scale(1.01)", offset: 0.62 },
        { opacity: 1, transform: "scale(1)" , offset: 0.82 },
        { opacity: 0.2, transform: "scale(0.99)" }
      ],
      {
        duration: pulseDuration,
        easing: "ease-in-out",
        iterations: Math.max(1, Math.round(duration / pulseDuration))
      }
    );
    setTimeout(() => {
      warningOverlay.style.display = "none";
    }, duration + 40);
  }

  function playBossWarning(duration = 2800, pulseMs = 700) {
    triggerBossWarning(duration, pulseMs);
    if (window.SoundSystem) {
      const pulseCount = Math.max(1, Math.ceil(duration / pulseMs));
      for (let i = 0; i < pulseCount; i++) {
        setTimeout(() => {
          SoundSystem.play("boss_alarm", { cooldownMs: 0 });
        }, i * pulseMs);
      }
    }
    return new Promise((resolve) => setTimeout(resolve, duration + 80));
  }

  function resolveStageClear() {
    if (!pendingStageClearResolve) return;
    const resolve = pendingStageClearResolve;
    pendingStageClearResolve = null;
    showCard(null);
    resolve();
  }

  function resolveStageStart() {
    if (stageStartTimer) {
      clearTimeout(stageStartTimer);
      stageStartTimer = null;
    }
    if (stageStartAnimation) {
      stageStartAnimation.cancel();
      stageStartAnimation = null;
    }
    if (stageStartCard) stageStartCard.style.display = "none";
    if (!startCard || startCard.style.display === "none") overlayRoot.style.display = "none";
    if (!pendingStageStartResolve) return;
    const resolve = pendingStageStartResolve;
    pendingStageStartResolve = null;
    resolve();
  }

  function showStageStart(stage = 1, options = {}) {
    const durationMs = Math.max(1200, Number(options.durationMs) || 2665);
    const exitDelayMs = Math.max(0, Number(options.exitDelayMs) || 235);
    if (!stageStartCard || !overlayRoot) return Promise.resolve();
    if (pendingStageStartResolve) resolveStageStart();
    if (stageStartTitle) stageStartTitle.textContent = `Stage ${stage} Start`;
    if (stageStartSubtitle) stageStartSubtitle.textContent = options.subtitle || "Combat zone opening.";
    startCard.style.display = "none";
    upgradeCard.style.display = "none";
    gameOverCard.style.display = "none";
    if (stageClearCard) stageClearCard.style.display = "none";
    overlayRoot.style.display = "flex";
    stageStartCard.style.display = "block";
    stageStartAnimation = stageStartCard.animate(
      [
        { opacity: 0, transform: "translateY(28px) scale(0.94)", filter: "blur(12px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0px)", offset: 0.26 },
        { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0px)", offset: 0.66 },
        { opacity: 0, transform: "translateY(-14px) scale(1.015)", filter: "blur(6px)" }
      ],
      {
        duration: durationMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
    if (window.SoundSystem) SoundSystem.play("ui_hover", { playbackRate: 0.9, volume: 0.2, cooldownMs: 0 });
    return new Promise((resolve) => {
      pendingStageStartResolve = resolve;
      stageStartTimer = setTimeout(resolveStageStart, durationMs + exitDelayMs);
    });
  }

  function showStageClear(stage = 1, options = {}) {
    const isFinalStage = !!options.isFinalStage;
    if (stageClearLabel) {
      stageClearLabel.textContent = isFinalStage
        ? `Stage ${stage} secured. Demo route complete.`
        : `Stage ${stage} secured.`;
    }
    if (nextStageBtn) nextStageBtn.textContent = isFinalStage ? "Return to Title" : "Next Stage";
    if (pendingStageClearResolve) resolveStageClear();
    showCard("clear");
    if (window.SoundSystem) SoundSystem.play("stage_clear");
    return new Promise((resolve) => {
      pendingStageClearResolve = resolve;
    });
  }

  function openDialogueOverlay() {
    if (!dialogueOverlay || !dialogueLog) return;
    dialogueOverlay.hidden = false;
    dialogueOverlay.classList.add("visible");
  }

  function pruneDialogueLog() {
    if (!dialogueLog) return;
    while (dialogueLog.children.length > 8) {
      dialogueLog.removeChild(dialogueLog.firstElementChild);
    }
    while (dialogueLog.children.length > 1 && dialogueLog.scrollHeight > dialogueLog.clientHeight) {
      dialogueLog.removeChild(dialogueLog.firstElementChild);
    }
  }

  function createDialogueCard(line) {
    if (!dialogueLog) return null;
    openDialogueOverlay();
    const speaker = resolveDialogueCharacter(line);
    const isController = speaker.role !== "player";
    const card = document.createElement("div");
    card.className = `dialogueCard ${isController ? "controller" : "player"} typing`;

    if (isController) {
      const avatarFrame = document.createElement("div");
      avatarFrame.className = "dialogueAvatarFrame";

      const avatar = document.createElement("img");
      avatar.className = "dialogueAvatar";
      avatar.src = speaker.avatarSrc || "./assets/images/characters/avatar-controller.png";
      avatar.alt = speaker.name;
      avatarFrame.appendChild(avatar);
      card.appendChild(avatarFrame);
    } else {
      const stub = document.createElement("div");
      stub.className = "dialogueStub";
      stub.textContent = speaker.shortName;
      card.appendChild(stub);
    }

    const bubble = document.createElement("div");
    bubble.className = "dialogueBubble";

    const chrome = document.createElement("div");
    chrome.className = "dialogueChrome";

    const top = document.createElement("div");
    top.className = "dialogueTop";

    const name = document.createElement("div");
    name.className = "dialogueName";
    name.textContent = speaker.name;

    const channel = document.createElement("div");
    channel.className = "dialogueChannel";
    channel.textContent = isController ? "COMMUNICATION LINK" : "PILOT FEED";
    channel.hidden = true;

    const text = document.createElement("div");
    text.className = "dialogueText";

    top.appendChild(name);
    top.appendChild(channel);
    bubble.appendChild(chrome);
    bubble.appendChild(top);
    bubble.appendChild(text);
    card.appendChild(bubble);
    dialogueLog.appendChild(card);
    pruneDialogueLog();
    return { card, text, speaker };
  }

  function showDialogueLine(entry, text = "") {
    if (!entry || !entry.text) return;
    entry.text.textContent = text;
    entry.card.classList.add("typing");
    pruneDialogueLog();
  }

  function closeDialogueOverlay() {
    if (!dialogueOverlay) return;
    dialogueOverlay.classList.remove("visible");
    dialogueOverlay.hidden = true;
  }

  function commitDialogueLine(entry) {
    if (!entry || !entry.card) return;
    entry.card.classList.remove("typing");
    pruneDialogueLog();
  }

  function resetDialogueLog() {
    if (!dialogueLog) return;
    dialogueLog.innerHTML = "";
    closeDialogueOverlay();
  }

  function syncUpgradeChoiceSelection() {
    if (!upgradeChoiceState || !upgradeGrid) return;
    const cards = [...upgradeGrid.querySelectorAll(".upgrade")];
    cards.forEach((card, index) => {
      card.classList.toggle("selected", index === upgradeChoiceState.selectedIndex);
    });
  }

  function moveUpgradeSelection(delta) {
    if (!upgradeChoiceState || !upgradeChoiceState.choices.length) return false;
    const total = upgradeChoiceState.choices.length;
    upgradeChoiceState.selectedIndex = (upgradeChoiceState.selectedIndex + delta + total) % total;
    syncUpgradeChoiceSelection();
    if (window.SoundSystem) SoundSystem.play("ui_hover", { playbackRate: 1.02, cooldownMs: 0 });
    return true;
  }

  function confirmUpgradeSelection() {
    if (!upgradeChoiceState || !upgradeChoiceState.choices.length) return false;
    const choice = upgradeChoiceState.choices[upgradeChoiceState.selectedIndex];
    if (!choice || typeof upgradeChoiceState.onPick !== "function") return false;
    upgradeChoiceState.onPick(choice);
    return true;
  }

  function triggerUpgradeReroll() {
    if (!upgradeChoiceState || typeof upgradeChoiceState.onReroll !== "function" || upgradeChoiceState.rerollUsed) return false;
    upgradeChoiceState.onReroll();
    return true;
  }

  function handleUpgradeKey(code) {
    if (!upgradeChoiceState) return false;
    if (["ArrowLeft", "KeyA", "ArrowUp", "KeyW"].includes(code)) return moveUpgradeSelection(-1);
    if (["ArrowRight", "KeyD", "ArrowDown", "KeyS"].includes(code)) return moveUpgradeSelection(1);
    if (["Enter", "NumpadEnter"].includes(code)) return confirmUpgradeSelection();
    if (code === "Space") return triggerUpgradeReroll();
    return false;
  }

  function renderUpgradeChoices(choices, onPick, options = {}) {
    upgradeChoiceState = {
      choices: choices.slice(),
      onPick,
      onReroll: options.onReroll || null,
      rerollUsed: !!options.rerollUsed,
      selectedIndex: Math.max(0, Math.min(choices.length - 1, options.selectedIndex || 0))
    };
    if (upgradeRerollBtn) {
      const rerollAvailable = !!options.onReroll && !options.rerollUsed;
      upgradeRerollBtn.disabled = !rerollAvailable;
      upgradeRerollBtn.textContent = rerollAvailable ? "Reroll Choices" : "Reroll Used";
      upgradeRerollBtn.onclick = rerollAvailable ? () => options.onReroll() : null;
    }
    upgradeGrid.innerHTML = "";
    for (const choice of choices) {
      const typeMeta = getUpgradeTypeMeta(choice);
      const el = document.createElement("div");
      el.className = `upgrade ${typeMeta.className}`;
      el.innerHTML = `<div class="upgradeType">${typeMeta.label}</div><h3>${choice.name}</h3><p>${choice.desc}</p>`;
      const playHover = () => {
        if (window.SoundSystem) SoundSystem.play("ui_hover");
      };
      el.onmouseenter = playHover;
      el.onpointerenter = playHover;
      el.onmousemove = () => {
        if (!upgradeChoiceState) return;
        upgradeChoiceState.selectedIndex = choices.indexOf(choice);
        syncUpgradeChoiceSelection();
      };
      el.onclick = () => {
        if (window.SoundSystem) SoundSystem.play("upgrade_pick");
        onPick(choice);
      };
      upgradeGrid.appendChild(el);
    }
    syncUpgradeChoiceSelection();
  }

  function bindButtons({ onStart, onPracticeBoss, onPracticeStage, onPracticeEnemy, onRetry, onBack, onBossChange, onSpawnBoss, onPracticeTypeChange, onApplyStageTest, onApplyEnemyTest, onDifficultyChange, onPlayerTypeChange, onEffectQualityChange, onAutoFireChange, onAutoAimChange, onMovementModeChange, onPauseToggle, onPauseAdjustUpgrade, onPauseResetUpgrades, onPauseClearUpgrades }) {
    document.getElementById("btnStart").onclick = onStart;
    document.getElementById("btnPracticeBoss").onclick = onPracticeBoss;
    document.getElementById("btnPracticeStage").onclick = onPracticeStage;
    const practiceEnemyBtn = document.getElementById("btnPracticeEnemy");
    if (practiceEnemyBtn) practiceEnemyBtn.onclick = onPracticeEnemy;
    document.getElementById("btnRetry").onclick = onRetry;
    document.getElementById("btnBack").onclick = onBack;
    if (pauseBtn) pauseBtn.onclick = () => onPauseToggle && onPauseToggle();
    if (resumePauseBtn) resumePauseBtn.onclick = () => onPauseToggle && onPauseToggle(false);
    if (nextStageBtn) nextStageBtn.onclick = resolveStageClear;
    if (bossSelect) bossSelect.onchange = () => onBossChange && onBossChange(bossSelect.value);
    if (spawnBossBtn) spawnBossBtn.onclick = () => onSpawnBoss && onSpawnBoss();
    if (applyStageTestBtn) applyStageTestBtn.onclick = () => onApplyStageTest && onApplyStageTest({
      stageId: Number(stageSelect && stageSelect.value) || 1,
      durationSec: Number(stageDurationInput && stageDurationInput.value) || 180
    });
    if (applyEnemyTestBtn) applyEnemyTestBtn.onclick = () => onApplyEnemyTest && onApplyEnemyTest({
      enemyTier: enemySelect && enemySelect.value,
      count: Number(enemyCountInput && enemyCountInput.value) || 3
    });
    for (const radio of practiceTypeEls){
      radio.onchange = () => {
        if (radio.checked && onPracticeTypeChange) onPracticeTypeChange(radio.value);
      };
    }
    for (const radio of difficultyEls){
      radio.onchange = () => {
        if (radio.checked && onDifficultyChange) onDifficultyChange(radio.value);
      };
    }
    for (const radio of playerTypeEls){
      radio.onchange = () => {
        if (radio.checked && onPlayerTypeChange) onPlayerTypeChange(radio.value);
      };
    }
    for (const radio of effectQualityEls){
      radio.onchange = () => {
        if (radio.checked && onEffectQualityChange) onEffectQualityChange(radio.value);
      };
    }
    for (const radio of autoFireEls){
      radio.onchange = () => {
        if (radio.checked && onAutoFireChange) onAutoFireChange(radio.value === "true");
      };
    }
    for (const radio of autoAimEls){
      radio.onchange = () => {
        if (radio.checked && onAutoAimChange) onAutoAimChange(radio.value === "true");
      };
    }
    for (const radio of movementModeEls){
      radio.onchange = () => {
        if (radio.checked && onMovementModeChange) onMovementModeChange(radio.value);
      };
    }
    if (closeSkillMapBtn) closeSkillMapBtn.onclick = closeSkillMapPanel;
    if (skillMapPanel) {
      skillMapPanel.onclick = (e) => {
        if (e.target === skillMapPanel) closeSkillMapPanel();
      };
    }
    for (const slotEl of activeSlotEls){
      const nameBtn = slotEl.querySelector(".slotNameBtn");
      if (nameBtn) {
        nameBtn.onclick = () => openSkillMapPanel(slotEl.dataset.key);
      }
    }
    for (const radio of weaponRadioEls){
      radio.onchange = () => {
        if (radio.checked) CombatSystem.setWeaponType(radio.value);
      };
    }
    renderPauseMenu(onPauseAdjustUpgrade, onPauseResetUpgrades, onPauseClearUpgrades);
  }

  return {
    hudUpdate,
    showCard,
    showGameOver,
    handleUpgradeKey,
    triggerBossWarning,
    playBossWarning,
    showStageStart,
    showStageClear,
    openDialogueOverlay,
    createDialogueCard,
    showDialogueLine,
    commitDialogueLine,
    closeDialogueOverlay,
    resetDialogueLog,
    renderUpgradeChoices,
    renderPauseMenu,
    openSkillMapPanel,
    closeSkillMapPanel,
    bindButtons,
    flashActiveSlot,
    showActiveSlotHint,
    populateBossOptions
  };
})();
