import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { createQueryClient } from './api/queryClient'
import { applyScenarioFromUrl } from './mocks/scenarios'
import { exposeNetworkControls } from './mocks/control'
import { audio } from './game/audio/AudioManager'

// Browsers allow sound only after the first click, tap or key press.
const unlockAudio = () => audio.unlock()
window.addEventListener('pointerdown', unlockAudio, { once: true })
window.addEventListener('keydown', unlockAudio, { once: true })

const queryClient = createQueryClient()

/**
 * Starts the MSW service worker that plays the role of the ranking/history server.
 * It runs in every build, including the published one. If it fails, the game
 * still starts; only ranking and history are affected.
 */
async function startMockServer(): Promise<void> {
  applyScenarioFromUrl()
  const { worker } = await import('./mocks/browser')
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame: 'bypass',
    quiet: import.meta.env.PROD,
  })
  exposeNetworkControls(queryClient)
}

startMockServer()
  .catch((error: unknown) => {
    console.warn('Mock server unavailable; ranking and history will show errors.', error)
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
