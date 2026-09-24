import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/** Mutation testing runs only the fast Node unit suite against the pure logic modules. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/{lib,utils,constants,render,i18n}/**/*.test.ts'],
    },
  }),
)
