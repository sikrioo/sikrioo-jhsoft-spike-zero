/**
 * BossVisuals.js
 * 보스 관련 비주얼 생성/갱신 유틸리티 모듈
 * BossSystem, 개별 보스 파일에서 공통으로 사용
 */
window.BossVisuals = (() => {
  function buildRegularPolygonPoints(radius, sides = 6, rotation = -Math.PI / 2, innerScale = 1) {
    const points = [];
    const safeSides = Math.max(3, Math.floor(sides || 3));
    for (let i = 0; i < safeSides; i++) {
      const angle = rotation + (Math.PI * 2 * i) / safeSides;
      const scale = typeof innerScale === "function" ? innerScale(i, safeSides) : innerScale;
      points.push(Math.cos(angle) * radius * scale, Math.sin(angle) * radius * scale);
    }
    return points;
  }

  function buildPolygonSilhouette(radius, sides, color, jagged = false, options = {}) {
    const g = new PIXI.Graphics();
    const alpha = options.alpha != null ? options.alpha : 0.18;
    const lineAlpha = options.lineAlpha != null ? options.lineAlpha : 0.78;
    const lineWidth = options.lineWidth != null ? options.lineWidth : 2;
    const scaleOuter = options.scaleOuter != null ? options.scaleOuter : 1.08;
    const points = buildRegularPolygonPoints(
      radius * scaleOuter,
      sides,
      options.rotation != null ? options.rotation : -Math.PI / 2,
      jagged ? (index) => (index % 2 === 0 ? 1 : 0.72) : 1
    );
    g.beginFill(color, alpha);
    g.lineStyle(lineWidth, options.lineColor || color, lineAlpha);
    g.drawPolygon(points);
    g.endFill();
    return g;
  }

  function buildSpikeRing(radius, color, count = 10, spikeLength = 12, options = {}) {
    const g = new PIXI.Graphics();
    const safeCount = Math.max(3, Math.floor(count || 3));
    const innerRadius = radius + (options.innerOffset || 10);
    const outerRadius = innerRadius + spikeLength;
    const baseHalfWidth = options.baseHalfWidth || Math.max(3, spikeLength * 0.28);
    for (let i = 0; i < safeCount; i++) {
      const angle = (Math.PI * 2 * i) / safeCount + (options.rotation || 0);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const tx = -ny;
      const ty = nx;
      g.beginFill(options.fillColor || color, options.fillAlpha != null ? options.fillAlpha : 0.12);
      g.lineStyle(options.lineWidth || 2, color, options.lineAlpha != null ? options.lineAlpha : 0.78);
      g.drawPolygon([
        nx * outerRadius, ny * outerRadius,
        nx * innerRadius + tx * baseHalfWidth, ny * innerRadius + ty * baseHalfWidth,
        nx * innerRadius - tx * baseHalfWidth, ny * innerRadius - ty * baseHalfWidth
      ]);
      g.endFill();
    }
    return g;
  }

  function buildOrbitOrbs(radius, color, count = 3, options = {}) {
    const root = new PIXI.Container();
    const safeCount = Math.max(1, Math.floor(count || 1));
    const orbitRadius = radius + (options.offset || 22);
    const orbRadius = options.orbRadius || Math.max(3, Math.round(radius * 0.12));
    for (let i = 0; i < safeCount; i++) {
      const angle = (Math.PI * 2 * i) / safeCount;
      const orb = new PIXI.Graphics();
      orb.beginFill(color, options.fillAlpha != null ? options.fillAlpha : 0.8);
      orb.lineStyle(1.5, 0xffffff, 0.72);
      orb.drawCircle(0, 0, orbRadius);
      orb.endFill();
      orb.x = Math.cos(angle) * orbitRadius;
      orb.y = Math.sin(angle) * orbitRadius;
      root.addChild(orb);
    }
    return root;
  }

  /**
   * 보스 프레임 컨테이너 생성
   * @param {object} config - { radius, code, bodyColor, glowColor }
   * @returns {PIXI.Container} root - .valueText 프로퍼티 포함
   */
  function buildFrame(config) {
    const root = new PIXI.Container();
    const aura  = new PIXI.Graphics();
    const halo  = new PIXI.Graphics();
    const shell = new PIXI.Graphics();
    const core  = new PIXI.Graphics();
    const ring  = new PIXI.Graphics();
    const spokes = new PIXI.Graphics();
    const silhouette = new PIXI.Container();
    const stateLayer = new PIXI.Container();
    const orbitContainer = new PIXI.Container();
    const showValue = config.showValue !== false;
    const useGlow = config.useGlow !== false;
    const radius = config.radius;

    const value = showValue ? new PIXI.Text("", {
      fontFamily: "Segoe UI, Arial, sans-serif",
      fontSize: Math.max(10, Math.round(config.radius * 0.6)),
      fontWeight: "900",
      fill: 0xffffff,
      stroke: 0x06101e,
      strokeThickness: 4,
      letterSpacing: 1,
      align: "center"
    }) : null;
    if (value) {
      value.anchor.set(0.5);
      value.y = -3;
    }

    aura.beginFill(config.glowColor, 0.12);
    aura.drawCircle(0, 0, radius + 20);
    aura.endFill();

    halo.lineStyle(1, config.bodyColor, 0.14);
    halo.drawCircle(0, 0, radius + 16);
    halo.lineStyle(1, config.bodyColor, 0.08);
    halo.drawCircle(0, 0, radius + 28);

    shell.beginFill(0x0a0f1d, 0.95);
    shell.lineStyle(4, config.bodyColor, 0.95);
    shell.drawCircle(0, 0, radius);
    shell.endFill();

    core.beginFill(config.glowColor, 0.2);
    core.drawCircle(0, 0, radius - 7);
    core.endFill();
    core.lineStyle(2, 0xffffff, 0.45);
    core.moveTo(-radius * 0.45, 0);
    core.lineTo( radius * 0.45, 0);
    core.moveTo(0, -radius * 0.45);
    core.lineTo(0,  radius * 0.45);

    ring.lineStyle(2, 0xffffff, 0.26);
    ring.drawCircle(0, 0, radius - 13);
    ring.lineStyle(2, config.glowColor, 0.48);
    ring.drawCircle(0, 0, radius - 3);

    spokes.lineStyle(2, config.bodyColor, 0.22);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const inner = radius * 0.58;
      const outer = radius + 10;
      spokes.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      spokes.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }

    root.addChild(aura, halo, spokes, shell, silhouette, ring, core, stateLayer, orbitContainer);
    if (value) root.addChild(value);

    if (useGlow) {
      const glow = Effects.makeGlowFilter({
        color: config.glowColor,
        distance: 14,
        outerStrength: 1.1,
        innerStrength: 0.2,
        quality: 0.18
      });
      root.filters = Effects.asFilters(glow);
    }

    root.aura = aura;
    root.halo = halo;
    root.spokes = spokes;
    root.shell = shell;
    root.silhouette = silhouette;
    root.ring = ring;
    root.core = core;
    root.stateLayer = stateLayer;
    root.orbitContainer = orbitContainer;
    root.valueText = value;
    return root;
  }

  /**
   * 프레임의 HP 수치 텍스트 갱신
   * @param {PIXI.Container} frame
   * @param {number} value
   */
  function setFrameValue(frame, value) {
    if (!frame || !frame.valueText) return;
    const nextText = String(Math.max(0, Math.ceil(value)));
    if (frame.valueText.text === nextText) return;
    frame.valueText.text = nextText;
  }

  /**
   * 대형 HP바 부착 (보스 상단)
   * @param {PIXI.Container} container
   * @param {number} width
   * @returns {{ barBg, barFill, width }}
   */
  function attachHpBar(container, width) {
    const barBg   = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    barBg.y   = -72;
    barFill.y = -72;
    container.addChild(barBg, barFill);
    return { barBg, barFill, width };
  }

  /**
   * 소형 HP바 부착 (미니언/자식 유닛)
   * @param {PIXI.Container} container
   * @param {number} width
   * @param {number} [y=-28]
   * @returns {{ barBg, barFill, width }}
   */
  function attachMiniHpBar(container, width, y = -28) {
    const barBg   = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    barBg.y   = y;
    barFill.y = y;
    container.addChild(barBg, barFill);
    return { barBg, barFill, width };
  }

  /**
   * 대형 HP바 다시 그리기
   * dirty 체크를 통해 변화 없을 때 스킵
   */
  function redrawHpBar(bar, ratio, color) {
    // 변화 없을 때 스킵 (드로우콜 절약)
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    if (bar._lastRatio === clampedRatio && bar._lastColor === color) return;
    bar._lastRatio = clampedRatio;
    bar._lastColor = color;

    bar.barBg.clear();
    bar.barBg.beginFill(0x02040a, 0.75);
    bar.barBg.lineStyle(2, 0xffffff, 0.4);
    bar.barBg.drawRoundedRect(-bar.width / 2, 0, bar.width, 10, 5);
    bar.barBg.endFill();

    bar.barFill.clear();
    bar.barFill.beginFill(color, 0.95);
    bar.barFill.drawRoundedRect(-bar.width / 2, 0, Math.max(0, bar.width * clampedRatio), 10, 5);
    bar.barFill.endFill();
  }

  /**
   * 소형 HP바 다시 그리기 (dirty 체크 포함)
   */
  function redrawMiniHpBar(bar, ratio, color) {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    if (bar._lastRatio === clampedRatio && bar._lastColor === color) return;
    bar._lastRatio = clampedRatio;
    bar._lastColor = color;

    bar.barBg.clear();
    bar.barBg.beginFill(0x05070d, 0.75);
    bar.barBg.lineStyle(1, 0xffffff, 0.28);
    bar.barBg.drawRoundedRect(-bar.width / 2, 0, bar.width, 5, 3);
    bar.barBg.endFill();

    bar.barFill.clear();
    bar.barFill.beginFill(color, 0.95);
    bar.barFill.drawRoundedRect(-bar.width / 2, 0, Math.max(0, bar.width * clampedRatio), 5, 3);
    bar.barFill.endFill();
  }

  return {
    buildFrame,
    buildOrbitOrbs,
    buildSpikeRing,
    buildPolygonSilhouette,
    setFrameValue,
    attachHpBar,
    attachMiniHpBar,
    redrawHpBar,
    redrawMiniHpBar
  };
})();
