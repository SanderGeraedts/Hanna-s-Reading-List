import { describe, expect, it } from 'vitest'
import { SQUARE_IDS } from './bingo'
import { bingoSwaps, cardSwaps, swapEvent, swapKey } from './bingoSwap'
import type { ChoiceEvent } from './creatures/choices'
import { deriveShop } from './creatures/shop'
import { savedItems } from './garden/spots'

/** A swapped bingo square in the choice log (T-0093, D-0067). */

const place = (id: string, at: number, key: string, extra: Record<string, string | number> = {}) =>
  ({ id, at, kind: 'place', key, ...extra }) as unknown as ChoiceEvent

describe('the event', () => {
  it('is a place event with a b: key and the square in sq, and nothing else', () => {
    expect(swapEvent(2026, 1, 3, 'longlisten')).toEqual({ kind: 'place', key: 'b:2026:1:3', sq: 'longlisten' })
  })

  it('keeps the key well inside the route 60 characters', () => {
    expect(swapKey(2026, 999, 15).length).toBeLessThanOrEqual(60)
    expect(swapKey(2026, 999, 15)).toBe('b:2026:999:15')
  })
})

describe('reading the log', () => {
  const square = SQUARE_IDS[20]

  it('takes the newest place event per b: key', () => {
    const log = [place('a', 1, 'b:2026:1:3', { sq: SQUARE_IDS[19] }), place('b', 2, 'b:2026:1:3', { sq: square })]
    expect(bingoSwaps(log).get('2026:1:3')).toBe(square)
    // on a tie the larger id wins, as the route and mergeLogs do
    const tie = [place('a', 5, 'b:2026:1:3', { sq: SQUARE_IDS[19] }), place('z', 5, 'b:2026:1:3', { sq: square })]
    expect(bingoSwaps(tie).get('2026:1:3')).toBe(square)
  })

  it('ignores the garden and the den keys', () => {
    const log = [
      place('g', 1, 'g:p:book-1', { bed: 0, spot: 1 }),
      place('d', 2, 'home:rug', { slot: 2 }),
      place('b', 3, 'b:2026:1:0', { sq: square }),
    ]
    expect([...bingoSwaps(log).keys()]).toEqual(['2026:1:0'])
  })

  it('ignores a b: event that is not a swap it can use', () => {
    const log = [
      place('no-sq', 1, 'b:2026:1:0'),
      place('bad-sq', 2, 'b:2026:1:1', { sq: 'not-a-square' }),
      place('slot-high', 3, 'b:2026:1:16', { sq: square }),
      place('slot-low', 4, 'b:2026:1:-1', { sq: square }),
      place('no-card', 5, 'b:2026:0:1', { sq: square }),
      place('short', 6, 'b:2026:1', { sq: square }),
      place('words', 7, 'b:x:y:z', { sq: square }),
    ]
    expect(bingoSwaps(log).size).toBe(0)
  })

  it('ignores events that are not place events at all', () => {
    const log = [{ id: 'f', at: 1, kind: 'feed', pet: 'p', amount: 2 } as ChoiceEvent]
    expect(bingoSwaps(log).size).toBe(0)
    expect(bingoSwaps([]).size).toBe(0)
  })

  it('cuts the whole map down to one card', () => {
    const log = [place('a', 1, 'b:2026:1:3', { sq: square }), place('b', 2, 'b:2026:2:4', { sq: SQUARE_IDS[21] })]
    const all = bingoSwaps(log)
    expect([...cardSwaps(all, 2026, 1)]).toEqual([[3, square]])
    expect([...cardSwaps(all, 2026, 2)]).toEqual([[4, SQUARE_IDS[21]]])
    expect([...cardSwaps(all, 2025, 1)]).toEqual([])
    expect([...cardSwaps(undefined, 2026, 1)]).toEqual([])
  })
})

describe('the three readers never read each other keys (D-0052 §4, D-0067 §5)', () => {
  const swap = place('b', 1, 'b:2026:1:0', { sq: SQUARE_IDS[20] })

  it('the garden ignores a bingo swap', () => {
    expect(savedItems([swap]).size).toBe(0)
    expect(savedItems([swap]).size).toBe(0)
  })

  it('the den ignores a bingo swap', () => {
    const shop = deriveShop([swap])
    expect(Object.keys(shop.placed)).toEqual([])
  })

  it('bingo ignores a garden plant and a den item', () => {
    expect(bingoSwaps([place('g', 1, 'g:p:x', { bed: 0, spot: 0 }), place('d', 2, 'home:rug', { slot: 1 })]).size).toBe(0)
  })
})
