import type { MatchRecord } from '../api/contracts'
import { readJson, writeJson } from '../storage/localStore'
import { FIXTURE_RECORDS } from './fixtures'

const STORAGE_KEY = 'pirate-battle:mock-db:v1'

/** Records confirmed by the mock server, kept in localStorage across reloads. */
function loadStored(): MatchRecord[] {
  return readJson(STORAGE_KEY, (value) => (Array.isArray(value) ? (value as MatchRecord[]) : null)) ?? []
}

export function allRecords(): MatchRecord[] {
  return [...FIXTURE_RECORDS, ...loadStored()]
}

/** Stores the record unless one with the same matchId already exists. */
export function upsertRecord(record: MatchRecord): { record: MatchRecord; created: boolean } {
  const existing = allRecords().find((item) => item.matchId === record.matchId)
  if (existing) return { record: existing, created: false }
  writeJson(STORAGE_KEY, [...loadStored(), record])
  return { record, created: true }
}

export function resetDb(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
