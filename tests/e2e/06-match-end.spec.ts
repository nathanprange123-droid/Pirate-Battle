import {
  test,
  expect,
  openApp,
  startBattle,
  advance,
  hold,
  addEnemy,
  getState,
  scoreOnePoint,
  NO_SPAWNS,
} from './helpers'

test.describe('End of the battle', () => {
  test('ends when the time runs out and everything stops', async ({ page }) => {
    await openApp(page, { settings: { sessionTime: 60, spawnInterval: 3 }, testConfig: NO_SPAWNS })
    await startBattle(page)
    await scoreOnePoint(page)

    let state = await getState(page)
    state = await advance(page, state.timeLeft - 1)
    expect(state.status).toBe('running')

    state = await advance(page, 1.1)
    expect(state.status).toBe('ended')
    expect(state.endReason).toBe('timeUp')
    expect(state.elapsed).toBeCloseTo(60, 1)

    // Nothing moves, fires or scores after the end.
    const frozen = await hold(page, ['KeyW', 'Space'], 2)
    expect(frozen.player).toEqual(state.player)
    expect(frozen.score).toBe(1)
    expect(frozen.elapsed).toBe(state.elapsed)
    expect(frozen.projectiles.length).toBeLessThanOrEqual(state.projectiles.length)

    await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible()
    await expect(page.getByText("Time's up")).toBeVisible()
  })

  test('ends when the player ship sinks', async ({ page }) => {
    await openApp(page, { testConfig: { ...NO_SPAWNS, player: { maxHealth: 20 } } })
    const start = await startBattle(page)
    await addEnemy(page, 'chaser', start.player.x + 150, start.player.y, Math.PI)
    await addEnemy(page, 'shooter', start.player.x + 600, start.player.y - 180, Math.PI)

    const state = await advance(page, 3)
    expect(state.status).toBe('ended')
    expect(state.endReason).toBe('playerDestroyed')
    expect(state.player.health).toBe(0)
    expect(state.score).toBe(0) // the Chaser ramming does not count

    // Enemies stop moving and shooting.
    const later = await advance(page, 2)
    expect(later.enemies).toEqual(state.enemies)
    expect(later.player.health).toBe(0)

    await expect(page.getByText('Ship sunk')).toBeVisible()
  })

  test('"Play again" starts a clean new battle', async ({ page }) => {
    await openApp(page, { settings: { sessionTime: 60, spawnInterval: 3 }, testConfig: NO_SPAWNS })
    const start = await startBattle(page)
    await scoreOnePoint(page)
    await hold(page, ['KeyW'], 1)
    await advance(page, 60)
    await page.getByRole('button', { name: 'Play again' }).click()

    await page.waitForFunction(() => {
      const w = window as unknown as {
        pirateTest?: { getState: () => { status: string; score: number; elapsed: number } | null }
      }
      const s = w.pirateTest?.getState()
      return s?.status === 'running' && s.elapsed === 0
    })
    const fresh = await getState(page)
    expect(fresh.score).toBe(0)
    expect(fresh.timeLeft).toBe(60)
    expect(fresh.player).toEqual(start.player)
    expect(fresh.enemies).toHaveLength(0)
    expect(fresh.projectiles).toHaveLength(0)
    expect(fresh.canvasCount).toBe(1)
  })
})
