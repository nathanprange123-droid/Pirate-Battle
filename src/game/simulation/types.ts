/** Plain data used by the simulation. No Pixi objects here. */

export interface ShipState {
  x: number
  y: number
  /** Heading in radians. 0 points right, PI/2 points down. */
  angle: number
  radius: number
  health: number
  maxHealth: number
}

export type EnemyKind = 'chaser' | 'shooter'

export interface EnemyState extends ShipState {
  id: number
  kind: EnemyKind
  /** Seconds until this enemy can fire again (Shooter only). */
  fireCooldown: number
}

export type Team = 'player' | 'enemy'

export interface ProjectileState {
  id: number
  team: Team
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  /** Seconds left before it disappears. */
  timeLeft: number
}

/** Axis-aligned rectangle in world units. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type MatchStatus = 'running' | 'ended'
export type EndReason = 'timeUp' | 'playerDestroyed'

/** Summary of a finished match. */
export interface MatchOutcome {
  score: number
  /** Seconds of active play (pauses not included). */
  durationSeconds: number
  endReason: EndReason
}

export type ShipKind = 'player' | EnemyKind
export type WeaponKind = 'front' | 'broadside' | 'enemy'

/**
 * Things that happened during a step. The renderer turns them into effects
 * and the sound director into sounds. The simulation never draws or plays anything.
 */
export type GameEvent =
  /** One per projectile (muzzle flash). */
  | { type: 'shot'; team: Team; x: number; y: number }
  /** One per volley (sound). */
  | { type: 'cannonFired'; weapon: WeaponKind }
  | { type: 'hit'; x: number; y: number; target: Team }
  | { type: 'splash'; x: number; y: number }
  | { type: 'shipDestroyed'; x: number; y: number; angle: number; ship: ShipKind }
  | { type: 'rammed'; x: number; y: number }
  | { type: 'scored' }
  | { type: 'matchEnded'; reason: EndReason }

/** What the player wants to do this step, independent of keyboard or touch. */
export interface PlayerIntent {
  forward: boolean
  /** -1 turns left, 1 turns right, 0 keeps heading. */
  turn: number
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
}
