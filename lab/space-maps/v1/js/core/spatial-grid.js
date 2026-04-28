window.SpatialGrid = (() => {
  function create(cellSize = 96) {
    return {
      cellSize,
      buckets: new Map()
    };
  }

  function clear(grid) {
    grid.buckets.clear();
  }

  function key(cx, cy) {
    return cx + "," + cy;
  }

  function insert(grid, obj, x, y, r) {
    const cs = grid.cellSize;
    const minX = Math.floor((x - r) / cs);
    const maxX = Math.floor((x + r) / cs);
    const minY = Math.floor((y - r) / cs);
    const maxY = Math.floor((y + r) / cs);

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const k = key(cx, cy);
        let list = grid.buckets.get(k);
        if (!list) {
          list = [];
          grid.buckets.set(k, list);
        }
        list.push(obj);
      }
    }
  }

  function query(grid, x, y, r, out = []) {
    out.length = 0;

    const cs = grid.cellSize;
    const minX = Math.floor((x - r) / cs);
    const maxX = Math.floor((x + r) / cs);
    const minY = Math.floor((y - r) / cs);
    const maxY = Math.floor((y + r) / cs);
    const seen = new Set();

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const list = grid.buckets.get(key(cx, cy));
        if (!list) continue;

        for (const obj of list) {
          if (seen.has(obj)) continue;
          seen.add(obj);
          out.push(obj);
        }
      }
    }

    return out;
  }

  return { create, clear, insert, query };
})();
