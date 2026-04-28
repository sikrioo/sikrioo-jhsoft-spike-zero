window.Utils = {
  rand(min, max) {
    return min + Math.random() * (max - min);
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
};
