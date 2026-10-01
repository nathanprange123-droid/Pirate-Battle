import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * While active: moves focus into the element, keeps Tab inside it,
 * and gives focus back to where it was when deactivated.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  /** Change this value to move focus to the first button again (e.g. when the content changes). */
  contentKey: string = '',
): void {
  useEffect(() => {
    const container = ref.current
    if (!active || !container) return

    const previous = document.activeElement as HTMLElement | null
    const first = container.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? container).focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previous?.focus?.()
    }
  }, [ref, active, contentKey])
}
