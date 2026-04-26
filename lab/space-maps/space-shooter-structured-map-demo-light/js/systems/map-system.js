window.MapSystem = (() => {
  function createRuntime(state, stageId) {
    const stage = StageData[stageId] || StageData.asteroid;

    if (stage.type === "nebula") {
      return {
        stage,
        renderer: NebulaRenderer,
        runtime: NebulaRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "gasPlanet") {
      return {
        stage,
        renderer: GasPlanetRenderer,
        runtime: GasPlanetRenderer.createRuntime(state, stage)
      };
    }

    if (stage.type === "orbit") {
      return {
        stage,
        renderer: OrbitRenderer,
        runtime: OrbitRenderer.createRuntime(state, stage)
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
    document.getElementById("stageTitle").textContent = stage.title;
    document.getElementById("stageDesc").textContent = stage.desc;
    document.getElementById("stageRule").textContent = stage.rule;
  }

  function update(state) {
    state.mapRuntime.renderer.update(state.mapRuntime.runtime, state);
  }

  function render(state, layer) {
    state.mapRuntime.renderer.render(state.ctx, state.mapRuntime.runtime, state, layer);
  }

  return { setStage, update, render };
})();
