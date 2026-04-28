window.ObjectPool = (() => {
  function create(factory, reset, initialSize = 0) {
    const free = [];

    for (let i = 0; i < initialSize; i++) {
      free.push(factory());
    }

    return {
      acquire(data) {
        const obj = free.pop() || factory();
        reset(obj, data);
        obj.active = true;
        return obj;
      },

      release(obj) {
        obj.active = false;
        free.push(obj);
      },

      freeCount() {
        return free.length;
      }
    };
  }

  return { create };
})();
