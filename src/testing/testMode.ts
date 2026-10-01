import type { GameConfig } from '../game/config'

/**
 * Test instrumentation. Active only when the URL has ?e2e (Playwright adds it).
 * It lets tests read the game state and drive the simulation clock, while the
 * real rules, inputs, collisions and rendering still run.
 */
const params = new URLSearchParams(window.location.search)

export const isTestMode = params.has('e2e')

/** ?perf records frame times and entity counts (works in any build). */
export const perfEnabled = params.has('perf')

/** In test mode the simulation only advances when a test calls advance(), unless ?clock=real. */
export const manualClockEnabled = isTestMode && params.get('clock') !== 'real'

export function testSeed(): number | undefined {
  if (!isTestMode) return undefined
  const seed = Number(params.get('seed'))
  return Number.isFinite(seed) && params.has('seed') ? seed : 1
}

export function testApiTimeout(): number | undefined {
  if (!isTestMode) return undefined
  const value = Number(params.get('apiTimeout'))
  return value > 0 ? value : undefined
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

declare global {
  interface Window {
    /** Set by tests (addInitScript) to tweak the match configuration. */
    __PIRATE_TEST_CONFIG__?: DeepPartial<GameConfig>
    /** Set by tests to make the next asset load fail once. */
    __PIRATE_FAIL_NEXT_LOAD__?: boolean
    /** Set by tests to slow the asset load down, so the progress screen can be checked. */
    __PIRATE_LOAD_DELAY_MS__?: number
  }
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return (patch === undefined ? base : patch) as T
  }
  const result = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    result[key] = deepMerge(result[key], value)
  }
  return result as T
}

export function applyTestConfig(config: GameConfig): GameConfig {
  if (!isTestMode || !window.__PIRATE_TEST_CONFIG__) return config
  return deepMerge(config, window.__PIRATE_TEST_CONFIG__)
}

/** Returns true once if a test asked the next load to fail. */
export function consumeForcedLoadFailure(): boolean {
  if (!isTestMode || !window.__PIRATE_FAIL_NEXT_LOAD__) return false
  window.__PIRATE_FAIL_NEXT_LOAD__ = false
  return true
}

/** Waits before loading when a test asked for it. */
export async function testLoadDelay(): Promise<void> {
  const ms = isTestMode ? (window.__PIRATE_LOAD_DELAY_MS__ ?? 0) : 0
  if (ms > 0) await new Promise((resolve) => window.setTimeout(resolve, ms))
}
