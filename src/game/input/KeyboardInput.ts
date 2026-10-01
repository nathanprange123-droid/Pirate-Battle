import type { GameAction } from './actions'

const KEY_BINDINGS: Record<string, GameAction | undefined> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
}

/**
 * Tracks which game keys are held.
 * Keys are only captured while enabled (match running and not paused),
 * so menus and dialogs keep their normal keyboard behavior.
 */
export class KeyboardInput {
  private readonly pressed = new Set<GameAction>()
  private attached = false
  private enabled = false

  attach(): void {
    if (this.attached) return
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.clear)
    this.attached = true
  }

  detach(): void {
    if (!this.attached) return
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.clear)
    this.clear()
    this.attached = false
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.clear()
  }

  isDown(action: GameAction): boolean {
    return this.pressed.has(action)
  }

  readonly clear = (): void => {
    this.pressed.clear()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return
    const action = KEY_BINDINGS[event.code]
    if (!action) return
    event.preventDefault()
    this.pressed.add(action)
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code]
    if (!action) return
    this.pressed.delete(action)
  }
}
