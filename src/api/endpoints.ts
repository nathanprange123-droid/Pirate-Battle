import { apiClient } from './client'
import {
  API_PATHS,
  type HistoryQuery,
  type MatchRecord,
  type Page,
  type RankingEntry,
  type RankingQuery,
  type RegisterMatchRequest,
  type RegisterMatchResponse,
} from './contracts'

/** `signal` lets TanStack Query cancel requests that are no longer needed. */
export async function fetchRanking(
  query: RankingQuery,
  signal?: AbortSignal,
): Promise<Page<RankingEntry>> {
  const { data } = await apiClient.get<Page<RankingEntry>>(API_PATHS.ranking, {
    params: query,
    signal,
  })
  return data
}

export async function fetchHistory(
  { playerId, page, pageSize }: HistoryQuery,
  signal?: AbortSignal,
): Promise<Page<MatchRecord>> {
  const { data } = await apiClient.get<Page<MatchRecord>>(API_PATHS.history(playerId), {
    params: { page, pageSize },
    signal,
  })
  return data
}

export async function registerMatch(
  request: RegisterMatchRequest,
): Promise<RegisterMatchResponse> {
  const { data } = await apiClient.post<RegisterMatchResponse>(API_PATHS.matches, request)
  return data
}
