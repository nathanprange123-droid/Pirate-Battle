import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchHistory, fetchRanking } from './endpoints'
import type { HistoryQuery, RankingQuery } from './contracts'

/** Query keys in one place, so invalidation always hits the right caches. */
export const queryKeys = {
  ranking: ['ranking'] as const,
  rankingPage: (query: RankingQuery) => ['ranking', query] as const,
  history: ['history'] as const,
  historyPage: (query: HistoryQuery) => ['history', query] as const,
}

/**
 * Each page has its own cache key, so a slow answer for an old page can never
 * replace the page on screen. keepPreviousData keeps the table visible while the
 * next page loads, and refetchOnMount 'always' refreshes the tab every time it is shown.
 */
export function useRankingQuery(query: RankingQuery) {
  return useQuery({
    queryKey: queryKeys.rankingPage(query),
    queryFn: ({ signal }) => fetchRanking(query, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  })
}

export function useHistoryQuery(query: HistoryQuery) {
  return useQuery({
    queryKey: queryKeys.historyPage(query),
    queryFn: ({ signal }) => fetchHistory(query, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  })
}
