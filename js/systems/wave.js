window.WaveSystem = (() => {
  const MAP_TEST_STAGE_ID = 4;
  const BOSS_ENTRY_DELAY_MS = 3000;
  const stagePreloadMap = {
    1: ["stage1", "stage2"],
    2: ["stage2", "stage3"],
    3: ["stage3"]
  };

  function warmStageAssets(stage = 1) {
    if (!window.ResourceLoader) return;
    const groups = stagePreloadMap[stage] || [];
    if (!groups.length) return;
    ResourceLoader.preloadGroups(groups).catch(() => {});
  }

  function getMaxStage() {
    return window.BossSystem && BossSystem.getStageCount ? BossSystem.getStageCount() : 3;
  }

  function isMapTestStageId(stageId) {
    return Number(stageId) === MAP_TEST_STAGE_ID;
  }

  function isAsteroidMapTestStage(stageId = GameState.progression.stage || 1) {
    return !!GameState.stats.practice
      && GameState.stats.practiceMode === "stage"
      && isMapTestStageId(stageId);
  }

  function getStageHudLabel(stageId = GameState.progression.stage || 1) {
    return isAsteroidMapTestStage(stageId) ? "AST" : String(stageId || 1);
  }

  function getDefaultStageDurationFrames() {
    const sec = GameState.stats.practice && GameState.stats.practiceMode === "stage"
      ? Math.max(10, Math.floor(GameState.practiceStageDurationSec || 180))
      : 180;
    return sec * 60;
  }

  function getWaveCountMultiplier() {
    if (GameState.stats.practice) return 1;
    const difficulty = GAME_BALANCE.DIFFICULTY[GameState.difficulty || "normal"] || GAME_BALANCE.DIFFICULTY.normal;
    return difficulty.waveCountMultiplier || 1;
  }

  function getStageWaveCountMultiplier(stage = GameState.progression.stage || 1) {
    const normalizedStage = Math.max(1, Math.min(3, Number(stage) || 1));
    if (normalizedStage === 2) return 1.3;
    if (normalizedStage === 3) return 1.69;
    return 1;
  }

  function resumeCombat() {
    if (window.Boot && Boot.resetInputState) Boot.resetInputState();
    GameState.progression.waveState = "running";
    UI.hudUpdate();
  }

  function beginStageCombat(stage = 1, options = {}) {
    const mapTestStage = isAsteroidMapTestStage(stage);
    const startCombat = () => {
      if (window.Boot && Boot.clearCombatState) {
        Boot.clearCombatState({ preservePlayer: true, preserveEnvironment: true });
      }
      if (!mapTestStage) startNextWave();
      resumeCombat();
    };
    if (!window.UI || !UI.showStageStart) {
      startCombat();
      return;
    }
    UI.showStageStart(stage, {
      durationMs: 3400,
      exitDelayMs: 320,
      subtitle: options.subtitle || (mapTestStage ? "Asteroid field render and collision test." : undefined)
    }).then(startCombat);
  }

  function startStage(stage = 1, options = {}){
    const P = GameState.progression;
    if (window.Boot && Boot.clearCombatState) Boot.clearCombatState({ preservePlayer: true });
    P.stage = Math.min(getMaxStage(), Math.max(1, stage));
    if (isMapTestStageId(stage)) P.stage = MAP_TEST_STAGE_ID;
    warmStageAssets(P.stage);
    if (window.BackgroundRenderer) BackgroundRenderer.drawBackground();
    if (window.StageAtmosphere) StageAtmosphere.resetForStage(P.stage);
    if (window.PlanetSystem) PlanetSystem.resetForStage(P.stage);
    P.stageDuration = options.stageDurationFrames || getDefaultStageDurationFrames();
    P.stageTime = P.stageDuration;
    P.stageState = isAsteroidMapTestStage(P.stage) ? "maptest" : "combat";
    P.bossFinishTimer = 0;
    P.wave = isAsteroidMapTestStage(P.stage) ? 0 : 1;
    P.waveAlive = 0;
    P.waveTarget = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    if (window.HazardSystem && HazardSystem.resetTimer) {
      HazardSystem.resetTimer();
    }
    if (isAsteroidMapTestStage(P.stage)) {
      beginStageCombat(P.stage, { subtitle: "Asteroid field render and collision test." });
      return;
    }
    const shouldSkipDialogue = options.skipDialogue || (GameState.stats.practice && GameState.stats.practiceMode === "boss");
    if (shouldSkipDialogue || !window.DialogueSystem) {
      beginStageCombat(P.stage);
      return;
    }
    DialogueSystem.playStageIntro(P.stage, () => {
      beginStageCombat(P.stage);
    });
  }

  function triggerStageBoss(){
    const P = GameState.progression;
    if (P.stageState === "boss") return;
    if (window.Boot && Boot.resetInputState) Boot.resetInputState();
    P.stageState = "boss";
    P.bossFinishTimer = 0;
    P.waveState = "dialogue";
    P.waveAlive = 0;
    P.waveTarget = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    const spawnBoss = () => {
      setTimeout(() => {
        if (window.BossSystem) BossSystem.spawnStageBoss(P.stage);
        resumeCombat();
        UI.hudUpdate();
      }, BOSS_ENTRY_DELAY_MS);
    };
    if (!window.BossSystem) {
      spawnBoss();
      return;
    }
    const continueToDialogue = () => {
      if (!window.DialogueSystem) {
        spawnBoss();
        return;
      }
      DialogueSystem.playBossWarning(P.stage, BossSystem.getStageBossId(P.stage), spawnBoss);
    };
    if (window.SoundSystem) SoundSystem.play("boss_alarm");
    UI.playBossWarning().then(continueToDialogue);
  }

  function completeStage(){
      const currentStage = GameState.progression.stage;
      const maxStage = getMaxStage();
      const isFinalStage = currentStage >= maxStage;
      const nextStage = currentStage + 1;
      if (window.Boot && Boot.clearCombatState) Boot.clearCombatState({ preservePlayer: true });
      GameState.progression.waveState = "dialogue";
      setTimeout(() => {
        const P = GameState.progression;
        const bossGone = !window.BossSystem || !BossSystem.hasActiveBoss();
        if (P.stage === currentStage && P.waveState === "dialogue" && bossGone) {
          P.stageState = "clear";
          if (window.BgmSystem) BgmSystem.stopAll();
        }
      }, 550);
      const continueToClear = () => UI.showStageClear(currentStage, { isFinalStage }).then(() => {
        if (isFinalStage) {
          GameState.progression.waveState = "idle";
          UI.showCard("start");
          return;
        }
        startStage(nextStage);
      });
      if (!window.DialogueSystem || !window.BossSystem) {
        continueToClear();
        return;
      }
    DialogueSystem.playBossClear(currentStage, BossSystem.getStageBossId(currentStage), continueToClear);
  }

  function startNextWave(){
    const P = GameState.progression;
    if (isAsteroidMapTestStage(P.stage)) {
      P.stageState = "maptest";
      P.wave = 0;
      P.waveTarget = 0;
      P.waveAlive = 0;
      P.spawnT = 0;
      P.spawnedCount = 0;
      UI.hudUpdate();
      return;
    }
    P.stageState = P.stageState === "boss" ? "boss" : "combat";
    const baseTarget = 10 + Math.floor(P.wave * 3.1);
    P.waveTarget = Math.max(6, Math.floor(baseTarget * getWaveCountMultiplier() * getStageWaveCountMultiplier(P.stage)));
    P.waveAlive = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    UI.hudUpdate();
  }

  function completeCurrentWave(){
    const P = GameState.progression;
    if (P.stageState !== "combat") return;
    if (!GameState.stats.practice && P.stageTime <= 0) {
      triggerStageBoss();
      return;
    }
    P.wave += 1;
    startNextWave();
  }

  return {
    getMaxStage,
    isMapTestStageId,
    isAsteroidMapTestStage,
    getStageHudLabel,
    startStage,
    triggerStageBoss,
    completeStage,
    startNextWave,
    completeCurrentWave
  };
})();
