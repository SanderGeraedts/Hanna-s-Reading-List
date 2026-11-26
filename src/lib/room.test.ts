import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, NIGHT_MODES, cleanRoom, isNightNow, moveDecor, shownDecor, toggleDecor } from './room'
import { computeLayout } from './shelfLayout'
import type { Book } from './library'

describe('make the room yours', () => {
  it('starts as the room was: walnut, lavender, every decoration in the usual order', () => {
    expect(cleanRoom(null)).toEqual(DEFAULT_ROOM)
    expect(DEFAULT_ROOM.wood).toBe('walnut')
    expect(DEFAULT_ROOM.wallpaper).toBe('lavender')
    expect(shownDecor(DEFAULT_ROOM)[0]).toBe('koala')
  })

  it('cleans a saved room: unknown values back to the defaults, every decoration once', () => {
    const r = cleanRoom({ wood: 'plastic', wallpaper: 'midnight', decor: [{ kind: 'cat', on: false }, { kind: 'cat' }, { kind: 'dragon' }] })
    expect(r.wood).toBe('walnut')
    expect(r.wallpaper).toBe('midnight')
    expect(r.decor[0]).toEqual({ kind: 'cat', on: false })
    expect(r.decor.length).toBe(DEFAULT_ROOM.decor.length)
  })

  it('draws detailed books by default, and only a saved false turns them off (D-0035)', () => {
    expect(DEFAULT_ROOM.detailedBooks).toBe(true)
    expect(cleanRoom({}).detailedBooks).toBe(true)
    for (const v of [undefined, null, 'no', 1, 0, 'false']) expect(cleanRoom({ detailedBooks: v }).detailedBooks).toBe(true)
    expect(cleanRoom({ detailedBooks: false }).detailedBooks).toBe(false)
    expect(cleanRoom({ ...DEFAULT_ROOM, detailedBooks: false }).detailedBooks).toBe(false)
  })

  it('loads a room saved before the switch with detailed books on and its other choices kept', () => {
    const old = { wood: 'cherry', wallpaper: 'midnight', decor: [{ kind: 'mug', on: false }] }
    const r = cleanRoom(JSON.parse(JSON.stringify(old)))
    expect(r.detailedBooks).toBe(true)
    expect(r.wood).toBe('cherry')
    expect(r.wallpaper).toBe('midnight')
    expect(r.decor[0]).toEqual({ kind: 'mug', on: false })
    expect(r.decor.length).toBe(DEFAULT_ROOM.decor.length)
  })

  it('switches decorations off and moves them up or down', () => {
    let r = toggleDecor(DEFAULT_ROOM, 'koala')
    expect(shownDecor(r)[0]).toBe('cat')
    r = moveDecor(DEFAULT_ROOM, 'mug', -1)
    expect(shownDecor(r).slice(0, 3)).toEqual(['koala', 'mug', 'cat'])
    expect(moveDecor(DEFAULT_ROOM, 'koala', -1)).toBe(DEFAULT_ROOM)
  })

  it('puts the chosen decorations on the shelves in her order, and none when all are off', () => {
    const books: Book[] = Array.from({ length: 200 }, (_, i) => ({ id: `b${i}`, title: `B ${i}`, authors: [], color: '#888888', status: 'want', addedAt: 0 }))
    const order = shownDecor(moveDecor(toggleDecor(DEFAULT_ROOM, 'koala'), 'ivy', -1))
    const { decor } = computeLayout(books, {}, new Map(), order)
    expect(decor.slice(0, 3).map((d) => d.kind)).toEqual(order.slice(0, 3))
    expect(decor.some((d) => d.kind === 'koala')).toBe(false)
    expect(computeLayout(books, {}, new Map(), []).decor).toEqual([])
  })
})

/** Night mode for the pages (D-0085). */
describe('night mode', () => {
  it('follows the phone’s own dark setting by default', () => {
    expect(DEFAULT_ROOM.night).toBe('auto')
    expect(isNightNow('auto', true)).toBe(true)
    expect(isNightNow('auto', false)).toBe(false)
  })

  it('holds it on or off whatever the phone says', () => {
    for (const deviceDark of [true, false]) {
      expect(isNightNow('on', deviceDark)).toBe(true)
      expect(isNightNow('off', deviceDark)).toBe(false)
    }
  })

  it('offers her three choices, in her words', () => {
    expect(NIGHT_MODES.map((m) => m.id)).toEqual(['auto', 'on', 'off'])
    expect(NIGHT_MODES.map((m) => m.label)).toEqual(['Follow my phone', 'Always', 'Never'])
  })

  it('keeps a room saved before it existed on the clock, and keeps her choice', () => {
    expect(cleanRoom({ ...DEFAULT_ROOM, night: undefined }).night).toBe('auto')
    expect(cleanRoom({ ...DEFAULT_ROOM, night: 'midnight' }).night).toBe('auto')
    expect(cleanRoom({ ...DEFAULT_ROOM, night: 'on' }).night).toBe('on')
    expect(cleanRoom({ ...DEFAULT_ROOM, night: 'off' }).night).toBe('off')
  })

  it('is this device’s own, like the rest of the room', () => {
    // nothing about the room is sent anywhere (D-0022): the night is a look, not a setting on her books
    const room = cleanRoom({ ...DEFAULT_ROOM, night: 'on' })
    expect(Object.keys(room)).toContain('night')
  })
})
