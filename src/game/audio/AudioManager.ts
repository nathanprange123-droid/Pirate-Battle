import { readJson, writeJson } from '../../storage/localStore'

const SOUND_IDS = [
  'cannon_broadside',
  'cannon_fire_1',
  'cannon_fire_2',
  'cannon_fire_3',
  'cannonball_water_hit_1',
  'cannonball_water_hit_2',
  'game_complete',
  'game_over',
  'game_pause',
  'game_resume',
  'game_start',
  'health_low',
  'ocean_ambience_loop',
  'score_point',
  'ship_collision',
  'ship_explosion_1',
  'ship_explosion_2',
  'ship_sailing_loop',
  'ship_sinking',
  'ship_wood_hit_1',
  'ship_wood_hit_2',
  'time_warning',
  'ui_back',
  'ui_click',
  'ui_close',
  'ui_hover',
  'ui_open',
] as const

export type SoundId = (typeof SOUND_IDS)[number]

const MUTE_KEY = 'pirate-battle:audio-muted:v1'
/** The same sound is not restarted more often than this (avoids harsh stacking). */
const MIN_GAP_SECONDS = 0.04

interface Loop {
  source: AudioBufferSourceNode
  gain: GainNode
}

function soundUrl(id: SoundId): string {
  return `${import.meta.env.BASE_URL}assets/sounds/${id}.wav`
}

/**
 * Plays the WAV files with the Web Audio API.
 * Sound is optional: if the browser blocks audio or a file fails to load,
 * the game simply continues in silence.
 */
class AudioManager {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private loadPromise: Promise<void> | null = null
  private muted = readJson(MUTE_KEY, (value) => (typeof value === 'boolean' ? value : null)) ?? false
  private readonly buffers = new Map<SoundId, AudioBuffer>()
  private readonly lastPlayed = new Map<SoundId, number>()
  private readonly loops = new Map<SoundId, Loop>()
  /** Loops that should be playing; started as soon as their file is ready. */
  private readonly wantedLoops = new Map<SoundId, number>()

  /** Browsers only allow audio after a user gesture, so this runs on the first click or key. */
  unlock(): void {
    if (typeof window.AudioContext === 'undefined') return
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => undefined)
    }
    this.loadPromise ??= this.loadAll()
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    writeJson(MUTE_KEY, muted)
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.05)
    }
  }

  play(id: SoundId, volume = 1): void {
    const context = this.context
    const buffer = this.buffers.get(id)
    if (!context || !this.master || !buffer || context.state !== 'running') return

    const last = this.lastPlayed.get(id) ?? -Infinity
    if (context.currentTime - last < MIN_GAP_SECONDS) return
    this.lastPlayed.set(id, context.currentTime)

    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = volume
    source.connect(gain).connect(this.master)
    source.onended = () => gain.disconnect()
    source.start()
  }

  playOneOf(ids: readonly SoundId[], volume = 1): void {
    this.play(ids[Math.floor(Math.random() * ids.length)], volume)
  }

  startLoop(id: SoundId, volume: number): void {
    this.wantedLoops.set(id, volume)
    this.startLoopSource(id)
  }

  setLoopVolume(id: SoundId, volume: number): void {
    if (!this.wantedLoops.has(id)) return
    this.wantedLoops.set(id, volume)
    const loop = this.loops.get(id)
    if (loop && this.context) {
      loop.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.15)
    }
  }

  stopLoop(id: SoundId): void {
    this.wantedLoops.delete(id)
    const loop = this.loops.get(id)
    if (!loop) return
    loop.source.stop()
    loop.gain.disconnect()
    this.loops.delete(id)
  }

  private startLoopSource(id: SoundId): void {
    const context = this.context
    const buffer = this.buffers.get(id)
    const volume = this.wantedLoops.get(id)
    if (!context || !this.master || !buffer || volume === undefined || this.loops.has(id)) return

    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.loop = true
    gain.gain.value = volume
    source.connect(gain).connect(this.master)
    source.start()
    this.loops.set(id, { source, gain })
  }

  private async loadAll(): Promise<void> {
    const context = this.context
    if (!context) return
    let failures = 0

    await Promise.all(
      SOUND_IDS.map(async (id) => {
        try {
          const response = await fetch(soundUrl(id))
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const buffer = await context.decodeAudioData(await response.arrayBuffer())
          this.buffers.set(id, buffer)
          this.startLoopSource(id)
        } catch {
          failures += 1
        }
      }),
    )

    if (failures > 0) {
      console.warn(`${failures} sound file(s) could not be loaded; continuing without them.`)
    }
  }
}

export const audio = new AudioManager()
