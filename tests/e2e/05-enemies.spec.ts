import { test, expect, openApp, startBattle, advance, addEnemy, distance, NO_SPAWNS } from './helpers'

test.describe('Enemies', () => {
  test('a Chaser follows the player and explodes on contact without scoring', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    const start = await startBattle(page)
    await addEnemy(page, 'chaser', start.player.x + 400, start.player.y + 350, Math.PI)

    let state = await advance(page, 1)
    const firstDistance = distance(state.enemies[0], state.player)
    state = await advance(page, 1)
    expect(distance(state.enemies[0], state.player)).toBeLessThan(firstDistance)

    state = await advance(page, 5)
    expect(state.enemies).toHaveLength(0)
    expect(state.player.health).toBe(75) // contact damage 25
    expect(state.score).toBe(0)
  })

  test('a Shooter approaches, stops at range and fires', async ({ page }) => {
    await openApp(page, { testConfig: NO_SPAWNS })
    const start = await startBattle(page)
    // Placed above the big island so its path to the player is clear.
    await addEnemy(page, 'shooter', start.player.x + 700, start.player.y - 180, Math.PI)

    let state = await advance(page, 8)
    const range = distance(state.enemies[0], state.player)
    expect(range).toBeLessThan(240)
    expect(range).toBeGreaterThan(200)

    // Stays at that distance instead of ramming.
    state = await advance(page, 2)
    expect(Math.abs(distance(state.enemies[0], state.player) - range)).toBeLessThan(5)
    expect(state.player.health).toBeLessThan(state.player.maxHealth)
  })

  test('enemies spawn at the configured interval, away from the player and islands', async ({
    page,
  }) => {
    await openApp(page, {
      settings: { sessionTime: 120, spawnInterval: 2 },
      testConfig: { spawn: { firstDelay: 1 } },
    })
    await startBattle(page)

    let state = await advance(page, 0.9)
    expect(state.spawnedCount).toBe(0)

    const kinds: string[] = []
    for (const expected of [1, 2, 3]) {
      const seen = new Set(state.enemies.map((e) => e.id))
      state = await advance(page, expected === 1 ? 0.2 : 2)
      expect(state.spawnedCount).toBe(expected)

      const spawned = state.enemies.find((e) => !seen.has(e.id))
      expect(spawned).toBeDefined()
      if (!spawned) continue
      kinds.push(spawned.kind)
      expect(distance(spawned, state.player)).toBeGreaterThan(330)
      for (const island of state.islands) {
        const inside =
          spawned.x > island.x &&
          spawned.x < island.x + island.width &&
          spawned.y > island.y &&
          spawned.y < island.y + island.height
        expect(inside).toBe(false)
      }
    }
    // Both types appear in every match.
    expect(kinds.slice(0, 2)).toEqual(['chaser', 'shooter'])
  })
})
