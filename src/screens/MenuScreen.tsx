import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'
import { ScreenLayout } from '../ui/ScreenLayout'
import { ControlsHelp } from '../ui/ControlsHelp'

interface MenuScreenProps {
  onPlay: () => void
  onOptions: () => void
  onRanking: () => void
  onHistory: () => void
  onNetworkLab: () => void
}

export function MenuScreen({
  onPlay,
  onOptions,
  onRanking,
  onHistory,
  onNetworkLab,
}: MenuScreenProps) {
  return (
    <ScreenLayout>
      <Panel>
        <div className="panel-content">
          <h1 className="game-title">
            <img
              src={`${import.meta.env.BASE_URL}assets/png/retina/ui/menu/title_pirate_battle.png`}
              alt="Pirate Battle"
              width={300}
              height={100}
            />
          </h1>
          <p className="tagline">Set sail. Take command.</p>

          <nav className="menu-actions" aria-label="Main menu">
            <MenuButton onClick={onPlay}>Play</MenuButton>
            <MenuButton onClick={onOptions}>Options</MenuButton>
          </nav>

          <ControlsHelp />

          <nav className="menu-tabs" aria-label="Captain's log">
            <MenuButton variant="secondary" onClick={onRanking}>
              Ranking
            </MenuButton>
            <MenuButton variant="secondary" onClick={onHistory}>
              Match History
            </MenuButton>
          </nav>

          <button type="button" className="text-button" onClick={onNetworkLab}>
            Network lab
          </button>
        </div>
      </Panel>
    </ScreenLayout>
  )
}
