import { Assets, type Texture } from 'pixi.js'
import { ISLAND_TILE_IDS } from './render/islandLayouts'
import { consumeForcedLoadFailure } from '../testing/testMode'

const BASE = `${import.meta.env.BASE_URL}assets/png/default`

/**
 * Each ship color has 4 images in the pack, from intact to wrecked:
 * ship_N, ship_N+6, ship_N+12, ship_N+18.
 */
const SHIP_COLORS = {
  player: 5,
  chaser: 2,
  shooter: 3,
} as const

type ShipColorKey = keyof typeof SHIP_COLORS

const EXPLOSION_IDS = [3, 2, 1] as const
const FIRE_IDS = [1, 2] as const

const HUD_IMAGES = [
  'health_frame',
  'health_fill_green',
  'health_fill_amber',
  'health_fill_red',
  'enemy_health_frame',
  'enemy_health_fill_green',
  'enemy_health_fill_red',
] as const

type HudImage = (typeof HUD_IMAGES)[number]

export interface GameTextures {
  water: Texture
  cannonBall: Texture
  /** Map tiles by their number in the tilesheet (tile_1.png -> 1). */
  tiles: Map<number, Texture>
  /** Damage stages for each ship, from intact (0) to wrecked (3). */
  ships: Record<ShipColorKey, Texture[]>
  /** Explosion frames, small to large. */
  explosion: Texture[]
  fire: Texture[]
  hud: Record<HudImage, Texture>
}

const urls = {
  water: `${BASE}/tiles/tile_73.png`,
  cannonBall: `${BASE}/ship_parts/cannon_ball.png`,
  tile: (id: number) => `${BASE}/tiles/tile_${id}.png`,
  ship: (id: number) => `${BASE}/ships/ship_${id}.png`,
  explosion: (id: number) => `${BASE}/effects/explosion_${id}.png`,
  fire: (id: number) => `${BASE}/effects/fire_${id}.png`,
  hud: (name: HudImage) => `${BASE}/ui/hud/${name}.png`,
}

function shipStageIds(color: number): number[] {
  return [color, color + 6, color + 12, color + 18]
}

/**
 * Loads all match textures. Pixi's Assets cache keeps them,
 * so a second match reuses them instead of downloading again.
 */
export async function loadGameTextures(
  onProgress?: (progress: number) => void,
): Promise<GameTextures> {
  const shipKeys = Object.keys(SHIP_COLORS) as ShipColorKey[]
  const allUrls = [
    urls.water,
    urls.cannonBall,
    ...ISLAND_TILE_IDS.map(urls.tile),
    ...shipKeys.flatMap((key) => shipStageIds(SHIP_COLORS[key]).map(urls.ship)),
    ...EXPLOSION_IDS.map(urls.explosion),
    ...FIRE_IDS.map(urls.fire),
    ...HUD_IMAGES.map(urls.hud),
  ]

  // Tests can force one failed download to check the error screen and retry.
  if (consumeForcedLoadFailure()) allUrls.push(`${BASE}/missing-for-test.png`)

  const loaded = await Assets.load<Texture>(allUrls, onProgress)

  const tiles = new Map<number, Texture>()
  for (const id of ISLAND_TILE_IDS) {
    tiles.set(id, loaded[urls.tile(id)])
  }

  const shipStages = (key: ShipColorKey): Texture[] =>
    shipStageIds(SHIP_COLORS[key]).map((id) => loaded[urls.ship(id)])

  const hud = {} as Record<HudImage, Texture>
  for (const name of HUD_IMAGES) hud[name] = loaded[urls.hud(name)]

  return {
    water: loaded[urls.water],
    cannonBall: loaded[urls.cannonBall],
    tiles,
    ships: {
      player: shipStages('player'),
      chaser: shipStages('chaser'),
      shooter: shipStages('shooter'),
    },
    explosion: EXPLOSION_IDS.map((id) => loaded[urls.explosion(id)]),
    fire: FIRE_IDS.map((id) => loaded[urls.fire(id)]),
    hud,
  }
}
