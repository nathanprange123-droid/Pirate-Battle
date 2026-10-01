import { Container, Rectangle, Sprite, Texture } from 'pixi.js'

/** Health bar images and where the fill sits inside them (from ui_sheet.json). */
export interface HealthBarSkin {
  frame: Texture
  /** Fill images, checked in order: the first whose `above` is lower than the ratio is used. */
  fills: readonly { above: number; texture: Texture }[]
  /** Fill area inside the image, in image pixels. */
  fillRect: { x: number; width: number }
  scale: number
}

/**
 * Health bar drawn with the pack's frame and fill images.
 * The fill is cropped from the left, like the `clip_axis: x` metadata describes.
 */
export class HealthBar {
  readonly container = new Container()
  private readonly skin: HealthBarSkin
  private readonly fill = new Sprite()
  private cropped: Texture | null = null

  constructor(skin: HealthBarSkin) {
    this.skin = skin
    const frame = new Sprite(skin.frame)
    // Draw order from the metadata: frame first, fill on top.
    this.container.addChild(frame, this.fill)
    this.container.scale.set(skin.scale)
    this.container.pivot.set(skin.frame.width / 2, skin.frame.height / 2)
  }

  /** Call only when health changes; it creates a cropped texture. */
  setRatio(ratio: number): void {
    const clamped = Math.max(0, Math.min(1, ratio))
    const fill = this.skin.fills.find((option) => clamped > option.above) ?? this.skin.fills[0]
    const source = fill.texture
    const width = this.skin.fillRect.x + this.skin.fillRect.width * clamped

    this.cropped?.destroy(false)
    this.cropped = new Texture({
      source: source.source,
      frame: new Rectangle(source.frame.x, source.frame.y, width, source.frame.height),
    })
    this.fill.texture = this.cropped
    this.container.visible = clamped > 0
  }

  destroy(): void {
    this.cropped?.destroy(false)
    this.cropped = null
  }
}
