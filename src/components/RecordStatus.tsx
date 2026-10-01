import { outbox, useSubmissionStatus } from '../records/outbox'

interface RecordStatusProps {
  matchId: string
  compact?: boolean
}

/** Shows whether a finished battle reached the captain's log, with a retry when it failed. */
export function RecordStatus({ matchId, compact = false }: RecordStatusProps) {
  const status = useSubmissionStatus(matchId)

  let message: string
  let failed = false
  if (status === 'saved') {
    message = compact ? 'Saved' : "Saved to the captain's log."
  } else if (status.state === 'failed') {
    failed = true
    message = compact ? 'Not saved' : `Not saved yet. ${status.lastError ?? ''}`
  } else {
    message = compact ? 'Saving…' : "Saving to the captain's log…"
  }

  return (
    <span className={`record-status ${failed ? 'is-failed' : ''}`} role="status">
      {message}
      {failed && (
        <button type="button" className="text-button" onClick={() => outbox.retry(matchId)}>
          Try again
        </button>
      )}
    </span>
  )
}
