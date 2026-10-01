import { END_REASON_LABELS, formatClock, type MatchResult } from '../results/lastResult'
import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'
import { ScreenLayout } from '../ui/ScreenLayout'
import { RecordStatus } from '../components/RecordStatus'

interface ResultScreenProps {
  result: MatchResult
  onPlayAgain: () => void
  onMainMenu: () => void
}

export function ResultScreen({ result, onPlayAgain, onMainMenu }: ResultScreenProps) {
  return (
    <ScreenLayout>
      <Panel>
        <div className="panel-content">
          <h1 className="panel-title">Battle complete</h1>
          <p className="result-score">
            <span className="result-score__value">{result.score}</span>
            <span className="result-score__label">{result.score === 1 ? 'point' : 'points'}</span>
          </p>

          <dl className="result-details">
            <div>
              <dt>Time played</dt>
              <dd>{formatClock(result.durationSeconds)}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{END_REASON_LABELS[result.endReason]}</dd>
            </div>
          </dl>

          <p className="panel-note">
            <RecordStatus matchId={result.matchId} />
          </p>

          <div className="menu-actions">
            <MenuButton onClick={onPlayAgain}>Play again</MenuButton>
            <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
          </div>
        </div>
      </Panel>
    </ScreenLayout>
  )
}
