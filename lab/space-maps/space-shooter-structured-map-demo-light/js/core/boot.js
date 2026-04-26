window.Boot = (() => {
  const S = GameState;

  function init() {
    S.canvas = document.getElementById("gameCanvas");
    S.ctx = S.canvas.getContext("2d", { alpha: false });

    bindInput();
    bindStageButtons();
    resize();

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
    document.getElementById("btnAsteroid").addEventListener("click", () => MapSystem.setStage(S, "asteroid"));
    document.getElementById("btnNebula").addEventListener("click", () => MapSystem.setStage(S, "nebula"));
    document.getElementById("btnGasPlanet").addEventListener("click", () => MapSystem.setStage(S, "gasPlanet"));
    document.getElementById("btnOrbit").addEventListener("click", () => MapSystem.setStage(S, "orbit"));
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

  function loop() {
    S.time++;

    Player.update(S.player, S);
    MapSystem.update(S);

    MapSystem.render(S, "background");

    if (S.stageId === "nebula") {
      MapSystem.render(S, "foreground");
      Player.render(S.ctx, S.player);
    } else {
      Player.render(S.ctx, S.player);
      MapSystem.render(S, "foreground");
    }

    updateLightHud();

    requestAnimationFrame(loop);
  }

  return { init };
})();

window.addEventListener("DOMContentLoaded", Boot.init);
