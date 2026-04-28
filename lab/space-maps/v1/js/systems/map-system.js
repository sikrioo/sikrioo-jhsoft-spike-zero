window.MapSystem = (() => {
  function createRuntime(state, stageId) {
    const stage = StageData[stageId] || StageData.asteroid;

    if (stage.type === "asteroidFlowCombat" && window.AsteroidFlowCombatRenderer) {
      return {
        stage,
        renderer: AsteroidFlowCombatRenderer,
        runtime: AsteroidFlowCombatRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "asteroidFlow" && window.AsteroidFlowRenderer) {
      return {
        stage,
        renderer: AsteroidFlowRenderer,
        runtime: AsteroidFlowRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "asteroidPhysics" && window.AsteroidPhysicsRenderer) {
      return {
        stage,
        renderer: AsteroidPhysicsRenderer,
        runtime: AsteroidPhysicsRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "nebula") {
      return {
        stage,
        renderer: NebulaRenderer,
        runtime: NebulaRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "gasPlanet" && window.GasPlanetRenderer) {
      return {
        stage,
        renderer: GasPlanetRenderer,
        runtime: GasPlanetRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "orbit" && window.OrbitRenderer) {
      return {
        stage,
        renderer: OrbitRenderer,
        runtime: OrbitRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "magnetic" && window.MagneticRenderer) {
      return {
        stage,
        renderer: MagneticRenderer,
        runtime: MagneticRenderer.createRuntime(state, stage)
      };
    }

    return {
      stage,
      renderer: AsteroidRenderer,
      runtime: AsteroidRenderer.createRuntime(state, stage)
    };
  }

  function setStage(state, stageId) {
    state.stageId = stageId;
    state.mapRuntime = createRuntime(state, stageId);

    const stage = state.mapRuntime.stage;
    const title = document.getElementById("stageTitle");
    const desc = document.getElementById("stageDesc");
    const rule = document.getElementById("stageRule");

    if (title) title.textContent = stage.title || stage.id || "STAGE";
    if (desc) desc.textContent = stage.desc || "";
    if (rule) rule.textContent = stage.rule || "";
  }

  function update(state) {
    if (!state.mapRuntime) return;
    state.mapRuntime.renderer.update(state.mapRuntime.runtime, state);
  }

  function render(state, layer) {
    if (!state.mapRuntime) return;
    state.mapRuntime.renderer.render(state.ctx, state.mapRuntime.runtime, state, layer);
  }

  return { setStage, update, render };
})();
