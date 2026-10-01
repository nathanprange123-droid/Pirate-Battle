import {
  test,
  expect,
  openApp,
  startBattle,
  advance,
  scoreOnePoint,
  finishByTime,
  NO_SPAWNS,
} from './helpers'

/**
 * Visual regression. Baselines live in tests/e2e/__screenshots__ and are versioned.
 * Update them on purpose with: npm run test:e2e:update
 */
test.describe('Visual regression', () => {
  test('main menu', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('img', { name: 'Pirate Battle' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('menu.png')
  })

  test('arena in a stable state', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
    await advance(page, 0.1)
    // Let the renderer draw the current state a few times.
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('arena.png')
  })

  test('result screen', async ({ page }) => {
    await openApp(page, { settings: { sessionTime: 60, spawnInterval: 3 }, testConfig: NO_SPAWNS })
    await startBattle(page)
    await scoreOnePoint(page)
    await finishByTime(page)
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()
    await expect(page).toHaveScreenshot('result.png')
  })
})
