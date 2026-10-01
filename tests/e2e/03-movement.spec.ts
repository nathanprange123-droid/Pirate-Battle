import { test, expect, openApp, startBattle, hold, NO_SPAWNS } from './helpers'

test.describe('Movement', () => {
  test('sails forward and turns both ways', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    const start = await startBattle(page)

    // Player starts facing right (angle 0) at 140 units per second.
    const moved = await hold(page, ['KeyW'], 1)
    expect(moved.player.x - start.player.x).toBeCloseTo(140, 0)
    expect(moved.player.y).toBeCloseTo(start.player.y, 3)

    const right = await hold(page, ['KeyD'], 0.5)
    expect(right.player.angle - moved.player.angle).toBeCloseTo(Math.PI / 2, 1)

    const left = await hold(page, ['ArrowLeft'], 0.5)
    expect(left.player.angle).toBeCloseTo(moved.player.angle, 1)

    // Turning alone does not move the ship.
    expect(left.player.x).toBeCloseTo(moved.player.x, 3)
  })

  test('cannot leave the arena', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
    await hold(page, ['KeyA'], 1) // turn to face left
    const state = await hold(page, ['KeyW'], 6)
    // Stopped at the left edge: the ship radius (24) keeps it fully visible.
    expect(state.player.x).toBeCloseTo(24, 3)
  })

  test('islands block the ship', async ({ page }) => {
    // Start just left of the big island (collision box x 524 to 756, y 268 to 500).
    await openApp(page, {
      testConfig: { ...NO_SPAWNS, player: { spawn: { x: 400, y: 384, angle: 0 } } },
    })
    await startBattle(page)
    const state = await hold(page, ['KeyW'], 3)
    const island = state.islands[0]
    expect(state.player.x).toBeLessThanOrEqual(island.x - 24 + 0.5)
    expect(state.player.x).toBeGreaterThan(400)
  })

  test('can sail and fire at the same time', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    const start = await startBattle(page)
    const state = await hold(page, ['KeyW', 'Space'], 0.5)
    expect(state.player.x).toBeGreaterThan(start.player.x + 50)
    expect(state.projectiles.filter((p) => p.team === 'player').length).toBeGreaterThan(0)
  })
})
