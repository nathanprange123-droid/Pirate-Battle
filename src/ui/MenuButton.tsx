import type { ButtonHTMLAttributes, MouseEvent, PointerEvent } from 'react'
import { audio, type SoundId } from '../game/audio/AudioManager'

interface MenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  /** For tab-like buttons: shows the pressed style. */
  selected?: boolean
  /** Sound played on click. */
  sound?: SoundId
}

export function MenuButton({
  variant = 'primary',
  selected = false,
  sound = 'ui_click',
  className = '',
  type = 'button',
  onClick,
  onPointerEnter,
  ...rest
}: MenuButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    audio.unlock()
    audio.play(sound, 0.6)
    onClick?.(event)
  }

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') audio.play('ui_hover', 0.25)
    onPointerEnter?.(event)
  }

  return (
    <button
      type={type}
      className={`menu-button menu-button--${variant} ${selected ? 'is-selected' : ''} ${className}`}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      {...rest}
    />
  )
}
