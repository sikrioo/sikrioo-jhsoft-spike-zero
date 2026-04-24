/**
 * BossVisuals.js
 * 보스 관련 비주얼 생성/갱신 유틸리티 모듈
 * BossSystem, 개별 보스 파일에서 공통으로 사용
 */
window.BossVisuals = (() => {

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

    root.addChild(aura, halo, spokes, shell, ring, core);
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
    setFrameValue,
    attachHpBar,
    attachMiniHpBar,
    redrawHpBar,
    redrawMiniHpBar
  };
})();
