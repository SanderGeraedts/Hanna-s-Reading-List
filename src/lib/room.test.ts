import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, cleanRoom, moveDecor, shownDecor, toggleDecor } from './room'
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
