window.Boot = (() => {
  const S = GameState;
  let resizeRaf = 0;

  function addShake(v){ S.shake = Math.min(24, S.shake + v); }

  function removeDisplayObject(node) {
    if (node && node.parent) node.parent.removeChild(node);
  }

  function resetInputState() {
    S.keys.clear();
    S.mouse.down = false;
  }

  function clearCombatState(options = {}) {
    const preservePlayer = options.preservePlayer !== false;
    const preserveEnvironment = !!options.preserveEnvironment;

    resetInputState();

    if (S.weaponState.laserChannel) {
      removeDisplayObject(S.weaponState.laserChannel.beam && S.weaponState.laserChannel.beam.spr);
      S.weaponState.laserChannel = null;
    }

    for (const decoy of S.decoys) removeDisplayObject(decoy && decoy.spr);
    for (const drone of (S.activeSkillState.escortDrones || [])) removeDisplayObject(drone && drone.spr);
    for (const turret of (S.activeSkillState.deployTurrets || [])) removeDisplayObject(turret && turret.spr);
    for (const smoke of S.smokeClouds) removeDisplayObject(smoke && smoke.spr);
    for (const field of S.slowFields) removeDisplayObject(field && field.spr);
    for (const hazard of S.hazards) removeDisplayObject(hazard && hazard.spr);
    for (const mine of S.mines) removeDisplayObject(mine && mine.spr);
    for (const bullet of S.bullets) removeDisplayObject(bullet && bullet.spr);
    for (const bullet of S.enemyBullets) removeDisplayObject(bullet && bullet.spr);
    for (const beam of S.beams) removeDisplayObject(beam && beam.spr);
    for (const missile of S.missiles) removeDisplayObject(missile && missile.spr);
    for (const particle of S.particles) removeDisplayObject(particle && particle.spr);

    for (const enemy of S.enemies) {
      if (enemy && enemy.scheduler && typeof enemy.scheduler.clear === "function") {
        enemy.scheduler.clear();
      }
      if (enemy && typeof enemy.destroyVisuals === "function") enemy.destroyVisuals();
      else removeDisplayObject(enemy && enemy.spr);
    }

    S.decoys.length = 0;
    S.smokeClouds.length = 0;
    S.slowFields.length = 0;
    S.hazards.length = 0;
    S.mines.length = 0;
    S.bullets.length = 0;
    S.enemyBullets.length = 0;
    S.beams.length = 0;
    S.missiles.length = 0;
    S.enemies.length = 0;
    S.particles.length = 0;

    if (!preserveEnvironment) {
      if (window.PlanetSystem) PlanetSystem.clear();
      if (window.StageAtmosphere) StageAtmosphere.clear();
    }

    if (preservePlayer && S.player) {
      S.player.vx = 0;
      S.player.vy = 0;
      S.player.fireCd = 0;
      S.player.dashT = 0;
    }

    S.progression.waveAlive = 0;
    S.progression.spawnedCount = 0;
    S.progression.spawnT = 0;
    S.stats.hardpointCooldown = 0;
    S.stats.homingMissileCd = 0;
    S.stats.slowFieldCooldown = 0;
    S.activeSkillState.escortDrones = [];
    S.activeSkillState.deployTurrets = [];
  }

  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingStatus = document.getElementById("loadingStatus");
  const loadingBarFill = document.getElementById("loadingBarFill");
  const loadingPercent = document.getElementById("loadingPercent");
  const loadingCount = document.getElementById("loadingCount");

  function updateLoadingUi(completed, total, item = null) {
    const safeTotal = Math.max(1, total || 1);
    const percent = Math.round((completed / safeTotal) * 100);
    if (loadingBarFill) loadingBarFill.style.width = `${percent}%`;
    if (loadingPercent) loadingPercent.textContent = `${percent}%`;
    if (loadingCount) loadingCount.textContent = `${completed} / ${total || 0}`;
    if (loadingStatus) {
      loadingStatus.textContent = item
        ? `Caching ${item.kind}: ${item.src.split("/").pop()}`
        : "Preparing resource cache...";
    }
  }

  function hideLoadingUi() {
    if (loadingOverlay) loadingOverlay.classList.add("hidden");
  }

  function canTogglePause() {
    return ["running", "paused"].includes(S.progression.waveState);
  }

  function handlePauseUpgradeAdjust(id, delta) {
    if (!S.stats.practice || !window.SkillSystem) return false;
    const upgrade = SkillSystem.getUpgradeById(id);
    if (!upgrade || typeof upgrade.maxLevel !== "number") return false;
    const currentLevel = S.upgrades.levels[id] || 0;
    const nextLevel = Math.max(0, Math.min(upgrade.maxLevel, currentLevel + delta));
    if (nextLevel === currentLevel) return false;
    const changed = SkillSystem.setUpgradeLevel(id, nextLevel);
    if (!changed) return false;
    UI.renderPauseMenu(handlePauseUpgradeAdjust, resetPauseUpgrades, clearPauseUpgrades);
    UI.hudUpdate();
    return true;
  }

  function resetPauseUpgrades() {
    if (!S.stats.practice) return false;
    const starting = (GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_UPGRADES) || [];
    if (!window.SkillSystem) return false;
    SkillSystem.rebuildUpgradeState(starting.slice(), {
      keepTestActives: true,
      keepExistingSlots: false
    });
    S.mouse.down = false;
    UI.renderPauseMenu(handlePauseUpgradeAdjust, resetPauseUpgrades, clearPauseUpgrades);
    UI.hudUpdate();
    return true;
  }

  function clearPauseUpgrades() {
    if (!S.stats.practice || !window.SkillSystem) return false;
    SkillSystem.rebuildUpgradeState([], {
      keepTestActives: false,
      keepExistingSlots: false
    });
    for (const slot of S.activeSkillState.slots) {
      slot.skillId = null;
      slot.cooldown = 0;
      slot.autoCast = false;
    }
    S.activeSkillState.ownedSkillIds = [];
    S.mouse.down = false;
    UI.renderPauseMenu(handlePauseUpgradeAdjust, resetPauseUpgrades, clearPauseUpgrades);
    UI.hudUpdate();
    return true;
  }

  function setPauseState(open) {
    if (!canTogglePause()) return false;
    const shouldOpen = typeof open === "boolean" ? open : S.progression.waveState !== "paused";
    if (shouldOpen) {
      resetInputState();
      S.progression.waveState = "paused";
      S.pause.open = true;
      UI.renderPauseMenu(handlePauseUpgradeAdjust, resetPauseUpgrades, clearPauseUpgrades);
      UI.showCard("pause");
      UI.hudUpdate();
      return true;
    }
    resetInputState();
    S.progression.waveState = "running";
    S.pause.open = false;
    if (window.ActiveSkillSystem && typeof ActiveSkillSystem.resetEscortDrones === "function") {
      ActiveSkillSystem.resetEscortDrones();
    }
    UI.showCard(null);
    UI.hudUpdate();
    return true;
  }

  function primeAudioSystems() {
    if (window.SoundSystem) SoundSystem.prime();
    if (window.BgmSystem) BgmSystem.prime();
  }

  function shouldRestoreAudioPrime() {
    try {
      return sessionStorage.getItem("spike-zero-audio-activated") === "1";
    } catch (_) {
      return false;
    }
  }

  function normalizePracticeStageId(stageId) {
    const maxStage = window.WaveSystem && WaveSystem.getMaxStage ? WaveSystem.getMaxStage() : 3;
    const parsedStageId = Math.floor(Number(stageId) || 1);
    if (window.WaveSystem && WaveSystem.isMapTestStageId && WaveSystem.isMapTestStageId(parsedStageId)) {
      return parsedStageId;
    }
    return Math.min(maxStage, Math.max(1, parsedStageId));
  }

  function normalizePracticeEnemyTier(value) {
    const options = window.EnemySystem && EnemySystem.getPracticeEnemyOptions
      ? EnemySystem.getPracticeEnemyOptions().map((entry) => entry.id)
      : ["normal"];
    return options.includes(value) ? value : options[0];
  }

  function normalizePracticeEnemyCount(value) {
    return Math.max(1, Math.min(12, Math.floor(Number(value) || 3)));
  }

  function normalizeDifficulty(value) {
    return ["easy", "normal", "hard"].includes(value) ? value : "normal";
  }

  function normalizePlayerType(value) {
    return ["standard", "power", "agility"].includes(value) ? value : "standard";
  }

  function normalizeEffectQuality(value) {
    return value === "high" ? "high" : "standard";
  }

  function normalizeAutoFire(value) {
    return value === false || value === "false" || value === "manual" || value === "off"
      ? false
      : true;
  }

  function normalizeAutoAim(value) {
    return value === true || value === "true" || value === "on" || value === "assist";
  }

  function readStoredPlayerType() {
    try {
      return normalizePlayerType(localStorage.getItem("spike-zero-player-type") || S.playerType || "standard");
    } catch (_) {
      return normalizePlayerType(S.playerType || "standard");
    }
  }

  function setPlayerType(value) {
    S.playerType = normalizePlayerType(value);
    try {
      localStorage.setItem("spike-zero-player-type", S.playerType);
    } catch (_) {}
    return S.playerType;
  }

  function readStoredEffectQuality() {
    try {
      return normalizeEffectQuality(localStorage.getItem("spike-zero-effect-quality") || S.effectQuality || "standard");
    } catch (_) {
      return normalizeEffectQuality(S.effectQuality || "standard");
    }
  }

  function setEffectQuality(value) {
    S.effectQuality = normalizeEffectQuality(value);
    try {
      localStorage.setItem("spike-zero-effect-quality", S.effectQuality);
    } catch (_) {}
    return S.effectQuality;
  }

  function readStoredAutoFire() {
    try {
      return normalizeAutoFire(localStorage.getItem("spike-zero-auto-fire"));
    } catch (_) {
      return normalizeAutoFire(S.autoFire);
    }
  }

  function setAutoFire(value) {
    S.autoFire = normalizeAutoFire(value);
    try {
      localStorage.setItem("spike-zero-auto-fire", S.autoFire ? "true" : "false");
    } catch (_) {}
    return S.autoFire;
  }

  function readStoredAutoAim() {
    try {
      return normalizeAutoAim(localStorage.getItem("spike-zero-auto-aim"));
    } catch (_) {
      return normalizeAutoAim(S.autoAim);
    }
  }

  function setAutoAim(value) {
    S.autoAim = normalizeAutoAim(value);
    try {
      localStorage.setItem("spike-zero-auto-aim", S.autoAim ? "true" : "false");
    } catch (_) {}
    return S.autoAim;
  }

  function applyPlayerTypeStats(playerType) {
    if (window.PlayerFactory && typeof PlayerFactory.applyShipStats === "function") {
      PlayerFactory.applyShipStats(S.stats, normalizePlayerType(playerType));
    }
  }

  function getLaunchOptions() {
    const params = new URLSearchParams(window.location.search);
    const playerType = normalizePlayerType(params.get("player") || params.get("ship") || readStoredPlayerType());
    return {
      autostartPlay: params.get("autostart") === "play",
      difficulty: normalizeDifficulty(params.get("difficulty") || S.difficulty || "normal"),
      playerType,
      effectQuality: normalizeEffectQuality(params.get("effects") || params.get("quality") || readStoredEffectQuality()),
      autoFire: normalizeAutoFire(params.get("autofire") || readStoredAutoFire()),
      autoAim: normalizeAutoAim(params.get("autoaim") || readStoredAutoAim())
    };
  }

  function initializeArena() {
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    const arenaWidth = Math.max(Math.round(w * 1.35), w + 280);
    const arenaHeight = Math.max(Math.round(h * 1.3), h + 220);
    S.arena.width = arenaWidth;
    S.arena.height = arenaHeight;
    S.arena.left = Math.round((w - arenaWidth) * 0.5);
    S.arena.top = Math.round((h - arenaHeight) * 0.5);
    if (!S.camera) S.camera = { x: w * 0.5, y: h * 0.5 };
    S.camera.x = w * 0.5;
    S.camera.y = h * 0.5;
  }

  function updateMouseWorldCoordinates() {
    const screenX = S.mouse.screenX != null ? S.mouse.screenX : (S.app.renderer.width * 0.5);
    const screenY = S.mouse.screenY != null ? S.mouse.screenY : (S.app.renderer.height * 0.5);
    const worldPoint = Helpers.screenToWorld(screenX, screenY);
    S.mouse.x = worldPoint.x;
    S.mouse.y = worldPoint.y;
  }

  function updateCameraTransform(dt = 1) {
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    const player = S.player;
    const arena = Helpers.getArenaBounds();
    if (!player) {
      S.world.x = 0;
      S.world.y = 0;
      return;
    }

    const minCameraX = arena.left + w * 0.5;
    const maxCameraX = arena.right - w * 0.5;
    const minCameraY = arena.top + h * 0.5;
    const maxCameraY = arena.bottom - h * 0.5;
    const desiredX = Helpers.clamp(player.spr.x, minCameraX, maxCameraX);
    const desiredY = Helpers.clamp(player.spr.y, minCameraY, maxCameraY);

    S.camera.x = Helpers.lerp(S.camera.x || desiredX, desiredX, Math.min(1, 0.1 * dt));
    S.camera.y = Helpers.lerp(S.camera.y || desiredY, desiredY, Math.min(1, 0.1 * dt));

    const shakeX = S.shake > 0.01 ? Helpers.rand(-S.shake, S.shake) : 0;
    const shakeY = S.shake > 0.01 ? Helpers.rand(-S.shake, S.shake) : 0;
    S.world.x = Math.round((w * 0.5) - S.camera.x + shakeX);
    S.world.y = Math.round((h * 0.5) - S.camera.y + shakeY);
  }

  function resetAll(options=false){
    const testMode = typeof options === "boolean" ? options : !!options.testMode;
    const practiceMode = typeof options === "object" && options
      ? (options.practiceMode || (testMode ? "boss" : "none"))
      : (testMode ? "boss" : "none");
    const requestedStageId = typeof options === "object" && options ? (options.practiceStageId || S.practiceStageId || 1) : (S.practiceStageId || 1);
    const practiceStageId = normalizePracticeStageId(requestedStageId);
    const practiceStageDurationSec = typeof options === "object" && options
      ? Math.max(10, Math.floor(options.practiceStageDurationSec || S.practiceStageDurationSec || 180))
      : Math.max(10, Math.floor(S.practiceStageDurationSec || 180));
    const practiceEnemyTier = typeof options === "object" && options
      ? normalizePracticeEnemyTier(options.practiceEnemyTier || S.practiceEnemyTier || "normal")
      : normalizePracticeEnemyTier(S.practiceEnemyTier || "normal");
    const practiceEnemyCount = typeof options === "object" && options
      ? normalizePracticeEnemyCount(options.practiceEnemyCount || S.practiceEnemyCount || 3)
      : normalizePracticeEnemyCount(S.practiceEnemyCount || 3);
    const spawnPracticeEnemies = typeof options === "object" && options
      ? options.spawnPracticeEnemies === true
      : false;
    const difficulty = typeof options === "object" && options
      ? normalizeDifficulty(options.difficulty || S.difficulty || "normal")
      : normalizeDifficulty(S.difficulty || "normal");
    const playerType = typeof options === "object" && options
      ? setPlayerType(options.playerType || S.playerType || readStoredPlayerType())
      : setPlayerType(S.playerType || readStoredPlayerType());
    if (window.DialogueSystem) DialogueSystem.cancel();
    if (window.UI) UI.resetDialogueLog();
    if (window.BgmSystem) BgmSystem.stopAll();
    clearCombatState({ preservePlayer: false });

    S.stats.maxHp = 100;
    S.stats.hp = 100;
    S.stats.speed = GAME_BALANCE.PLAYER.MOVE_SPEED;
    S.stats.dashSpeed = GAME_BALANCE.PLAYER.DASH_SPEED;
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
    S.stats.mp = GAME_BALANCE.PLAYER.MP_MAX;
    S.stats.mpMax = GAME_BALANCE.PLAYER.MP_MAX;
    S.stats.mpRegen = GAME_BALANCE.PLAYER.MP_REGEN;
    S.stats.regen = 0;
    S.stats.shield = 0;
    S.stats.shieldMax = 0;
    S.stats.shieldRegen = 0;
    S.stats.shieldRegenDelay = 0;
    S.stats.shieldRegenDelayMax = GAME_BALANCE.PLAYER.SHIELD_REGEN_DELAY_MAX;
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
    applyPlayerTypeStats(playerType);
    S.stats.practice = !!testMode;
    S.stats.practiceMode = practiceMode;
    S.practiceStageId = practiceStageId;
    S.practiceStageDurationSec = practiceStageDurationSec;
    S.practiceEnemyTier = practiceEnemyTier;
    S.practiceEnemyCount = practiceEnemyCount;
    S.difficulty = difficulty;

    S.progression.score = 0;
    S.progression.combo = 1;
    S.progression.comboT = 0;
    S.progression.stage = practiceMode === "stage" ? practiceStageId : 1;
    S.progression.stageDuration = practiceStageDurationSec * 60;
    S.progression.stageTime = S.progression.stageDuration;
    S.progression.stageState = practiceMode === "enemy" ? "enemytest" : "combat";
    S.progression.wave = practiceMode === "enemy" ? 0 : 1;
    S.progression.waveAlive = 0;
    S.progression.waveTarget = practiceMode === "enemy" ? 0 : 8;
    S.progression.waveState = "running";
    S.progression.spawnT = 0;
    S.progression.spawnedCount = 0;
    S.progression.level = 1;
    S.progression.xp = 0;
    S.progression.xpToNext = GAME_BALANCE.XP.BASE_TO_NEXT;
    S.progression.pendingLevelUps = 0;
    S.progression.levelUpRerollUsed = false;
    S.progression.deathTimer = 0;

    S.upgrades.levels = {};
    S.upgrades.pickedIds = [];
    S.upgrades.categoryCounts.weapon = 0;
    S.upgrades.categoryCounts.passive = 0;
    S.upgrades.categoryCounts.active = 0;

    S.shake = 0;
    if (window.HazardSystem && HazardSystem.resetTimer) {
      HazardSystem.resetTimer();
    } else {
      S.hazardTimer = Helpers.randi(360, 560);
    }
    S.activeSkillState.boostDirection = "forward";
    S.activeSkillState.boostDir = 0;
    S.activeSkillState.boostDrag = 0.9;
    S.activeSkillState.boostMitigationT = 0;
    S.activeSkillState.boostMitigationMul = 1;
    S.activeSkillState.boostT = 0;
    S.activeSkillState.afterburnerT = 0;
    S.activeSkillState.escortDrones = [];
    S.activeSkillState.deployTurrets = [];
    S.activeSkillState.stealthT = 0;
    S.activeSkillState.stealthAlpha = 1;
    S.activeSkillState.stealthLastKnownX = 0;
    S.activeSkillState.stealthLastKnownY = 0;
    S.weaponState.laserChannel = null;
    initializeArena();

    if (S.player) S.uiLayer.removeChild(S.player.spr);
    S.player = PlayerFactory.makePlayer(playerType);
    if (S.player && S.player.spr) {
      S.player.spr.x = S.app.renderer.width * 0.5;
      S.player.spr.y = S.app.renderer.height * 0.5;
    }
    updateMouseWorldCoordinates();
    updateCameraTransform();
    CombatSystem.applyStartingWeaponLoadout(testMode);
    CombatSystem.syncWeaponStats();
    ActiveSkillSystem.assignStartingLoadout(testMode);
    SkillSystem.applyStartingLoadout(testMode);

    if (testMode && practiceMode === "boss") {
      WaveSystem.startNextWave();
    } else if (testMode && practiceMode === "stage") {
      WaveSystem.startStage(practiceStageId, { stageDurationFrames: practiceStageDurationSec * 60 });
    } else if (testMode && practiceMode === "enemy") {
      if (window.BackgroundRenderer) BackgroundRenderer.drawBackground();
      if (window.StageAtmosphere) StageAtmosphere.clear();
      if (window.PlanetSystem) PlanetSystem.clear();
    } else {
      WaveSystem.startStage(1);
    }
    if (testMode && practiceMode === "boss" && window.BossSystem) BossSystem.spawnSelectedPracticeBoss();
    if (testMode && practiceMode === "enemy" && spawnPracticeEnemies && window.EnemySystem && EnemySystem.spawnPracticeEnemies) {
      EnemySystem.spawnPracticeEnemies(practiceEnemyTier, practiceEnemyCount);
    }
    if (window.BgmSystem) BgmSystem.refresh();
    S.pause.open = false;
    UI.hudUpdate();
    UI.showCard(null);
  }

  function gameOver(){
    if (S.progression.waveState === "dying" || S.progression.waveState === "idle") return;

    S.progression.waveState = "dying";
    S.progression.deathTimer = 28;
    resetInputState();

    if (S.weaponState.laserChannel){
      removeDisplayObject(S.weaponState.laserChannel.beam.spr);
      S.weaponState.laserChannel = null;
    }

    if (S.player && S.player.spr){
      Effects.emitPlayerExplosion(S.player.spr.x, S.player.spr.y);
      S.player.spr.visible = false;
    }

    if (window.SoundSystem) {
      SoundSystem.play("player_death", { playbackRate: 0.8 });
      SoundSystem.play("low_explosion", { playbackRate: 0.68, volume: 0.42, cooldownMs: 0 });
      SoundSystem.play("debris_glass", { playbackRate: 0.82, volume: 0.2, cooldownMs: 0 });
    }
    addShake(16);
  }

  function bindInput(){
    window.addEventListener("keydown", (e)=>{
      if (window.SoundSystem) SoundSystem.prime();
      if (window.BgmSystem) BgmSystem.prime();
      if (
        S.progression.waveState === "dialogue" &&
        ["Space", "Enter", "NumpadEnter", "Escape"].includes(e.code)
      ) {
        if (window.DialogueSystem) DialogueSystem.skip();
        e.preventDefault();
        return;
      }
      if (S.progression.waveState === "levelup" && window.UI && UI.handleUpgradeKey && UI.handleUpgradeKey(e.code)) {
        e.preventDefault();
        return;
      }
      if (["Escape", "KeyP"].includes(e.code) && canTogglePause()) {
        setPauseState();
        e.preventDefault();
        return;
      }
      if (S.progression.waveState === "paused") {
        e.preventDefault();
        return;
      }
      S.keys.add(e.code);
      if (e.code === "KeyC") {
        if (window.ActiveSkillSystem && ActiveSkillSystem.cycleBoostDirection && ActiveSkillSystem.cycleBoostDirection()) {
          e.preventDefault();
          return;
        }
      }
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Digit1") ActiveSkillSystem.tryUseBoostDirection("forward");
      if (e.code === "Digit2") ActiveSkillSystem.tryUseBoostDirection("left");
      if (e.code === "Digit3") ActiveSkillSystem.tryUseBoostDirection("right");
      if (e.code === "Digit4") ActiveSkillSystem.tryUseBoostDirection("back");
      ActiveSkillSystem.tryUseSlotByKey(e.code);
    }, { passive:false });

    window.addEventListener("keyup", (e)=>S.keys.delete(e.code));
    window.addEventListener("blur", resetInputState);
    window.addEventListener("pointercancel", resetInputState);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) resetInputState();
    });

    S.app.view.addEventListener("pointermove", (e)=>{
      const rect = S.app.view.getBoundingClientRect();
      S.mouse.screenX = (e.clientX - rect.left) * (S.app.renderer.width / rect.width);
      S.mouse.screenY = (e.clientY - rect.top) * (S.app.renderer.height / rect.height);
      updateMouseWorldCoordinates();
    });

    S.app.view.addEventListener("pointerdown", ()=>{
      if (window.SoundSystem) SoundSystem.prime();
      if (window.BgmSystem) BgmSystem.prime();
      S.mouse.down = true;
    });
    window.addEventListener("pointerup", ()=>{ S.mouse.down = false; });
  }

  function resize(){
    if (!S.app || !S.app.renderer) return;
    S.app.renderer.resize(window.innerWidth, window.innerHeight);
    if (S.app.view) {
      S.app.view.style.width = "100%";
      S.app.view.style.height = "100%";
      S.app.view.style.display = "block";
    }
    initializeArena();
    if (S.player && S.player.spr) {
      const arena = Helpers.getArenaBounds();
      S.player.spr.x = Helpers.clamp(S.player.spr.x, arena.left + 20, arena.right - 20);
      S.player.spr.y = Helpers.clamp(S.player.spr.y, arena.top + 20, arena.bottom - 20);
    }
    updateMouseWorldCoordinates();
    updateCameraTransform();
    BackgroundRenderer.drawBackground();
    if (window.StageAtmosphere) StageAtmosphere.resize();
  }

  function scheduleResizeRefresh() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resize();
    resizeRaf = requestAnimationFrame(() => {
      resize();
      resizeRaf = requestAnimationFrame(() => {
        resize();
        resizeRaf = 0;
      });
    });
  }

  function doDash(){
    const p = S.player;
    if (p.dashT > 0) return;
    if (S.stats.dashCd > 0) return;
    if (!(S.keys.has("ShiftLeft") || S.keys.has("ShiftRight"))) return;

    let dx = 0;
    let dy = 0;
    if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) dx -= 1;
    if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) dx += 1;
    if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) dy -= 1;
    if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) dy += 1;

    if (dx === 0 && dy === 0){
      const ang = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    } else {
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
    }

    p.vx += dx * S.stats.dashSpeed;
    p.vy += dy * S.stats.dashSpeed;
    p.inv = 18;
    p.dashT = 10;
    S.stats.dashCd = S.stats.dashCdMax;
    addShake(8);
    Effects.emitParticle(p.spr.x, p.spr.y, 0x8a5cff, 18, 1.3);
  }

  function updatePlayer(dt){
    const p = S.player;

    if (p.fireCd > 0) p.fireCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (S.stats.dashCd > 0) S.stats.dashCd -= dt;

    if (p.shieldSpr){
      const ratio = S.stats.shieldMax > 0 ? Helpers.clamp(S.stats.shield / S.stats.shieldMax, 0, 1) : 0;
      p.shieldSpr.alpha = ratio > 0.01 ? (0.07 + ratio * 0.22) : 0;
      const pulse = 1 + Math.sin(performance.now() / 240) * 0.015;
      p.shieldSpr.scale.set(pulse + ratio * 0.025);
    }

    let ax = 0;
    let ay = 0;
    if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) ax -= 1;
    if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) ax += 1;
    if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) ay -= 1;
    if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) ay += 1;

    if (ax !== 0 || ay !== 0){
      const m = Math.hypot(ax, ay) || 1;
      ax /= m;
      ay /= m;
    }

    doDash();

    const afterburnerSkill = ActiveSkillSystem.getDefinition("afterburner");
    const afterburnerActive = S.activeSkillState.afterburnerT > 0 && afterburnerSkill;
    const afterburnerBoost = afterburnerActive
      ? afterburnerSkill.effectData.speedMultiplier
      : 1;
    const accel = S.stats.speed * afterburnerBoost * 0.9;
    p.vx = Helpers.lerp(p.vx, ax * accel, 0.18);
    p.vy = Helpers.lerp(p.vy, ay * accel, 0.18);
    if (S.activeSkillState.boostT > 0){
      p.vx *= S.activeSkillState.boostDrag;
      p.vy *= S.activeSkillState.boostDrag;
    }

    p.spr.x += p.vx * dt;
    p.spr.y += p.vy * dt;

    const arena = Helpers.getArenaBounds();
    p.spr.x = Helpers.clamp(p.spr.x, arena.left + 20, arena.right - 20);
    p.spr.y = Helpers.clamp(p.spr.y, arena.top + 20, arena.bottom - 20);
    if (window.PlanetSystem) PlanetSystem.resolveShipCollision(p, p.r);

    const ang = window.CombatSystem && CombatSystem.getPlayerAimAngle
      ? CombatSystem.getPlayerAimAngle({ maxStrength: 0.36 })
      : Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    p.spr.rotation = ang + Math.PI / 2;
    p.spr.tint = afterburnerActive ? 0xffc087 : 0xffffff;
    if (p.afterburnerSpr) {
      p.afterburnerSpr.alpha = afterburnerActive ? 0.72 + Math.sin(performance.now() / 55) * 0.12 : 0;
      const flameScale = afterburnerActive ? 1.08 + Math.sin(performance.now() / 70) * 0.08 : 1;
      p.afterburnerSpr.scale.set(flameScale, afterburnerActive ? 1.22 : 1);
    }
    p.engineTrailT = Math.max(0, (p.engineTrailT || 0) - dt);
    const moveSpeed = Math.hypot(p.vx, p.vy);
    const isMoving = (ax !== 0 || ay !== 0) && moveSpeed > 0.35;
    if (isMoving && p.engineTrailT <= 0 && S.particles.length < 180) {
      const emitAngle = Math.atan2(-p.vy, -p.vx);
      const rearBaseX = p.spr.x + Math.cos(emitAngle) * 18;
      const rearBaseY = p.spr.y + Math.sin(emitAngle) * 18;
      const sideX = -Math.sin(emitAngle);
      const sideY = Math.cos(emitAngle);
      const warmTint = afterburnerActive ? 0xffffff : 0xf3f7ff;
      const coolTint = afterburnerActive ? 0xdff8ff : 0xcfeeff;
      const trailScale = afterburnerActive ? Helpers.rand(0.62, 0.9) : Helpers.rand(0.42, 0.68);
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const tint = i === 0 ? warmTint : coolTint;
        const trail = Effects.makeTrailSprite(
          rearBaseX + sideX * side * 4 + Helpers.rand(-1.5, 1.5),
          rearBaseY + sideY * side * 4 + Helpers.rand(-1.5, 1.5),
          tint,
          trailScale,
          afterburnerActive ? 0.34 : 0.28,
          { kind: "linear" }
        );
        trail.rotation = emitAngle + Helpers.rand(-0.12, 0.12);
        S.fx.addChild(trail);
        S.particles.push({
          spr: trail,
          x: trail.x,
          y: trail.y,
          vx: Math.cos(emitAngle) * Helpers.rand(0.3, 0.72),
          vy: Math.sin(emitAngle) * Helpers.rand(0.3, 0.72),
          life: afterburnerActive ? Helpers.rand(16, 24) : Helpers.rand(12, 18),
          drag: 0.9
        });
      }
      const glow = Effects.makeTrailSprite(
        rearBaseX + Helpers.rand(-2, 2),
        rearBaseY + Helpers.rand(-2, 2),
        afterburnerActive ? 0xffffff : 0xeaf4ff,
        afterburnerActive ? Helpers.rand(0.38, 0.55) : Helpers.rand(0.26, 0.4),
        afterburnerActive ? 0.26 : 0.22
      );
      S.fx.addChild(glow);
      S.particles.push({
        spr: glow,
        x: glow.x,
        y: glow.y,
        vx: Math.cos(emitAngle) * Helpers.rand(0.08, 0.18),
        vy: Math.sin(emitAngle) * Helpers.rand(0.08, 0.18),
        life: afterburnerActive ? Helpers.rand(10, 16) : Helpers.rand(8, 12),
        drag: 0.88
      });
      p.engineTrailT = afterburnerActive ? 1.1 : 1.6;
    }
    if (afterburnerActive && ((performance.now() | 0) % 2 === 0)) {
      const rearX = p.spr.x - Math.cos(ang) * 18;
      const rearY = p.spr.y - Math.sin(ang) * 18;
      const sideX = -Math.sin(ang);
      const sideY = Math.cos(ang);
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const t = Effects.makeTrailSprite(
          rearX + sideX * side * 4,
          rearY + sideY * side * 4,
          side === -1 ? 0xff8a3d : 0x7df9ff,
          0.22,
          0.2,
          { kind: "linear" }
        );
        t.rotation = ang + Math.PI;
        S.fx.addChild(t);
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:-Math.cos(ang) * 0.25, vy:-Math.sin(ang) * 0.25, life:8, drag:0.9 });
      }
      if ((performance.now() | 0) % 4 === 0) {
        Effects.emitParticle(rearX, rearY, 0xffa24d, 3, 0.48);
      }
    }
    const stealthAlpha = S.activeSkillState.stealthT > 0
      ? S.activeSkillState.stealthAlpha + Math.sin(performance.now() / 90) * 0.06
      : 1;
    p.spr.alpha = Helpers.clamp(stealthAlpha, 0.22, 1);
    if (p.shieldSpr) p.shieldSpr.alpha *= p.spr.alpha;
  }

  function updateParticles(dt){
    for (let i=S.particles.length-1; i>=0; i--){
      const p = S.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag || 0.92;
      p.vy *= p.drag || 0.92;
      p.life -= dt;
      if (p.pulse){
        p.spr.x = p.x;
        p.spr.y = p.y;
        const progress = 1 - (p.life / (p.maxLife || 1));
        const pulseBaseRadius = 20;
        const targetRadius = Math.max(1, 1 + progress * p.pulseRadius);
        const scale = targetRadius / pulseBaseRadius;
        if (typeof p.spr.clear === "function") {
          p.spr.clear();
          p.spr.lineStyle(8, p.color || 0xffffff, (1 - progress) * 0.05);
          p.spr.drawCircle(0, 0, 1);
          p.spr.lineStyle(3, p.color || 0xffffff, (1 - progress) * 0.32);
          p.spr.drawCircle(0, 0, 1);
        }
        p.spr.scale.set(scale);
        p.spr.alpha = Math.max(0, 1 - progress);
      } else if (p.telegraphLine){
        const progress = 1 - (p.life / (p.maxLife || 1));
        const alpha = Math.max(0, 0.84 - progress * 0.72);
        const dx = p.telegraphLine.x2 - p.telegraphLine.x1;
        const dy = p.telegraphLine.y2 - p.telegraphLine.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const flicker = Math.sin(performance.now() * 0.024) * 0.5 + 0.5;
        p.spr.x = p.telegraphLine.x1;
        p.spr.y = p.telegraphLine.y1;
        p.spr.clear();
        p.spr.lineStyle(p.telegraphLine.width + 10, p.telegraphLine.color, alpha * 0.06);
        p.spr.moveTo(0, 0);
        p.spr.lineTo(dx, dy);
        p.spr.lineStyle(p.telegraphLine.width + 3, p.telegraphLine.color, alpha * 0.18);
        p.spr.moveTo(nx * 2, ny * 2);
        p.spr.lineTo(dx + nx * 2, dy + ny * 2);
        p.spr.moveTo(-nx * 2, -ny * 2);
        p.spr.lineTo(dx - nx * 2, dy - ny * 2);
        p.spr.lineStyle(p.telegraphLine.width, p.telegraphLine.color, alpha * (0.72 + flicker * 0.18));
        p.spr.moveTo(0, 0);
        p.spr.lineTo(dx, dy);
        p.spr.lineStyle(Math.max(1.25, p.telegraphLine.width * 0.22), 0xffffff, alpha * 0.92);
        p.spr.moveTo(0, 0);
        p.spr.lineTo(dx, dy);
      } else if (p.telegraphRing){
        const progress = 1 - (p.life / (p.maxLife || 1));
        const alpha = Math.max(0, 0.78 - progress * 0.62);
        const scale = 0.9 + progress * 0.16;
        p.spr.x = p.telegraphRing.x;
        p.spr.y = p.telegraphRing.y;
        p.spr.clear();
        p.spr.lineStyle(8, p.telegraphRing.color, alpha * 0.06);
        p.spr.drawCircle(0, 0, p.telegraphRing.radius * scale);
        p.spr.lineStyle(3, p.telegraphRing.color, alpha * 0.68);
        p.spr.beginFill(p.telegraphRing.color, alpha * 0.08);
        p.spr.drawCircle(0, 0, p.telegraphRing.radius * scale);
        p.spr.endFill();
        p.spr.lineStyle(1.5, 0xffffff, alpha * 0.75);
        p.spr.drawCircle(0, 0, p.telegraphRing.radius * scale * 0.96);
      } else if (p.slashArc){
        const progress = 1 - (p.life / (p.maxLife || 1));
        const alpha = Math.max(0, 0.8 - progress * 0.7);
        const radius = p.slashArc.radius * (0.96 + progress * 0.08);
        p.spr.x = p.slashArc.x;
        p.spr.y = p.slashArc.y;
        p.spr.clear();
        p.spr.lineStyle(p.slashArc.width + 8, p.slashArc.color, alpha * 0.08);
        p.spr.arc(0, 0, radius, p.slashArc.startAngle, p.slashArc.endAngle);
        p.spr.lineStyle(p.slashArc.width + 1, p.slashArc.color, alpha * 0.82);
        p.spr.arc(0, 0, radius, p.slashArc.startAngle, p.slashArc.endAngle);
        p.spr.lineStyle(Math.max(1.2, p.slashArc.width * 0.24), 0xffffff, alpha * 0.92);
        p.spr.arc(0, 0, radius, p.slashArc.startAngle, p.slashArc.endAngle);
      } else if (p.electricArc){
        const progress = 1 - (p.life / (p.maxLife || 1));
        const alpha = Math.max(0, 0.95 - progress * 0.72);
        const arc = p.electricArc;
        const dx = arc.x2 - arc.x1;
        const dy = arc.y2 - arc.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const segments = 6;
        p.spr.x = arc.x1;
        p.spr.y = arc.y1;
        p.spr.clear();

        let prevX = 0;
        let prevY = 0;
        p.spr.lineStyle(5, arc.color, alpha * 0.2);
        p.spr.moveTo(prevX, prevY);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const offset = i === segments ? 0 : Helpers.rand(-arc.jitter, arc.jitter) * (1 - Math.abs(0.5 - t) * 0.7);
          const px = dx * t + nx * offset;
          const py = dy * t + ny * offset;
          p.spr.lineTo(px, py);
        }

        prevX = 0;
        prevY = 0;
        p.spr.lineStyle(2.2, arc.color, alpha);
        p.spr.moveTo(prevX, prevY);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const offset = i === segments ? 0 : Helpers.rand(-arc.jitter, arc.jitter) * (1 - Math.abs(0.5 - t) * 0.7);
          const px = dx * t + nx * offset;
          const py = dy * t + ny * offset;
          p.spr.lineTo(px, py);
        }

        prevX = 0;
        prevY = 0;
        p.spr.lineStyle(1, arc.coreColor, alpha * 0.88);
        p.spr.moveTo(prevX, prevY);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const offset = i === segments ? 0 : Helpers.rand(-arc.jitter * 0.45, arc.jitter * 0.45);
          const px = dx * t + nx * offset;
          const py = dy * t + ny * offset;
          p.spr.lineTo(px, py);
        }
      } else {
        p.spr.x = p.x;
        p.spr.y = p.y;
        p.spr.alpha = Math.max(0, p.life / 36);
      }
      if (p.life <= 0){
        S.fx.removeChild(p.spr);
        S.particles.splice(i, 1);
      }
    }
  }

  function updateProgress(dt){
    const P = S.progression;
    const stageRunEnabled = !S.stats.practice || S.stats.practiceMode === "stage";

    if (S.stats.regen > 0 && S.stats.hp < S.stats.maxHp){
      S.stats.hp = Math.min(S.stats.maxHp, S.stats.hp + S.stats.regen * (dt / 60));
    }
    if (S.stats.mp < S.stats.mpMax){
      S.stats.mp = Math.min(S.stats.mpMax, S.stats.mp + S.stats.mpRegen * (dt / 60));
    }
    if (S.stats.shieldMax > 0){
      if (S.stats.shieldRegenDelay > 0){
        S.stats.shieldRegenDelay -= dt;
      } else if (S.stats.shield < S.stats.shieldMax && S.stats.shieldRegen > 0){
        S.stats.shield = Math.min(S.stats.shieldMax, S.stats.shield + S.stats.shieldRegen * (dt / 60));
      }
    }

    if (P.comboT > 0){
      P.comboT -= dt;
    } else {
      P.combo = Helpers.lerp(P.combo, 1, 0.06);
      if (P.combo < 1.02) P.combo = 1;
    }

    if (window.WaveSystem && WaveSystem.isAsteroidMapTestStage && WaveSystem.isAsteroidMapTestStage(P.stage)) {
      return;
    }

    if (stageRunEnabled && P.stageState === "combat" && !(window.BossSystem && BossSystem.hasActiveBoss())) {
      P.stageTime = Math.max(0, P.stageTime - dt);
      if (P.stageTime <= 0) {
        WaveSystem.triggerStageBoss();
        return;
      }
    }

    P.spawnT += dt;
    const suppressEnemySpawns = window.BossSystem && BossSystem.shouldSuppressEnemySpawns();
    if (!suppressEnemySpawns) {
      const difficulty = GAME_BALANCE.DIFFICULTY[S.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
      const spawnRate = Math.max(9, (46 - P.wave * 1.15) * (difficulty.spawnRateMultiplier || 1));
      while (P.spawnT >= spawnRate && P.spawnedCount < P.waveTarget){
        P.spawnT -= spawnRate;
        EnemySystem.spawnEnemy();
      }
    }

    if (stageRunEnabled && P.stageState === "boss" && (!window.BossSystem || !BossSystem.hasActiveBoss()) && S.enemies.length === 0){
      if (P.bossFinishTimer > 0) {
        P.bossFinishTimer = Math.max(0, P.bossFinishTimer - dt);
        return;
      }
      WaveSystem.completeStage();
      return;
    }

    if (P.stageState === "combat" && P.spawnedCount >= P.waveTarget && P.waveAlive <= 0 && S.enemies.length === 0){
      WaveSystem.completeCurrentWave();
    }
  }

  function tick(dt){
    if (S.shake > 0.01){
      S.shake *= 0.87;
    } else {
      S.shake = 0;
    }
    updateMouseWorldCoordinates();
    updateCameraTransform(dt);
    if (window.StageAtmosphere) StageAtmosphere.update(dt);

    if (S.progression.waveState === "dying"){
      updateParticles(dt);
      if (S.progression.deathTimer > 0){
        S.progression.deathTimer -= dt;
      } else {
        S.progression.waveState = "idle";
        UI.showGameOver();
      }
      return;
    }

    if (S.progression.waveState !== "running") return;

    updateProgress(dt);
    if (window.PlanetSystem && PlanetSystem.update) PlanetSystem.update(dt);
    updatePlayer(dt);
    updateCameraTransform(dt);
    if (window.DefenseSystem) DefenseSystem.update(dt);
    CombatSystem.tryShoot();
    CombatSystem.tryShootMissiles();
    ActiveSkillSystem.update(dt);
    if (window.HazardSystem) HazardSystem.update(dt);
    EnemySystem.updateEnemies(dt);
    EnemySystem.updateEnemyBullets(dt);
    CombatSystem.updateBullets(dt);
    CombatSystem.updateBeams(dt);
    CombatSystem.updateMissiles(dt);
    updateParticles(dt);
    if (window.BgmSystem) BgmSystem.refresh();
    UI.hudUpdate();
  }

  async function init(){
    S.app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true
    });

    document.getElementById("wrap").appendChild(S.app.view);
    S.app.view.style.width = "100%";
    S.app.view.style.height = "100%";
    S.app.view.style.display = "block";

    S.stage = S.app.stage;
    S.bgLayer = new PIXI.Container();
    S.world = new PIXI.Container();
    S.stage.addChild(S.bgLayer, S.world);

    S.bg = new PIXI.Container();
    S.fx = new PIXI.Container();
    S.uiLayer = new PIXI.Container();
    S.bgLayer.addChild(S.bg);
    S.world.addChild(S.fx, S.uiLayer);
    S.mouse.screenX = window.innerWidth * 0.5;
    S.mouse.screenY = window.innerHeight * 0.5;
    initializeArena();

    S.bgGfx = new PIXI.Graphics();
    S.bgDecor = new PIXI.Container();
    S.bg.addChild(S.bgGfx, S.bgDecor);

    resize();
    bindInput();

    if (shouldRestoreAudioPrime()) {
      primeAudioSystems();
    }

    if (window.ResourceLoader) {
      await ResourceLoader.preloadGroups(["common", "gameCritical"], ({ completed, total, item }) => {
        updateLoadingUi(completed, total, item);
      });
    }

    updateLoadingUi(1, 1, null);
    hideLoadingUi();

    if (window.ResourceLoader) {
      setTimeout(() => {
        ResourceLoader.preloadGroups(["stage1"]).catch(() => {});
      }, 0);
    }

    UI.bindButtons({
      onStart: ()=>{ primeAudioSystems(); resetAll({ difficulty:S.difficulty || "normal", playerType:S.playerType || readStoredPlayerType() }); },
      onPracticeBoss: ()=>{ primeAudioSystems(); resetAll({ testMode:true, practiceMode:"boss", playerType:S.playerType || readStoredPlayerType() }); },
      onPracticeStage: ()=>{ primeAudioSystems(); resetAll({ testMode:true, practiceMode:"stage", practiceStageId:S.practiceStageId || 1, practiceStageDurationSec:S.practiceStageDurationSec || 180, playerType:S.playerType || readStoredPlayerType() }); },
      onPracticeEnemy: ()=>{ primeAudioSystems(); resetAll({ testMode:true, practiceMode:"enemy", practiceEnemyTier:S.practiceEnemyTier || "normal", practiceEnemyCount:S.practiceEnemyCount || 3, spawnPracticeEnemies:false, playerType:S.playerType || readStoredPlayerType() }); },
      onRetry: ()=>{ primeAudioSystems(); resetAll(S.stats.practice
        ? { testMode:true, practiceMode:S.stats.practiceMode || "boss", practiceStageId:S.practiceStageId || 1, practiceStageDurationSec:S.practiceStageDurationSec || 180, practiceEnemyTier:S.practiceEnemyTier || "normal", practiceEnemyCount:S.practiceEnemyCount || 3, difficulty:S.difficulty || "normal", playerType:S.playerType || readStoredPlayerType() }
        : { difficulty:S.difficulty || "normal", playerType:S.playerType || readStoredPlayerType() }); },
      onBack: ()=>{
        if (window.DialogueSystem) DialogueSystem.cancel();
        UI.resetDialogueLog();
        window.location.href = "./index.html";
      },
      onBossChange: (bossId) => {
        if (!window.BossSystem) return;
        BossSystem.setPracticeBossId(bossId);
        UI.hudUpdate();
      },
      onSpawnBoss: () => {
        if (window.BossSystem) BossSystem.spawnSelectedPracticeBoss();
      },
      onPracticeTypeChange: (mode) => {
        primeAudioSystems();
        if (mode === "boss") resetAll({ testMode:true, practiceMode:"boss", playerType:S.playerType || readStoredPlayerType() });
        if (mode === "stage") resetAll({ testMode:true, practiceMode:"stage", practiceStageId:S.practiceStageId || 1, practiceStageDurationSec:S.practiceStageDurationSec || 180, playerType:S.playerType || readStoredPlayerType() });
        if (mode === "enemy") resetAll({ testMode:true, practiceMode:"enemy", practiceEnemyTier:S.practiceEnemyTier || "normal", practiceEnemyCount:S.practiceEnemyCount || 3, playerType:S.playerType || readStoredPlayerType() });
      },
      onDifficultyChange: (difficulty) => {
        S.difficulty = normalizeDifficulty(difficulty);
        UI.hudUpdate();
      },
      onPlayerTypeChange: (playerType) => {
        setPlayerType(playerType);
      },
      onEffectQualityChange: (effectQuality) => {
        setEffectQuality(effectQuality);
        UI.hudUpdate();
      },
      onAutoFireChange: (autoFire) => {
        setAutoFire(autoFire);
        UI.hudUpdate();
      },
      onAutoAimChange: (autoAim) => {
        setAutoAim(autoAim);
        UI.hudUpdate();
      },
      onPauseToggle: (open) => {
        setPauseState(open);
      },
      onPauseAdjustUpgrade: (id, delta) => {
        handlePauseUpgradeAdjust(id, delta);
      },
      onPauseResetUpgrades: () => {
        resetPauseUpgrades();
      },
      onPauseClearUpgrades: () => {
        clearPauseUpgrades();
      },
      onApplyStageTest: ({ stageId, durationSec }) => {
        primeAudioSystems();
        resetAll({
          testMode: true,
          practiceMode: "stage",
          practiceStageId: normalizePracticeStageId(stageId),
          practiceStageDurationSec: Math.max(10, durationSec || 180),
          playerType:S.playerType || readStoredPlayerType()
        });
      },
      onApplyEnemyTest: ({ enemyTier, count }) => {
        primeAudioSystems();
        resetAll({
          testMode: true,
          practiceMode: "enemy",
          practiceEnemyTier: normalizePracticeEnemyTier(enemyTier),
          practiceEnemyCount: normalizePracticeEnemyCount(count),
          spawnPracticeEnemies: true,
          playerType:S.playerType || readStoredPlayerType()
        });
      }
    });

    const launchOptions = getLaunchOptions();
    S.difficulty = launchOptions.difficulty;
    setPlayerType(launchOptions.playerType);
    setEffectQuality(launchOptions.effectQuality);
    setAutoFire(launchOptions.autoFire);
    setAutoAim(launchOptions.autoAim);
    for (const radio of document.querySelectorAll("input[name='difficulty']")) {
      radio.checked = radio.value === S.difficulty;
    }
    for (const radio of document.querySelectorAll("input[name='playerType']")) {
      radio.checked = radio.value === S.playerType;
    }
    for (const radio of document.querySelectorAll("input[name='effectQuality']")) {
      radio.checked = radio.value === S.effectQuality;
    }
    for (const radio of document.querySelectorAll("input[name='autoFire']")) {
      radio.checked = String(S.autoFire) === radio.value;
    }
    for (const radio of document.querySelectorAll("input[name='autoAim']")) {
      radio.checked = String(S.autoAim) === radio.value;
    }
    UI.populateBossOptions();
    ActiveSkillSystem.assignStartingLoadout(false);
    UI.hudUpdate();

    if (launchOptions.autostartPlay) {
      S.difficulty = launchOptions.difficulty;
      resetAll({ difficulty: launchOptions.difficulty, playerType: launchOptions.playerType });
    } else {
      UI.showCard("start");
    }

    S.app.ticker.add(tick);
    window.addEventListener("resize", scheduleResizeRefresh);
    window.addEventListener("fullscreenchange", scheduleResizeRefresh);
  }

  init();

  return { resetAll, gameOver, resetInputState, clearCombatState };
})();
