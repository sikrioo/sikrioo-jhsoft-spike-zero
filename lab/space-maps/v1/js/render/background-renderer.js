window.BackgroundRenderer = (() => {
  function createSpaceLayer(width, height, options = {}) {
    const c = Utils.makeCanvas(width, height);
    const ctx = c.getContext("2d");

    const bg = ctx.createRadialGradient(width * .54, height * .44, 0, width * .54, height * .44, Math.max(width, height) * .82);
    bg.addColorStop(0, options.center || "#111b2a");
    bg.addColorStop(.35, options.mid || "#060b16");
    bg.addColorStop(1, options.edge || "#010207");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawNebula(ctx, width * .18, height * .28, 280, options.nebulaA || "70,105,145", .075);
    drawNebula(ctx, width * .82, height * .66, 380, options.nebulaB || "148,111,70", .07);

    const starCount = options.starCount || 150;
    for (let i = 0; i < starCount; i++) {
      ctx.fillStyle = `rgba(220,238,255,${Utils.rand(.2, .85)})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Utils.rand(.45, 1.6), 0, Math.PI * 2);
      ctx.fill();
    }

    return c;
  }

  function createGridLayer(width, height) {
    const c = Utils.makeCanvas(width, height);
    const ctx = c.getContext("2d");

    ctx.strokeStyle = "rgba(120,170,210,.022)";
    ctx.lineWidth = 1;
    const step = 84;

    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    return c;
  }

  function drawNebula(ctx, x, y, radius, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(.55, `rgba(${rgb}, ${alpha * .32})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVignette(ctx, width, height, alpha = .58) {
    const g = ctx.createRadialGradient(width * .5, height * .5, Math.min(width, height) * .22, width * .5, height * .5, Math.max(width, height) * .75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  return { createSpaceLayer, createGridLayer, drawNebula, drawVignette };
})();
