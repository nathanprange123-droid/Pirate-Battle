import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { loadSettings, type GameSettings } from './settings/settings'
import { loadLastResult, saveLastResult, type MatchResult } from './results/lastResult'
import { MenuScreen } from './screens/MenuScreen'
import { OptionsScreen } from './screens/OptionsScreen'
import { ResultScreen } from './screens/ResultScreen'
import { LogScreen } from './screens/LogScreen'
import { NetworkLabScreen } from './screens/NetworkLabScreen'
import { RecordSync } from './records/RecordSync'
import { outbox } from './records/outbox'
import { getPlayer } from './records/player'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Panel } from './ui/Panel'
import { MenuButton } from './ui/MenuButton'
import { ScreenLayout } from './ui/ScreenLayout'

/**
 * The battle screen (and PixiJS with it) is a separate download, fetched when
 * the player presses Play. The menus open faster and stay small.
 */
const GameScreen = lazy(() => import('./screens/GameScreen'))

function BattleLoading() {
  return (
    <ScreenLayout>
      <Panel>
        <div className="panel-content" role="status">
          <h1 className="panel-title">Preparing the fleet</h1>
          <p className="panel-note">Loading the battle…</p>
        </div>
      </Panel>
    </ScreenLayout>
  )
}

const TITLES = {
  menu: 'Pirate Battle',
  options: 'Options · Pirate Battle',
  play: 'Battle · Pirate Battle',
  result: 'Battle complete · Pirate Battle',
  ranking: 'Ranking · Pirate Battle',
  history: 'Match history · Pirate Battle',
  network: 'Network lab · Pirate Battle',
} as const

export default function App() {
  const [route, navigate] = useHashRoute()
  const [settings, setSettings] = useState<GameSettings>(loadSettings)
  const [lastResult, setLastResult] = useState<MatchResult | null>(loadLastResult)
  // A new key for every match, so "Play again" always creates a fresh game.
  const [matchId, setMatchId] = useState(0)

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  const goToMenu = () => navigate('menu')

  const startMatch = () => {
    setMatchId((id) => id + 1)
    navigate('play')
  }

  const finishMatch = (result: MatchResult) => {
    const player = getPlayer()
    // Queue the record first: it is sent in the background and survives reloads.
    outbox.add({
      matchId: result.matchId,
      playerId: player.id,
      playerName: player.name,
      finishedAt: result.finishedAt,
      score: result.score,
      durationSeconds: result.durationSeconds,
      endReason: result.endReason,
      config: { ...result.settings },
    })
    saveLastResult(result)
    setLastResult(result)
    navigate('result')
  }

  let screen: ReactNode
  switch (route) {
    case 'options':
      screen = <OptionsScreen settings={settings} onChange={setSettings} onBack={goToMenu} />
      break
    case 'play':
      screen = (
        <ErrorBoundary
          key={matchId}
          fallback={() => (
            <ScreenLayout>
              <Panel>
                <div className="panel-content" role="alert">
                  <h1 className="panel-title">Couldn't load the battle</h1>
                  <p className="panel-note">
                    Check your connection, then reload the page to download the game again.
                  </p>
                  <div className="menu-actions">
                    <MenuButton onClick={() => window.location.reload()}>Reload</MenuButton>
                    <MenuButton onClick={goToMenu}>Main menu</MenuButton>
                  </div>
                </div>
              </Panel>
            </ScreenLayout>
          )}
        >
          <Suspense fallback={<BattleLoading />}>
            <GameScreen
              settings={settings}
              onSettingsChange={setSettings}
              onFinished={finishMatch}
              onMainMenu={goToMenu}
            />
          </Suspense>
        </ErrorBoundary>
      )
      break
    case 'result':
      screen = lastResult && (
        <ResultScreen result={lastResult} onPlayAgain={startMatch} onMainMenu={goToMenu} />
      )
      break
    case 'ranking':
    case 'history':
      screen = (
        <LogScreen tab={route} settings={settings} onTabChange={navigate} onMainMenu={goToMenu} />
      )
      break
    case 'network':
      screen = <NetworkLabScreen onMainMenu={goToMenu} />
      break
  }

  return (
    <>
      <RecordSync />
      {screen ?? (
        <MenuScreen
          onPlay={startMatch}
          onOptions={() => navigate('options')}
          onRanking={() => navigate('ranking')}
          onHistory={() => navigate('history')}
          onNetworkLab={() => navigate('network')}
        />
      )}
    </>
  )
}
