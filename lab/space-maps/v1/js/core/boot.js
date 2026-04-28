window.Boot = (() => {
  const S = GameState;

  function init() {
    S.canvas = document.getElementById("gameCanvas");
    S.ctx = S.canvas.getContext("2d", { alpha: false });

    bindInput();
    bindStageButtons();
    resize();
    S.engine = EngineRuntime.create();

    requestAnimationFrame(loop);
  }

  function resize() {
    S.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    S.width = window.innerWidth;
    S.height = window.innerHeight;

    S.canvas.width = Math.floor(S.width * S.dpr);
    S.canvas.height = Math.floor(S.height * S.dpr);
    S.canvas.style.width = S.width + "px";
    S.canvas.style.height = S.height + "px";
    S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    S.ctx.imageSmoothingEnabled = true;

    if (!S.player) S.player = Player.create(S.width * .5, S.height * .72);
    else {
      S.player.x = Utils.clamp(S.player.x, 28, S.width - 28);
      S.player.y = Utils.clamp(S.player.y, 28, S.height - 28);
    }

    MapSystem.setStage(S, S.stageId || "asteroid");
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      S.keys.add(e.code);

      if (e.code === "KeyL" && S.stageId === "nebula" && S.player && S.player.lightEnergy > 5) {
        S.player.lightOn = !S.player.lightOn;
        e.preventDefault();
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    }, { passive: false });

    window.addEventListener("keyup", (e) => S.keys.delete(e.code));
    window.addEventListener("resize", resize);
  }

  function bindStageButtons() {
    const bind = (id, stageId) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => MapSystem.setStage(S, stageId));
    };

    bind("btnAsteroid", "asteroid");
    bind("btnAsteroidPhysics", "asteroidPhysics");
    bind("btnAsteroidFlow", "asteroidFlow");
    bind("btnAsteroidFlowCombat", "asteroidFlowCombat");
    bind("btnNebula", "nebula");
    bind("btnGasPlanet", "gasPlanet");
    bind("btnOrbit", "orbit");
    bind("btnMagnetic", "magnetic");
  }

  function updateDebugHud() {
    const fpsEl = document.getElementById("debugFps");
    const objEl = document.getElementById("debugObjects");
    const stageEl = document.getElementById("debugStage");

    if (!S.engine) return;

    if (fpsEl) fpsEl.textContent = `FPS: ${S.engine.fps}`;
    if (objEl) objEl.textContent = `Objects: ${S.debug.objectCount || 0} / Updates: ${S.engine.updatesThisFrame}`;
    if (stageEl) stageEl.textContent = `Stage: ${S.stageId}`;
  }

  function updateLightHud() {
    const el = document.getElementById("lightStatus");
    if (!el || !S.player) return;

    if (S.stageId !== "nebula") {
      el.textContent = "LIGHT N/A";
      el.classList.remove("on");
      return;
    }

    const energy = Math.round(S.player.lightEnergy || 0);
    el.textContent = S.player.lightOn ? `LIGHT ON · ${energy}%` : `LIGHT OFF · ${energy}%`;
    el.classList.toggle("on", !!S.player.lightOn);
  }

  function countRuntimeObjects() {
    const mr = S.mapRuntime && S.mapRuntime.runtime;
    if (!mr) return 0;

    let count = 1; // player
    if (Array.isArray(mr.asteroids)) count += mr.asteroids.length;
    if (Array.isArray(mr.bullets)) count += mr.bullets.length;
    if (Array.isArray(mr.sparks)) count += mr.sparks.length;
    if (Array.isArray(mr.enemies)) count += mr.enemies.filter(e => !e.alive || e.alive).length;
    if (Array.isArray(mr.planets)) count += mr.planets.length;
    if (Array.isArray(mr.strikes)) count += mr.strikes.length;
    if (Array.isArray(mr.satellites)) count += mr.satellites.length;

    return count;
  }

  function fixedUpdate() {
    S.time++;

    Player.update(S.player, S);
    MapSystem.update(S);

    S.debug.objectCount = countRuntimeObjects();
  }

  function renderFrame() {
    MapSystem.render(S, "background");

    if (S.stageId === "nebula") {
      MapSystem.render(S, "foreground");
      Player.render(S.ctx, S.player);
    } else {
      Player.render(S.ctx, S.player);
      MapSystem.render(S, "foreground");
    }

    updateLightHud();
    updateDebugHud();
  }

  function loop(now) {
    if (!S.engine) S.engine = EngineRuntime.create();

    EngineRuntime.beginFrame(S.engine, now || performance.now());

    while (EngineRuntime.shouldStep(S.engine)) {
      fixedUpdate();
      EngineRuntime.consumeStep(S.engine);
    }

    renderFrame();
    requestAnimationFrame(loop);
  }

  return { init };
})();

window.addEventListener("DOMContentLoaded", Boot.init);
