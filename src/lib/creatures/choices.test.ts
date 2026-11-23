import { describe, expect, it } from 'vitest'
import { cleanEvent, cleanLog, isFeed, isHatch, isName, mergeLogs, newEventId } from './choices'
import type { ChoiceEvent } from './choices'

/** The choices log (D-0034): merged the same way as the server's route merges it (T-0028). */

const ev = (id: string, at: number, kind: string, more: Record<string, string | number> = {}) =>
  ({ id, at, kind, ...more }) as ChoiceEvent

describe('merging two logs', () => {
  it('is a union by id: nothing lost, nothing doubled', () => {
    const a = [ev('feed-1', 1, 'feed', { pet: 'welcome', amount: 5 }), ev('feed-2', 2, 'feed', { pet: 'welcome', amount: 5 })]
    const b = [ev('feed-2', 2, 'feed', { pet: 'welcome', amount: 5 }), ev('feed-3', 3, 'feed', { pet: 'welcome', amount: 3 })]
    const merged = mergeLogs(a, b)
    expect(merged.map((e) => e.id)).toEqual(['feed-1', 'feed-2', 'feed-3'])
    expect(mergeLogs(merged, a, b)).toEqual(merged)
  })

  it('never changes an event that is already there', () => {
    const mine = [ev('feed-1', 1, 'feed', { pet: 'welcome', amount: 5 })]
    const theirs = [ev('feed-1', 1, 'feed', { pet: 'welcome', amount: 50 })]
    expect(mergeLogs(mine, theirs)[0]).toMatchObject({ amount: 5 })
  })

  it('keeps only the newest setting per key, the larger id on a tie', () => {
    const a = [ev('name-a', 10, 'name', { key: 'welcome', name: 'Mochi' }), ev('name-x', 5, 'name', { key: 'other', name: 'Tofu' })]
    const b = [ev('name-b', 20, 'name', { key: 'welcome', name: 'Biscuit' })]
    const merged = mergeLogs(a, b)
    expect(merged.map((e) => e.id)).toEqual(['name-x', 'name-b'])
    const tie = mergeLogs([ev('name-1', 30, 'name', { key: 'welcome', name: 'A' })], [ev('name-2', 30, 'name', { key: 'welcome', name: 'B' })])
    expect(tie.map((e) => e.id)).toEqual(['name-2'])
  })

  it('lists the log in the same order on every device', () => {
    const a = [ev('x', 2, 'feed', { pet: 'p', amount: 1 }), ev('y', 1, 'feed', { pet: 'p', amount: 1 })]
    const b = [ev('z', 1, 'feed', { pet: 'p', amount: 1 })]
    expect(mergeLogs(a, b)).toEqual(mergeLogs(b, a))
    expect(mergeLogs(a, b).map((e) => e.id)).toEqual(['y', 'z', 'x'])
  })
})

describe('cleaning', () => {
  it('keeps well-formed events like the route does, and drops the rest', () => {
    expect(cleanEvent({ id: 'feed-1', at: 1, kind: 'feed', pet: 'welcome', amount: 5 })).not.toBeNull()
    expect(cleanEvent({ id: 'bad id!', at: 1, kind: 'feed' })).toBeNull()
    expect(cleanEvent({ id: 'a', at: 'soon', kind: 'feed' })).toBeNull()
    expect(cleanEvent({ id: 'a', at: 1, kind: 'dance' })).toBeNull()
    expect(cleanEvent({ id: 'a', at: 1, kind: 'name', name: 'Biscuit' })).toBeNull() // a setting needs a key
    expect(cleanEvent({ id: 'a', at: 1, kind: 'feed', note: 'x'.repeat(61) })).toBeNull()
    expect(cleanEvent({ id: 'a', at: 1, kind: 'feed', nested: { a: 1 } })).toBeNull()
    expect(cleanEvent(null)).toBeNull()
  })

  it('keeps a kind it can’t read yet (from a newer device) and passes it on', () => {
    const later = { id: 'buy-1', at: 5, kind: 'buy', item: 'scarf', price: 40 }
    expect(cleanLog([later])).toEqual([later])
    // a milestone egg's hatch carries no species (T-0030 derives it); a welcome hatch without one isn't read
    const surprise = { id: 'hatch-9', at: 6, kind: 'hatch', egg: 'm:books-5' }
    expect(cleanLog([surprise])).toEqual([surprise])
    expect(isHatch(surprise as ChoiceEvent)).toBe(true)
    expect(isHatch({ id: 'hatch-8', at: 6, kind: 'hatch', egg: 'welcome' } as ChoiceEvent)).toBe(false)
  })

  it('reads only what it understands', () => {
    expect(isHatch(ev('h', 1, 'hatch', { egg: 'welcome', species: 'cat' }))).toBe(true)
    expect(isHatch(ev('h', 1, 'hatch', { egg: 'welcome', species: 'dodo' }))).toBe(false)
    expect(isName(ev('n', 1, 'name', { key: 'welcome', name: '  ' }))).toBe(false)
    expect(isFeed(ev('f', 1, 'feed', { pet: 'welcome', amount: 0 }))).toBe(false)
  })

  it('makes ids the route accepts', () => {
    const id = newEventId('hatch', 1_795_824_000_000)
    expect(id).toMatch(/^[A-Za-z0-9:_-]{1,60}$/)
    expect(newEventId('feed', 1, () => 0.1)).not.toBe(newEventId('feed', 1, () => 0.2))
  })
})
