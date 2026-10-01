import { test as base, expect, type Page } from '@playwright/test'

/** Shape of window.pirateTest.getState() (see src/game/Game.ts). */
export interface ShipSnapshot {
  x: number
  y: number
  angle: number
  health: number
  maxHealth: number
}

export interface GameState {
  status: 'running' | 'ended'
  paused: boolean
  score: number
  timeLeft: number
  elapsed: number
  endReason: 'timeUp' | 'playerDestroyed' | null
  spawnedCount: number
  player: ShipSnapshot
  enemies: (ShipSnapshot & { id: number; kind: 'chaser' | 'shooter' })[]
  projectiles: { team: 'player' | 'enemy'; x: number; y: number }[]
  islands: { x: number; y: number; width: number; height: number }[]
  arena: { width: number; height: number }
  canvasCount: number
}

type ScenarioId =
  | 'normal'
  | 'empty'
  | 'manyPages'
  | 'slow'
  | 'variableLatency'
  | 'outOfOrder'
  | 'timeout'
  | 'connectionFailure'
  | 'clientError'
  | 'serverError'
  | 'rankingFails'
  | 'historyFails'
  | 'timeoutAfterSave'
  | 'saveUnavailable'

interface TestWindow {
  pirateTest?: {
    getState: () => GameState | null
    advance: (seconds: number) => void
    addEnemy: (kind: 'chaser' | 'shooter', x: number, y: number, angle?: number) => void
  }
  pirateNetwork?: { setScenario: (id: ScenarioId) => void; reset: () => void }
  __PIRATE_TEST_CONFIG__?: unknown
  __PIRATE_FAIL_NEXT_LOAD__?: boolean
  __PIRATE_LOAD_DELAY_MS__?: number
}

/** Turns spawning off so a test controls exactly which enemies exist. */
export const NO_SPAWNS = { spawn: { firstDelay: 100_000 } }

/** Fails any test that throws an uncaught error in the page. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await use(errors)
      expect(errors, 'uncaught errors in the page').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

interface OpenOptions {
  hash?: string
  /** Saved options, applied once before the app starts. */
  settings?: { sessionTime: number; spawnInterval: number }
  /** Deep-merged into the match configuration (test mode only). */
  testConfig?: unknown
  scenario?: ScenarioId
  query?: Record<string, string>
}

/**
 * Opens the app in test mode (?e2e, seed 1, manual simulation clock).
 * Every Playwright test has its own browser context, so storage starts empty.
 */
export async function openApp(page: Page, options: OpenOptions = {}): Promise<void> {
  const { hash = 'menu', settings, testConfig, scenario, query = {} } = options

  await page.addInitScript(
    ({ settings, testConfig }) => {
      // Runs on every navigation; the sessionStorage flag keeps the setup to the first load.
      if (!sessionStorage.getItem('e2e-setup')) {
        sessionStorage.setItem('e2e-setup', '1')
        if (settings) localStorage.setItem('pirate-battle:settings:v1', JSON.stringify(settings))
      }
      if (testConfig) {
        ;(window as unknown as { __PIRATE_TEST_CONFIG__: unknown }).__PIRATE_TEST_CONFIG__ =
          testConfig
      }
    },
    { settings, testConfig },
  )

  const params = new URLSearchParams({ e2e: '1', seed: '1', ...query })
  await page.goto(`/?${params.toString()}#/${hash}`)
  await waitForMockServer(page)
  if (scenario) await setScenario(page, scenario)
}

export async function waitForMockServer(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as TestWindow).pirateNetwork)
}

export async function setScenario(page: Page, id: ScenarioId): Promise<void> {
  await page.evaluate((scenario) => {
    ;(window as unknown as TestWindow).pirateNetwork?.setScenario(scenario)
  }, id)
}

/**
 * Changes the scenario without refreshing the cached data, so a test can check
 * that the "Try again" button itself recovers.
 */
export async function setScenarioWithoutRefresh(page: Page, id: ScenarioId): Promise<void> {
  await page.evaluate((scenario) => {
    localStorage.setItem('pirate-battle:network-scenario:v1', JSON.stringify(scenario))
  }, id)
}

export async function startBattle(page: Page): Promise<GameState> {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  return waitForRunning(page)
}

export async function waitForRunning(page: Page): Promise<GameState> {
  await page.waitForFunction(() => {
    const state = (window as unknown as TestWindow).pirateTest?.getState()
    return state?.status === 'running'
  })
  return getState(page)
}

export async function getState(page: Page): Promise<GameState> {
  const state = await page.evaluate(() => (window as unknown as TestWindow).pirateTest?.getState())
  if (!state) throw new Error('The battle is not running')
  return state
}

/** Runs the real simulation for `seconds` with whatever keys or buttons are held. */
export async function advance(page: Page, seconds: number): Promise<GameState> {
  await page.evaluate((s) => (window as unknown as TestWindow).pirateTest?.advance(s), seconds)
  return getState(page)
}

/** Holds keys (real keyboard events) while the simulation runs for `seconds`. */
export async function hold(page: Page, keys: string[], seconds: number): Promise<GameState> {
  for (const key of keys) await page.keyboard.down(key)
  const state = await advance(page, seconds)
  for (const key of keys) await page.keyboard.up(key)
  return state
}

export async function addEnemy(
  page: Page,
  kind: 'chaser' | 'shooter',
  x: number,
  y: number,
  angle = 0,
): Promise<GameState> {
  await page.evaluate(
    ([k, ex, ey, ea]) =>
      (window as unknown as TestWindow).pirateTest?.addEnemy(
        k as 'chaser' | 'shooter',
        ex as number,
        ey as number,
        ea as number,
      ),
    [kind, x, y, angle] as const,
  )
  return getState(page)
}

/** Places a Shooter in front of the player and sinks it with the front cannon. */
export async function scoreOnePoint(page: Page): Promise<GameState> {
  const { player } = await getState(page)
  await addEnemy(page, 'shooter', player.x + 220, player.y, Math.PI)
  return hold(page, ['Space'], 2)
}

/** Lets the timer run out and waits for the result screen. */
export async function finishByTime(page: Page): Promise<void> {
  const state = await getState(page)
  await advance(page, state.timeLeft + 0.5)
  await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible()
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

