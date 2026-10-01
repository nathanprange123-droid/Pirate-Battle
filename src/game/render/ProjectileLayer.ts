import { Container, Sprite, type Texture } from 'pixi.js'
import type { ProjectileState } from '../simulation/types'

/**
 * Draws all projectiles. Sprites are reused from a pool instead of being
 * created and destroyed for every shot, which avoids garbage and keeps FPS stable.
 */
export class ProjectileLayer {
  readonly container = new Container()
  private readonly texture: Texture
  private readonly active = new Map<number, Sprite>()
  private readonly pool: Sprite[] = []
  private readonly seen = new Set<number>()

  constructor(texture: Texture) {
    this.texture = texture
  }

  sync(projectiles: readonly ProjectileState[]): void {
    this.seen.clear()

    for (const projectile of projectiles) {
      this.seen.add(projectile.id)
      let sprite = this.active.get(projectile.id)
      if (!sprite) {
        sprite = this.takeSprite()
        this.active.set(projectile.id, sprite)
      }
      sprite.position.set(projectile.x, projectile.y)
    }

    for (const [id, sprite] of this.active) {
      if (!this.seen.has(id)) {
        sprite.visible = false
        this.pool.push(sprite)
        this.active.delete(id)
      }
    }
  }

  private takeSprite(): Sprite {
    const reused = this.pool.pop()
    if (reused) {
      reused.visible = true
      return reused
    }
    const sprite = new Sprite(this.texture)
    sprite.anchor.set(0.5)
    this.container.addChild(sprite)
    return sprite
  }
}
