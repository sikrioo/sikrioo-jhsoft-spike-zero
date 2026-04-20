window.SoundSystem = (() => {
  const SOUND_DEFS = {
    player_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser2.ogg",
      volume: 0.18,
      poolSize: 6,
      cooldownMs: 58
    },
    laser_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser9.ogg",
      volume: 0.2,
      poolSize: 4,
      cooldownMs: 120
    },
    shotgun_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser5.ogg",
      volume: 0.22,
      poolSize: 4,
      cooldownMs: 90
    },
    missile_launch: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser1.ogg",
      volume: 0.34,
      poolSize: 4,
      cooldownMs: 70
    },
    player_hit: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/forceField_003.ogg",
      volume: 0.26,
      poolSize: 3,
      cooldownMs: 90
    },
    level_up: {
      src: "./assets/sfx/kenney_digital-audio/Audio/powerUp5.ogg",
      volume: 0.34,
      poolSize: 2,
      cooldownMs: 160
    },
    comms: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp3.ogg",
      volume: 0.2,
      poolSize: 3,
      cooldownMs: 60
    },
    radio_in: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp2.ogg",
      volume: 0.22,
      poolSize: 3,
      cooldownMs: 40
    },
    radio_out: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserDown2.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 40
    },
    upgrade_pick: {
      src: "./assets/sfx/levelup/universfield-level-up-05-326133.mp3",
      volume: 0.34,
      poolSize: 2,
      cooldownMs: 120
    },
    ui_hover: {
      src: "./assets/sfx/kenney_ui-audio/Audio/rollover2.ogg",
      volume: 0.24,
      poolSize: 3,
      cooldownMs: 45
    },
    boss_alarm: {
      src: "./assets/sfx/alert/red-alert.mp3",
      volume: 0.46,
      poolSize: 4,
      cooldownMs: 1200
    },
    low_explosion: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/lowFrequency_explosion_001.ogg",
      volume: 0.3,
      poolSize: 3,
      cooldownMs: 140
    },
    boss_destroy: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_001.ogg",
      volume: 0.48,
      poolSize: 2,
      cooldownMs: 250
    },
    boss_clear: {
      src: "./assets/sfx/kenney_digital-audio/Audio/powerUp10.ogg",
      volume: 0.34,
      poolSize: 2,
      cooldownMs: 250
    },
    stage_clear: {
      src: "./assets/sfx/stage/clear/grumpynora-rock-ending-8-440862.mp3",
      volume: 0.44,
      poolSize: 2,
      cooldownMs: 500
    },
    player_death: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_000.ogg",
      volume: 0.58,
      poolSize: 2,
      cooldownMs: 400
    },
    enemy_destroy: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_003.ogg",
      volume: 0.28,
      poolSize: 4,
      cooldownMs: 55
    },
    debris_glass: {
      src: "./assets/sfx/kenney_impact-sounds/Audio/impactGlass_heavy_003.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 120
    },
    armor_hit: {
      src: "./assets/sfx/kenney_impact-sounds/Audio/impactPlate_heavy_001.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 100
    }
  };

  const buffers = new Map();
  const loadingPromises = new Map();
  const activeSources = new Map();
  const lastPlayAt = new Map();
  let audioContext = null;
  let masterGain = null;
  let unlocked = false;

  function ensureContext() {
    if (audioContext) return audioContext;
    const ContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!ContextCtor) return null;
    audioContext = new ContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  async function prime() {
    const context = ensureContext();
    if (!context) return false;
    unlocked = true;
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch (_) {}
    }
    return context.state === "running";
  }

  async function load(id) {
    const def = SOUND_DEFS[id];
    if (!def) return null;
    if (buffers.has(id)) return buffers.get(id);
    if (loadingPromises.has(id)) return loadingPromises.get(id);

    const context = ensureContext();
    if (!context) return null;

    const promise = fetch(def.src)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch sound: ${def.src}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer.slice(0)))
      .then((buffer) => {
        buffers.set(id, buffer);
        loadingPromises.delete(id);
        return buffer;
      })
      .catch((error) => {
        loadingPromises.delete(id);
        console.warn("[SoundSystem] preload failed", id, error);
        return null;
      });

    loadingPromises.set(id, promise);
    return promise;
  }

  function loadAll(onProgress = null) {
    const ids = Object.keys(SOUND_DEFS);
    let completed = 0;

    if (typeof onProgress === "function") onProgress(0, ids.length);

    return Promise.all(ids.map((id) =>
      load(id).finally(() => {
        completed += 1;
        if (typeof onProgress === "function") onProgress(completed, ids.length);
      })
    ));
  }

  function stopOverflowingSource(id, poolSize) {
    const list = activeSources.get(id);
    if (!list || list.length < poolSize) return;
    const source = list.shift();
    try {
      source.stop(0);
    } catch (_) {}
  }

  function play(id, options = {}) {
    const def = SOUND_DEFS[id];
    if (!def) return false;
    if (!unlocked) return false;

    const context = ensureContext();
    if (!context || context.state !== "running") return false;

    const buffer = buffers.get(id);
    if (!buffer) {
      load(id);
      return false;
    }

    const now = performance.now();
    const cooldownMs = options.cooldownMs != null ? options.cooldownMs : (def.cooldownMs || 0);
    const prev = lastPlayAt.get(id) || 0;
    if (now - prev < cooldownMs) return false;

    const source = context.createBufferSource();
    const gainNode = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = options.playbackRate != null ? options.playbackRate : 1;
    gainNode.gain.value = options.volume != null ? options.volume : (def.volume != null ? def.volume : 1);
    source.connect(gainNode);
    gainNode.connect(masterGain);

    const list = activeSources.get(id) || [];
    stopOverflowingSource(id, def.poolSize || 1);
    list.push(source);
    activeSources.set(id, list);

    source.onended = () => {
      const active = activeSources.get(id);
      if (!active) return;
      const next = active.filter((item) => item !== source);
      if (next.length) activeSources.set(id, next);
      else activeSources.delete(id);
    };

    lastPlayAt.set(id, now);
    source.start(0);
    return true;
  }

  function getManifestEntries() {
    return Object.entries(SOUND_DEFS).map(([id, def]) => ({
      id: `sfx:${id}`,
      kind: "audio",
      src: def.src
    }));
  }

  return {
    prime,
    load,
    loadAll,
    play,
    getManifestEntries
  };
})();
