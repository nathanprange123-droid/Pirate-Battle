import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameConfig } from '../config'
import { ISLAND_LAYOUTS } from './islandLayouts'

/** Builds the island sprites once. Islands never move, so there is no sync(). */
export function createIslandLayer(
  config: GameConfig,
  tiles: Map<number, Texture>,
): Container {
  const layer = new Container()
  const { tileSize } = config.arena

  for (const island of config.islands) {
    const layout = ISLAND_LAYOUTS[island.kind]
    layout.forEach((rowTiles, rowIndex) => {
      rowTiles.forEach((tileId, colIndex) => {
        const texture = tiles.get(tileId)
        if (!texture) return
        const sprite = new Sprite(texture)
        sprite.position.set(
          (island.col + colIndex) * tileSize,
          (island.row + rowIndex) * tileSize,
        )
        layer.addChild(sprite)
      })
    })
  }

  return layer
}
