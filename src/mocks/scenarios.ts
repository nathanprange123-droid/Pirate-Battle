import { readJson, writeJson } from '../storage/localStore'

/** Network conditions the mock server can simulate. */
export const SCENARIOS = {
  normal: 'Everything works.',
  empty: 'Ranking and history return empty lists.',
  manyPages: 'Your history gets 23 extra battles, so every tab has several pages.',
  slow: 'Every response takes 2.5 seconds.',
  variableLatency: 'Each response takes between 0.2 and 3 seconds (seeded, reproducible).',
  outOfOrder: 'Odd requests take 3 seconds and even ones 0.3 seconds, so answers arrive out of order.',
  timeout: 'The server never answers, so every request times out.',
  connectionFailure: 'Every request fails as if the network were down.',
  clientError: 'Every request is answered with 422 Unprocessable Entity.',
  serverError: 'Every request is answered with 503 Service Unavailable.',
  rankingFails: 'Only the ranking fails (500). History and saving work.',
  historyFails: 'Only the history fails (500). Ranking and saving work.',
  timeoutAfterSave: 'Saving a battle stores it but never answers. The retry finds it already saved.',
  saveUnavailable: 'Saving a battle fails (503) until you switch back to a working scenario.',
} as const

export type ScenarioId = keyof typeof SCENARIOS

const STORAGE_KEY = 'pirate-battle:network-scenario:v1'

function isScenario(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIOS
}

/**
 * The active scenario lives in localStorage so it survives reloads.
 * It can also be chosen with ?scenario=<id> in the URL (handy for tests and demos).
 */
export function getScenario(): ScenarioId {
  return readJson(STORAGE_KEY, (value) => (isScenario(value) ? value : null)) ?? 'normal'
}

export function setScenario(id: ScenarioId): void {
  writeJson(STORAGE_KEY, id)
}

export function applyScenarioFromUrl(): void {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (isScenario(fromUrl)) setScenario(fromUrl)
}

export function clearScenario(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
