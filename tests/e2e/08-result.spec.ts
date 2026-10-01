import { test, expect, openApp, startBattle, scoreOnePoint, finishByTime, NO_SPAWNS } from './helpers'

test.describe('Result screen', () => {
  test('shows score, time played and outcome, and survives a reload', async ({ page }) => {
    await openApp(page, { settings: { sessionTime: 60, spawnInterval: 3 }, testConfig: NO_SPAWNS })
    await startBattle(page)
    await scoreOnePoint(page)
    await finishByTime(page)

    const details = page.locator('.result-details')
    await expect(page.locator('.result-score__value')).toHaveText('1')
    await expect(details).toContainText('Time played')
    await expect(details).toContainText('01:00')
    await expect(details).toContainText("Time's up")
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible()
    await expect(page.locator('.result-score__value')).toHaveText('1')
    await expect(details).toContainText('01:00')

    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  })
})
