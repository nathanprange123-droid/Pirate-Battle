import { test, expect, openApp, waitForRunning } from './helpers'

test.describe('Asset loading', () => {
  test('shows progress while the battle assets load', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      ;(window as unknown as { __PIRATE_LOAD_DELAY_MS__: number }).__PIRATE_LOAD_DELAY_MS__ = 1500
    })
    await page.getByRole('button', { name: 'Play', exact: true }).click()

    const progress = page.getByRole('progressbar', { name: 'Loading game assets' })
    await expect(progress).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Preparing the fleet' })).toBeVisible()

    await waitForRunning(page)
    await expect(progress).toBeHidden()
  })

  test('a failed download shows an error and "Try again" starts the battle', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      ;(window as unknown as { __PIRATE_FAIL_NEXT_LOAD__: boolean }).__PIRATE_FAIL_NEXT_LOAD__ = true
    })
    await page.getByRole('button', { name: 'Play', exact: true }).click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText("Couldn't load the battle")
    await expect(page.getByTestId('hud-score')).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Try again' }).click()
    const state = await waitForRunning(page)
    expect(state.canvasCount).toBe(1)
  })

  test('the error screen can go back to the menu', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      ;(window as unknown as { __PIRATE_FAIL_NEXT_LOAD__: boolean }).__PIRATE_FAIL_NEXT_LOAD__ = true
    })
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Main menu' }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  })
})
