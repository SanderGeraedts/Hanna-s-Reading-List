import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { canKeepApp, keepAppOnThisDevice } from './offline'

/** Keeping the app on her phone (D-0089). */

describe('registering the worker', () => {
  it('asks for the one service worker the app has', async () => {
    const register = vi.fn().mockResolvedValue({})
    expect(await keepAppOnThisDevice({ serviceWorker: { register } } as unknown as Navigator)).toBe('kept')
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('carries on when the browser has none, or refuses', async () => {
    expect(await keepAppOnThisDevice({} as unknown as Navigator)).toBe('unsupported')
    expect(await keepAppOnThisDevice(undefined)).toBe('unsupported')
    const register = vi.fn().mockRejectedValue(new Error('blocked in a private window'))
    expect(await keepAppOnThisDevice({ serviceWorker: { register } } as unknown as Navigator)).toBe('refused')
  })

  it('says whether this browser can keep it at all', () => {
    expect(typeof canKeepApp()).toBe('boolean')
  })
})

/**
 * The worker itself is plain JavaScript served as a file, so it is read and
 * checked here rather than run: these are the promises its comment makes.
 */
describe('what the worker caches, and what it never does', () => {
  const sw = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8')

  it('never caches her shelf, her account or the reminder', () => {
    expect(sw).toContain("url.pathname.startsWith('/_serverFn/')")
    expect(sw).toContain("url.pathname.startsWith('/api/')")
    // the guard runs before anything is answered from a cache
    expect(sw.indexOf('isLiveData(url)')).toBeLessThan(sw.indexOf('caches.match'))
  })

  it('fetches the page from the network first, so a new version is never held back', () => {
    const nav = sw.slice(sw.indexOf("request.mode === 'navigate'"), sw.indexOf('isBuiltFile(url)'))
    expect(nav.indexOf('await fetch(request)')).toBeLessThan(nav.indexOf('caches.match'))
  })

  it('keeps only files whose name carries their contents', () => {
    expect(sw).toContain("url.pathname.startsWith('/assets/')")
    expect(sw).toContain("url.pathname.startsWith('/icons/')")
    expect(sw).toContain("url.pathname.startsWith('/creatures/')")
  })

  it('answers only its own origin, and only GETs', () => {
    expect(sw).toContain("request.method !== 'GET'")
    expect(sw).toContain('url.origin !== self.location.origin')
  })

  it('throws away what an older version kept', () => {
    expect(sw).toContain('caches.delete')
    expect(sw).toContain('KEEP.includes')
  })

  it('still does the reading reminder it was made for (#163)', () => {
    expect(sw).toContain("addEventListener('push'")
    expect(sw).toContain("addEventListener('notificationclick'")
    expect(sw).toContain('showNotification')
  })
})
