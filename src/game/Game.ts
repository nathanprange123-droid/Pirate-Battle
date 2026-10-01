import { Application, Container, TilingSprite, type Texture, type Ticker } from 'pixi.js'
import type { GameConfig } from './config'
import type { HudStore } from './HudStore'
import { loadGameTextures, type GameTextures } from './assets'
import { testLoadDelay } from '../testing/testMode'
import { PerfRecorder } from './perf/PerfRecorder'
import { World } from './simulation/World'
import { ShipView, type ShipSkin } from './render/ShipView'
import type { HealthBarSkin } from './render/HealthBar'
import { EnemyLayer } from './render/EnemyLayer'
import { EffectLayer } from './render/EffectLayer'
import { SoundDirector } from './audio/SoundDirector'
import { audio } from './audio/AudioManager'
import { createIslandLayer } from './render/IslandView'
import { ProjectileLayer } from './render/ProjectileLayer'
import { KeyboardInput } from './input/KeyboardInput'
import type { TouchInput } from './input/TouchInput'
import { intentFrom } from './input/actions'
import type { EnemyKind, ShipState } from './simulation/types'

/** Upper limit for one frame, so a long freeze does not cause a huge jump. */
const MAX_FRAME_SECONDS = 0.25
const SHAKE_SECONDS = 0.25
const SHAKE_PIXELS = 5

export interface GameOptions {
  /** Snapshot of the configuration for this match. Not changed during the match. */
  config: GameConfig
  hud: HudStore
  touch: TouchInput
  seed?: number
  /** Tests drive the simulation with advance() instead of the screen refresh. */
  manualClock?: boolean
  /** Records frame times and entity counts (performance measurements). */
  perf?: PerfRecorder
}

interface Views {
  player: ShipView
  enemies: EnemyLayer
  projectiles: ProjectileLayer
  effects: EffectLayer
}

/**
 * Owns the Pixi application and connects simulation, rendering and input.
 * Lifecycle: new Game() -> mount(host) -> destroy().
 */
export class Game {
  private readonly config: GameConfig
  private readonly hud: HudStore
  private readonly touch: TouchInput
  private readonly seed: number
  private readonly manualClock: boolean
  private readonly perf: PerfRecorder | null
  private readonly keyboard = new KeyboardInput()
  /** Holds everything in arena coordinates; scaled to fit the screen. */
  private readonly arenaLayer = new Container()
  private readonly sounds = new SoundDirector()
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  private app: Application | null = null
  private world: World | null = null
  private views: Views | null = null
  private accumulator = 0
  private paused = false
  private disposed = false
  private layoutWidth = -1
  private layoutHeight = -1
  private baseX = 0
  private baseY = 0
  private shakeTime = 0

  constructor(options: GameOptions) {
    this.config = options.config
    this.hud = options.hud
    this.touch = options.touch
    this.seed = options.seed ?? Date.now()
    this.manualClock = options.manualClock ?? false
    this.perf = options.perf ?? null
  }

