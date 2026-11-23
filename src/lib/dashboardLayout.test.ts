import { describe, expect, it } from 'vitest'
import {
  BLOCKS,
  DEFAULT_LAYOUT,
  SECTION_IDS,
  cleanLayout,
  hideBlock,
  moveBlock,
  placeOf,
  resetLayout,
  showBlock,
  singleColumn,
  toggleFold,
} from './dashboardLayout'
import type { BlockId, DashboardLayout } from './dashboardLayout'

const everyBlock = (l: DashboardLayout) => [...SECTION_IDS.flatMap((s) => l.sections[s].flat()), ...l.hidden]

describe('dashboard layout with sections', () => {
  it('starts from the default, with every block once', () => {
    expect(cleanLayout(null)).toEqual(DEFAULT_LAYOUT)
    const all = everyBlock(DEFAULT_LAYOUT)
    expect(new Set(all).size).toBe(all.length)
    expect([...all].sort()).toEqual((Object.keys(BLOCKS) as BlockId[]).sort())
  })

  it('moves a layout from before the sections into them, keeping her order and side', () => {
    const old = cleanLayout({
      columns: [
        ['goal', 'count', 'streak', 'monthly', 'fact', 'reading'],
        ['records', 'spice', 'top', 'alphabetAuthors', 'bingo'],
      ],
      hidden: ['lent'],
    })
    // merged blocks (streak, monthly, spice, alphabetAuthors) are gone
    expect(everyBlock(old)).not.toContain('streak')
    expect(old.sections.challenges).toEqual([['alphabet'], ['bingo']])
    // goal, count and records all read as My year now (D-0060): one block, in the first one's place
    expect(old.sections.stats[0].slice(0, 1)).toEqual(['myyear'])
    expect(old.sections.stats[1]).not.toContain('myyear')
    expect(old.sections.fun[0][0]).toBe('fact')
    expect(old.sections.fun[1][0]).toBe('top')
    // Waiting for you first; hidden stays hidden; every block once
    expect(old.sections.today[0].slice(0, 2)).toEqual(['waiting', 'reading'])
    expect(old.hidden).toEqual(['lent'])
    const all = everyBlock(old)
    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBe(Object.keys(BLOCKS).length)
  })

  it('moves a block within its section and to another section', () => {
    const l = moveBlock(DEFAULT_LAYOUT, 'fact', 'today', 1, 0)
    expect(l.sections.today[1][0]).toBe('fact')
    expect(l.sections.fun[0]).toEqual(['badges', 'tropes', 'wrapped'])
    expect(placeOf(l, 'fact')).toEqual({ section: 'today', column: 1, index: 0 })
  })

  it('hides a block and brings it back in its own section', () => {
    const moved = moveBlock(DEFAULT_LAYOUT, 'fact', 'today', 1, 0)
    const hidden = hideBlock(moved, 'fact')
    expect(placeOf(hidden, 'fact')).toBeNull()
    expect(hidden.hidden).toEqual(['fact'])
    const back = showBlock(toggleFold(hidden, 'fun'), 'fact')
    expect(placeOf(back, 'fact')?.section).toBe('fun')
    // showing a block opens its section
    expect(back.folded).toEqual([])
  })

  it('folds sections, remembered with the layout', () => {
    const l = toggleFold(DEFAULT_LAYOUT, 'stats')
    expect(l.folded).toEqual(['stats'])
    expect(cleanLayout(JSON.parse(JSON.stringify(l))).folded).toEqual(['stats'])
    expect(toggleFold(l, 'stats').folded).toEqual([])
  })

  it('takes turns between the columns on a narrow screen', () => {
    expect(singleColumn([['myyear', 'reading'], ['pace', 'next', 'calendar']])).toEqual([
      'myyear',
      'pace',
      'reading',
      'next',
      'calendar',
    ])
  })
})

