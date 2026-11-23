import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from '../creatures/choices'
import { cleanEvent } from '../creatures/choices'
import { deriveShop } from '../creatures/shop'
import { ITEM_SLOTS, SPOTS_PER_BED } from './numbers'
import { arrange, itemKey, itemPlace, itemRemove, plantKey, plantPlace, savedItems, savedPlants, spotAt, spotIndex } from './spots'

/**
 * Where things stand, saved in the existing choice log (T-0060, D-0052): the
 * keys, what a bad event does, and that the garden and the den never read each
 * other's choices.
 */

const event = (over: Partial<ChoiceEvent> & { key: string }, i = 0): ChoiceEvent =>
  ({ id: `e${i}`, at: 1000 + i, kind: 'place', ...over }) as ChoiceEvent

const log = (...events: Array<Partial<ChoiceEvent> & { key: string }>) => events.map(event)

describe('the keys', () => {
  it('names a plant by its book and an item by its year', () => {
    expect(plantKey('abc')).toBe('g:p:abc')
    expect(itemKey(2026, 'bench')).toBe('g:i:2026:bench')
    expect(itemKey(0, 'pond')).toBe('g:i:0:pond')
  })

  it('fits inside what the route takes, even for a 36-character book id', () => {
    const id = '0123456789abcdef0123456789abcdef0123'
    expect(id).toHaveLength(36)
    expect(plantKey(id).length).toBeLessThanOrEqual(60)
    // the whole event passes the same check the server's route makes
    const e = cleanEvent({ id: 'place-abc-123456', at: 1, ...plantPlace(id, { bed: 2, spot: 7 }) })
    expect(e).not.toBeNull()
    expect(cleanEvent({ id: 'place-abc-123457', at: 1, ...itemPlace(2026, 'pond', 3) })).not.toBeNull()
    expect(cleanEvent({ id: 'place-abc-123458', at: 1, ...itemRemove(2026, 'pond') })).not.toBeNull()
  })
})

describe('reading her saved spots', () => {
  it('takes the newest choice per key', () => {
    const spots = savedPlants(log({ key: plantKey('a'), bed: 0, spot: 1 }, { key: plantKey('a'), bed: 1, spot: 3 }))
    expect(spots.get('a')).toEqual({ bed: 1, spot: 3 })
  })

  it('drops a spot that is not a spot', () => {
    const spots = savedPlants(
      log(
        { key: plantKey('a'), bed: -1, spot: 1 },
        { key: plantKey('b'), bed: 0, spot: SPOTS_PER_BED },
        { key: plantKey('c'), bed: 0.5, spot: 1 },
        { key: plantKey('d'), spot: 1 },
        { key: 'g:p:', bed: 0, spot: 1 },
      ),
    )
    expect(spots.size).toBe(0)
  })

  it('ignores the den’s own place choices', () => {
    expect(savedPlants(log({ key: 'home:bed', item: 'basket-bed' })).size).toBe(0)
    expect(savedItems(log({ key: 'home:rug', item: 'rug-rag' })).size).toBe(0)
  })

  it('leaves the den’s choices working, with garden choices in the same log', () => {
    const mixed = [
      { id: 'b1', at: 1, kind: 'buy', item: 'basket-bed', price: 1 },
      { id: 'b2', at: 2, kind: 'place', key: 'home:bed', item: 'basket-bed' },
      { id: 'b3', at: 3, kind: 'place', key: plantKey('a'), bed: 1, spot: 2 },
      { id: 'b4', at: 4, kind: 'place', key: itemKey(2026, 'pond'), slot: 1 },
    ] as unknown as ChoiceEvent[]
    expect(deriveShop(mixed).placed.bed).toBe('basket-bed')
    expect(savedPlants(mixed).get('a')).toEqual({ bed: 1, spot: 2 })
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
        { key: 'g:i:2026:fountain', slot: 1 },
        { key: 'g:i:-5:bench', slot: 1 },
        { key: 'g:i:2026:bench', slot: ITEM_SLOTS },
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

  it('leaves her own spot alone and steps the plant that wanted it along', () => {
    const list = ids(4).map((p, i) => (i === 3 ? { ...p, saved: { bed: 0, spot: 1 } } : p))
    const { spots } = arrange(list)
    expect(spots.get('p3')).toEqual({ bed: 0, spot: 1 })
    expect(spots.get('p0')).toEqual({ bed: 0, spot: 0 })
    expect(spots.get('p1')).toEqual({ bed: 0, spot: 2 })
    expect(spots.get('p2')).toEqual({ bed: 0, spot: 2 + 1 })
  })

  it('gives a bed for a plant she put far away, and never two plants one spot', () => {
    const list = [{ id: 'a', saved: { bed: 4, spot: 3 } }, { id: 'b' }]
    const { spots, beds } = arrange(list)
    expect(beds).toBe(5)
    expect(spots.get('a')).toEqual({ bed: 4, spot: 3 })
    expect(spots.get('b')).toEqual({ bed: 0, spot: 1 })
    const all = [...spots.values()].map(spotIndex)
    expect(new Set(all).size).toBe(all.length)
  })

  it('lets the first plant keep the spot when two saved choices land on one', () => {
    const { spots } = arrange([
      { id: 'a', saved: { bed: 0, spot: 5 } },
      { id: 'b', saved: { bed: 0, spot: 5 } },
    ])
    expect(spots.get('a')).toEqual({ bed: 0, spot: 5 })
    expect(spots.get('b')).not.toEqual({ bed: 0, spot: 5 })
  })

  it('counts a spot the same way back and forth', () => {
    for (const at of [0, 3, SPOTS_PER_BED, SPOTS_PER_BED * 3 + 7]) expect(spotIndex(spotAt(at))).toBe(at)
  })
})
