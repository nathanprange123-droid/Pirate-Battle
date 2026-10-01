import { useSyncExternalStore } from 'react'
import type { MatchRecord } from '../api/contracts'
import { isRecord, readJson, writeJson } from '../storage/localStore'

export type SubmissionState = 'pending' | 'submitting' | 'failed'

/** A finished match that the server has not confirmed yet. */
export interface PendingSubmission {
  record: MatchRecord
  state: SubmissionState
  attempts: number
  lastError: string | null
}

const STORAGE_KEY = 'pirate-battle:pending-records:v1'

function parseOutbox(value: unknown): PendingSubmission[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(
    (item): item is PendingSubmission =>
      isRecord(item) && isRecord(item.record) && typeof item.record.matchId === 'string',
  )
}

/**
 * Local queue of match records waiting for the server.
 * It is saved in localStorage, so a failure or a page reload never loses a match.
 * Records leave the queue only when the server confirms them.
 */
class Outbox {
  private items: PendingSubmission[]
  private readonly listeners = new Set<() => void>()

  constructor() {
    // A reload interrupts any request in flight: those go back to "pending".
    this.items = (readJson(STORAGE_KEY, parseOutbox) ?? []).map((item) =>
      item.state === 'submitting' ? { ...item, state: 'pending' } : item,
    )
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): readonly PendingSubmission[] => this.items

  find(matchId: string): PendingSubmission | undefined {
    return this.items.find((item) => item.record.matchId === matchId)
  }

  /** Adding the same match twice is ignored. */
  add(record: MatchRecord): void {
    if (this.find(record.matchId)) return
    this.set([...this.items, { record, state: 'pending', attempts: 0, lastError: null }])
  }

  /**
   * Marks a record as being sent. Returns false if it is already being sent,
   * which prevents double submissions (repeated clicks, React Strict Mode).
   */
  beginSubmit(matchId: string): boolean {
    const item = this.find(matchId)
    if (!item || item.state === 'submitting') return false
    this.patch(matchId, { state: 'submitting', attempts: item.attempts + 1 })
    return true
  }

  markFailed(matchId: string, message: string): void {
    this.patch(matchId, { state: 'failed', lastError: message })
  }

  /** Puts a failed record back in the queue. */
  retry(matchId: string): void {
    const item = this.find(matchId)
    if (item?.state === 'failed') this.patch(matchId, { state: 'pending', lastError: null })
  }

  retryAllFailed(): void {
    for (const item of this.items) this.retry(item.record.matchId)
  }

  confirm(matchId: string): void {
    this.set(this.items.filter((item) => item.record.matchId !== matchId))
  }

  clear(): void {
    this.set([])
  }

  private patch(matchId: string, changes: Partial<PendingSubmission>): void {
    this.set(
      this.items.map((item) =>
        item.record.matchId === matchId ? { ...item, ...changes } : item,
      ),
    )
  }

  private set(items: PendingSubmission[]): void {
    this.items = items
    writeJson(STORAGE_KEY, items)
    for (const listener of this.listeners) listener()
  }
}

export const outbox = new Outbox()

export function usePendingSubmissions(): readonly PendingSubmission[] {
  return useSyncExternalStore(outbox.subscribe, outbox.getSnapshot)
}

/** Sync status of one match: still in the queue, or confirmed by the server. */
export function useSubmissionStatus(matchId: string): PendingSubmission | 'saved' {
  const items = usePendingSubmissions()
  return items.find((item) => item.record.matchId === matchId) ?? 'saved'
}
