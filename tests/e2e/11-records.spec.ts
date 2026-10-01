import {
  test,
  expect,
  openApp,
  startBattle,
  scoreOnePoint,
  finishByTime,
  setScenario,
  NO_SPAWNS,
} from './helpers'

const SIXTY = { settings: { sessionTime: 60, spawnInterval: 3 }, testConfig: NO_SPAWNS }

test.describe('Recording finished battles', () => {
  test('a finished battle appears once in both tabs', async ({ page }) => {
    await openApp(page, SIXTY)
    await startBattle(page)
    await scoreOnePoint(page)
    await finishByTime(page)
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()

    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByText('60 second battles · 3 second spawn interval')).toBeVisible()
    const mine = page.locator('.log-table tbody tr.is-you')
    await expect(mine).toHaveCount(1)
    await expect(mine.locator('td:nth-child(3)')).toHaveText('1')

    await page.getByRole('tab', { name: 'Match History' }).click()
    const rows = page.locator('.log-table tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText("Time's up")
    await expect(rows.first().locator('td:nth-child(2)')).toHaveText('1')
  })

  test('a battle that could not be saved survives a reload and is saved after recovery', async ({
    page,
  }) => {
    await openApp(page, { ...SIXTY, scenario: 'saveUnavailable' })
    await startBattle(page)
    await finishByTime(page)
    await expect(page.getByText(/Not saved yet/)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible()
    await expect(page.getByText(/Not saved yet/)).toBeVisible()

    // It is listed as waiting in the history too.
    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.getByRole('region', { name: 'Battles waiting to be saved' })).toContainText(
      'Not saved',
    )

    await setScenario(page, 'normal')
    await page.getByRole('region', { name: 'Battles waiting to be saved' })
      .getByRole('button', { name: 'Try again' })
      .click()
    await expect(page.getByRole('region', { name: 'Battles waiting to be saved' })).toBeHidden()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(1)
  })

  test('a battle still sending when the page reloads is sent again automatically', async ({
    page,
  }) => {
    await openApp(page, { ...SIXTY, scenario: 'timeout' })
    await startBattle(page)
    await finishByTime(page)
    await expect(page.getByText("Saving to the captain's log…")).toBeVisible()

    await setScenario(page, 'normal')
    await page.reload()
    await expect(page.getByText("Saved to the captain's log.")).toBeVisible()
    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.locator('.log-table tbody tr')).toHaveCount(1)
  })

  test('another battle can start while a record is pending', async ({ page }) => {
    await openApp(page, { ...SIXTY, scenario: 'saveUnavailable' })
    await startBattle(page)
    await finishByTime(page)
    await page.getByRole('button', { name: 'Play again' }).click()
    await page.waitForFunction(
      () =>
        (window as unknown as { pirateTest?: { getState: () => { status: string } | null } })
          .pirateTest?.getState()?.status === 'running',
    )
  })
})
