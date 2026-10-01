import type { GameEvent } from '../simulation/types'
import type { World } from '../simulation/World'
import { audio } from './AudioManager'

const TIME_WARNING_SECONDS = 10
const LOW_HEALTH_RATIO = 0.3
const OCEAN_VOLUME = 0.35
const SAILING_VOLUME = 0.4

/** Turns game events and state into sounds. Owns the ambient loops of a match. */
export class SoundDirector {
  private timeWarned = false
  private healthWarned = false

  start(): void {
    audio.startLoop('ocean_ambience_loop', OCEAN_VOLUME)
    audio.startLoop('ship_sailing_loop', 0)
  }

  stop(): void {
    audio.stopLoop('ocean_ambience_loop')
    audio.stopLoop('ship_sailing_loop')
  }

  handle(event: GameEvent): void {
    switch (event.type) {
      case 'cannonFired':
        if (event.weapon === 'broadside') audio.play('cannon_broadside', 0.6)
        else audio.playOneOf(['cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3'], event.weapon === 'front' ? 0.5 : 0.3)
        break
      case 'hit':
        audio.playOneOf(['ship_wood_hit_1', 'ship_wood_hit_2'], event.target === 'player' ? 0.8 : 0.45)
        break
      case 'splash':
        audio.playOneOf(['cannonball_water_hit_1', 'cannonball_water_hit_2'], 0.35)
        break
      case 'rammed':
        audio.play('ship_collision', 0.8)
        break
      case 'scored':
        audio.play('score_point', 0.5)
        break
      case 'shipDestroyed':
        if (event.ship === 'player') audio.play('ship_sinking', 0.9)
        else audio.playOneOf(['ship_explosion_1', 'ship_explosion_2'], 0.6)
        break
      case 'matchEnded':
        audio.setLoopVolume('ship_sailing_loop', 0)
        audio.play(event.reason === 'timeUp' ? 'game_complete' : 'game_over', 0.8)
        break
      case 'shot':
        break
    }
  }

  /** Called every frame: sailing loop follows the player, warnings fire once. */
  update(world: World, sailing: boolean): void {
    if (world.status !== 'running') return
    audio.setLoopVolume('ship_sailing_loop', sailing ? SAILING_VOLUME : 0)

    if (!this.timeWarned && world.timeLeft <= TIME_WARNING_SECONDS) {
      this.timeWarned = true
      audio.play('time_warning', 0.7)
    }

    const ratio = world.player.health / world.player.maxHealth
    if (!this.healthWarned && ratio > 0 && ratio <= LOW_HEALTH_RATIO) {
      this.healthWarned = true
      audio.play('health_low', 0.7)
    }
  }
}
