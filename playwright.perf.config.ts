import { defineConfig, devices } from '@playwright/test'

/**
 * Performance runs: production build, a real visible browser window (GPU on),
 * one test at a time. Results are written to reports/performance/.
 * Run with: npm run test:perf (or npm run test:perf:chrome)
 */
const channel = process.env.PW_CHANNEL || undefined
const PORT = 4174

export default defineConfig({
  testDir: './tests/perf',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/performance/html' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: false,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
    video: 'off',
  },
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
