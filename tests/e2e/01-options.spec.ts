import { test, expect, openApp, startBattle } from './helpers'

test.describe('Options', () => {
  test('validates values, saves them and keeps them after a reload', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Options' }).click()
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()

    const sessionTime = page.getByLabel('Game session time', { exact: true })
    const spawnTime = page.getByLabel('Enemy spawn time', { exact: true })

    // Invalid values show an error and are not saved.
    await sessionTime.fill('500')
    await sessionTime.press('Enter')
    await expect(page.getByText('Choose a value between 60 and 180 seconds.')).toBeVisible()
    await expect(sessionTime).toHaveAttribute('aria-invalid', 'true')

    await spawnTime.fill('0')
    await spawnTime.press('Enter')
    await expect(page.getByText('Choose a value between 0.5 and 10 seconds.')).toBeVisible()

    // Valid values are saved right away.
    await sessionTime.fill('90')
    await sessionTime.press('Enter')
    await spawnTime.fill('3')
    await spawnTime.press('Enter')
    await page.getByRole('button', { name: 'Increase enemy spawn time' }).click()
    await expect(spawnTime).toHaveValue('3.5')
    await expect(sessionTime).toHaveAttribute('aria-invalid', 'false')

    await page.reload()
    await expect(page.getByLabel('Game session time', { exact: true })).toHaveValue('90')
    await expect(page.getByLabel('Enemy spawn time', { exact: true })).toHaveValue('3.5')

    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  })

  test('a new battle uses the saved session time', async ({ page }) => {
    await openApp(page, { settings: { sessionTime: 90, spawnInterval: 3 } })
    const state = await startBattle(page)
    expect(state.timeLeft).toBe(90)
    await expect(page.getByTestId('hud-time')).toHaveText('01:30')
  })

  test('menus work with the keyboard only', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Options' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
  })
})
