import {
  test,
  expect,
  openApp,
  startBattle,
  finishByTime,
  setScenario,
  NO_SPAWNS,
} from './helpers'

test.describe('Network resilience', () => {
  test('a save that times out after being stored is retried without duplicates', async ({
    page,
  }) => {
    await openApp(page, {
      settings: { sessionTime: 60, spawnInterval: 3 },
      testConfig: NO_SPAWNS,
      scenario: 'timeoutAfterSave',
      query: { apiTimeout: '800' },
    })
    await startBattle(page)
    await finishByTime(page)

    // First request: stored, but the answer never comes. The retry gets the existing record.
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()

    await setScenario(page, 'normal')
    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(1)
    await page.getByRole('tab', { name: 'Ranking' }).click()
    await expect(page.locator('.log-table tbody tr.is-you')).toHaveCount(1)
  })

  test('repeated retry clicks do not duplicate the record', async ({ page }) => {
    await openApp(page, {
      settings: { sessionTime: 60, spawnInterval: 3 },
      testConfig: NO_SPAWNS,
      scenario: 'saveUnavailable',
    })
    await startBattle(page)
    await finishByTime(page)
    const retry = page.getByRole('button', { name: 'Try again' })
    await expect(retry).toBeVisible()

    await setScenario(page, 'normal')
    await retry.click({ clickCount: 3 })
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()

    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(1)
  })

  test('a late answer for an older page never replaces the page on screen', async ({ page }) => {
    await openApp(page, { hash: 'menu', scenario: 'outOfOrder' })
    // Odd requests take 3 s, even ones 0.3 s.
    await page.getByRole('button', { name: 'Ranking' }).click() // request 1 (slow)
    const firstRank = page.locator('.log-table tbody tr').first().locator('td').first()
    await expect(firstRank).toHaveText('01', { timeout: 8_000 })

    await page.getByRole('button', { name: 'Next page' }).click() // request 2 (fast): page 2
    await expect(firstRank).toHaveText('06')

    // Request 3 (slow) asks for page 3. While it loads, page 2 stays on screen,
    // so "Previous" goes to page 1, which is still cached.
    await page.getByRole('button', { name: 'Next page' }).click()
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(firstRank).toHaveText('01')

    // Wait until the slow page-3 answer has arrived: the screen must still show page 1.
    await page.waitForTimeout(3500)
    await expect(firstRank).toHaveText('01')
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()
  })
})
