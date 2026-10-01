import { test, expect, openApp, setScenario, setScenarioWithoutRefresh } from './helpers'

test.describe("Captain's log: Ranking and Match History", () => {
  test('ranking is sorted by points and paginated', async ({ page }) => {
    await openApp(page, { hash: 'ranking' })
    const rows = page.locator('.log-table tbody tr')
    await expect(rows).toHaveCount(5)
    await expect(page.getByText('120 second battles · 3 second spawn interval')).toBeVisible()
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()
    await expect(rows.first().locator('td').first()).toHaveText('01')

    const points = await rows.locator('td:nth-child(3)').allTextContents()
    const numbers = points.map(Number)
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers)

    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible()
    await expect(rows.first().locator('td').first()).toHaveText('06')

    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(rows.first().locator('td').first()).toHaveText('01')
  })

  test('history is paginated', async ({ page }) => {
    await openApp(page, { hash: 'history', scenario: 'manyPages' })
    await expect(page.locator('.log-table tbody tr')).toHaveCount(5)
    await expect(page.getByText('Page 1 of 5')).toBeVisible()
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('Page 2 of 5')).toBeVisible()
  })

  test('shows a loading state while waiting', async ({ page }) => {
    await openApp(page, { hash: 'menu', scenario: 'slow' })
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByText('Loading the ranking…')).toBeVisible()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(5, { timeout: 8_000 })
  })

  test('shows empty states', async ({ page }) => {
    await openApp(page, { hash: 'menu', scenario: 'empty' })
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByText('No battles with these settings yet.')).toBeVisible()
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByText('No battles recorded yet.')).toBeVisible()
  })

  test('a failing ranking shows an error, history still works, retry recovers', async ({
    page,
  }) => {
    await openApp(page, { hash: 'menu', scenario: 'rankingFails' })
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText("Couldn't load the ranking.")

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByText('No battles recorded yet.')).toBeVisible()

    await page.getByRole('tab', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText("Couldn't load the ranking.")
    await setScenarioWithoutRefresh(page, 'normal')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(5)
  })

  test('when the server recovers, open tabs refresh on their own', async ({ page }) => {
    await openApp(page, { hash: 'menu', scenario: 'rankingFails' })
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText("Couldn't load the ranking.")
    // Switching scenarios invalidates the cache, so the ranking reloads without a click.
    await setScenario(page, 'normal')
    await expect(page.locator('.log-table tbody tr')).toHaveCount(5)
  })

  test('a failing history shows an error with a retry', async ({ page }) => {
    await openApp(page, { hash: 'menu', scenario: 'historyFails' })
    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.getByRole('alert')).toContainText("Couldn't load your history.")
    await setScenarioWithoutRefresh(page, 'normal')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('No battles recorded yet.')).toBeVisible()
  })

  test('connection failures and timeouts are reported, the game is still playable', async ({
    page,
  }) => {
    await openApp(page, { hash: 'menu', scenario: 'connectionFailure' })
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not reach the server.')
    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.waitForFunction(
      () =>
        (window as unknown as { pirateTest?: { getState: () => { status: string } | null } })
          .pirateTest?.getState()?.status === 'running',
    )
  })
})
