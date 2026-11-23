import { describe, expect, it } from 'vitest'
import { BLOCKS, type BlockId } from './dashboardLayout'
import { MAX_FAVOURITES, applyChange, cleanFavourites, favouritesChange, meetAccount } from './favourites'

describe('favourites kept with the account (#182)', () => {
  it('cleans a saved list: unknown ids dropped, duplicates removed, order kept', () => {
    expect(cleanFavourites(['reading', 'nonsense', 'myyear', 'reading', 42, null, 'calendar', 'myyear'])).toEqual([
      'reading',
      'myyear',
      'calendar',
    ])
  })

  it('treats anything but a list as no favourites', () => {
    for (const raw of [null, undefined, '', 'myyear', { 0: 'myyear' }, 7]) expect(cleanFavourites(raw)).toEqual([])
  })

  it('keeps at most one entry per block', () => {
    const every = Object.keys(BLOCKS)
    expect(MAX_FAVOURITES).toBe(every.length)
    expect(cleanFavourites([...every, ...every, 'extra'])).toEqual(every)
  })

  it('does not take ids from the object prototype for blocks', () => {
    expect(cleanFavourites(['toString', 'constructor', '__proto__', 'myyear'])).toEqual(['myyear'])
  })

  it('sends what changed, not the whole list', () => {
    expect(favouritesChange(['myyear', 'reading'], ['reading', 'calendar', 'badges'])).toEqual({
      add: ['calendar', 'badges'],
      remove: ['myyear'],
    })
    expect(favouritesChange(['myyear'], ['myyear'])).toEqual({ add: [], remove: [] })
  })

  it('applies a change to what the account has now, keeping stars from other devices', () => {
    // the phone starred "calendar" meanwhile; the laptop unstars "goal" and stars "heatmap"
    const account: BlockId[] = ['myyear', 'reading', 'calendar']
    expect(applyChange(account, { add: ['badges'], remove: ['myyear'] })).toEqual(['reading', 'calendar', 'badges'])
    // a block already starred stays where it is
    expect(applyChange(account, { add: ['reading'], remove: [] })).toEqual(account)
    // an empty change leaves the list alone
    expect(applyChange(account, { add: [], remove: [] })).toEqual(account)
  })

  describe('the first time a device meets the account', () => {
    it("takes the account's favourites when it has any", () => {
      expect(meetAccount(['myyear', 'pace'], ['reading', 'calendar'], false)).toEqual({
        favourites: ['reading', 'calendar'],
        push: [],
      })
    })

    it("saves the device's own to the account when the account has none", () => {
      expect(meetAccount(['myyear', 'pace'], [], false)).toEqual({ favourites: ['myyear', 'pace'], push: ['myyear', 'pace'] })
    })

    it('sends nothing when neither has any', () => {
      expect(meetAccount([], [], false)).toEqual({ favourites: [], push: [] })
    })

    it('never wipes the account with a device that has none', () => {
      expect(meetAccount([], ['reading'], false)).toEqual({ favourites: ['reading'], push: [] })
    })
  })

  describe('after that', () => {
    it("always takes the account's, also an empty list", () => {
      expect(meetAccount(['myyear', 'pace'], [], true)).toEqual({ favourites: [], push: [] })
      expect(meetAccount(['myyear'], ['reading'], true)).toEqual({ favourites: ['reading'], push: [] })
    })
  })
})

describe('a move within Favourites worked out against the account (T-0020, D-0028)', async () => {
  const { moveToChanges, orderMoves, cleanUnsent } = await import('./favourites')
  const [a, b, c, d, e, f] = ['myyear', 'reading', 'calendar', 'pace', 'fact', 'bingo'] as BlockId[]
  /** the two changes applied one after the other, as the server route does */
  const sent = (account: BlockId[], id: BlockId, before: BlockId[]) =>
    moveToChanges(account, id, before).reduce(applyChange, account)

  it('puts the block right after its last anchor on the account, every other block in the same order', () => {
    expect(sent([a, b, c, d, e], e, [a])).toEqual([a, e, b, c, d])
    expect(sent([a, b, c, d, e], a, [b, c, d])).toEqual([b, c, d, a, e])
    expect(sent([a, b, c, d, e], c, [])).toEqual([c, a, b, d, e])
    // anchors in her order: the last one decides
    expect(sent([a, b, c, d, e], a, [d, b])).toEqual([b, a, c, d, e])
  })

  it('sends two plain changes: an unstar, then a re-star of the same tail', () => {
    const changes = moveToChanges([a, b, c, d], b, [a, c])
    expect(changes).toHaveLength(2)
    expect(changes[0].add).toEqual([])
    expect(changes[1].remove).toEqual([])
    expect(changes[0].remove).toEqual(changes[1].add)
  })

  it('a move to the end is just the block; the tail is never longer than needed', () => {
    expect(moveToChanges([a, b, c, d], b, [a, c, d])).toEqual([
      { add: [], remove: [b] },
      { add: [b], remove: [] },
    ])
    // down: a after c gives [b, c, a, d]; only a and d go round
    expect(moveToChanges([a, b, c, d], a, [b, c])).toEqual([
      { add: [], remove: [a, d] },
      { add: [a, d], remove: [] },
    ])
    // up: d after a gives [a, d, b, c]; only b and c go round
    expect(moveToChanges([a, b, c, d], d, [a])).toEqual([
      { add: [], remove: [b, c] },
      { add: [b, c], remove: [] },
    ])
    // already where it should be: nothing to send
    expect(moveToChanges([a, b, c], b, [a])).toEqual([])
  })

  it('keeps what other devices did: unstars stay unstarred, new stars stay', () => {
    // b was unstarred elsewhere; she moved e after b (her list still had b)
    const changes = moveToChanges([a, c, d, e], e, [a, b])
    expect(changes.flatMap((ch) => [...ch.add, ...ch.remove])).not.toContain(b)
    expect(changes.reduce(applyChange, [a, c, d, e] as BlockId[])).toEqual([a, e, c, d])
    // f was starred elsewhere: it stays, and nothing is twice
    const withF = sent([a, b, c, d, f], d, [a])
    expect(withF).toEqual([a, d, b, c, f])
    expect(new Set(withF).size).toBe(withF.length)
  })

  it('drops a move of a block no longer on the account; with no anchor there the block goes first', () => {
    expect(moveToChanges([a, b, c], d, [a])).toEqual([])
    expect(sent([a, b, c], c, [e, f])).toEqual([c, a, b])
  })

  it('turns a new order into a move of the one block moved', () => {
    expect(orderMoves([a, b, c, d], [a, d, b, c])).toEqual([{ move: d, before: [a] }])
    expect(orderMoves([a, b], [b, a])).toHaveLength(1)
    expect(orderMoves([a, b, c], [a, b, c])).toEqual([])
    // more than one block moved at once: a move for each, which builds the same order
    const moves = orderMoves([a, b, c, d], [d, c, b, a])
    let account: BlockId[] = [a, b, c, d]
    for (const m of moves) account = moveToChanges(account, m.move, m.before).reduce(applyChange, account)
    expect(account).toEqual([d, c, b, a])
  })

  it('reads a queued move back, and junk as an empty change', () => {
    expect(cleanUnsent({ move: d, before: [a, 'nonsense', d] })).toEqual({ move: d, before: [a] })
    expect(cleanUnsent({ move: 'nonsense' })).toEqual({ add: [], remove: [] })
    expect(cleanUnsent(null)).toEqual({ add: [], remove: [] })
  })
})
