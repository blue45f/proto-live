import { describe, expect, it, vi } from 'vitest'
// The service worker is a plain script in public/ (no module exports), so we
// pull its source in via Vite's ?raw import, evaluate it inside a controlled
// scope and drive the captured listeners directly. This pins the cache-hygiene
// contract: activate prunes caches from older versions, navigations store a
// single shell copy under '/' (no per-URL index.html duplicates), and the
// offline fallback keeps working.
import swSource from '../public/sw.js?raw'

const CACHE_NAME = swSource.match(/const CACHE_NAME = '([^']+)'/)?.[1] ?? ''

interface SwEvent {
  waitUntil: (promise: Promise<unknown>) => void
  request: { mode: string; url: string }
  respondWith: (promise: Promise<unknown>) => void
}

function createWorker({ cacheKeys = [CACHE_NAME] }: { cacheKeys?: string[] } = {}) {
  const listeners = new Map<string, (event: SwEvent) => void>()
  const cache = { put: vi.fn(async (_key: unknown, _value: unknown) => undefined) }
  const cachesMock = {
    keys: vi.fn(async () => cacheKeys),
    delete: vi.fn(async (_key: unknown) => true),
    open: vi.fn(async () => cache),
    match: vi.fn(async (_key: unknown): Promise<unknown> => undefined),
  }
  const swSelf = {
    addEventListener: (type: string, listener: (event: SwEvent) => void) => {
      listeners.set(type, listener)
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
  }
  const fetchMock = vi.fn()
  new Function('self', 'caches', 'fetch', swSource)(swSelf, cachesMock, fetchMock)

  const dispatch = (type: string, event: Partial<SwEvent>) => {
    const listener = listeners.get(type)
    if (!listener) throw new Error(`no ${type} listener registered`)
    listener({
      waitUntil: () => {},
      request: { mode: 'navigate', url: 'https://proto-live.test/' },
      respondWith: () => {},
      ...event,
    })
  }

  return { swSelf, cachesMock, cache, fetchMock, dispatch }
}

// Drains the floating caches.open().then(put) chain, which respondWith
// intentionally does not await.
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('sw.js cache hygiene', () => {
  it('declares a versioned cache name (parsed from the worker source)', () => {
    expect(CACHE_NAME).toMatch(/^proto-live-pwa-v\d+$/)
  })

  it('skips waiting on install', () => {
    const worker = createWorker()
    worker.dispatch('install', {})
    expect(worker.swSelf.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('prunes caches from older versions on activate, then claims clients', async () => {
    const worker = createWorker({ cacheKeys: ['proto-live-pwa-v1', CACHE_NAME, 'stale-cache'] })
    let settled: Promise<unknown> | undefined
    worker.dispatch('activate', {
      waitUntil: (promise) => {
        settled = promise
      },
    })
    await settled
    expect(worker.cachesMock.delete).toHaveBeenCalledTimes(2)
    expect(worker.cachesMock.delete).toHaveBeenCalledWith('proto-live-pwa-v1')
    expect(worker.cachesMock.delete).toHaveBeenCalledWith('stale-cache')
    expect(worker.cachesMock.delete).not.toHaveBeenCalledWith(CACHE_NAME)
    expect(worker.swSelf.clients.claim).toHaveBeenCalledTimes(1)
  })

  it('caches successful navigations under the single "/" key, not the request URL', async () => {
    const worker = createWorker()
    const copy = { body: 'shell-copy' }
    const response = { ok: true, clone: vi.fn(() => copy) }
    worker.fetchMock.mockResolvedValue(response)
    let result: Promise<unknown> | undefined
    worker.dispatch('fetch', {
      request: { mode: 'navigate', url: 'https://proto-live.test/projects/1' },
      respondWith: (promise) => {
        result = promise
      },
    })
    await expect(result).resolves.toBe(response)
    await flushAsync()
    expect(worker.cachesMock.open).toHaveBeenCalledWith(CACHE_NAME)
    expect(worker.cache.put).toHaveBeenCalledTimes(1)
    expect(worker.cache.put).toHaveBeenCalledWith('/', copy)
  })

  it('does not cache non-ok navigation responses (would poison the "/" fallback)', async () => {
    const worker = createWorker()
    const response = { ok: false, status: 404, clone: vi.fn() }
    worker.fetchMock.mockResolvedValue(response)
    let result: Promise<unknown> | undefined
    worker.dispatch('fetch', {
      request: { mode: 'navigate', url: 'https://proto-live.test/projects/999' },
      respondWith: (promise) => {
        result = promise
      },
    })
    await expect(result).resolves.toBe(response)
    await flushAsync()
    expect(response.clone).not.toHaveBeenCalled()
    expect(worker.cache.put).not.toHaveBeenCalled()
  })

  it('serves the cached "/" shell as offline fallback for any route', async () => {
    const worker = createWorker()
    const shell = { body: 'cached-shell' }
    worker.fetchMock.mockRejectedValue(new Error('offline'))
    worker.cachesMock.match.mockImplementation(async (key) => (key === '/' ? shell : undefined))
    const request = { mode: 'navigate', url: 'https://proto-live.test/projects/2' }
    let result: Promise<unknown> | undefined
    worker.dispatch('fetch', {
      request,
      respondWith: (promise) => {
        result = promise
      },
    })
    await expect(result).resolves.toBe(shell)
    expect(worker.cachesMock.match).toHaveBeenCalledWith(request)
    expect(worker.cachesMock.match).toHaveBeenCalledWith('/')
  })

  it('ignores non-navigation fetches', () => {
    const worker = createWorker()
    const respondWith = vi.fn()
    worker.dispatch('fetch', {
      request: { mode: 'cors', url: 'https://proto-live.test/api/projects' },
      respondWith,
    })
    expect(respondWith).not.toHaveBeenCalled()
    expect(worker.fetchMock).not.toHaveBeenCalled()
  })
})
