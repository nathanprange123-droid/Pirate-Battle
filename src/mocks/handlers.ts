import { delay, http, HttpResponse } from 'msw'
import {
  API_PATHS,
  compareHistory,
  compareRanking,
  sameConfig,
  type MatchRecord,
  type Page,
  type RankingEntry,
  type RegisterMatchResponse,
} from '../api/contracts'
import { createRandom } from '../game/simulation/random'
import { allRecords, upsertRecord } from './db'
import { playerHistoryFixtures } from './fixtures'
import { getScenario } from './scenarios'

/** Normal latency, fixed so runs are reproducible. */
const BASE_DELAY_MS = 150
const LATENCY_SEED = 42

let requestCount = 0
let random = createRandom(LATENCY_SEED)

/** Restores counters and the latency sequence (used by the reset button and tests). */
export function resetNetworkState(): void {
  requestCount = 0
  random = createRandom(LATENCY_SEED)
}

type Endpoint = 'ranking' | 'history' | 'save'

function errorResponse(status: number, message: string) {
  return HttpResponse.json({ error: message }, { status })
}

/**
 * Applies the active scenario. Returns a response to send instead of the real one,
 * or null to continue normally (possibly after a delay).
 */
async function applyScenario(endpoint: Endpoint) {
  requestCount += 1
  switch (getScenario()) {
    case 'slow':
      await delay(2500)
      return null
    case 'variableLatency':
      await delay(200 + Math.floor(random() * 2800))
      return null
    case 'outOfOrder':
      await delay(requestCount % 2 === 1 ? 3000 : 300)
      return null
    case 'timeout':
      await delay('infinite')
      return null
    case 'connectionFailure':
      return HttpResponse.error()
    case 'clientError':
      return errorResponse(422, 'Unprocessable request')
    case 'serverError':
      return errorResponse(503, 'Service unavailable')
    case 'rankingFails':
      await delay(BASE_DELAY_MS)
      return endpoint === 'ranking' ? errorResponse(500, 'Ranking unavailable') : null
    case 'historyFails':
      await delay(BASE_DELAY_MS)
      return endpoint === 'history' ? errorResponse(500, 'History unavailable') : null
    case 'saveUnavailable':
      await delay(BASE_DELAY_MS)
      return endpoint === 'save' ? errorResponse(503, 'Saving unavailable') : null
    default:
      await delay(BASE_DELAY_MS)
      return null
  }
}

function readPaging(url: URL): { page: number; pageSize: number } | null {
  const page = Number(url.searchParams.get('page') ?? 1)
  const pageSize = Number(url.searchParams.get('pageSize') ?? 5)
  const valid =
    Number.isInteger(page) && page >= 1 && Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 50
  return valid ? { page, pageSize } : null
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageSize,
    totalItems: items.length,
    totalPages,
  }
}

function isMatchRecord(value: unknown): value is MatchRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  const config = r.config as Record<string, unknown> | undefined
  return (
    typeof r.matchId === 'string' &&
    r.matchId.length > 0 &&
    typeof r.playerId === 'string' &&
    typeof r.playerName === 'string' &&
    typeof r.finishedAt === 'string' &&
    typeof r.score === 'number' &&
    r.score >= 0 &&
    typeof r.durationSeconds === 'number' &&
    (r.endReason === 'timeUp' || r.endReason === 'playerDestroyed') &&
    typeof config?.sessionTime === 'number' &&
    typeof config?.spawnInterval === 'number'
  )
}

export const handlers = [
  http.get(API_PATHS.ranking, async ({ request }) => {
    const override = await applyScenario('ranking')
    if (override) return override

    const url = new URL(request.url)
    const paging = readPaging(url)
    const config = {
      sessionTime: Number(url.searchParams.get('sessionTime')),
      spawnInterval: Number(url.searchParams.get('spawnInterval')),
    }
    if (!paging || !config.sessionTime || !config.spawnInterval) {
      return errorResponse(400, 'Invalid ranking query')
    }

    const records = getScenario() === 'empty' ? [] : allRecords()
    const ranked: RankingEntry[] = records
      .filter((record) => sameConfig(record.config, config))
      .sort(compareRanking)
      .map((record, index) => ({
        rank: index + 1,
        matchId: record.matchId,
        playerId: record.playerId,
        playerName: record.playerName,
        score: record.score,
        durationSeconds: record.durationSeconds,
        finishedAt: record.finishedAt,
      }))

    return HttpResponse.json<Page<RankingEntry>>(paginate(ranked, paging.page, paging.pageSize))
  }),

  http.get(API_PATHS.historyPattern, async ({ request, params }) => {
    const override = await applyScenario('history')
    if (override) return override

    const paging = readPaging(new URL(request.url))
    if (!paging) return errorResponse(400, 'Invalid history query')

    const playerId = String(params.playerId)
    const scenario = getScenario()
    let records = scenario === 'empty' ? [] : allRecords().filter((r) => r.playerId === playerId)

    if (scenario === 'manyPages') {
      const name = records[0]?.playerName ?? 'Captain'
      records = [...records, ...playerHistoryFixtures({ id: playerId, name })]
    }

    records.sort(compareHistory)
    return HttpResponse.json<Page<MatchRecord>>(paginate(records, paging.page, paging.pageSize))
  }),

  http.post(API_PATHS.matches, async ({ request }) => {
    const override = await applyScenario('save')
    if (override) return override

    const body: unknown = await request.json().catch(() => null)
    if (!isMatchRecord(body)) return errorResponse(422, 'Invalid match record')

    // Idempotent: the same matchId always maps to the same stored record.
    const result = upsertRecord(body)

    if (getScenario() === 'timeoutAfterSave' && result.created) {
      // Saved on the server, but the answer never arrives: the client must retry.
      await delay('infinite')
    }

    return HttpResponse.json<RegisterMatchResponse>(result, {
      status: result.created ? 201 : 200,
    })
  }),
]
