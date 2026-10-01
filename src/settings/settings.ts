import { DEFAULT_CONFIG, type GameConfig } from '../game/config'
import { isRecord, readJson, writeJson } from '../storage/localStore'

/** The two options the player can change on the Options screen. */
export interface GameSettings {
  /** Match length in seconds. */
  sessionTime: number
  /** Seconds between enemy spawns. */
  spawnInterval: number
}

export interface Limits {
  min: number
  max: number
  step: number
}

export const SETTING_LIMITS: Record<keyof GameSettings, Limits> = {
  sessionTime: { min: 60, max: 180, step: 10 },
  spawnInterval: { min: 0.5, max: 10, step: 0.5 },
}

export const DEFAULT_SETTINGS: GameSettings = {
  sessionTime: DEFAULT_CONFIG.match.duration,
  spawnInterval: DEFAULT_CONFIG.spawn.interval,
}

const STORAGE_KEY = 'pirate-battle:settings:v1'

/** Returns an error message, or null when the value is valid. */
export function validateSetting(key: keyof GameSettings, value: number): string | null {
  const { min, max } = SETTING_LIMITS[key]
  const unit = 'seconds'
  if (!Number.isFinite(value)) return 'Enter a number.'
  if (value < min || value > max) return `Choose a value between ${min} and ${max} ${unit}.`
  if (key === 'sessionTime' && !Number.isInteger(value)) return 'Use whole seconds.'
  return null
}

function parseSettings(value: unknown): GameSettings | null {
  if (!isRecord(value)) return null
  const { sessionTime, spawnInterval } = value
  if (typeof sessionTime !== 'number' || typeof spawnInterval !== 'number') return null
  if (validateSetting('sessionTime', sessionTime)) return null
  if (validateSetting('spawnInterval', spawnInterval)) return null
  return { sessionTime, spawnInterval }
}

export function loadSettings(): GameSettings {
  return readJson(STORAGE_KEY, parseSettings) ?? DEFAULT_SETTINGS
}

export function saveSettings(settings: GameSettings): boolean {
  return writeJson(STORAGE_KEY, settings)
}

/**
 * Builds the configuration snapshot for one match.
 * The match keeps this copy, so changing options later only affects new matches.
 */
export function buildMatchConfig(
  settings: GameSettings,
  base: GameConfig = DEFAULT_CONFIG,
): GameConfig {
  const config = structuredClone(base)
  config.match.duration = settings.sessionTime
  config.spawn.interval = settings.spawnInterval
  return config
}