  async mount(host: HTMLElement): Promise<void> {
    this.hud.reset()

    await testLoadDelay()
    let textures: GameTextures
    try {
      textures = await loadGameTextures((progress) => {
        // Rounded so React is not notified for tiny changes.
        if (!this.disposed) this.hud.update({ loadProgress: Math.round(progress * 100) / 100 })
      })
    } catch (error) {
      // A game that was already destroyed does not report errors.
      if (this.disposed) return
      throw error
    }
    if (this.disposed) return

    const app = new Application()
    await app.init({
      resizeTo: host,
      background: '#06233a',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
    })

    // destroy() may have been called while we were waiting (React Strict Mode).
    if (this.disposed) {
      app.destroy(true, { children: true })
      return
    }

    this.app = app
    host.appendChild(app.canvas)

    const { width, height } = this.config.arena
    const water = new TilingSprite({ texture: textures.water, width, height })

    // Health bar images and fill areas come from ui_sheet.json.
    const { hud } = textures
    const playerBar: HealthBarSkin = {
      frame: hud.health_frame,
      fills: [
        { above: 0.5, texture: hud.health_fill_green },
        { above: 0.25, texture: hud.health_fill_amber },
        { above: -1, texture: hud.health_fill_red },
      ],
      fillRect: { x: 30, width: 196 },
      scale: 0.3,
    }
    const enemyBar: HealthBarSkin = {
      frame: hud.enemy_health_frame,
      fills: [
        { above: 0.4, texture: hud.enemy_health_fill_green },
        { above: -1, texture: hud.enemy_health_fill_red },
      ],
      fillRect: { x: 24, width: 112 },
      scale: 0.42,
    }
    const scale = this.config.shipScale
    const skin = (stages: Texture[], bar: HealthBarSkin): ShipSkin => ({
      stages,
      bar,
      fire: textures.fire,
      scale,
    })

    this.world = new World(this.config, this.seed)
    this.views = {
      player: new ShipView(skin(textures.ships.player, playerBar)),
      enemies: new EnemyLayer({
        chaser: skin(textures.ships.chaser, enemyBar),
        shooter: skin(textures.ships.shooter, enemyBar),
      }),
      projectiles: new ProjectileLayer(textures.cannonBall),
      effects: new EffectLayer({
        explosion: textures.explosion,
        wrecks: {
          player: textures.ships.player[3],
          chaser: textures.ships.chaser[3],
          shooter: textures.ships.shooter[3],
        },
        shipScale: scale,
      }),
    }

    // Draw order: water, islands, ships, projectiles, effects on top.
    this.arenaLayer.addChild(
      water,
      createIslandLayer(this.config, textures.tiles),
      this.views.enemies.container,
      this.views.player.container,
      this.views.projectiles.container,
      this.views.effects.container,
    )
    app.stage.addChild(this.arenaLayer)

    this.keyboard.attach()
    this.keyboard.setEnabled(true)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('blur', this.handleWindowBlur)
    app.ticker.add(this.tick)

    audio.play('game_start', 0.7)
    this.sounds.start()
  }

  /** Freezes simulation, timer and cooldowns. Safe to call more than once. */
  pause(): void {
    if (this.paused || !this.world || this.world.status !== 'running') return
    this.paused = true
    this.keyboard.setEnabled(false)
    this.touch.clear()
    this.sounds.stop()
    audio.play('game_pause', 0.6)
    this.hud.update({ status: 'paused' })
  }

  /** Continues from exactly where it stopped. Nothing pressed during the pause carries over. */
  resume(): void {
    if (!this.paused || !this.world) return
    this.paused = false
    this.accumulator = 0
    this.touch.clear()
    this.keyboard.setEnabled(true)
    audio.play('game_resume', 0.6)
    this.sounds.start()
    this.hud.update({ status: this.world.status })
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.keyboard.detach()
    this.touch.clear()
    this.sounds.stop()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('blur', this.handleWindowBlur)

    if (this.app) {
      this.app.ticker.remove(this.tick)
      // Destroys sprites and containers but keeps textures cached for the next match.
      this.app.destroy(true, { children: true })
      this.app = null
    }
    this.world = null
    this.views = null
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pause()
  }

  private readonly handleWindowBlur = (): void => {
    this.pause()
  }

  private readonly tick = (ticker: Ticker): void => {
    if (!this.world || !this.views) return
    this.fitArenaToScreen()
    if (this.paused) return

    const frameSeconds = Math.min(ticker.deltaMS / 1000, MAX_FRAME_SECONDS)
    if (!this.manualClock) this.simulate(frameSeconds)
    this.render(frameSeconds)

    if (this.perf && this.world.status === 'running') {
      const { enemies, projectiles } = this.world
      this.perf.record(ticker.deltaMS, enemies.length + projectiles.length + this.views.effects.count)
    }
  }

