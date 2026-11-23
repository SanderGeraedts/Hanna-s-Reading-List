import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from '../creatures/choices'
import { cleanEvent } from '../creatures/choices'
import { deriveShop } from '../creatures/shop'
import { MAX_ITEM_SLOTS, SPOTS_PER_BED } from './numbers'
import { arrange, itemKey, itemPlace, itemRemove, savedItems, spotAt, spotIndex } from './spots'

/**
 * Where things stand, saved in the existing choice log (T-0060, D-0052): the
 * keys, what a bad event does, and that the garden and the den never read each
 * other's choices.
 */

const event = (over: Partial<ChoiceEvent> & { key: string }, i = 0): ChoiceEvent =>
  ({ id: `e${i}`, at: 1000 + i, kind: 'place', ...over }) as ChoiceEvent

const log = (...events: Array<Partial<ChoiceEvent> & { key: string }>) => events.map(event)

describe('the keys', () => {
  it('names an item by its year', () => {
    expect(itemKey(2026, 'bench')).toBe('g:i:2026:bench')
    expect(itemKey(0, 'pond')).toBe('g:i:0:pond')
  })

  it('fits inside what the route takes', () => {
    expect(itemKey(2026, 'greenhouse').length).toBeLessThanOrEqual(60)
    // the whole event passes the same check the server's route makes
    expect(cleanEvent({ id: 'place-abc-123457', at: 1, ...itemPlace(2026, 'pond', 3) })).not.toBeNull()
    expect(cleanEvent({ id: 'place-abc-123458', at: 1, ...itemRemove(2026, 'pond') })).not.toBeNull()
  })
})

describe('reading her saved spots', () => {
  it('takes the newest choice per key', () => {
    const items = savedItems(log({ key: itemKey(2026, 'pond'), slot: 1 }, { key: itemKey(2026, 'pond'), slot: 4 }))
    expect(items.get(2026)!.get('pond')).toBe(4)
  })

  it('ignores the den’s own place choices', () => {
    expect(savedItems(log({ key: 'home:rug', item: 'rug-rag' })).size).toBe(0)
  })

  it('leaves the plant spots she once saved in the log, unread', () => {
    // a log only grows (D-0052 §6): the old g:p: keys stay and are no longer read (D-0071 §1)
    const old = log({ key: 'g:p:a', bed: 1, spot: 2 }, { key: itemKey(2026, 'pond'), slot: 1 })
    expect(savedItems(old).get(2026)!.get('pond')).toBe(1)
    expect(savedItems(old).size).toBe(1)
  })

  it('leaves the den’s choices working, with garden choices in the same log', () => {
    const mixed = [
      { id: 'b1', at: 1, kind: 'buy', item: 'basket-bed', price: 1 },
      { id: 'b2', at: 2, kind: 'place', key: 'home:bed', item: 'basket-bed' },
      { id: 'b3', at: 3, kind: 'place', key: 'g:p:a', bed: 1, spot: 2 },
      { id: 'b4', at: 4, kind: 'place', key: itemKey(2026, 'pond'), slot: 1 },
    ] as unknown as ChoiceEvent[]
    expect(deriveShop(mixed).placed.bed).toBe('basket-bed')
    expect(savedItems(mixed).get(2026)!.get('pond')).toBe(1)
  })

  it('reads an item’s slot and leaves out one that was taken away', () => {
    const items = savedItems(log({ key: itemKey(2026, 'bench'), slot: 0 }, { key: itemKey(2026, 'pond'), slot: 1 }, { key: itemKey(2026, 'pond'), slot: 1, off: 1 }))
    expect(items.get(2026)!.get('bench')).toBe(0)
    expect(items.get(2026)!.has('pond')).toBe(false)
  })

  it('drops an item, a year or a slot it does not know', () => {
    const items = savedItems(
      log(
        { key: 'g:i:2026:gazebo', slot: 1 },
        { key: 'g:i:-5:bench', slot: 1 },
        { key: 'g:i:2026:bench', slot: MAX_ITEM_SLOTS },
        { key: 'g:i:2026', slot: 1 },
      ),
    )
    expect(items.size).toBe(0)
  })
})

describe('putting the plants in their places', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }))

  it('fills the spots in the order the plants were finished', () => {
    const { spots, beds } = arrange(ids(5))
    expect(beds).toBe(1)
    expect(spots.get('p0')).toEqual({ bed: 0, spot: 0 })
    expect(spots.get('p4')).toEqual({ bed: 0, spot: 4 })
  })

  it('opens the next bed when the spots run out', () => {
    const { spots, beds } = arrange(ids(SPOTS_PER_BED + 2))
    expect(beds).toBe(2)
    expect(spots.get(`p${SPOTS_PER_BED}`)).toEqual({ bed: 1, spot: 0 })
  })

  it('puts every plant on the spot of its own place in the order, and never two on one', () => {
    const { spots } = arrange(ids(4))
    expect(spots.get('p0')).toEqual({ bed: 0, spot: 0 })
    expect(spots.get('p1')).toEqual({ bed: 0, spot: 1 })
    expect(spots.get('p2')).toEqual({ bed: 0, spot: 2 })
    expect(spots.get('p3')).toEqual({ bed: 0, spot: 3 })
    const all = [...spots.values()].map(spotIndex)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives the same garden twice, because nothing of hers is read (D-0071 §1)', () => {
    const once = arrange(ids(20))
    const again = arrange(ids(20))
    expect([...again.spots]).toEqual([...once.spots])
    expect(again.beds).toBe(once.beds)
  })

  it('counts a spot the same way back and forth', () => {
    for (const at of [0, 3, SPOTS_PER_BED, SPOTS_PER_BED * 3 + 7]) expect(spotIndex(spotAt(at))).toBe(at)
  })
})
