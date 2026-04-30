export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isPointNearSegment(px, py, x1, y1, x2, y2, threshold) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const x = x1 + dx * t;
  const y = y1 + dy * t;
  return Math.hypot(px - x, py - y) < threshold;
}

export function drawJaggedLine(g, x1, y1, x2, y2, segments, jitter, color, alpha, width) {
  g.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t + rand(-jitter, jitter);
    const y = y1 + (y2 - y1) * t + rand(-jitter, jitter);
    g.lineTo(x, y);
  }
  g.lineTo(x2, y2).stroke({ color, alpha, width });
}

export function resolveStaticCircleCollision(body, cx, cy, cr, options = {}) {
  const bounce = options.bounce ?? 1;
  const friction = options.friction ?? 1;
  const dx = body.x - cx;
  const dy = body.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = (body.radius ?? 0) + cr;

  if (dist >= minDist) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  body.x += nx * overlap;
  body.y += ny * overlap;

  const normalVelocity = body.vx * nx + body.vy * ny;
  if (normalVelocity < 0) {
    body.vx -= (1 + bounce) * normalVelocity * nx;
    body.vy -= (1 + bounce) * normalVelocity * ny;
  } else {
    body.vx += nx * 0.35;
    body.vy += ny * 0.35;
  }

  body.vx *= friction;
  body.vy *= friction;
  return true;
}