  /**
   * Advances the rules by `seconds` in fixed steps.
   * Fixed timestep: the simulation always advances in equal steps,
   * no matter if the screen runs at 30, 60 or 144 FPS.
   */
  private simulate(seconds: number): void {
    const world = this.world
    const views = this.views
    if (!world || !views) return

    this.accumulator += seconds
    const step = this.config.fixedStep
    const intent = intentFrom(
      (action) => this.keyboard.isDown(action) || this.touch.isDown(action),
    )

    // The tiny epsilon avoids losing a step to floating-point rounding.
    while (this.accumulator >= step - 1e-9) {
      world.update(step, intent)
      this.accumulator -= step
    }
    this.accumulator = Math.max(0, this.accumulator)

    if (world.status === 'ended') this.keyboard.setEnabled(false)

    for (const event of world.drainEvents()) {
      views.effects.handle(event)
      this.sounds.handle(event)
      if (event.type === 'hit' && event.target === 'player' && !this.reducedMotion) {
        this.shakeTime = SHAKE_SECONDS
      }
    }
    this.sounds.update(world, intent.forward)
  }

  /** Copies the simulation state to the sprites and the HUD. */
  private render(dt: number): void {
    const world = this.world
    const views = this.views
    if (!world || !views) return

    views.player.sync(world.player, dt)
    views.enemies.sync(world.enemies, dt)
    views.projectiles.sync(world.projectiles)
    views.effects.update(dt)
    this.applyShake(dt)

    this.hud.update({
      status: world.status,
      score: world.score,
      timeLeft: Math.ceil(world.timeLeft),
      health: Math.ceil(world.player.health),
      maxHealth: world.player.maxHealth,
      outcome: world.outcome,
    })
  }

  // ---------- Test instrumentation (used only with ?e2e) ----------

  /** Runs the real simulation for `seconds` with the inputs currently held. Ignored while paused. */
  advance(seconds: number): void {
    if (this.paused || !this.world) return
    this.simulate(seconds)
    this.render(0)
  }

  addEnemy(kind: EnemyKind, x: number, y: number, angle = 0): void {
    this.world?.addEnemy(kind, x, y, angle)
    this.render(0)
  }

  /** Plain copy of the state, safe to send to the test runner. */
  getDebugState() {
    const world = this.world
    if (!world) return null
    const ship = ({ x, y, angle, health, maxHealth }: ShipState) => ({
      x,
      y,
      angle,
      health,
      maxHealth,
    })
    return {
      status: world.status,
      paused: this.paused,
      score: world.score,
      timeLeft: world.timeLeft,
      elapsed: world.elapsed,
      endReason: world.endReason,
      spawnedCount: world.spawnedCount,
      player: ship(world.player),
      enemies: world.enemies.map((e) => ({ id: e.id, kind: e.kind, ...ship(e) })),
      projectiles: world.projectiles.map((p) => ({ team: p.team, x: p.x, y: p.y })),
      islands: world.islands,
      arena: { width: this.config.arena.width, height: this.config.arena.height },
      canvasCount: document.querySelectorAll('canvas').length,
    }
  }

  /** Scales the arena to fit the canvas, keeping its proportions (letterbox). */
  private fitArenaToScreen(): void {
    if (!this.app) return
    const { width, height } = this.app.screen
    if (width === this.layoutWidth && height === this.layoutHeight) return
    this.layoutWidth = width
    this.layoutHeight = height

    const arena = this.config.arena
    const scale = Math.min(width / arena.width, height / arena.height)
    this.arenaLayer.scale.set(scale)
    this.baseX = (width - arena.width * scale) / 2
    this.baseY = (height - arena.height * scale) / 2
    this.arenaLayer.position.set(this.baseX, this.baseY)
  }

  /** Small camera shake when the player is hit (off with reduced motion). */
  private applyShake(dt: number): void {
    if (this.shakeTime <= 0) return
    this.shakeTime = Math.max(0, this.shakeTime - dt)
    const strength = (this.shakeTime / SHAKE_SECONDS) * SHAKE_PIXELS
    this.arenaLayer.position.set(
      this.baseX + (Math.random() * 2 - 1) * strength,
      this.baseY + (Math.random() * 2 - 1) * strength,
    )
  }
}
