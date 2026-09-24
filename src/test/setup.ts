import '@testing-library/jest-dom/vitest'
import 'vitest-canvas-mock'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * jsdom lacks several browser APIs the app (and Radix) rely on. These stubs
 * are deliberately minimal and inert: real behaviour is covered by the
 * Playwright suites running in Chromium.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

/** Media queries are false unless a test overrides them via `setMediaQueries`. */
const mediaMatches = new Map<string, boolean>()

export function setMediaQueries(entries: Record<string, boolean>): void {
  for (const [query, matches] of Object.entries(entries)) mediaMatches.set(query, matches)
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: mediaMatches.get(query) ?? false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)

// Radix primitives call these pointer/scroll APIs that jsdom does not implement.
Element.prototype.scrollIntoView = function scrollIntoView() {}
Element.prototype.hasPointerCapture = function hasPointerCapture() {
  return false
}
Element.prototype.releasePointerCapture = function releasePointerCapture() {}
Element.prototype.setPointerCapture = function setPointerCapture() {}
HTMLElement.prototype.scrollTo = function scrollTo() {}

afterEach(() => {
  cleanup()
  mediaMatches.clear()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})
