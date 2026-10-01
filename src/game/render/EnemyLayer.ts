import { Container } from 'pixi.js'
import type { EnemyKind, EnemyState } from '../simulation/types'
import { ShipView, type ShipSkin } from './ShipView'

/** Keeps one ShipView per living enemy, creating and removing them as needed. */
export class EnemyLayer {
  readonly container = new Container()
  private readonly views = new Map<number, ShipView>()
  private readonly seen = new Set<number>()
  private readonly skins: Record<EnemyKind, ShipSkin>

  constructor(skins: Record<EnemyKind, ShipSkin>) {
    this.skins = skins
  }

  sync(enemies: readonly EnemyState[], dt: number): void {
    this.seen.clear()

    for (const enemy of enemies) {
      this.seen.add(enemy.id)
      let view = this.views.get(enemy.id)
      if (!view) {
        view = new ShipView(this.skins[enemy.kind])
        this.views.set(enemy.id, view)
        this.container.addChild(view.container)
      }
      view.sync(enemy, dt)
    }

    for (const [id, view] of this.views) {
      if (!this.seen.has(id)) {
        view.destroy()
        this.views.delete(id)
      }
    }
  }
}
