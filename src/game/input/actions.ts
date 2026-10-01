import type { PlayerIntent } from '../simulation/types'

/** Everything the player can do with a key or a touch button. */
export type GameAction =
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'fireFront'
  | 'fireLeft'
  | 'fireRight'

/** Builds the simulation intent from "is this action held?". */
export function intentFrom(isDown: (action: GameAction) => boolean): PlayerIntent {
  return {
    forward: isDown('forward'),
    turn: (isDown('turnRight') ? 1 : 0) - (isDown('turnLeft') ? 1 : 0),
    fireFront: isDown('fireFront'),
    fireLeft: isDown('fireLeft'),
    fireRight: isDown('fireRight'),
  }
}
