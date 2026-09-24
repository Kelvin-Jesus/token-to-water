import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const isCI = Boolean(process.env.CI)

/**
 * Browser suites run against the *production* build (`vite preview`), so
 * they exercise exactly what ships: minified bundle, real canvas, real GPU
 * compositing path.
 *
 * - desktop / mobile: end-to-end user journeys + accessibility (axe, keyboard, reflow, touch targets)
 * - visual: screenshot regression with a frozen clock (deterministic canvas)
 * - perf: frame rate, frame cost, LOD fallback, pausing, web vitals, memory
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}-{projectName}-{platform}{ext}',
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', testMatch: /(e2e|a11y)\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /(e2e|a11y)\/.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'visual', testMatch: /visual\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'perf', testMatch: /perf\/.*\.spec\.ts/, fullyParallel: false, use: { ...devices['Desktop Chrome'] } },
  ],
})
