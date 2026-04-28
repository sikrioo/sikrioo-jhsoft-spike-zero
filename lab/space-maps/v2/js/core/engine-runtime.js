window.EngineRuntime = (() => {
  function create() {
    return {
      lastTime: performance.now(),
      accumulator: 0,
      fixedDtMs: 1000 / 60,
      maxFrameMs: 80,
      fps: 0,
      frameCount: 0,
      fpsTimer: 0,
      updatesThisFrame: 0
    };
  }

  function beginFrame(engine, now) {
    let frameMs = now - engine.lastTime;
    engine.lastTime = now;

    if (frameMs > engine.maxFrameMs) {
      frameMs = engine.maxFrameMs;
    }

    engine.accumulator += frameMs;
    engine.updatesThisFrame = 0;

    engine.frameCount++;
    engine.fpsTimer += frameMs;
    if (engine.fpsTimer >= 500) {
      engine.fps = Math.round(engine.frameCount * 1000 / engine.fpsTimer);
      engine.frameCount = 0;
      engine.fpsTimer = 0;
    }
  }

  function shouldStep(engine) {
    return engine.accumulator >= engine.fixedDtMs && engine.updatesThisFrame < 4;
  }

  function consumeStep(engine) {
    engine.accumulator -= engine.fixedDtMs;
    engine.updatesThisFrame++;
  }

  function alpha(engine) {
    return Math.max(0, Math.min(1, engine.accumulator / engine.fixedDtMs));
  }

  return { create, beginFrame, shouldStep, consumeStep, alpha };
})();
