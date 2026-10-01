import { useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { GameSettings } from '../settings/settings'
import { OptionsPanel } from '../screens/OptionsPanel'
import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'

interface PauseDialogProps {
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
  onResume: () => void
  onMainMenu: () => void
  showOptions: boolean
  onShowOptions: (show: boolean) => void
}

export function PauseDialog({
  settings,
  onSettingsChange,
  onResume,
  onMainMenu,
  showOptions,
  onShowOptions,
}: PauseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, true, showOptions ? 'options' : 'pause')

  return (
    <div className="overlay">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={showOptions ? 'options-title' : 'pause-title'}
        tabIndex={-1}
      >
        <Panel>
          {showOptions ? (
            <OptionsPanel
              settings={settings}
              onChange={onSettingsChange}
              backLabel="Back"
              onBack={() => onShowOptions(false)}
              note="Changes apply to the next battle."
            />
          ) : (
            <div className="panel-content">
              <h1 className="panel-title" id="pause-title">
                Paused
              </h1>
              <p className="panel-note">Ready when you are. Press P or Esc to resume.</p>
              <div className="menu-actions">
                <MenuButton sound="ui_close" onClick={onResume}>
                  Resume
                </MenuButton>
                <MenuButton sound="ui_open" onClick={() => onShowOptions(true)}>
                  Options
                </MenuButton>
                <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
