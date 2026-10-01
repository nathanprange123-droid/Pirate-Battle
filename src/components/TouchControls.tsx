import type { PointerEvent } from 'react'
import type { GameAction } from '../game/input/actions'
import type { TouchInput } from '../game/input/TouchInput'

interface ControlDef {
  action: GameAction
  icon: string
  label: string
}

const MOVE_CONTROLS: ControlDef[] = [
  { action: 'turnLeft', icon: 'turn-left', label: 'Turn left' },
  { action: 'forward', icon: 'forward', label: 'Sail forward' },
  { action: 'turnRight', icon: 'turn-right', label: 'Turn right' },
]

const FIRE_CONTROLS: ControlDef[] = [
  { action: 'fireLeft', icon: 'fire-left', label: 'Fire left broadside' },
  { action: 'fireFront', icon: 'fire-front', label: 'Fire front cannon' },
  { action: 'fireRight', icon: 'fire-right', label: 'Fire right broadside' },
]

interface TouchControlsProps {
  touch: TouchInput
}

/**
 * On-screen buttons. Holding a button keeps the action active, and several
 * buttons can be held at once (for example, sail and fire with two thumbs).
 */
export function TouchControls({ touch }: TouchControlsProps) {
  const renderButton = ({ action, icon, label }: ControlDef) => {
    const release = () => touch.release(action)
    const press = (event: PointerEvent<HTMLButtonElement>) => {
      try {
        // Keeps receiving "up" even if the finger slides off the button.
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Synthetic pointers (some test tools) cannot be captured; holding still works.
      }
      touch.press(action)
    }
    return (
      <button
        key={action}
        type="button"
        tabIndex={-1}
        aria-label={label}
        data-action={action}
        className={`round-icon round-icon--${icon} touch-button`}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
      />
    )
  }

  return (
    <div className="touch-controls">
      <div className="touch-controls__group" role="group" aria-label="Movement">
        {MOVE_CONTROLS.map(renderButton)}
      </div>
      <div className="touch-controls__group" role="group" aria-label="Cannons">
        {FIRE_CONTROLS.map(renderButton)}
      </div>
    </div>
  )
}
