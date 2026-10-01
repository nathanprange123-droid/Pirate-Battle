import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against the production build (npm run build + preview),
 * the same code that is deployed, with the MSW mock server active.
 *
 * PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's
 * Chromium (useful when `npx playwright install chromium` cannot download).
 */
const channel = process.env.PW_CHANNEL || undefined
const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/e2e' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFileName}/{arg}{ext}',
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, channel },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7 landscape'], channel },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
