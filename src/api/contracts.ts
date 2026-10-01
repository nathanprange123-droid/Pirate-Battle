/**
 * Typed contracts shared by the app (Axios client) and the mock server (MSW handlers).
 * Both sides import these types, so they can never drift apart.
 */

export type EndReason = 'timeUp' | 'playerDestroyed'

/** The two settings that define which matches can be compared. */
export interface MatchConfigKey {
  sessionTime: number
  spawnInterval: number
}

/** One finished match, as stored by the server. */
export interface MatchRecord {
  /** Created by the client when the match ends. Re-sending the same id never duplicates. */
  matchId: string
  playerId: string
  playerName: string
  /** ISO date. */
  finishedAt: string
  score: number
  /** Seconds of active play. */
  durationSeconds: number
  endReason: EndReason
  config: MatchConfigKey
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface RankingEntry {
  rank: number
  matchId: string
  playerId: string
  playerName: string
  score: number
  durationSeconds: number
  finishedAt: string
}

export interface RankingQuery extends MatchConfigKey {
  page: number
  pageSize: number
}

export interface HistoryQuery {
  playerId: string
  page: number
  pageSize: number
}

export type RegisterMatchRequest = MatchRecord

export interface RegisterMatchResponse {
  record: MatchRecord
  /** false when the match already existed (a retry); the stored record is returned. */
  created: boolean
}

export interface ApiErrorBody {
  error: string
}

export const API_PATHS = {
  ranking: '/api/ranking',
  history: (playerId: string) => `/api/players/${encodeURIComponent(playerId)}/matches`,
  historyPattern: '/api/players/:playerId/matches',
  matches: '/api/matches',
} as const

/**
 * Ranking order: higher score first; ties go to the match that finished earlier
 * (it reached that score first); a last tie compares matchId so the order is always the same.
 */
export function compareRanking(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    a.finishedAt.localeCompare(b.finishedAt) ||
    a.matchId.localeCompare(b.matchId)
  )
}

/** History order: newest first, matchId as a stable tie-break. */
export function compareHistory(a: MatchRecord, b: MatchRecord): number {
  return b.finishedAt.localeCompare(a.finishedAt) || a.matchId.localeCompare(b.matchId)
}

export function sameConfig(a: MatchConfigKey, b: MatchConfigKey): boolean {
  return a.sessionTime === b.sessionTime && a.spawnInterval === b.spawnInterval
}
