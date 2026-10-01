import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  wide?: boolean
  className?: string
}

/** Wooden frame used by every menu and dialog. */
export function Panel({ children, wide = false, className = '' }: PanelProps) {
  return <div className={`panel ${wide ? 'panel--wide' : ''} ${className}`}>{children}</div>
}
