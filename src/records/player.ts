import { isRecord, readJson, writeJson } from '../storage/localStore'

export interface PlayerProfile {
  id: string
  name: string
}

const STORAGE_KEY = 'pirate-battle:player:v1'

const NAMES = ['Captain Jack', 'Captain Wren', 'Captain Reyes', 'Captain Okoro', 'Captain Lind']

function parsePlayer(value: unknown): PlayerProfile | null {
  if (!isRecord(value)) return null
  const { id, name } = value
  return typeof id === 'string' && typeof name === 'string' ? { id, name } : null
}

let cached: PlayerProfile | null = null

/** The local player. Created once per browser and kept in localStorage. */
export function getPlayer(): PlayerProfile {
  if (cached) return cached
  const stored = readJson(STORAGE_KEY, parsePlayer)
  if (stored) {
    cached = stored
    return stored
  }
  const created: PlayerProfile = {
    id: crypto.randomUUID(),
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
  }
  writeJson(STORAGE_KEY, created)
  cached = created
  return created
}

/** Used by the network lab reset. */
export function forgetPlayer(): void {
  cached = null
  window.localStorage.removeItem(STORAGE_KEY)
}
