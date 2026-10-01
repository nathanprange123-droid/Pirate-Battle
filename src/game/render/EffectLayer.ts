import { Container, Sprite, type Texture } from 'pixi.js'
import type { GameEvent, ShipKind } from '../simulation/types'

interface Effect {
  sprite: Sprite
  age: number
  duration: number
  /** Called every frame with progress from 0 to 1. */
  animate: (sprite: Sprite, progress: number) => void
}

export interface EffectTextures {
  explosion: readonly Texture[]
  wrecks: Record<ShipKind, Texture>
  shipScale: number
}

/** Short visual effects (muzzle flashes, hits, explosions, sinking wrecks) driven by game events. */
export class EffectLayer {
  readonly container = new Container()
  private readonly wrecks = new Container()
  private readonly flashes = new Container()
  private readonly textures: EffectTextures
  private readonly effects: Effect[] = []

  constructor(textures: EffectTextures) {
    this.textures = textures
    // Wrecks sink under the flashes and explosions.
    this.container.addChild(this.wrecks, this.flashes)
  }

  get count(): number {
    return this.effects.length
  }

  handle(event: GameEvent): void {
    const { explosion } = this.textures
    switch (event.type) {
      case 'shot':
        this.spawnFrames(event.x, event.y, explosion.slice(0, 1), 0.12, 0.3)
        break
      case 'hit':
        this.spawnFrames(event.x, event.y, explosion.slice(0, 2), 0.25, 0.45)
        break
      case 'splash':
        this.spawnFrames(event.x, event.y, explosion.slice(0, 1), 0.2, 0.35)
        break
      case 'shipDestroyed':
        this.spawnWreck(event.x, event.y, event.angle, event.ship)
        this.spawnFrames(event.x, event.y, explosion, 0.6, 1.1)
        break
      default:
        break
    }
  }

  /** Advances all effects. dt in seconds. */
  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]
      effect.age += dt
      const progress = effect.age / effect.duration

      if (progress >= 1) {
        effect.sprite.destroy()
        this.effects.splice(i, 1)
        continue
      }
      effect.animate(effect.sprite, progress)
    }
  }

  private spawnFrames(
    x: number,
    y: number,
    frames: readonly Texture[],
    duration: number,
    scale: number,
  ): void {
    const sprite = new Sprite(frames[0])
    sprite.anchor.set(0.5)
    sprite.scale.set(scale)
    sprite.position.set(x, y)
    this.flashes.addChild(sprite)
    this.effects.push({
      sprite,
      age: 0,
      duration,
      animate: (target, progress) => {
        const frame = Math.min(frames.length - 1, Math.floor(progress * frames.length))
        target.texture = frames[frame]
        // Fade out during the last third.
        target.alpha = progress > 0.66 ? (1 - progress) / 0.34 : 1
      },
    })
  }

  /** The wrecked hull stays for a moment, sinking (shrinking and fading). */
  private spawnWreck(x: number, y: number, angle: number, ship: ShipKind): void {
    const { wrecks, shipScale } = this.textures
    const sprite = new Sprite(wrecks[ship])
    sprite.anchor.set(0.5)
    sprite.scale.set(shipScale)
    sprite.rotation = angle - Math.PI / 2
    sprite.position.set(x, y)
    this.wrecks.addChild(sprite)
    this.effects.push({
      sprite,
      age: 0,
      duration: ship === 'player' ? 3 : 1.6,
      animate: (target, progress) => {
        target.alpha = 1 - progress
        target.scale.set(shipScale * (1 - progress * 0.35))
      },
    })
  }
}
