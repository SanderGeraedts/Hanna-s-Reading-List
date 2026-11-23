import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { CARD_SIZE, SQUARE_IDS, bingoYear, cardSquares, forCard } from './bingo'

/** A card drawn with her own swaps (T-0093, D-0067 §7). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Writer ${id}`],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const plain = cardSquares(2026, 1)
/** a square the first card has not got */
const spare = SQUARE_IDS.find((id) => !plain.squares.includes(id))!
const map = (pairs: Array<[number, string]>) => new Map(pairs)

describe('cardSquares with her swaps', () => {
  it('puts the chosen square in that slot and keeps the other fifteen', () => {
    const swapped = cardSquares(2026, 1, map([[3, spare]]))
    expect(swapped.squares[3]).toBe(spare)
    expect(swapped.squares).toHaveLength(CARD_SIZE)
    expect(new Set(swapped.squares).size).toBe(CARD_SIZE)
    for (let i = 0; i < CARD_SIZE; i++) if (i !== 3) expect(swapped.squares[i]).toBe(plain.squares[i])
  })

  it('sends the square that was there back into the spare pile, once', () => {
    const swapped = cardSquares(2026, 1, map([[3, spare]]))
    expect(swapped.spare).toContain(plain.squares[3])
    expect(swapped.spare.filter((id) => id === plain.squares[3])).toHaveLength(1)
    expect(swapped.spare).not.toContain(spare)
  })

  it('ignores a square the card already has, so no square is on a card twice', () => {
    const already = plain.squares[7]
    expect(cardSquares(2026, 1, map([[3, already]]))).toEqual(plain)
  })

  it('ignores a slot out of range, a square that does not exist and a fractional slot', () => {
    for (const bad of [map([[16, spare]]), map([[-1, spare]]), map([[3, 'nope']]), map([[1.5, spare]])])
      expect(cardSquares(2026, 1, bad as Map<number, string>)).toEqual(plain)
  })

  it('is exactly what it was without swaps, and for an empty map', () => {
    expect(cardSquares(2026, 1, new Map())).toEqual(plain)
    expect(cardSquares(2026, 2, undefined)).toEqual(cardSquares(2026, 2))
  })

  it('cuts the whole map to one card and another card is untouched', () => {
    const all = new Map([
      ['2026:1:3', spare],
      ['2026:2:0', spare],
    ])
    expect([...forCard(all, 2026, 1)]).toEqual([[3, spare]])
    expect(cardSquares(2026, 1, forCard(all, 2025, 1))).toEqual(plain)
  })
})

describe('bingoYear with her swaps', () => {
  const shelf = [book('a', { pages: 600 }), book('b', { pages: 150 })]

  it('gives exactly what it gave before when no swaps are passed', () => {
    expect(bingoYear(shelf, 2026, '2026-11-23')).toEqual(bingoYear(shelf, 2026, '2026-11-23', new Map()))
    expect(bingoYear(shelf, 2026, '2026-11-23', undefined)).toEqual(bingoYear(shelf, 2026, '2026-11-23'))
  })

  it('draws the card being played with the swap in it', () => {
    const swaps = new Map([['2026:1:3', spare]])
    const y = bingoYear(shelf, 2026, '2026-11-23', swaps)
    expect(y.squares[3].id).toBe(spare)
    expect(y.squares.filter((s) => s.id === spare)).toHaveLength(1)
  })

  it('a swapped card that fills up is remembered with its swapped squares', () => {
    // every square ticked by the one book that fits everything is not possible, so
    // the check is on what a full card would carry: the ids it was played with
    const swaps = new Map([['2026:1:3', spare]])
    const y = bingoYear(shelf, 2026, '2026-11-23', swaps)
    expect(y.squares.map((s) => s.id)).toEqual(cardSquares(2026, 1, forCard(swaps, 2026, 1)).squares)
  })

  it('a swap for a card that is not being played changes nothing she sees', () => {
    const y = bingoYear(shelf, 2026, '2026-11-23', new Map([['2026:9:0', spare]]))
    expect(y.squares.map((s) => s.id)).toEqual(cardSquares(2026, 1).squares)
  })

  it('never touches a tick: a swapped square is judged by the finishes like any other', () => {
    const read = [book('long', { pages: 600, status: 'read', readCount: 1, finished: ['2026-01-05'] })]
    const ticked = bingoYear(read, 2026, '2026-11-23')
    const slot = ticked.squares.findIndex((s) => s.ticked)
    expect(slot).toBeGreaterThanOrEqual(0)
    // she can only have swapped this slot while the card was empty (the picker is gone as
    // soon as one square is ticked, D-0067 §3), so the derivation applies it from the start
    // and the squares are ticked from the finishes again — no tick is invented or kept.
    const withSwap = bingoYear(read, 2026, '2026-11-23', new Map([[`2026:1:${slot}`, spare]]))
    expect(withSwap.squares[slot].id).toBe(spare)
    for (const s of withSwap.squares) expect(s.ticked).toBe(!!s.book || s.ticked)
    // the square that was there is still on no card twice, and the rest tick as before
    const others = withSwap.squares.filter((_, i) => i !== slot).map((s) => [s.id, s.ticked])
    expect(others).toEqual(ticked.squares.filter((_, i) => i !== slot).map((s) => [s.id, s.ticked]))
  })
})
