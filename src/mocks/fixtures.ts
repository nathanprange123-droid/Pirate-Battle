import type { EndReason, MatchConfigKey, MatchRecord } from '../api/contracts'
import { createRandom } from '../game/simulation/random'

/** Other captains in the ranking. Generated from a fixed seed, so they never change. */
const RIVALS = [
  { id: 'fixture-flint', name: 'Captain Flint' },
  { id: 'fixture-sparrow', name: 'Red Sparrow' },
  { id: 'fixture-storm', name: 'Storm Rider' },
  { id: 'fixture-wolf', name: 'Sea Wolf' },
  { id: 'fixture-bonny', name: 'Anne Bonny' },
  { id: 'fixture-hook', name: 'Iron Hook' },
  { id: 'fixture-tide', name: 'Mary Tide' },
  { id: 'fixture-bart', name: 'Black Bart' },
]

const CONFIGS: MatchConfigKey[] = [
  { sessionTime: 120, spawnInterval: 3 },
  { sessionTime: 120, spawnInterval: 3 },
  { sessionTime: 120, spawnInterval: 3 },
  { sessionTime: 60, spawnInterval: 3 },
  { sessionTime: 180, spawnInterval: 2 },
]

const BASE_TIME = Date.parse('2026-09-08T21:00:00Z')
const HOUR = 3_600_000

function makeRecord(
  random: () => number,
  index: number,
  player: { id: string; name: string },
  config: MatchConfigKey,
  idPrefix: string,
): MatchRecord {
  const endReason: EndReason = random() < 0.6 ? 'timeUp' : 'playerDestroyed'
  const durationSeconds =
    endReason === 'timeUp'
      ? config.sessionTime
      : Math.round(config.sessionTime * (0.3 + random() * 0.6))
  const perMinute = 6 + random() * 10
  return {
    matchId: `${idPrefix}-${index.toString().padStart(3, '0')}`,
    playerId: player.id,
    playerName: player.name,
    finishedAt: new Date(BASE_TIME - Math.floor(random() * 200) * HOUR).toISOString(),
    score: Math.round((durationSeconds / 60) * perMinute),
    durationSeconds,
    endReason,
    config,
  }
}

/** 40 rival matches: enough for several ranking pages at the default settings. */
export const FIXTURE_RECORDS: readonly MatchRecord[] = (() => {
  const random = createRandom(2026)
  return Array.from({ length: 40 }, (_, i) =>
    makeRecord(
      random,
      i,
      RIVALS[i % RIVALS.length],
      CONFIGS[Math.floor(random() * CONFIGS.length)],
      'fixture',
    ),
  )
})()

/** Extra history for the local player, used by the "many pages" scenario. */
export function playerHistoryFixtures(player: { id: string; name: string }): MatchRecord[] {
  const random = createRandom(7)
  return Array.from({ length: 23 }, (_, i) =>
    makeRecord(random, i, player, { sessionTime: 120, spawnInterval: 3 }, `fixture-${player.id}`),
  )
}