describe('favourites on top', async () => {
  const { favouriteColumns, toggleFavourite } = await import('./dashboardLayout')

  it('stars blocks in order, in two columns, and takes the star off again', () => {
    let l = toggleFavourite(DEFAULT_LAYOUT, 'alphabet')
    l = toggleFavourite(l, 'bingo')
    l = toggleFavourite(l, 'fact')
    expect(l.favourites).toEqual(['alphabet', 'bingo', 'fact'])
    expect(favouriteColumns(l)).toEqual([['alphabet', 'fact'], ['bingo']])
    // still in their own sections too
    expect(placeOf(l, 'alphabet')?.section).toBe('challenges')
    expect(toggleFavourite(l, 'bingo').favourites).toEqual(['alphabet', 'fact'])
  })

  it('drops a hidden block from the favourites, and keeps favourites when saved', () => {
    const l = hideBlock(toggleFavourite(DEFAULT_LAYOUT, 'fact'), 'fact')
    expect(l.favourites).toEqual([])
    const saved = cleanLayout(JSON.parse(JSON.stringify(toggleFold(toggleFavourite(DEFAULT_LAYOUT, 'alphabet'), 'favourites'))))
    expect(saved.favourites).toEqual(['alphabet'])
    expect(saved.folded).toEqual(['favourites'])
    expect(cleanLayout({ ...saved, favourites: ['alphabet', 'nonsense', 'alphabet'] }).favourites).toEqual(['alphabet'])
  })

  it('Reset puts the default layout back but leaves the favourites alone (#182)', () => {
    let l = toggleFavourite(toggleFavourite(DEFAULT_LAYOUT, 'alphabet'), 'calendar')
    l = toggleFold(hideBlock(moveBlock(l, 'pace', 'fun', 1, 0), 'fact'), 'stats')
    const reset = resetLayout(l)
    expect(reset).toEqual({ ...DEFAULT_LAYOUT, favourites: ['alphabet', 'calendar'] })
    // a copy: changing it later can't change the default
    reset.sections.today[0].push('fact')
    expect(DEFAULT_LAYOUT.sections.today[0]).not.toContain('fact')
  })
})

