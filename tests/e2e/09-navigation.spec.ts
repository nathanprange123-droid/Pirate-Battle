import { test, expect, openApp, startBattle, advance, getState, NO_SPAWNS } from './helpers'

test.describe('Leaving battles and touch controls', () => {
  test('leaving a battle abandons it: nothing is recorded', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
    await advance(page, 5)

    await page.keyboard.press('KeyP')
    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.getByText('No battles recorded yet.')).toBeVisible()
  })

  test('reloading during a battle ends it and returns to the menu', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
    await advance(page, 5)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    expect(page.url()).toContain('#/menu')

    await page.getByRole('button', { name: 'Match History' }).click()
    await expect(page.getByText('No battles recorded yet.')).toBeVisible()
  })

  test('starting and leaving many times keeps a single clean game', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    for (let round = 0; round < 4; round++) {
      const state = await startBattle(page)
      expect(state.canvasCount).toBe(1)
      expect(state.elapsed).toBe(0)
      await advance(page, 1)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Main menu' }).click()
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
      await expect(page.locator('canvas')).toHaveCount(0)
      expect(await page.evaluate(() => 'pirateTest' in window)).toBe(false)
    }
  })

  test('touch buttons sail, turn and fire', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    const start = await startBattle(page)

    const press = async (name: string) =>
      page.getByRole('button', { name }).dispatchEvent('pointerdown', {
        pointerId: 7,
        pointerType: 'touch',
        isPrimary: true,
      })
    const release = async (name: string) =>
      page.getByRole('button', { name }).dispatchEvent('pointerup', {
        pointerId: 7,
        pointerType: 'touch',
        isPrimary: true,
      })

    await press('Sail forward')
    let state = await advance(page, 1)
    expect(state.player.x - start.player.x).toBeCloseTo(140, 0)
    await release('Sail forward')
    const stopped = await advance(page, 1)
    expect(stopped.player.x).toBe(state.player.x)

    await press('Turn right')
    state = await advance(page, 0.5)
    await release('Turn right')
    expect(state.player.angle).toBeCloseTo(Math.PI / 2, 1)

    await press('Fire front cannon')
    state = await advance(page, 0.05)
    await release('Fire front cannon')
    expect(state.projectiles.filter((p) => p.team === 'player')).toHaveLength(1)

    // Two thumbs: sail and fire at the same time. Facing down, the right side
    // points west, away from the big island (shots that hit an island disappear).
    await press('Sail forward')
    await press('Fire right broadside')
    const both = await advance(page, 0.3)
    expect(both.player.y).toBeGreaterThan(state.player.y)
    const westward = both.projectiles.filter((p) => p.team === 'player' && p.x < both.player.x)
    expect(westward).toHaveLength(3)
    expect((await getState(page)).status).toBe('running')
  })
})
