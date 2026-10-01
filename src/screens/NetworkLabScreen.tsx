import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SCENARIOS, getScenario, type ScenarioId } from '../mocks/scenarios'
import { resetMockServer, selectScenario } from '../mocks/control'
import { usePendingSubmissions } from '../records/outbox'
import { Panel } from '../ui/Panel'
import { MenuButton } from '../ui/MenuButton'
import { ScreenLayout } from '../ui/ScreenLayout'

/**
 * Developer screen to simulate network conditions for the ranking and history.
 * Everything here only affects the mock server running in this browser.
 */
export function NetworkLabScreen({ onMainMenu }: { onMainMenu: () => void }) {
  const queryClient = useQueryClient()
  const pending = usePendingSubmissions()
  const [current, setCurrent] = useState<ScenarioId>(getScenario)
  const [message, setMessage] = useState('')

  const choose = (id: ScenarioId) => {
    selectScenario(id, queryClient)
    setCurrent(id)
    setMessage(`Scenario changed to ${id}.`)
  }

  const reset = () => {
    resetMockServer(queryClient)
    setCurrent(getScenario())
    setMessage('Mock server reset: saved battles, pending battles and scenario cleared.')
  }

  return (
    <ScreenLayout>
      <Panel wide>
        <div className="panel-content">
          <h1 className="panel-title">Network lab</h1>
          <p className="panel-note">
            Simulates how the ranking and history server behaves. The game itself never depends on it.
          </p>

          <fieldset className="scenario-list">
            <legend>Scenario</legend>
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
              <label key={id} className="scenario-option">
                <input
                  type="radio"
                  name="scenario"
                  value={id}
                  checked={current === id}
                  onChange={() => choose(id)}
                />
                <span>
                  <strong>{id}</strong> {SCENARIOS[id]}
                </span>
              </label>
            ))}
          </fieldset>

          <p className="panel-note">
            Battles waiting to be saved: {pending.length}
          </p>
          <p className="panel-note" role="status">
            {message}
          </p>

          <div className="menu-tabs">
            <MenuButton variant="secondary" onClick={reset}>
              Reset all
            </MenuButton>
            <MenuButton onClick={onMainMenu}>Main menu</MenuButton>
          </div>
        </div>
      </Panel>
    </ScreenLayout>
  )
}
