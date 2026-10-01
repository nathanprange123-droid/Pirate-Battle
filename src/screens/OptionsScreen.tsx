import type { GameSettings } from '../settings/settings'
import { Panel } from '../ui/Panel'
import { ScreenLayout } from '../ui/ScreenLayout'
import { OptionsPanel } from './OptionsPanel'

interface OptionsScreenProps {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
  onBack: () => void
}

export function OptionsScreen({ settings, onChange, onBack }: OptionsScreenProps) {
  return (
    <ScreenLayout>
      <Panel>
        <OptionsPanel
          settings={settings}
          onChange={onChange}
          backLabel="Main menu"
          onBack={onBack}
        />
      </Panel>
    </ScreenLayout>
  )
}
