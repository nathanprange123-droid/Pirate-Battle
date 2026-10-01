import type { ReactNode } from 'react'

/** Full-screen map background used behind the menus. */
export function ScreenLayout({ children }: { children: ReactNode }) {
  return (
    <main className="screen">
      {children}
    </main>
  )
}
