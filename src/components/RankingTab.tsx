import { useState } from 'react'
import { useRankingQuery } from '../api/queries'
import type { GameSettings } from '../settings/settings'
import { getPlayer } from '../records/player'
import { Pagination } from './Pagination'
import { QueryState } from './QueryState'
import { formatDate } from './format'

const PAGE_SIZE = 5

export function RankingTab({ settings }: { settings: GameSettings }) {
  const [page, setPage] = useState(1)
  const player = getPlayer()
  const query = useRankingQuery({
    sessionTime: settings.sessionTime,
    spawnInterval: settings.spawnInterval,
    page,
    pageSize: PAGE_SIZE,
  })
  const data = query.data

  return (
    <div className="log-tab">
      <p className="log-subtitle">
        {settings.sessionTime} second battles · {settings.spawnInterval} second spawn interval
      </p>

      <QueryState
        isPending={query.isPending}
        error={query.isError && !data ? query.error : null}
        isEmpty={data?.totalItems === 0}
        isFetching={query.isFetching}
        loadingText="Loading the ranking…"
        emptyText="No battles with these settings yet. Play one to claim the top spot."
        errorTitle="Couldn't load the ranking."
        onRetry={() => void query.refetch()}
      >
        {query.isError && (
          <p className="log-warning" role="alert">
            Showing saved results. The latest ranking couldn't be loaded.
          </p>
        )}
        <table className="log-table">
          <caption className="sr-only">Ranking, page {data?.page}</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Captain</th>
              <th scope="col">Points</th>
              <th scope="col">Played</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((entry) => {
              const isYou = entry.playerId === player.id
              return (
                <tr key={entry.matchId} className={isYou ? 'is-you' : undefined}>
                  <td>{entry.rank.toString().padStart(2, '0')}</td>
                  <td>
                    {entry.playerName}
                    {isYou && <span className="badge">You</span>}
                  </td>
                  <td>{entry.score}</td>
                  <td>{formatDate(entry.finishedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data && (
          <Pagination
            label="Ranking pages"
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
          />
        )}
      </QueryState>
    </div>
  )
}
