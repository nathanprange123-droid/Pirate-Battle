import type { HudSnapshot } from '../game/HudStore'
import { formatClock } from '../results/lastResult'

interface HudProps {
  hud: HudSnapshot
  onPause: () => void
}

/** Fill image geometry from ui_sheet.json (health_fill_*: fill_rect x 30, w 196 of 256). */
const FILL_START = 30
const FILL_WIDTH = 196
const IMAGE_WIDTH = 256

function fillColor(ratio: number): string {
  if (ratio > 0.5) return 'green'
  if (ratio > 0.25) return 'amber'
  return 'red'
}

export function Hud({ hud, onPause }: HudProps) {
  const ratio = hud.maxHealth > 0 ? hud.health / hud.maxHealth : 0
  const visibleRight = ((FILL_START + FILL_WIDTH * ratio) / IMAGE_WIDTH) * 100
  const clipPath = `inset(0 ${100 - visibleRight}% 0 0)`

  return (
    <div className="hud" role="group" aria-label="Match status">
      <div
        className="hud-health"
        role="meter"
        aria-label="Health"
        aria-valuemin={0}
        aria-valuemax={hud.maxHealth}
        aria-valuenow={hud.health}
      >
        <span className="hud-health__heart" aria-hidden="true" />
        <span className="hud-health__bar">
          <span
            className={`hud-health__fill hud-health__fill--${fillColor(ratio)}`}
            style={{ clipPath }}
          />
          <span className="hud-health__text" aria-hidden="true">
            {hud.health} / {hud.maxHealth}
          </span>
        </span>
      </div>

      <div className="hud-right">
        <p className="hud-counter">
          <span className="hud-counter__icon hud-counter__icon--score" aria-hidden="true" />
          <span className="sr-only">Score</span>
          <span data-testid="hud-score">{hud.score}</span>
        </p>
        <p className="hud-counter">
          <span className="hud-counter__icon hud-counter__icon--time" aria-hidden="true" />
          <span className="sr-only">Time left</span>
          <span data-testid="hud-time">{formatClock(hud.timeLeft)}</span>
        </p>
        <button
          type="button"
          className="round-icon round-icon--pause"
          aria-label="Pause game"
          onClick={onPause}
          disabled={hud.status !== 'running'}
        />
      </div>
    </div>
  )
}
