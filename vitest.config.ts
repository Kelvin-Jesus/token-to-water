import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      restoreMocks: true,
      // Pure math/data modules run in plain Node (fast); anything touching the DOM runs in jsdom.
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/{lib,utils,constants,render,i18n}/**/*.test.ts'],
            typecheck: { enabled: false },
            // Performance budgets (`npm run test:bench`). Vitest 5 runs benchmarks apart from the regular
            // suite because they are noisy, so a busy CI machine never fails an unrelated change.
            benchmark: { include: ['src/**/*.bench.ts'] },
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: ['src/{components,hooks}/**/*.test.{ts,tsx}', 'src/*.test.tsx'],
            setupFiles: ['./src/test/setup.ts'],
            benchmark: { include: [] },
          },
        },
        {
          extends: true,
          test: {
            name: 'types',
            include: [],
            benchmark: { include: [] },
            typecheck: {
              enabled: true,
              only: true,
              include: ['src/**/*.test-d.ts'],
              tsconfig: './tsconfig.app.json',
            },
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.test-d.ts', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        reporter: ['text-summary', 'html', 'json-summary'],
        thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 },
      },
    },
  }),
)
