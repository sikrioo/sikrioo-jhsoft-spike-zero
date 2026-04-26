window.AsteroidRenderer = (() => {
  function createRuntime(state) {
    const runtime = {
      spaceLayer: BackgroundRenderer.createSpaceLayer(state.width, state.height),
      gridLayer: BackgroundRenderer.createGridLayer(state.width, state.height),
      dust: [],
      asteroids: []
    };

    for (let i = 0; i < 34; i++) {
      runtime.dust.push({
        x: Utils.rand(-140, state.width + 140),
        y: state.height * .5 + Utils.rand(-190, 190),
        w: Utils.rand(70, 240),
        h: Utils.rand(8, 30),
        alpha: Utils.rand(.016, .052),
        speed: Utils.rand(.04, .15)
      });
    }

    for (let i = 0; i < 5; i++) runtime.asteroids.push(createAsteroid(state, "large"));
    for (let i = 0; i < 16; i++) runtime.asteroids.push(createAsteroid(state, "mid"));
    for (let i = 0; i < 54; i++) runtime.asteroids.push(createAsteroid(state, "small"));
    runtime.asteroids.sort((a, b) => a.r - b.r);

    return runtime;
  }

  function createRockShape(count, r) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count;
      const rough = Utils.rand(.7, 1.22);
      points.push({ x: Math.cos(angle) * r * rough, y: Math.sin(angle) * r * rough });
    }
    return points;
  }

  function path(ctx, points, cx, cy) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = cx + p.x;
      const y = cy + p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }

  function createSprite(a) {
    const size = Math.ceil(a.r * 3.5);
    const c = Utils.makeCanvas(size, size);
    const ctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;

    path(ctx, a.points, cx, cy);
    ctx.save();
    ctx.clip();

    const g = ctx.createLinearGradient(cx - a.r, cy - a.r, cx + a.r, cy + a.r);
    g.addColorStop(0, `rgb(${a.color.r + 42},${a.color.g + 38},${a.color.b + 32})`);
    g.addColorStop(.38, `rgb(${a.color.r},${a.color.g},${a.color.b})`);
    g.addColorStop(1, `rgb(${Math.max(15, a.color.r - 58)},${Math.max(15, a.color.g - 52)},${Math.max(15, a.color.b - 46)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    for (const f of a.facets) {
      ctx.beginPath();
      ctx.moveTo(cx + f.x1, cy + f.y1);
      ctx.lineTo(cx + f.x2, cy + f.y2);
      ctx.lineTo(cx + f.x3, cy + f.y3);
      ctx.closePath();
      ctx.fillStyle = f.light ? `rgba(230,220,195,${f.alpha})` : `rgba(20,18,17,${f.alpha})`;
      ctx.fill();
    }

    for (const crater of a.craters) {
      const x = cx + crater.x;
      const y = cy + crater.y;
      const cg = ctx.createRadialGradient(x - crater.r * .28, y - crater.r * .28, 0, x, y, crater.r);
      cg.addColorStop(0, `rgba(230,220,195,${crater.alpha * .28})`);
      cg.addColorStop(.48, `rgba(42,36,32,${crater.alpha})`);
      cg.addColorStop(1, "rgba(10,10,12,.02)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(x, y, crater.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    path(ctx, a.points, cx, cy);
    ctx.strokeStyle = `rgba(245,238,220,${a.type === "large" ? .32 : .24})`;
    ctx.lineWidth = Math.max(1.2, a.r * .035);
    ctx.stroke();

    path(ctx, a.points, cx, cy);
    ctx.strokeStyle = "rgba(8,10,14,.55)";
    ctx.lineWidth = Math.max(1, a.r * .018);
    ctx.stroke();

    return { canvas: c, offset: size / 2 };
  }

  function createShadowSprite(a) {
    if (a.r < 58) return null;
    const w = Math.ceil(a.r * 6);
    const h = Math.ceil(a.r * 2.1);
    const c = Utils.makeCanvas(w, h);
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, h * .5, w, h * .5);
    g.addColorStop(0, `rgba(0,0,0,${a.type === "large" ? .5 : .28})`);
    g.addColorStop(.42, `rgba(0,0,0,${a.type === "large" ? .22 : .12})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w * .38, h * .5, w * .42, h * .34, -.05, 0, Math.PI * 2);
    ctx.fill();
    return { canvas: c, w, h };
  }

  function createAsteroid(state, type) {
    const isLarge = type === "large";
    const isMid = type === "mid";
    const r = isLarge ? Utils.rand(68, 122) : isMid ? Utils.rand(30, 58) : Utils.rand(8, 24);
    const a = {
      type, r,
      x: Utils.rand(-220, state.width + 280),
      y: state.height * .5 + Utils.rand(-state.height * (isLarge ? .22 : .34), state.height * (isLarge ? .22 : .34)),
      points: createRockShape(Math.floor(Utils.rand(10, 17)), r),
      rot: Utils.rand(0, Math.PI * 2),
      rotSpeed: Utils.rand(-.003, .003) * (isLarge ? .35 : 1),
      speed: isLarge ? Utils.rand(.05, .15) : isMid ? Utils.rand(.16, .34) : Utils.rand(.34, .78),
      alpha: isLarge ? Utils.rand(.94, 1) : Utils.rand(.76, .98),
      color: { r: Math.floor(Utils.rand(82, 122)), g: Math.floor(Utils.rand(76, 108)), b: Math.floor(Utils.rand(66, 94)) },
      craters: Array.from({ length: isLarge ? 11 : isMid ? 6 : 2 }, () => ({
        x: Utils.rand(-r * .46, r * .46),
        y: Utils.rand(-r * .46, r * .46),
        r: Utils.rand(r * .045, r * .145),
        alpha: Utils.rand(.18, .38)
      })),
      facets: Array.from({ length: isLarge ? 16 : isMid ? 9 : 3 }, () => ({
        x1: Utils.rand(-r * .65, r * .65), y1: Utils.rand(-r * .65, r * .65),
        x2: Utils.rand(-r * .65, r * .65), y2: Utils.rand(-r * .65, r * .65),
        x3: Utils.rand(-r * .65, r * .65), y3: Utils.rand(-r * .65, r * .65),
        alpha: Utils.rand(.025, .09),
        light: Math.random() > .58
      }))
    };
    a.sprite = createSprite(a);
    a.shadowSprite = createShadowSprite(a);
    return a;
  }

  function update(runtime, state) {
    for (const a of runtime.asteroids) {
      a.x -= a.speed;
      a.y += Math.sin(state.time * .008 + a.r) * .025;
      a.rot += a.rotSpeed;
      if (a.x < -a.r * 4) Object.assign(a, createAsteroid(state, a.type), { x: state.width + a.r * 2 + Utils.rand(0, 180) });
    }
  }

  function drawDust(ctx, runtime, state) {
    ctx.save();
    ctx.translate(state.width * .5, state.height * .5);
    ctx.rotate(-.24);
    const g = ctx.createLinearGradient(-state.width * .65, 0, state.width * .65, 0);
    g.addColorStop(0, "rgba(185,154,108,0)");
    g.addColorStop(.5, "rgba(185,154,108,.055)");
    g.addColorStop(1, "rgba(185,154,108,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-state.width * .75, -64, state.width * 1.5, 128);
    ctx.restore();

    for (const d of runtime.dust) {
      d.x -= d.speed;
      if (d.x < -d.w) d.x = state.width + d.w;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(-.24);
      ctx.fillStyle = `rgba(185,165,130,${d.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.w, d.h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAsteroid(ctx, a, state) {
    const margin = a.r * 3.2;
    if (a.x < -margin || a.x > state.width + margin || a.y < -margin || a.y > state.height + margin) return;

    if (a.shadowSprite) {
      const s = a.shadowSprite;
      ctx.save();
      ctx.translate(a.x + a.r * .75, a.y + a.r * .16);
      ctx.rotate(-.2);
      ctx.globalAlpha = a.alpha;
      ctx.drawImage(s.canvas, -s.w * .15, -s.h * .5);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.globalAlpha = a.alpha;
    ctx.drawImage(a.sprite.canvas, -a.sprite.offset, -a.sprite.offset);
    ctx.restore();
  }

  function render(ctx, runtime, state, layer) {
    if (layer === "background") {
      ctx.drawImage(runtime.spaceLayer, 0, 0);
      ctx.drawImage(runtime.gridLayer, 0, 0);
      drawDust(ctx, runtime, state);
      for (const a of runtime.asteroids) if (a.r < 58) drawAsteroid(ctx, a, state);
    }

    if (layer === "foreground") {
      for (const a of runtime.asteroids) if (a.r >= 58) drawAsteroid(ctx, a, state);
      BackgroundRenderer.drawVignette(ctx, state.width, state.height, .58);
    }
  }

  return { createRuntime, update, render };
})();
