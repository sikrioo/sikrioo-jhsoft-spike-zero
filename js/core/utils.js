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
  getViewBounds: ()=> window.CameraSystem && CameraSystem.getViewBounds
    ? CameraSystem.getViewBounds()
    : {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0
      },
  screenToWorld: (x, y)=> window.CameraSystem && CameraSystem.screenToWorld
    ? CameraSystem.screenToWorld(x, y)
    : { x, y }
};
