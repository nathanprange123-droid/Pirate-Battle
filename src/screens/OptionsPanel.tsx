import { useState } from 'react'
import {
  SETTING_LIMITS,
  saveSettings,
  validateSetting,
  type GameSettings,
} from '../settings/settings'
import { Stepper } from '../ui/Stepper'
import { MenuButton } from '../ui/MenuButton'
import { audio } from '../game/audio/AudioManager'

interface OptionsPanelProps {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
  backLabel: string
  onBack: () => void
  /** Shown when opened during a match. */
  note?: string
}

/** Options form. Every valid change is saved right away and survives a page reload. */
export function OptionsPanel({ settings, onChange, backLabel, onBack, note }: OptionsPanelProps) {
  const [saveFailed, setSaveFailed] = useState(false)
  const [soundOn, setSoundOn] = useState(() => !audio.isMuted())

  const update = (key: keyof GameSettings, value: number) => {
    const next = { ...settings, [key]: value }
    setSaveFailed(!saveSettings(next))
    onChange(next)
  }

  return (
    <div className="panel-content">
      <h1 className="panel-title" id="options-title">
        Options
      </h1>
      {note && <p className="panel-note">{note}</p>}

      <Stepper
        label="Game session time"
        unit="s"
        value={settings.sessionTime}
        limits={SETTING_LIMITS.sessionTime}
        validate={(value) => validateSetting('sessionTime', value)}
        onCommit={(value) => update('sessionTime', value)}
      />
      <Stepper
        label="Enemy spawn time"
        unit="s"
        value={settings.spawnInterval}
        limits={SETTING_LIMITS.spawnInterval}
        validate={(value) => validateSetting('spawnInterval', value)}
        onCommit={(value) => update('spawnInterval', value)}
      />

      <label className="toggle">
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(event) => {
            audio.unlock()
            audio.setMuted(!event.target.checked)
            setSoundOn(event.target.checked)
          }}
        />
        <span>Sound</span>
      </label>

      <p className="panel-note" role="status">
        {saveFailed
          ? 'Options apply now but could not be saved on this device.'
          : 'Changes are saved automatically and apply to the next battle.'}
      </p>

      <MenuButton sound="ui_back" onClick={onBack}>
        {backLabel}
      </MenuButton>
    </div>
  )
}
