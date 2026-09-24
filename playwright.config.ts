import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const isCI = Boolean(process.env.CI)

/**
 * Browser suites run against the *production* build (`vite preview`), so
 * they exercise exactly what ships: minified bundle, real canvas, real GPU
 * compositing path.
 *
 * - desktop / mobile: end-to-end user journeys + accessibility (axe, keyboard, reflow, touch targets)
 * - firefox: the same journeys in Gecko
 * - visual: screenshot regression with a frozen clock (deterministic canvas)
 * - perf: frame rate, frame cost, LOD fallback, pausing, web vitals, memory
 * - pages: the same build served under /token-to-water/, as on GitHub Pages
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
    // Rendering is deterministic under the frozen clock, so the tolerance can be tight: 0.1 % of pixels
    // (about 900 on a desktop viewport) still catches a missing button or a changed word.
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled', caret: 'hide' },
  },
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}-{projectName}-{platform}{ext}',
  webServer: [
    {
      command: 'npm run build && npm run preview',
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      // Waits for the first server's build (same dist/), then mounts it under the Pages sub-path.
      command: 'node scripts/serve-subpath.mjs 4180 /token-to-water/',
      url: 'http://localhost:4180/token-to-water/',
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
  projects: [
    { name: 'desktop', testMatch: /(e2e|a11y)\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /(e2e|a11y)\/.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    // Gecko renders text, scrollbars and layout differently: user journeys run in Firefox too.
    { name: 'firefox', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'visual', testMatch: /visual\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'perf',
      testMatch: /perf\/.*\.spec\.ts/,
      fullyParallel: false,
      // Frame-rate measurements need a quiet machine: in a full run, start only after every other project.
      dependencies: ['desktop', 'mobile', 'firefox', 'visual', 'pages'],
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'pages', testMatch: /pages\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
})
