import { useState } from 'react'
import { useHistoryQuery } from '../api/queries'
import { getPlayer } from '../records/player'
import { usePendingSubmissions } from '../records/outbox'
import { END_REASON_LABELS, formatClock } from '../results/lastResult'
import { Pagination } from './Pagination'
import { QueryState } from './QueryState'
import { RecordStatus } from './RecordStatus'
import { formatDate } from './format'

const PAGE_SIZE = 5

export function HistoryTab() {
  const [page, setPage] = useState(1)
  const player = getPlayer()
  const pending = usePendingSubmissions()
  const query = useHistoryQuery({ playerId: player.id, page, pageSize: PAGE_SIZE })
  const data = query.data

  return (
    <div className="log-tab">
      <p className="log-subtitle">{player.name} · your recent battles</p>

      {pending.length > 0 && (
        <section className="pending-list" aria-label="Battles waiting to be saved">
          {pending.map((item) => (
            <div key={item.record.matchId} className="pending-item">
              <span>
                {formatDate(item.record.finishedAt)} · {item.record.score} points
              </span>
              <RecordStatus matchId={item.record.matchId} compact />
            </div>
          ))}
        </section>
      )}

      <QueryState
        isPending={query.isPending}
        error={query.isError && !data ? query.error : null}
        isEmpty={data?.totalItems === 0}
        isFetching={query.isFetching}
        loadingText="Loading your history…"
        emptyText="No battles recorded yet. Your finished battles will appear here."
        errorTitle="Couldn't load your history."
        onRetry={() => void query.refetch()}
      >
        {query.isError && (
          <p className="log-warning" role="alert">
            Showing saved results. The latest history couldn't be loaded.
          </p>
        )}
        <table className="log-table">
          <caption className="sr-only">Match history, page {data?.page}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Points</th>
              <th scope="col">Duration</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((record) => (
              <tr key={record.matchId}>
                <td>{formatDate(record.finishedAt)}</td>
                <td>{record.score}</td>
                <td>{formatClock(record.durationSeconds)}</td>
                <td>{END_REASON_LABELS[record.endReason]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && (
          <Pagination
            label="History pages"
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
          />
        )}
      </QueryState>
    </div>
  )
}
