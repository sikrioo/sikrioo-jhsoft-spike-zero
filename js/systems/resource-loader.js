window.ResourceLoader = (() => {
  const imagePromises = new Map();

  function getImageManifestEntries() {
    const profiles = window.CHARACTER_PROFILES || {};
    return Object.values(profiles)
      .filter((profile) => profile && profile.avatarSrc)
      .map((profile) => ({
        id: `image:${profile.id}`,
        kind: "image",
        src: profile.avatarSrc,
        fallbackSrc: profile.avatarFallbackSrc || null
      }));
  }

  function getBgmManifestEntries() {
    if (!window.BgmSystem || !BgmSystem.getManifestEntries) return [];
    return BgmSystem.getManifestEntries();
  }

  function getSfxManifestEntries() {
    if (!window.SoundSystem || !SoundSystem.getManifestEntries) return [];
    return SoundSystem.getManifestEntries();
  }

  function getManifest() {
    return [
      ...getImageManifestEntries(),
      ...getSfxManifestEntries(),
      ...getBgmManifestEntries()
    ];
  }

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

  async function preloadAll(onProgress = null) {
    const manifest = getManifest();
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

  return {
    getManifest,
    loadImage,
    preloadAll
  };
})();
