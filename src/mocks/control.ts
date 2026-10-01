import type { QueryClient } from '@tanstack/react-query'
import { outbox } from '../records/outbox'
import { resetDb } from './db'
import { resetNetworkState } from './handlers'
import { clearScenario, getScenario, setScenario, SCENARIOS, type ScenarioId } from './scenarios'

/** Restores the initial state: no saved battles, no pending ones, normal network. */
export function resetMockServer(queryClient: QueryClient): void {
  resetDb()
  outbox.clear()
  clearScenario()
  resetNetworkState()
  queryClient.clear()
}

export function selectScenario(id: ScenarioId, queryClient: QueryClient): void {
  setScenario(id)
  resetNetworkState()
  // Cached pages came from the old scenario; fetch them again under the new one.
  void queryClient.invalidateQueries()
}

declare global {
  interface Window {
    /** Test and demo hook to drive the mock server from the console or Playwright. */
    pirateNetwork?: {
      scenarios: readonly ScenarioId[]
      getScenario: () => ScenarioId
      setScenario: (id: ScenarioId) => void
      reset: () => void
    }
  }
}

export function exposeNetworkControls(queryClient: QueryClient): void {
  window.pirateNetwork = {
    scenarios: Object.keys(SCENARIOS) as ScenarioId[],
    getScenario,
    setScenario: (id) => selectScenario(id, queryClient),
    reset: () => resetMockServer(queryClient),
  }
}
