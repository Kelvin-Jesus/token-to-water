#!/usr/bin/env node
/**
 * Bundle-size budget for the critical path: everything a first visit must
 * download before the page is usable (entry JS, CSS, the Latin font file).
 *
 * The total follows web.dev's guidance of ≲170 KB compressed critical-path
 * resources to become interactive within ~5 s on a slow 3G phone. Lazy chunks
 * (the settings dialog) are reported but budgeted separately.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGETS_KB = { entryJs: 130, css: 14, font: 35, criticalTotal: 170, lazyJs: 25 }
const dist = join(import.meta.dirname, '..', 'dist')
const assets = join(dist, 'assets')

let html
try {
  html = readFileSync(join(dist, 'index.html'), 'utf8')
} catch {
  console.error(`No build output in ${dist}. Run "npm run build" first.`)
  process.exit(1)
}

const gzipKb = (file) => gzipSync(readFileSync(join(assets, file))).length / 1024
const entryFiles = new Set([...html.matchAll(/\/assets\/([^"]+\.js)"/g)].map((match) => match[1]))
const files = readdirSync(assets)

const sizes = {
  entryJs: [...entryFiles].reduce((sum, file) => sum + gzipKb(file), 0),
  lazyJs: files.filter((file) => file.endsWith('.js') && !entryFiles.has(file)).reduce((sum, file) => sum + gzipKb(file), 0),
  css: files.filter((file) => file.endsWith('.css')).reduce((sum, file) => sum + gzipKb(file), 0),
  // Fonts are pre-compressed; the browser only fetches the subset whose unicode-range the page uses (Latin).
  font: files.filter((file) => /latin-wght/.test(file) && !/ext/.test(file)).reduce((sum, file) => sum + statSync(join(assets, file)).size / 1024, 0),
  html: gzipSync(html).length / 1024,
}
sizes.criticalTotal = sizes.entryJs + sizes.css + sizes.font + sizes.html

let failed = false
for (const [name, budget] of Object.entries(BUDGETS_KB)) {
  const ok = sizes[name] <= budget
  failed ||= !ok
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(14)} ${sizes[name].toFixed(1).padStart(6)} KB (budget ${budget} KB)`)
}
process.exit(failed ? 1 : 0)
