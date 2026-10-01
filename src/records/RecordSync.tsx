import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerMatch } from '../api/endpoints'
import { queryKeys } from '../api/queries'
import { describeError } from '../api/errors'
import { outbox, usePendingSubmissions, type PendingSubmission } from './outbox'

/**
 * Sends one pending record. The mutation retries timeouts and server errors;
 * the server treats the same matchId as the same match, so retries never duplicate it.
 */
function Submitter({ item }: { item: PendingSubmission }) {
  const queryClient = useQueryClient()
  const { matchId } = item.record

  const { mutate } = useMutation({
    mutationKey: ['registerMatch', matchId],
    mutationFn: () => registerMatch(item.record),
    onSuccess: async () => {
      outbox.confirm(matchId)
      // Both tabs show this match, so both caches are refreshed.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.ranking }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
      ])
    },
    onError: (error) => outbox.markFailed(matchId, describeError(error)),
  })

  useEffect(() => {
    if (item.state === 'pending' && outbox.beginSubmit(matchId)) {
      mutate()
    }
  }, [item.state, matchId, mutate])

  return null
}

/**
 * Keeps pending records flowing to the server in the background.
 * It never blocks the game: playing another match while records wait is fine.
 */
export function RecordSync() {
  const items = usePendingSubmissions()

  // When the connection comes back, try the failed ones again.
  useEffect(() => {
    const handleOnline = () => outbox.retryAllFailed()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <>
      {items.map((item) => (
        <Submitter key={item.record.matchId} item={item} />
      ))}
    </>
  )
}
