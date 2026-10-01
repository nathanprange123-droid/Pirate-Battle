import type { EndReason, MatchOutcome } from '../game/simulation/types'
import type { GameSettings } from '../settings/settings'
import { isRecord, readJson, writeJson } from '../storage/localStore'

/** A finished match, as shown on the result screen. */
export interface MatchResult extends MatchOutcome {
  /** Unique id, also used to register the match on the server. */
  matchId: string
  /** ISO date when the match ended. */
  finishedAt: string
  settings: GameSettings
}

const STORAGE_KEY = 'pirate-battle:last-result:v1'

const END_REASONS: readonly EndReason[] = ['timeUp', 'playerDestroyed']

function parseResult(value: unknown): MatchResult | null {
  if (!isRecord(value) || !isRecord(value.settings)) return null
  const { matchId, score, durationSeconds, endReason, finishedAt, settings } = value
  if (typeof matchId !== 'string') return null
  if (typeof score !== 'number' || typeof durationSeconds !== 'number') return null
  if (typeof finishedAt !== 'string') return null
  if (!END_REASONS.includes(endReason as EndReason)) return null
  const { sessionTime, spawnInterval } = settings
  if (typeof sessionTime !== 'number' || typeof spawnInterval !== 'number') return null
  return {
    matchId,
    score,
    durationSeconds,
    endReason: endReason as EndReason,
    finishedAt,
    settings: { sessionTime, spawnInterval },
  }
}

export function loadLastResult(): MatchResult | null {
  return readJson(STORAGE_KEY, parseResult)
}

export function saveLastResult(result: MatchResult): void {
  writeJson(STORAGE_KEY, result)
}

export const END_REASON_LABELS: Record<EndReason, string> = {
  timeUp: "Time's up",
  playerDestroyed: 'Ship sunk',
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
