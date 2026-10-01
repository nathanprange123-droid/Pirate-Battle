import { useId, useState } from 'react'
import type { Limits } from '../settings/settings'

interface StepperProps {
  label: string
  value: number
  limits: Limits
  unit: string
  validate: (value: number) => string | null
  onCommit: (value: number) => void
}

/**
 * Number field with − and + buttons.
 * The text box accepts typing; invalid values show an error and are not saved.
 */
export function Stepper({ label, value, limits, unit, validate, onCommit }: StepperProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState<string | null>(null)

  const commit = (next: number) => {
    const message = validate(next)
    setError(message)
    if (message === null) {
      setDraft(String(next))
      onCommit(next)
    }
  }

  const stepBy = (direction: 1 | -1) => {
    const base = Number.isFinite(Number(draft)) ? Number(draft) : value
    const next = Math.round((base + direction * limits.step) * 100) / 100
    commit(Math.min(limits.max, Math.max(limits.min, next)))
  }

  return (
    <div className="stepper">
      <label htmlFor={id} className="stepper__label">
        {label}
      </label>
      <div className="stepper__row">
        <button
          type="button"
          className="round-icon round-icon--minus"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => stepBy(-1)}
          disabled={value <= limits.min}
        />
        <span className="stepper__field">
          <input
            id={id}
            inputMode="decimal"
            value={draft}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(Number(draft.replace(',', '.')))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit(Number(draft.replace(',', '.')))
            }}
          />
          <span aria-hidden="true">{unit}</span>
        </span>
        <button
          type="button"
          className="round-icon round-icon--plus"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => stepBy(1)}
          disabled={value >= limits.max}
        />
      </div>
      <p className="stepper__hint">
        {limits.min} to {limits.max} {unit}
      </p>
      <p id={errorId} className="stepper__error" role="alert">
        {error}
      </p>
    </div>
  )
}
