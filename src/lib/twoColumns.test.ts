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
