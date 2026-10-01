import type { GameConfig, IslandKind } from '../config'
import type { Rect } from './types'

/** Island size in tiles (square). */
export const ISLAND_SIZE_IN_TILES: Record<IslandKind, number> = {
  sand: 3,
  grass: 4,
}

/** Collision boxes for every island in the config. */
export function buildIslandRects(config: GameConfig): Rect[] {
  const { tileSize } = config.arena
  const inset = config.islandCollisionInset

  return config.islands.map((island) => {
    const size = ISLAND_SIZE_IN_TILES[island.kind] * tileSize
    return {
      x: island.col * tileSize + inset,
      y: island.row * tileSize + inset,
      width: size - inset * 2,
      height: size - inset * 2,
    }
  })
}
