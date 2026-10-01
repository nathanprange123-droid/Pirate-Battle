/** All gameplay numbers live here. Systems read them; they never hardcode values. */

export interface ArenaConfig {
  /** Logical arena size in world units (pixels at scale 1). */
  width: number
  height: number
  /** Size of one map tile in world units. */
  tileSize: number
}

export type IslandKind = 'sand' | 'grass'

export interface IslandConfig {
  kind: IslandKind
  /** Top-left tile column and row. */
  col: number
  row: number
}

export interface WeaponConfig {
  /** Seconds between shots. */
  cooldown: number
  projectileSpeed: number
  damage: number
  /** Seconds before the projectile disappears. */
  lifetime: number
}

export interface SideWeaponConfig extends WeaponConfig {
  /** Distance between the three parallel projectiles. */
  spacing: number
}

/** Values shared by every ship. */
export interface ShipConfig {
  maxHealth: number
  /** World units per second. */
  moveSpeed: number
  /** Radians per second. */
  turnSpeed: number
  /** Collision circle radius in world units. */
  radius: number
}

export interface PlayerConfig extends ShipConfig {
  /** Where the ship starts. Angle in radians (0 = right). */
  spawn: { x: number; y: number; angle: number }
  /** Distance from the ship center to the bow, where the front cannon fires. */
  bowOffset: number
  /** Distance from the ship center to each side, where the side cannons fire. */
  sideOffset: number
  frontCannon: WeaponConfig
  sideCannons: SideWeaponConfig
}

export interface ChaserConfig extends ShipConfig {
  /** Damage dealt to the player when it rams and explodes. */
  contactDamage: number
}

export interface ShooterConfig extends ShipConfig {
  /** Starts firing when the player is closer than this. */
  attackRange: number
  /** Stops moving forward when the player is closer than this. */
  preferredDistance: number
  /** Fires only if aimed within this angle (radians) of the player. */
  aimTolerance: number
  bowOffset: number
  cannon: WeaponConfig
}

export interface SpawnConfig {
  /** Seconds between enemy spawns. */
  interval: number
  /** Seconds before the first enemy appears. */
  firstDelay: number
  /** No new spawns while this many enemies are alive. */
  maxAlive: number
  /** Enemies never appear closer than this to the player. */
  minDistanceFromPlayer: number
  /** Distance kept from the arena edges when spawning. */
  edgeMargin: number
  /** Chance (0 to 1) that a spawn is a Chaser; the rest are Shooters. */
  chaserChance: number
  /** Random positions tried before skipping a spawn. */
  maxAttempts: number
}

export interface MatchConfig {
  /** Match length in seconds of active play (60 to 180). */
  duration: number
}

export interface GameConfig {
  match: MatchConfig
  arena: ArenaConfig
  islands: IslandConfig[]
  /** Islands are drawn a bit bigger than their collision box because of the rounded shores. */
  islandCollisionInset: number
  /** Simulation step in seconds (fixed timestep). */
  fixedStep: number
  /** Visual scale applied to ship sprites. */
  shipScale: number
  projectileRadius: number
  player: PlayerConfig
  chaser: ChaserConfig
  shooter: ShooterConfig
  spawn: SpawnConfig
}

export const DEFAULT_CONFIG: GameConfig = {
  match: { duration: 120 },
  arena: { width: 1280, height: 768, tileSize: 64 },
  islands: [
    { kind: 'grass', col: 8, row: 4 },
    { kind: 'sand', col: 3, row: 8 },
    { kind: 'sand', col: 15, row: 1 },
  ],
  islandCollisionInset: 12,
  fixedStep: 1 / 60,
  shipScale: 0.6,
  projectileRadius: 5,
  player: {
    maxHealth: 100,
    moveSpeed: 140,
    turnSpeed: Math.PI,
    radius: 24,
    spawn: { x: 200, y: 300, angle: 0 },
    bowOffset: 34,
    sideOffset: 18,
    frontCannon: {
      cooldown: 0.4,
      projectileSpeed: 420,
      damage: 25,
      lifetime: 1.2,
    },
    sideCannons: {
      cooldown: 1.5,
      projectileSpeed: 360,
      damage: 20,
      lifetime: 0.9,
      spacing: 18,
    },
  },
  chaser: {
    maxHealth: 40,
    moveSpeed: 115,
    turnSpeed: 2.2,
    radius: 22,
    contactDamage: 25,
  },
  shooter: {
    maxHealth: 60,
    moveSpeed: 80,
    turnSpeed: 1.8,
    radius: 24,
    attackRange: 340,
    preferredDistance: 230,
    aimTolerance: 0.2,
    bowOffset: 34,
    cannon: {
      cooldown: 1.6,
      projectileSpeed: 300,
      damage: 10,
      lifetime: 1.4,
    },
  },
  spawn: {
    interval: 3,
    firstDelay: 1.5,
    maxAlive: 10,
    minDistanceFromPlayer: 350,
    edgeMargin: 40,
    chaserChance: 0.5,
    maxAttempts: 30,
  },
}
