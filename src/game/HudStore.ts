import type { MatchOutcome } from './simulation/types'

export type HudStatus = 'loading' | 'running' | 'paused' | 'ended' | 'error'

/** The small set of values the React interface needs from the game. */
export interface HudSnapshot {
  status: HudStatus
  /** Asset loading progress from 0 to 1. */
  loadProgress: number
  score: number
  /** Whole seconds left. */
  timeLeft: number
  health: number
  maxHealth: number
  /** Filled once when the match ends. */
  outcome: MatchOutcome | null
}

export const INITIAL_HUD: HudSnapshot = {
  status: 'loading',
  loadProgress: 0,
  score: 0,
  timeLeft: 0,
  health: 0,
  maxHealth: 0,
  outcome: null,
}

/**
 * Bridge between the game loop and React.
 * The game may call update() every frame, but listeners are only notified
 * when a value actually changes, so React re-renders a few times per second at most.
 * Works with React's useSyncExternalStore.
 */
export class HudStore {
  private snapshot: HudSnapshot = INITIAL_HUD
  private readonly listeners = new Set<() => void>()

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): HudSnapshot => this.snapshot

  /** Merges the given values; notifies only if something changed. */
  update(values: Partial<HudSnapshot>): void {
    const current = this.snapshot
    const changed = (Object.keys(values) as (keyof HudSnapshot)[]).some(
      (key) => values[key] !== current[key],
    )
    if (!changed) return
    this.snapshot = { ...current, ...values }
    for (const listener of this.listeners) listener()
  }

  reset(): void {
    this.update(INITIAL_HUD)
  }
}
