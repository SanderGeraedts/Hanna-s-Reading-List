import { describe, expect, it } from 'vitest'
import { BLOCKS, type BlockId } from './dashboardLayout'
import { MAX_FAVOURITES, applyChange, cleanFavourites, favouritesChange, meetAccount } from './favourites'

describe('favourites kept with the account (#182)', () => {
  it('cleans a saved list: unknown ids dropped, duplicates removed, order kept', () => {
    expect(cleanFavourites(['reading', 'nonsense', 'goal', 'reading', 42, null, 'calendar', 'goal'])).toEqual([
      'reading',
      'goal',
      'calendar',
    ])
  })

  it('treats anything but a list as no favourites', () => {
    for (const raw of [null, undefined, '', 'goal', { 0: 'goal' }, 7]) expect(cleanFavourites(raw)).toEqual([])
  })

  it('keeps at most one entry per block', () => {
    const every = Object.keys(BLOCKS)
    expect(MAX_FAVOURITES).toBe(every.length)
    expect(cleanFavourites([...every, ...every, 'extra'])).toEqual(every)
  })

  it('does not take ids from the object prototype for blocks', () => {
    expect(cleanFavourites(['toString', 'constructor', '__proto__', 'goal'])).toEqual(['goal'])
  })

  it('sends what changed, not the whole list', () => {
    expect(favouritesChange(['goal', 'reading'], ['reading', 'calendar', 'heatmap'])).toEqual({
      add: ['calendar', 'heatmap'],
      remove: ['goal'],
    })
    expect(favouritesChange(['goal'], ['goal'])).toEqual({ add: [], remove: [] })
  })

  it('applies a change to what the account has now, keeping stars from other devices', () => {
    // the phone starred "calendar" meanwhile; the laptop unstars "goal" and stars "heatmap"
    const account: BlockId[] = ['goal', 'reading', 'calendar']
    expect(applyChange(account, { add: ['heatmap'], remove: ['goal'] })).toEqual(['reading', 'calendar', 'heatmap'])
    // a block already starred stays where it is
    expect(applyChange(account, { add: ['reading'], remove: [] })).toEqual(account)
    // an empty change leaves the list alone
    expect(applyChange(account, { add: [], remove: [] })).toEqual(account)
  })

  describe('the first time a device meets the account', () => {
    it("takes the account's favourites when it has any", () => {
      expect(meetAccount(['goal', 'pace'], ['reading', 'calendar'], false)).toEqual({
        favourites: ['reading', 'calendar'],
        push: [],
      })
    })

    it("saves the device's own to the account when the account has none", () => {
      expect(meetAccount(['goal', 'pace'], [], false)).toEqual({ favourites: ['goal', 'pace'], push: ['goal', 'pace'] })
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
      expect(meetAccount(['goal', 'pace'], [], true)).toEqual({ favourites: [], push: [] })
      expect(meetAccount(['goal'], ['reading'], true)).toEqual({ favourites: ['reading'], push: [] })
    })
  })
})