describe('moving within Favourites (T-0020, D-0028)', async () => {
  const { favouriteColumns, favouritePlace, moveFavourite, stepFavourite, toggleFavourite } = await import(
    './dashboardLayout'
  )
  // a, b, c, d, e: columns [a, c, e] / [b, d]
  const [a, b, c, d, e] = ['myyear', 'reading', 'calendar', 'pace', 'fact'] as BlockId[]
  const five: DashboardLayout = { ...structuredClone(DEFAULT_LAYOUT), favourites: [a, b, c, d, e] }

  it('a drop in column c before row r is list place 2r + c of the others, or the end', () => {
    expect(favouriteColumns(five)).toEqual([
      [a, c, e],
      [b, d],
    ])
    const eFirst = moveFavourite(five, e, 0, 0)
    expect(eFirst.favourites).toEqual([e, a, b, c, d])
    expect(favouriteColumns(eFirst)[0][0]).toBe(e)
    const aRight = moveFavourite(five, a, 1, 1)
    expect(aRight.favourites).toEqual([b, c, d, a, e])
    expect(favouriteColumns(aRight)[1][1]).toBe(a)
    expect(moveFavourite(five, a, 1, 2).favourites).toEqual([b, c, d, e, a])
    expect(moveFavourite(five, a, 1, 9).favourites).toEqual([b, c, d, e, a])
    // the block shows where it was dropped whenever the list is long enough
    for (const id of five.favourites)
      for (const column of [0, 1] as const)
        for (let row = 0; row < 3; row++) {
          if (2 * row + column > 4) continue
          const next = moveFavourite(five, id, column, row)
          expect(favouriteColumns(next)[column][row]).toBe(id)
          expect(favouritePlace(next, id)).toEqual({ index: 2 * row + column, column, row })
        }
  })

  it('with one column the place in the column is the place in the list', () => {
    expect(moveFavourite(five, e, 0, 1, 1).favourites).toEqual([a, e, b, c, d])
    expect(favouritePlace(five, d, 1)).toEqual({ index: 3, column: 0, row: 3 })
  })

  it('keys: Up/Down a row with two columns, a place with one; Left/Right to the other column', () => {
    expect(stepFavourite(five, c, 'ArrowUp').favourites).toEqual([c, a, b, d, e])
    expect(stepFavourite(five, c, 'ArrowDown').favourites).toEqual([a, b, d, e, c])
    expect(stepFavourite(five, d, 'ArrowLeft').favourites).toEqual([a, b, d, c, e])
    expect(stepFavourite(five, c, 'ArrowRight').favourites).toEqual([a, b, d, c, e])
    expect(stepFavourite(five, c, 'ArrowUp', 1).favourites).toEqual([a, c, b, d, e])
    expect(stepFavourite(five, c, 'ArrowDown', 1).favourites).toEqual([a, b, d, c, e])
  })

  it('keys at an edge leave the layout as it is', () => {
    expect(stepFavourite(five, a, 'ArrowUp')).toBe(five)
    expect(stepFavourite(five, b, 'ArrowUp')).toBe(five)
    expect(stepFavourite(five, d, 'ArrowDown')).toBe(five)
    expect(stepFavourite(five, e, 'ArrowDown')).toBe(five)
    expect(stepFavourite(five, a, 'ArrowLeft')).toBe(five) // left column already
    expect(stepFavourite(five, b, 'ArrowRight')).toBe(five) // right column already
    expect(stepFavourite(five, e, 'ArrowRight')).toBe(five) // no room on its row
    expect(stepFavourite(five, a, 'ArrowUp', 1)).toBe(five)
    expect(stepFavourite(five, e, 'ArrowDown', 1)).toBe(five)
    expect(stepFavourite(five, c, 'ArrowLeft', 1)).toBe(five)
    expect(stepFavourite(five, c, 'ArrowRight', 1)).toBe(five)
    const one = { ...five, favourites: [a] }
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const) expect(stepFavourite(one, a, k)).toBe(one)
    // two side by side: Left/Right swaps them, Up/Down do nothing; one column: Up/Down swaps
    const two = { ...five, favourites: [a, b] }
    expect(stepFavourite(two, a, 'ArrowRight').favourites).toEqual([b, a])
    expect(stepFavourite(two, a, 'ArrowDown')).toBe(two)
    expect(stepFavourite(two, a, 'ArrowDown', 1).favourites).toEqual([b, a])
    // not a favourite: nothing
    expect(stepFavourite(five, 'bingo', 'ArrowUp')).toBe(five)
    expect(moveFavourite(five, 'bingo', 0, 0)).toBe(five)
  })

  it('a favourites move changes only their order; a section move never changes it', () => {
    const arranged = toggleFold(hideBlock(moveBlock(five, 'bingo', 'today', 1, 0), 'pile'), 'stats')
    const moved = [
      moveFavourite(arranged, e, 0, 0),
      moveFavourite(arranged, a, 0, 2, 1),
      stepFavourite(arranged, d, 'ArrowLeft'),
    ]
    for (const next of moved) {
      expect(next.sections).toEqual(arranged.sections)
      expect(next.hidden).toEqual(arranged.hidden)
      expect(next.folded).toEqual(arranged.folded)
      expect([...next.favourites].sort()).toEqual([...arranged.favourites].sort())
      expect(next.favourites).not.toEqual(arranged.favourites)
    }
    expect(moveBlock(five, c, 'fun', 0, 0).favourites).toEqual(five.favourites)
    expect(moveBlock(five, e, 'today', 1, 2).favourites).toEqual(five.favourites)
    // a new star still goes to the end; Reset keeps the order
    const ordered = moveFavourite(five, e, 0, 0)
    expect(toggleFavourite(ordered, 'bingo').favourites).toEqual([e, a, b, c, d, 'bingo'])
    expect(resetLayout(ordered).favourites).toEqual([e, a, b, c, d])
  })

  it('cleanLayout keeps the favourites in her order (saved and loaded again)', () => {
    const ordered = moveFavourite(five, a, 1, 1)
    expect(cleanLayout(JSON.parse(JSON.stringify(ordered))).favourites).toEqual([b, c, d, a, e])
  })
})

describe('the Creatures block (T-0029)', () => {
  it('stands in Today right after Monthly challenge, also on a layout saved before it, with her favourites kept', () => {
    expect(BLOCKS.creatures).toBe('Creatures')
    expect(DEFAULT_LAYOUT.sections.today[1].slice(0, 2)).toEqual(['challenge', 'creatures'])
    const before = structuredClone(DEFAULT_LAYOUT)
    before.sections.today[1] = before.sections.today[1].filter((id) => id !== 'creatures')
    before.favourites = ['myyear', 'challenge']
    const loaded = cleanLayout(JSON.parse(JSON.stringify(before)))
    expect(loaded.sections.today[1].slice(0, 2)).toEqual(['challenge', 'creatures'])
    expect(loaded.favourites).toEqual(['myyear', 'challenge'])
    // and it can be starred like every block
    expect(cleanLayout({ ...loaded, favourites: ['creatures'] }).favourites).toEqual(['creatures'])
  })
})

