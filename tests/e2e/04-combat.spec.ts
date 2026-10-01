import {
  test,
  expect,
  openApp,
  startBattle,
  advance,
  hold,
  addEnemy,
  getState,
  NO_SPAWNS,
} from './helpers'

test.describe('Combat', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    await startBattle(page)
  })

  test('front cannon fires one projectile and respects its cooldown', async ({ page }) => {
    await page.keyboard.down('Space')
    let state = await advance(page, 0.05)
    expect(state.projectiles.filter((p) => p.team === 'player')).toHaveLength(1)

    // Cooldown is 0.4 s: holding the key does not fire again before that.
    state = await advance(page, 0.3)
    expect(state.projectiles.filter((p) => p.team === 'player')).toHaveLength(1)

    state = await advance(page, 0.1)
    await page.keyboard.up('Space')
    expect(state.projectiles.filter((p) => p.team === 'player')).toHaveLength(2)

    // Projectiles fly in the direction the ship faces (right).
    const [first] = state.projectiles
    expect(first.x).toBeGreaterThan(state.player.x)
  })

  test('side cannons fire three parallel shots to the left and to the right', async ({ page }) => {
    const left = await hold(page, ['KeyQ'], 0.05)
    const leftShots = left.projectiles.filter((p) => p.team === 'player')
    expect(leftShots).toHaveLength(3)
    // Facing right, the left side is up (smaller y).
    for (const shot of leftShots) expect(shot.y).toBeLessThan(left.player.y)
    // Parallel: all three are at the same distance from the ship's side.
    const ys = leftShots.map((s) => s.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.5)

    const right = await hold(page, ['KeyE'], 0.05)
    const rightShots = right.projectiles.filter((p) => p.team === 'player' && p.y > right.player.y)
    expect(rightShots).toHaveLength(3)

    // Side cannon cooldown is 1.5 s.
    const again = await hold(page, ['KeyE'], 0.5)
    expect(again.projectiles.filter((p) => p.team === 'player' && p.y > again.player.y)).toHaveLength(3)
  })

  test('hits damage enemies, a sunk ship scores exactly one point', async ({ page }) => {
    const { player } = await getState(page)
    let state = await addEnemy(page, 'shooter', player.x + 220, player.y, Math.PI)
    const enemy = state.enemies[0]
    expect(enemy.health).toBe(60)

    // One front shot (25 damage) hits once.
    state = await hold(page, ['Space'], 0.6)
    expect(state.enemies[0].health).toBe(35)
    expect(state.score).toBe(0)

    state = await hold(page, ['Space'], 1.5)
    expect(state.enemies).toHaveLength(0)
    expect(state.score).toBe(1)
    await expect(page.getByTestId('hud-score')).toHaveText('1')

    // Keeps firing at nothing: the score does not change.
    state = await hold(page, ['Space'], 2)
    expect(state.score).toBe(1)
  })

  test('enemy shots damage the player', async ({ page }) => {
    const { player } = await getState(page)
    await addEnemy(page, 'shooter', player.x + 300, player.y, Math.PI)
    const state = await advance(page, 4)
    expect(state.player.health).toBeLessThan(state.player.maxHealth)
    await expect(page.getByRole('meter', { name: 'Health' })).not.toHaveAttribute(
      'aria-valuenow',
      String(state.player.maxHealth),
    )
  })

  test('shots disappear when they hit an island', async ({ page }) => {
    // Aim at the big island (to the right, between y 268 and 500).
    await hold(page, ['KeyD'], 0.1)
    let state = await hold(page, ['Space'], 0.05)
    expect(state.projectiles).toHaveLength(1)
    state = await advance(page, 1)
    expect(state.projectiles).toHaveLength(0)
  })
})
