import type { IslandKind } from '../config'

/** Tile numbers (from the tilesheet) that draw each island, row by row. */
export const ISLAND_LAYOUTS: Record<IslandKind, number[][]> = {
  sand: [
    [1, 2, 3],
    [17, 18, 19],
    [33, 34, 35],
  ],
  grass: [
    [6, 7, 8, 9],
    [22, 23, 24, 25],
    [38, 39, 40, 41],
    [54, 55, 56, 57],
  ],
}

/** Every tile number used by any island, without repeats. */
export const ISLAND_TILE_IDS: number[] = [
  ...new Set(Object.values(ISLAND_LAYOUTS).flat(2)),
]
