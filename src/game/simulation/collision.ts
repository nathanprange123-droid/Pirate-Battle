import type { Rect } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  )
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const r = ar + br
  return dx * dx + dy * dy <= r * r
}

/**
 * If a circle overlaps a rectangle, moves the circle out along the shortest path.
 * Mutates the given object. Returns true when it had to push.
 */
export function pushCircleOutOfRect(
  circle: { x: number; y: number; radius: number },
  rect: Rect,
): boolean {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.width)
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.height)
  const dx = circle.x - nearestX
  const dy = circle.y - nearestY
  const distSq = dx * dx + dy * dy

  if (distSq >= circle.radius * circle.radius) return false

  if (distSq > 0) {
    const dist = Math.sqrt(distSq)
    const push = (circle.radius - dist) / dist
    circle.x += dx * push
    circle.y += dy * push
    return true
  }

  // Center is inside the rectangle: push through the closest edge.
  const toLeft = circle.x - rect.x
  const toRight = rect.x + rect.width - circle.x
  const toTop = circle.y - rect.y
  const toBottom = rect.y + rect.height - circle.y
  const smallest = Math.min(toLeft, toRight, toTop, toBottom)

  if (smallest === toLeft) circle.x = rect.x - circle.radius
  else if (smallest === toRight) circle.x = rect.x + rect.width + circle.radius
  else if (smallest === toTop) circle.y = rect.y - circle.radius
  else circle.y = rect.y + rect.height + circle.radius
  return true
}

/** True when a circle touches a rectangle (with optional extra padding). */
export function circleIntersectsRect(
  x: number,
  y: number,
  radius: number,
  rect: Rect,
): boolean {
  const nearestX = clamp(x, rect.x, rect.x + rect.width)
  const nearestY = clamp(y, rect.y, rect.y + rect.height)
  const dx = x - nearestX
  const dy = y - nearestY
  return dx * dx + dy * dy < radius * radius
}

/** Pushes two overlapping circles apart. share = how much of the push goes to `a` (0 to 1). */
export function separateCircles(
  a: { x: number; y: number; radius: number },
  b: { x: number; y: number; radius: number },
  share: number,
): void {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const minDist = a.radius + b.radius
  const distSq = dx * dx + dy * dy
  if (distSq >= minDist * minDist) return

  const dist = Math.sqrt(distSq) || 0.0001
  const overlap = minDist - dist
  const nx = dx / dist
  const ny = dy / dist
  a.x -= nx * overlap * share
  a.y -= ny * overlap * share
  b.x += nx * overlap * (1 - share)
  b.y += ny * overlap * (1 - share)
}
