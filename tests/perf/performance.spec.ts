import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, openApp, startBattle } from '../e2e/helpers'

const OUTPUT = 'reports/performance'

function save(name: string, data: unknown): string {
  mkdirSync(OUTPUT, { recursive: true })
  const file = join(OUTPUT, `${name}.json`)
  writeFileSync(file, JSON.stringify(data, null, 2))
  return file
}

/** Collects browser and machine details for the report. */
async function environment(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    const debug = gl?.getExtension('WEBGL_debug_renderer_info')
    return {
      userAgent: navigator.userAgent,
      gpu: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown',
      cpuThreads: navigator.hardwareConcurrency,
      deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
    }
  })
}

/**
 * A full 3-minute battle on the real clock. The player keeps sailing in circles and
 * firing every cannon, and spawns come every second, to stress the game.
 * The only change to the rules is a very large player health, so the battle lasts
 * the whole 3 minutes.
 */
test('3-minute battle: frame rate, p95 frame time and entities', async ({ page }) => {
  const settings = { sessionTime: 180, spawnInterval: 1 }
  const testConfig = { player: { maxHealth: 1_000_000 }, spawn: { maxAlive: 20 } }
  await openApp(page, { settings, testConfig, query: { clock: 'real', perf: '1' } })
  const env = await environment(page)
  await startBattle(page)

  for (const key of ['KeyW', 'KeyD', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.down(key)

  await page.waitForFunction(
    () => {
      const w = window as unknown as {
        pirateTest?: { getState: () => { status: string } | null }
      }
      return w.pirateTest?.getState()?.status !== 'running'
    },
    undefined,
    { timeout: 200_000, polling: 1000 },
  )

  const report = await page.evaluate(() =>
    (window as unknown as { piratePerf?: { report: () => unknown } }).piratePerf?.report(),
  )
  const file = save('combat-3min', { date: new Date().toISOString(), env, settings, testConfig, report })
  console.log(`Saved ${file}`)
  console.log(JSON.stringify(report, null, 2))

  const r = report as { durationSeconds: number; averageFps: number; p95FrameMs: number }
  expect(r.durationSeconds).toBeGreaterThan(170)
  // Recorded, not enforced: the target is 60 FPS on the reference machine.
  expect.soft(r.averageFps, 'average FPS (target 60)').toBeGreaterThanOrEqual(55)
  expect.soft(r.p95FrameMs, 'p95 frame time (target ~16.7 ms)').toBeLessThanOrEqual(20)
})

/**
 * Starts, plays and leaves a battle five times, forcing garbage collection after each
 * cycle and reading the JavaScript heap. A steady climb would point to a leak.
 */
test('memory after five start, play and leave cycles', async ({ page }) => {
  await openApp(page, {
    settings: { sessionTime: 120, spawnInterval: 1 },
    query: { clock: 'real' },
  })
  const env = await environment(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('HeapProfiler.enable')

  const measure = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    await page.waitForTimeout(300)
    await cdp.send('HeapProfiler.collectGarbage')
    const { usedSize } = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }
    const canvases = await page.locator('canvas').count()
    return { heapMb: Math.round((usedSize / 1024 / 1024) * 100) / 100, canvases }
  }

  const samples = [{ cycle: 0, ...(await measure()) }]

  for (let cycle = 1; cycle <= 5; cycle++) {
    await startBattle(page)
    for (const key of ['KeyW', 'KeyD', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.down(key)
    await page.waitForTimeout(10_000)
    for (const key of ['KeyW', 'KeyD', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.up(key)

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    samples.push({ cycle, ...(await measure()) })
  }

  const growthMb = Math.round((samples[5].heapMb - samples[1].heapMb) * 100) / 100
  const file = save('memory-5-cycles', { date: new Date().toISOString(), env, samples, growthMb })
  console.log(`Saved ${file}`)
  console.table(samples)

  for (const sample of samples) expect(sample.canvases).toBe(0)
  // Cycle 1 includes one-time costs (textures, sounds, code). After that it should stay flat.
  expect.soft(growthMb, 'heap growth from cycle 1 to 5 (MB)').toBeLessThan(5)
})
