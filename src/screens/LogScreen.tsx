import type { GameSettings } from '../settings/settings'
import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'
import { ScreenLayout } from '../ui/ScreenLayout'
import { RankingTab } from '../components/RankingTab'
import { HistoryTab } from '../components/HistoryTab'

type LogTab = 'ranking' | 'history'

interface LogScreenProps {
  tab: LogTab
  settings: GameSettings
  onTabChange: (tab: LogTab) => void
  onMainMenu: () => void
}

/**
 * Captain's log with the Ranking and Match History tabs.
 * Only the visible tab is mounted, so showing a tab again refreshes its data.
 */
export function LogScreen({ tab, settings, onTabChange, onMainMenu }: LogScreenProps) {
  return (
    <ScreenLayout>
      <Panel wide>
        <div className="panel-content">
          <h1 className="panel-title">Captain's log</h1>
          <div className="menu-tabs" role="tablist" aria-label="Captain's log">
            <MenuButton
              id="tab-ranking"
              role="tab"
              variant="secondary"
              aria-selected={tab === 'ranking'}
              aria-controls="log-panel"
              selected={tab === 'ranking'}
              onClick={() => onTabChange('ranking')}
            >
              Ranking
            </MenuButton>
            <MenuButton
              id="tab-history"
              role="tab"
              variant="secondary"
              aria-selected={tab === 'history'}
              aria-controls="log-panel"
              selected={tab === 'history'}
              onClick={() => onTabChange('history')}
            >
              Match History
            </MenuButton>
          </div>

          <div id="log-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="log-panel">
            {tab === 'ranking' ? <RankingTab settings={settings} /> : <HistoryTab />}
          </div>

          <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
        </div>
      </Panel>
    </ScreenLayout>
  )
}
