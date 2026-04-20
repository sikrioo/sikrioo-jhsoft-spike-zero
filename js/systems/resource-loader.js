window.ResourceLoader = (() => {
  const imagePromises = new Map();

  function loadImage(src, fallbackSrc = null) {
    const key = `${src}|${fallbackSrc || ""}`;
    if (imagePromises.has(key)) return imagePromises.get(key);

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (fallbackSrc && img.src.indexOf(fallbackSrc) === -1) {
          img.src = fallbackSrc;
          return;
        }
        resolve(null);
      };
      img.src = src;
    });

    imagePromises.set(key, promise);
    return promise;
  }

  function getManifest(groupNames = ["common", "gameBoot", "gameDeferred"]) {
    if (!window.ResourceManifest || !ResourceManifest.getEntriesForGroups) return [];
    return ResourceManifest.getEntriesForGroups(groupNames);
  }

  async function preloadEntries(entries = [], onProgress = null) {
    const manifest = entries || [];
    let completed = 0;

    if (typeof onProgress === "function") onProgress({ completed: 0, total: manifest.length, item: null });

    const tasks = manifest.map((entry) => {
      let task;
      if (entry.kind === "image") {
        task = loadImage(entry.src, entry.fallbackSrc);
      } else if (entry.id.startsWith("sfx:") && window.SoundSystem && SoundSystem.load) {
        task = SoundSystem.load(entry.id.replace("sfx:", ""));
      } else if (entry.id.startsWith("bgm:") && window.BgmSystem && BgmSystem.load) {
        task = BgmSystem.load(entry.id.replace("bgm:", ""));
      } else {
        task = Promise.resolve(null);
      }

      return Promise.resolve(task).finally(() => {
        completed += 1;
        if (typeof onProgress === "function") {
          onProgress({ completed, total: manifest.length, item: entry });
        }
      });
    });

    await Promise.all(tasks);
    return true;
  }

  function preloadGroups(groupNames = [], onProgress = null) {
    return preloadEntries(getManifest(groupNames), onProgress);
  }

  async function preloadAll(onProgress = null) {
    return preloadGroups(["common", "gameBoot", "gameDeferred"], onProgress);
  }

  return {
    getManifest,
    loadImage,
    preloadEntries,
    preloadGroups,
    preloadAll
  };
})();
