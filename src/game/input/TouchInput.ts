import type { GameAction } from './actions'

/**
 * Holds the state of the on-screen buttons.
 * React buttons call press/release; the game reads isDown each step.
 */
export class TouchInput {
  private readonly pressed = new Set<GameAction>()

  press(action: GameAction): void {
    this.pressed.add(action)
  }

  release(action: GameAction): void {
    this.pressed.delete(action)
  }

  isDown(action: GameAction): boolean {
    return this.pressed.has(action)
  }

  clear(): void {
    this.pressed.clear()
  }
}
