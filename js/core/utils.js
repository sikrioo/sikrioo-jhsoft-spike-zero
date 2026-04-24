window.Helpers = {
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:  (a,b,t)=>a+(b-a)*t,
  rand:  (a,b)=>a+Math.random()*(b-a),
  randi: (a,b)=>Math.floor(a + Math.random()*(b-a+1)),
  dist2: (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; },
  getArenaBounds: ()=>{
    const arena = GameState.arena || {};
    const width = arena.width || (GameState.app && GameState.app.renderer ? GameState.app.renderer.width : 0);
    const height = arena.height || (GameState.app && GameState.app.renderer ? GameState.app.renderer.height : 0);
    return {
      left: arena.left || 0,
      top: arena.top || 0,
      right: (arena.left || 0) + width,
      bottom: (arena.top || 0) + height,
      width,
      height
    };
  },
  getViewBounds: ()=>{
    const renderer = GameState.app && GameState.app.renderer;
    const w = renderer ? renderer.width : 0;
    const h = renderer ? renderer.height : 0;
    const camera = GameState.camera || {};
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
  },
  screenToWorld: (x, y)=>{
    const view = window.Helpers.getViewBounds();
    return { x: view.left + x, y: view.top + y };
  }
};
