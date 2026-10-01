import { useCallback, useEffect, useState } from 'react'

export type Route = 'menu' | 'options' | 'play' | 'result' | 'ranking' | 'history' | 'network'

const ROUTES: readonly Route[] = [
  'menu',
  'options',
  'play',
  'result',
  'ranking',
  'history',
  'network',
]

function parseHash(hash: string): Route {
  const name = hash.replace(/^#\/?/, '')
  return ROUTES.includes(name as Route) ? (name as Route) : 'menu'
}

/**
 * Minimal router based on the URL hash (#/menu, #/options...).
 * Opening or reloading the page on #/play goes back to the menu:
 * a reload ends the match in progress, as the rules require.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => {
    const initial = parseHash(window.location.hash)
    if (initial === 'play') {
      window.history.replaceState(null, '', '#/menu')
      return 'menu'
    }
    return initial
  })

  useEffect(() => {
    const handleChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', handleChange)
    return () => window.removeEventListener('hashchange', handleChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    if (parseHash(window.location.hash) === next) {
      setRoute(next)
    } else {
      window.location.hash = `#/${next}`
    }
  }, [])

  return [route, navigate]
}
