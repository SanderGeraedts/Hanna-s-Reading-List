import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BIRTHDAY_KEY, clearBirthday, isBirthday, readBirthday, subscribeBirthday, writeBirthday } from './birthday'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('the birthday on this device (T-0043, D-0039)', () => {
  it('sets and reads back 05-14, under its key', () => {
    expect(BIRTHDAY_KEY).toBe('hannas-reading-list:birthday')
    expect(writeBirthday('05-14')).toBe(true)
    expect(localStorage.getItem(BIRTHDAY_KEY)).toBe('05-14')
    expect(readBirthday()).toBe('05-14')
  })

  it('clear removes it', () => {
    writeBirthday('05-14')
    clearBirthday()
    expect(localStorage.getItem(BIRTHDAY_KEY)).toBeNull()
    expect(readBirthday()).toBeUndefined()
  })

  it('reads 13-40, 02-30, abc and an empty value as none; 02-29 is a birthday', () => {
    for (const bad of ['13-40', '02-30', 'abc', '', '00-10', '04-31', '5-14']) {
      localStorage.setItem(BIRTHDAY_KEY, bad)
      expect(readBirthday(), bad).toBeUndefined()
      expect(isBirthday(bad), bad).toBe(false)
    }
    localStorage.setItem(BIRTHDAY_KEY, '02-29')
    expect(readBirthday()).toBe('02-29')
    // an invalid value is never stored
    expect(writeBirthday('13-40')).toBe(false)
    expect(localStorage.getItem(BIRTHDAY_KEY)).toBeNull()
  })

  it('reads blocked storage as none and never throws', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
    try {
      expect(readBirthday()).toBeUndefined()
      expect(() => writeBirthday('05-14')).not.toThrow()
      expect(writeBirthday('05-14')).toBe(false)
      expect(() => clearBirthday()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reads storage that throws on access as none', () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(readBirthday()).toBeUndefined()
      expect(writeBirthday('05-14')).toBe(false)
    } finally {
      if (real) Object.defineProperty(globalThis, 'localStorage', real)
    }
  })

  it('never reaches the server, the routes, the account server or the shelf’s saving (D-0039)', () => {
    // the same search as the task's check: git grep -n -i birthday -- src/server src/routes deploy
    // src/lib/shelfMerge.ts src/lib/library.ts (and the share image), read from disk here
    const files = (path: string): string[] =>
      statSync(path).isDirectory() ? readdirSync(path).flatMap((name) => files(join(path, name))) : [path]
    const paths = ['src/server', 'src/routes', 'deploy', 'src/lib/shelfMerge.ts', 'src/lib/library.ts', 'src/lib/shareImage.ts'].flatMap((p) =>
      files(join(process.cwd(), p)),
    )
    expect(paths.length).toBeGreaterThan(10)
    const hits = paths.filter((p) => /birthday/i.test(readFileSync(p, 'utf8')))
    expect(hits).toEqual([])
  })

  it('tells subscribers when it changes, until they stop listening', () => {
    const seen: Array<string | undefined> = []
    const stop = subscribeBirthday(() => seen.push(readBirthday()))
    writeBirthday('05-14')
    clearBirthday()
    stop()
    writeBirthday('06-01')
    expect(seen).toEqual(['05-14', undefined])
  })
})
