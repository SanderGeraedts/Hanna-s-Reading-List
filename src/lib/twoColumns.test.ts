import { describe, expect, it } from 'vitest'
import { cleanTwoColumns, hideIn, moveIn, oneColumn, placeIn, showIn } from './twoColumns'
import type { TwoColumns } from './twoColumns'

type Id = 'goal' | 'monthly' | 'bingo' | 'alphabet'
const known: Id[] = ['goal', 'monthly', 'bingo', 'alphabet']
const defaults: TwoColumns<Id> = { columns: [['goal', 'bingo'], ['monthly', 'alphabet']], hidden: [] }

describe('arranging the Challenges page', () => {
  it('starts from the default and keeps a saved order, adding what is new', () => {
    expect(cleanTwoColumns(null, known, defaults)).toEqual(defaults)
    const saved = cleanTwoColumns({ columns: [['bingo', 'nonsense'], ['goal']], hidden: ['alphabet'] }, known, defaults)
    expect(saved.columns).toEqual([['bingo'], ['goal', 'monthly']])
    expect(saved.hidden).toEqual(['alphabet'])
  })

  it('moves, hides and shows a challenge', () => {
    const moved = moveIn(defaults, 'alphabet', 0, 0)
    expect(moved.columns).toEqual([['alphabet', 'goal', 'bingo'], ['monthly']])
    expect(placeIn(moved, 'alphabet')).toEqual({ column: 0, index: 0 })
    const hidden = hideIn(moved, 'goal')
    expect(placeIn(hidden, 'goal')).toBeNull()
    expect(placeIn(showIn(hidden, 'goal'), 'goal')).toEqual({ column: 1, index: 0 })
    expect(oneColumn(defaults.columns)).toEqual(['goal', 'monthly', 'bingo', 'alphabet'])
  })
})

describe('a Challenges layout saved before the four new challenges (T-0091)', () => {
  type Next = 'goal' | 'monthly' | 'bingo' | 'alphabet' | 'world' | 'season' | 'minutes' | 'series'
  const nextKnown: Next[] = ['goal', 'monthly', 'bingo', 'alphabet', 'world', 'season', 'minutes', 'series']
  const nextDefaults: TwoColumns<Next> = {
    columns: [
      ['goal', 'bingo', 'world', 'minutes'],
      ['monthly', 'alphabet', 'season', 'series'],
    ],
    hidden: [],
  }

  it('keeps her order and puts each new block in its default place', () => {
    // what she had arranged before they existed
    const old = { columns: [['bingo', 'goal'], ['alphabet']], hidden: ['monthly'] }
    const got = cleanTwoColumns(old, nextKnown, nextDefaults)
    // her own order is untouched
    expect(got.columns[0].slice(0, 2)).toEqual(['bingo', 'goal'])
    expect(got.hidden).toEqual(['monthly'])
    // every new block is somewhere, exactly once, and nothing is lost
    const all = [...got.columns[0], ...got.columns[1], ...got.hidden]
    expect([...all].sort()).toEqual([...nextKnown].sort())
    for (const id of ['world', 'season', 'minutes', 'series'] as const) expect(all).toContain(id)
  })

  it('a layout that already knows them is left alone', () => {
    expect(cleanTwoColumns(nextDefaults, nextKnown, nextDefaults)).toEqual(nextDefaults)
  })
})
