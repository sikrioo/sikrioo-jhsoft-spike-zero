window.CameraSystem = (() => {
  const S = GameState;

  function getViewBounds() {
    const renderer = S.app && S.app.renderer;
    const w = renderer ? renderer.width : 0;
    const h = renderer ? renderer.height : 0;
    const camera = S.camera || {};
    const cx = camera.x || w * 0.5;
    const cy = camera.y || h * 0.5;
    return {
      left: cx - w * 0.5,
      top: cy - h * 0.5,
      right: cx + w * 0.5,
      bottom: cy + h * 0.5,
      width: w,
      height: h,
      centerX: cx,
      centerY: cy
    };
  }

  function screenToWorld(x, y) {
    const view = getViewBounds();
    return { x: view.left + x, y: view.top + y };
  }

  function updateMouseWorldCoordinates() {
    if (!S.app || !S.app.renderer) return;
    const screenX = S.mouse.screenX != null ? S.mouse.screenX : (S.app.renderer.width * 0.5);
    const screenY = S.mouse.screenY != null ? S.mouse.screenY : (S.app.renderer.height * 0.5);
    const worldPoint = screenToWorld(screenX, screenY);
    S.mouse.x = worldPoint.x;
    S.mouse.y = worldPoint.y;
  }

  function updateCameraTransform(dt = 1) {
    if (!S.app || !S.app.renderer) return;
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    const player = S.player;
    const arena = Helpers.getArenaBounds();
    if (!player) {
      S.world.x = 0;
      S.world.y = 0;
      return;
    }

    const minCameraX = arena.left + w * 0.5;
    const maxCameraX = arena.right - w * 0.5;
    const minCameraY = arena.top + h * 0.5;
    const maxCameraY = arena.bottom - h * 0.5;
    let desiredX = Helpers.clamp(player.spr.x, minCameraX, maxCameraX);
    let desiredY = Helpers.clamp(player.spr.y, minCameraY, maxCameraY);
    const currentX = S.camera.x || desiredX;
    const currentY = S.camera.y || desiredY;

    if (S.movementMode === "keyboard") {
      const screenX = player.spr.x + ((w * 0.5) - currentX);
      const screenY = player.spr.y + ((h * 0.5) - currentY);
      const marginX = Math.min(32, Math.max(18, w * 0.02));
      const marginY = Math.min(28, Math.max(16, h * 0.02));

      desiredX = currentX;
      desiredY = currentY;

      if (screenX < marginX) {
        desiredX = Helpers.clamp(player.spr.x - marginX + (w * 0.5), minCameraX, maxCameraX);
      } else if (screenX > w - marginX) {
        desiredX = Helpers.clamp(player.spr.x - (w - marginX) + (w * 0.5), minCameraX, maxCameraX);
      }

      if (screenY < marginY) {
        desiredY = Helpers.clamp(player.spr.y - marginY + (h * 0.5), minCameraY, maxCameraY);
      } else if (screenY > h - marginY) {
        desiredY = Helpers.clamp(player.spr.y - (h - marginY) + (h * 0.5), minCameraY, maxCameraY);
      }
    }

    if (S.movementMode === "keyboard") {
      S.camera.x = desiredX;
      S.camera.y = desiredY;
    } else {
      const cameraLerp = 0.1;
      S.camera.x = Helpers.lerp(currentX, desiredX, Math.min(1, cameraLerp * dt));
      S.camera.y = Helpers.lerp(currentY, desiredY, Math.min(1, cameraLerp * dt));
    }

    const shakeX = S.shake > 0.01 ? Helpers.rand(-S.shake, S.shake) : 0;
    const shakeY = S.shake > 0.01 ? Helpers.rand(-S.shake, S.shake) : 0;
    S.world.x = Math.round((w * 0.5) - S.camera.x + shakeX);
    S.world.y = Math.round((h * 0.5) - S.camera.y + shakeY);
  }

  return {
    getViewBounds,
    screenToWorld,
    updateMouseWorldCoordinates,
    updateCameraTransform
  };
})();
