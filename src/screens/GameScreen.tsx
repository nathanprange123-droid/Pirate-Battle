import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Game } from '../game/Game'
import { HudStore } from '../game/HudStore'
import { TouchInput } from '../game/input/TouchInput'
import { buildMatchConfig, type GameSettings } from '../settings/settings'
import type { MatchResult } from '../results/lastResult'
import { Hud } from '../components/Hud'
import { TouchControls } from '../components/TouchControls'
import { PauseDialog } from '../components/PauseDialog'
import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'
import {
  applyTestConfig,
  isTestMode,
  manualClockEnabled,
  perfEnabled,
  testSeed,
} from '../testing/testMode'
import { PerfRecorder, type PerfReport } from '../game/perf/PerfRecorder'
import type { EnemyKind } from '../game/simulation/types'

declare global {
  interface Window {
    /** Test hooks, present only with ?e2e while a battle screen is open. */
    pirateTest?: {
      getState: () => ReturnType<Game['getDebugState']>
      advance: (seconds: number) => void
      addEnemy: (kind: EnemyKind, x: number, y: number, angle?: number) => void
    }
    /** Performance recorder, present with ?perf while a battle screen is open. */
    piratePerf?: { report: () => PerfReport; reset: () => void }
  }
}

/** Time to watch the final explosion before showing the result screen. */
const RESULT_DELAY_MS = 1500

interface GameScreenProps {
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
  onFinished: (result: MatchResult) => void
  onMainMenu: () => void
}

export default function GameScreen({
  settings,
  onSettingsChange,
  onFinished,
  onMainMenu,
}: GameScreenProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [hudStore] = useState(() => new HudStore())
  const [touch] = useState(() => new TouchInput())
  // The match uses the settings it started with, even if they change in the pause menu.
  const [matchSettings] = useState(settings)
  const [attempt, setAttempt] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot)

  // Create the game once per attempt and destroy it when leaving the screen.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const perf = perfEnabled ? new PerfRecorder() : undefined
    const game = new Game({
      config: applyTestConfig(buildMatchConfig(matchSettings)),
      hud: hudStore,
      touch,
      seed: testSeed(),
      manualClock: manualClockEnabled,
      perf,
    })
    if (perf) {
      window.piratePerf = { report: () => perf.report(), reset: () => perf.reset() }
    }
    gameRef.current = game
    if (isTestMode) {
      window.pirateTest = {
        getState: () => game.getDebugState(),
        advance: (seconds) => game.advance(seconds),
        addEnemy: (kind, x, y, angle) => game.addEnemy(kind, x, y, angle),
      }
    }
    game.mount(host).catch((error: unknown) => {
      if (gameRef.current !== game) return
      console.warn('Could not start the battle:', error)
      hudStore.update({ status: 'error' })
    })

    return () => {
      game.destroy()
      if (gameRef.current === game) gameRef.current = null
      if (isTestMode) delete window.pirateTest
      // window.piratePerf is kept after leaving, so the last battle's report can still be read.
    }
  }, [hudStore, touch, matchSettings, attempt])

  // Keep the latest callback without restarting the effect below.
  const onFinishedRef = useRef(onFinished)
  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  // When the match ends, wait a moment and then report the result.
  const outcome = hud.outcome
  useEffect(() => {
    if (!outcome) return
    const timer = window.setTimeout(() => {
      onFinishedRef.current({
        ...outcome,
        matchId: crypto.randomUUID(),
        finishedAt: new Date().toISOString(),
        settings: matchSettings,
      })
    }, RESULT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [outcome, matchSettings])

  // P and Esc toggle the pause.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyP' && event.code !== 'Escape') return
      const { status } = hudStore.getSnapshot()
      if (status === 'running') {
        event.preventDefault()
        gameRef.current?.pause()
      } else if (status === 'paused') {
        event.preventDefault()
        if (showOptions) setShowOptions(false)
        else gameRef.current?.resume()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hudStore, showOptions])

  // Mobile is landscape only: pause when the device turns to portrait.
  useEffect(() => {
    const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)')
    const handleChange = () => {
      if (portrait.matches) gameRef.current?.pause()
    }
    portrait.addEventListener('change', handleChange)
    return () => portrait.removeEventListener('change', handleChange)
  }, [])

  const resume = () => {
    setShowOptions(false)
    gameRef.current?.resume()
  }

  const showHud = hud.status === 'running' || hud.status === 'paused' || hud.status === 'ended'

  return (
    <main className="game-screen" aria-label="Battle">
      <div ref={hostRef} className="game-host" />

      {showHud && (
        <>
          <Hud hud={hud} onPause={() => gameRef.current?.pause()} />
          {hud.status === 'running' && <TouchControls touch={touch} />}
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {hud.status === 'paused' && 'Game paused.'}
        {hud.status === 'ended' && hud.outcome && `Battle over. Score ${hud.outcome.score}.`}
      </p>

      {hud.status === 'loading' && (
        <div className="overlay">
          <Panel>
            <div className="panel-content">
              <h1 className="panel-title">Preparing the fleet</h1>
              <div
                className="progress"
                role="progressbar"
                aria-label="Loading game assets"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hud.loadProgress * 100)}
              >
                <span style={{ width: `${hud.loadProgress * 100}%` }} />
              </div>
              <p className="panel-note">{Math.round(hud.loadProgress * 100)}%</p>
            </div>
          </Panel>
        </div>
      )}

      {hud.status === 'error' && (
        <div className="overlay">
          <div role="alertdialog" aria-modal="true" aria-labelledby="load-error-title">
            <Panel>
              <div className="panel-content">
                <h1 className="panel-title" id="load-error-title">
                  Couldn't load the battle
                </h1>
                <p className="panel-note">
                  Some game files did not download. Check your connection and try again.
                </p>
                <div className="menu-actions">
                  <MenuButton onClick={() => setAttempt((n) => n + 1)}>Try again</MenuButton>
                  <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {hud.status === 'paused' && (
        <PauseDialog
          settings={settings}
          onSettingsChange={onSettingsChange}
          onResume={resume}
          onMainMenu={onMainMenu}
          showOptions={showOptions}
          onShowOptions={setShowOptions}
        />
      )}

      <div className="rotate-hint" aria-hidden="true">
        Turn your device sideways to play.
      </div>
    </main>
  )
}
