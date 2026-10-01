import { Container, Sprite, type Texture } from 'pixi.js'
import type { ShipState } from '../simulation/types'
import { HealthBar, type HealthBarSkin } from './HealthBar'

const BAR_OFFSET_Y = -52
const FLASH_SECONDS = 0.15
const FLASH_TINT = 0xff7a7a
const FIRE_FRAME_SECONDS = 0.12

export interface ShipSkin {
  /** Damage stages from intact (0) to wrecked (3). */
  stages: readonly Texture[]
  fire: readonly Texture[]
  bar: HealthBarSkin
  scale: number
}

/** Picks the damage image: 0 intact, 1 damaged, 2 badly damaged, 3 wrecked. */
export function damageStage(healthRatio: number): number {
  if (healthRatio > 0.66) return 0
  if (healthRatio > 0.33) return 1
  if (healthRatio > 0) return 2
  return 3
}

/**
 * Draws one ship with its health bar. Reads ShipState, never changes it.
 * The hull rotates; the health bar stays upright above the ship.
 */
export class ShipView {
  readonly container = new Container()
  private readonly skin: ShipSkin
  private readonly hull: Sprite
  private readonly fire: Sprite
  private readonly healthBar: HealthBar
  private lastHealth = -1
  private flashTime = 0
  private fireTime = 0

  constructor(skin: ShipSkin) {
    this.skin = skin
    this.hull = new Sprite(skin.stages[0])
    this.hull.anchor.set(0.5)
    this.hull.scale.set(skin.scale)

    // Fire is a child of the hull, so it turns with the ship.
    this.fire = new Sprite(skin.fire[0])
    this.fire.anchor.set(0.5, 1)
    this.fire.position.set(6, 4)
    this.fire.visible = false
    this.hull.addChild(this.fire)

    this.healthBar = new HealthBar(skin.bar)
    this.healthBar.container.position.set(0, BAR_OFFSET_Y)

    this.container.addChild(this.hull, this.healthBar.container)
  }

  sync(state: ShipState, dt: number): void {
    this.container.position.set(state.x, state.y)
    // The ship images point down (PI/2), so subtract that offset.
    this.hull.rotation = state.angle - Math.PI / 2

    // Textures and the bar change only when health changes, not every frame.
    if (state.health !== this.lastHealth) {
      if (this.lastHealth >= 0 && state.health < this.lastHealth) {
        this.flashTime = FLASH_SECONDS
      }
      this.lastHealth = state.health
      const ratio = state.health / state.maxHealth
      const stage = damageStage(ratio)
      this.hull.texture = this.skin.stages[stage]
      this.fire.visible = stage === 2
      this.healthBar.setRatio(ratio)
      // A sunk ship is drawn by the wreck effect instead.
      this.container.visible = ratio > 0
    }

    if (this.flashTime > 0) {
      this.flashTime = Math.max(0, this.flashTime - dt)
      this.hull.tint = this.flashTime > 0 ? FLASH_TINT : 0xffffff
    }

    if (this.fire.visible) {
      this.fireTime += dt
      const frame = Math.floor(this.fireTime / FIRE_FRAME_SECONDS) % this.skin.fire.length
      this.fire.texture = this.skin.fire[frame]
    }
  }

  destroy(): void {
    this.healthBar.destroy()
    this.container.destroy({ children: true })
  }
}
