const TWO_PI = Math.PI * 2

/** Smallest signed difference from one angle to another, in (-PI, PI]. */
export function angleDifference(from: number, to: number): number {
  let diff = (to - from) % TWO_PI
  if (diff > Math.PI) diff -= TWO_PI
  else if (diff <= -Math.PI) diff += TWO_PI
  return diff
}

/** Turns `current` toward `target` by at most `maxStep` radians. */
export function rotateTowards(current: number, target: number, maxStep: number): number {
  const diff = angleDifference(current, target)
  if (Math.abs(diff) <= maxStep) return current + diff
  return current + Math.sign(diff) * maxStep
}
