import { test, expect, openApp, startBattle, advance, getState, NO_SPAWNS } from './helpers'

test.describe('Pause', () => {
  test('P and Esc pause and resume; the timer does not move while paused', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
    const before = await advance(page, 1)

    await page.keyboard.press('KeyP')
    const dialog = page.getByRole('dialog', { name: 'Paused' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Resume' })).toBeFocused()

    const paused = await advance(page, 5)
    expect(paused.paused).toBe(true)
    expect(paused.timeLeft).toBe(before.timeLeft)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    const resumed = await advance(page, 1)
    expect(resumed.timeLeft).toBeCloseTo(before.timeLeft - 1, 2)
  })

  test('keys held during the pause do not carry over', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)

    await page.keyboard.down('KeyW')
    await page.getByRole('button', { name: 'Pause game' }).click()
    await page.keyboard.up('KeyW')
    const paused = await getState(page)
    expect(paused.paused).toBe(true)

    await page.getByRole('button', { name: 'Resume' }).click()
    const after = await advance(page, 1)
    expect(after.player.x).toBe(paused.player.x)
    expect(after.projectiles).toHaveLength(0)
  })

  test('pauses automatically when the window loses focus or the tab is hidden', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)

    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    await page.getByRole('button', { name: 'Resume' }).click()
    expect((await getState(page)).paused).toBe(false)

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
  })

  test('with the real clock, time spent paused is not counted', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS, query: { clock: 'real' } })
    await startBattle(page)
    await page.waitForTimeout(500)

    await page.keyboard.press('KeyP')
    const paused = await getState(page)
    await page.waitForTimeout(2000)
    expect((await getState(page)).timeLeft).toBe(paused.timeLeft)

    await page.keyboard.press('KeyP')
    const resumed = await getState(page)
    // No jump forward after resuming (only the frames since the key press).
    expect(paused.timeLeft - resumed.timeLeft).toBeLessThan(0.3)

    await page.waitForTimeout(1000)
    const running = await getState(page)
    expect(resumed.timeLeft - running.timeLeft).toBeGreaterThan(0.5)
  })
})