describe('the blocks that moved to the Stats page (T-0080, D-0060)', async () => {
  const { MERGED_INTO, favouriteColumns } = await import('./dashboardLayout')
  const MOVED = ['count', 'goal', 'heatmap', 'months', 'flower', 'rhythm', 'breakdown', 'records'] as const

  /** a layout as it was saved before the move: the old default, with her own tweak */
  const savedBefore = (extra: Record<string, unknown> = {}) => ({
    sections: {
      today: [
        ['waiting', 'reading', 'pace', 'lent', 'again'],
        ['challenge', 'creatures', 'garden', 'next', 'newforyou', 'recent'],
      ],
      challenges: [['goal', 'alphabet'], ['bingo']],
      stats: [
        ['count', 'heatmap', 'breakdown', 'flower', 'authors'],
        ['calendar', 'months', 'records', 'rhythm', 'series', 'pile'],
      ],
      fun: [
        ['badges', 'tropes', 'fact', 'wrapped'],
        ['covers', 'world', 'top', 'onthisday'],
      ],
    },
    hidden: [],
    folded: [],
    favourites: [],
    ...extra,
  })

  it('every moved block has somewhere to go, and none of them is a block any more', () => {
    for (const id of MOVED) {
      expect(MERGED_INTO[id]).toBe('myyear')
      expect(Object.keys(BLOCKS)).not.toContain(id)
    }
    expect(BLOCKS.myyear).toBe('My year')
  })

  it('a layout saved before the move loads, with My year once, in the first moved block’s place', () => {
    const l = cleanLayout(savedBefore())
    const all = everyBlock(l)
    expect(all.filter((id) => id === 'myyear')).toHaveLength(1)
    expect(new Set(all).size).toBe(all.length)
    expect([...all].sort()).toEqual((Object.keys(BLOCKS) as BlockId[]).sort())
    // "goal" came first in her saved layout, in Challenges: that is where My year lands
    expect(l.sections.challenges[0]).toEqual(['myyear', 'alphabet'])
    expect(l.sections.stats[0]).not.toContain('myyear')
  })

  it('a star on a moved block becomes a star on My year, once', () => {
    const l = cleanLayout(savedBefore({ favourites: ['heatmap', 'records', 'bingo', 'flower'] }))
    expect(l.favourites).toEqual(['myyear', 'bingo'])
    expect(favouriteColumns(l)).toEqual([['myyear'], ['bingo']])
  })

  it('a block she could see wins over a hidden one, whichever order they were saved in', () => {
    // the heatmap and Pages per month hidden, Books read and the goal still on the
    // dashboard: My year stays where she can see it, and a block she really hid stays hidden
    const before = savedBefore()
    for (const s of SECTION_IDS)
      before.sections[s] = before.sections[s].map((col) =>
        col.filter((id) => !['heatmap', 'months', 'lent'].includes(id as string)),
      ) as never
    const l = cleanLayout({ ...before, hidden: ['heatmap', 'months', 'lent'] })
    expect(l.hidden).toEqual(['lent'])
    expect(placeOf(l, 'myyear')).not.toBeNull()
  })

  it('all eight hidden means My year is hidden', () => {
    const before = savedBefore()
    for (const s of SECTION_IDS)
      before.sections[s] = before.sections[s].map((col) => col.filter((id) => !MOVED.includes(id as never))) as never
    const l = cleanLayout({ ...before, hidden: [...MOVED] })
    expect(l.hidden).toEqual(['myyear'])
    expect(placeOf(l, 'myyear')).toBeNull()
    // and she can bring it back, into My stats where it belongs
    expect(placeOf(showBlock(l, 'myyear'), 'myyear')?.section).toBe('stats')
  })

  it('Year in review keeps its id, so a layout and a star that name it still work', () => {
    const l = cleanLayout(savedBefore({ favourites: ['wrapped'] }))
    expect(l.favourites).toEqual(['wrapped'])
    expect(placeOf(l, 'wrapped')?.section).toBe('fun')
  })
})
