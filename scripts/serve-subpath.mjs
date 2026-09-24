#!/usr/bin/env node
/**
 * Serves dist/ under a sub-path exactly like GitHub Pages does for a project
 * site (https://<user>.github.io/token-to-water/), so the "pages" Playwright
 * project can prove the build works away from the domain root.
 *
 * Usage: node scripts/serve-subpath.mjs [port] [base]
 */
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const port = Number(process.argv[2] ?? 4180)
const base = process.argv[3] ?? '/token-to-water/'
const root = join(import.meta.dirname, '..', 'dist')
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  if (!pathname.startsWith(base)) {
    // Like Pages: nothing exists outside the project path — a root-relative asset URL would 404 here.
    response.writeHead(404).end('Not found')
    return
  }
  const relative = normalize(pathname.slice(base.length) || 'index.html').replace(/^(\.\.[/\\])+/, '')
  const file = join(root, relative.endsWith('/') ? `${relative}index.html` : relative)
  try {
    if (!statSync(file).isFile()) throw new Error('not a file')
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}${base}`))
