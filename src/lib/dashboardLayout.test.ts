import { describe, expect, it } from 'vitest'
import {
  BLOCKS,
  DEFAULT_LAYOUT,
  OFF_DASHBOARD,
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
    // every block that is still on the dashboard (T-0121)
    expect([...all].sort()).toEqual((Object.keys(BLOCKS) as BlockId[]).filter((id) => !OFF_DASHBOARD.includes(id)).sort())
  })

  it('moves a layout from before the sections into them, keeping her order and side', () => {
    const old = cleanLayout({
      columns: [
        ['goal', 'count', 'streak', 'monthly', 'fact', 'reading'],
        ['records', 'spice', 'top', 'alphabetAuthors', 'bingo'],
      ],
      hidden: ['lent'],
    })
    // merged blocks (streak, monthly, spice, alphabetAuthors) are gone, and so is everything that
    // moved off the dashboard (T-0121): My year, ratings and bingo live on their own pages now
    const all = everyBlock(old)
    for (const id of ['streak', 'myyear', 'top', 'bingo']) expect(all).not.toContain(id)
    // what stays is all in Today now; Reading today and Waiting for you come first (T-0124)
    const today = old.sections.today[0]
    expect(today).toContain('fact')
    expect(today[0]).toBe('readingtoday')
    expect(old.sections.today.flat()).toContain('waiting')
    expect(old.hidden).toEqual(['lent'])
    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBe(Object.keys(BLOCKS).length - OFF_DASHBOARD.length)
  })

  it('moves a block within its section and to another section', () => {
    const l = moveBlock(DEFAULT_LAYOUT, 'fact', 'today', 0, 0)
    expect(l.sections.today[0][0]).toBe('fact')
    expect(l.sections.today[1]).not.toContain('fact')
    expect(placeOf(l, 'fact')).toEqual({ section: 'today', column: 0, index: 0 })
    const there = moveBlock(DEFAULT_LAYOUT, 'fact', 'fun', 0, 0)
    expect(placeOf(there, 'fact')).toEqual({ section: 'fun', column: 0, index: 0 })
  })

  it('hides a block and brings it back in its own section', () => {
    const moved = moveBlock(DEFAULT_LAYOUT, 'fact', 'today', 1, 0)
    const hidden = hideBlock(moved, 'fact')
    expect(placeOf(hidden, 'fact')).toBeNull()
    expect(hidden.hidden).toEqual(['fact'])
    // every block's own section is Today now (T-0121)
    const back = showBlock(toggleFold(hidden, 'today'), 'fact')
    expect(placeOf(back, 'fact')?.section).toBe('today')
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
    let l = toggleFavourite(DEFAULT_LAYOUT, 'lent')
    l = toggleFavourite(l, 'again')
    l = toggleFavourite(l, 'fact')
    expect(l.favourites).toEqual(['lent', 'again', 'fact'])
    expect(favouriteColumns(l)).toEqual([['lent', 'fact'], ['again']])
    // still in their own sections too
    expect(placeOf(l, 'lent')?.section).toBe('today')
    expect(toggleFavourite(l, 'again').favourites).toEqual(['lent', 'fact'])
  })

  it('drops a hidden block from the favourites, and keeps favourites when saved', () => {
    const l = hideBlock(toggleFavourite(DEFAULT_LAYOUT, 'fact'), 'fact')
    expect(l.favourites).toEqual([])
    const saved = cleanLayout(JSON.parse(JSON.stringify(toggleFold(toggleFavourite(DEFAULT_LAYOUT, 'lent'), 'favourites'))))
    expect(saved.favourites).toEqual(['lent'])
    expect(saved.folded).toEqual(['favourites'])
    expect(cleanLayout({ ...saved, favourites: ['lent', 'nonsense', 'lent'] }).favourites).toEqual(['lent'])
    // a star on a block that moved off the dashboard is dropped (T-0121)
    expect(cleanLayout({ ...saved, favourites: ['alphabet', 'lent'] }).favourites).toEqual(['lent'])
  })

  it('Reset puts the default layout back but leaves the favourites alone (#182)', () => {
    let l = toggleFavourite(toggleFavourite(DEFAULT_LAYOUT, 'lent'), 'calendar')
    l = toggleFold(hideBlock(moveBlock(l, 'pace', 'fun', 1, 0), 'fact'), 'stats')
    const reset = resetLayout(l)
    expect(reset).toEqual({ ...DEFAULT_LAYOUT, favourites: ['lent', 'calendar'] })
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
  const [a, b, c, d, e] = ['readingtoday', 'challenge', 'pick', 'lent', 'fact'] as BlockId[]
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
    expect(stepFavourite(five, 'again', 'ArrowUp')).toBe(five)
    expect(moveFavourite(five, 'again', 0, 0)).toBe(five)
  })

  it('a favourites move changes only their order; a section move never changes it', () => {
    const arranged = toggleFold(hideBlock(moveBlock(five, 'again', 'today', 1, 0), 'recent'), 'stats')
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
    expect(toggleFavourite(ordered, 'again').favourites).toEqual([e, a, b, c, d, 'again'])
    expect(resetLayout(ordered).favourites).toEqual([e, a, b, c, d])
  })

  it('cleanLayout keeps the favourites in her order (saved and loaded again)', () => {
    const ordered = moveFavourite(five, a, 1, 1)
    expect(cleanLayout(JSON.parse(JSON.stringify(ordered))).favourites).toEqual([b, c, d, a, e])
  })
})

describe('the Creatures, Garden and Bookshop blocks (T-0029, T-0124)', () => {
  it('are folded into Today in your world, and a saved layout or star that names them loads without them', () => {
    const today = DEFAULT_LAYOUT.sections.today.flat()
    for (const id of ['creatures', 'garden', 'bookshop'] as const) expect(today).not.toContain(id)
    expect(today).toContain('yourworld')
    const before = structuredClone(DEFAULT_LAYOUT)
    before.sections.today[1] = ['creatures', ...before.sections.today[1]]
    before.favourites = ['creatures', 'challenge']
    const loaded = cleanLayout(JSON.parse(JSON.stringify(before)))
    expect(loaded.sections.today.flat()).not.toContain('creatures')
    expect(loaded.favourites).toEqual(['challenge'])
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

  it('a layout saved before either move loads with only the blocks still on the dashboard (T-0121)', () => {
    const l = cleanLayout(savedBefore({ favourites: ['heatmap', 'records', 'lent', 'flower'] }))
    const all = everyBlock(l)
    expect(new Set(all).size).toBe(all.length)
    expect([...all].sort()).toEqual((Object.keys(BLOCKS) as BlockId[]).filter((id) => !OFF_DASHBOARD.includes(id)).sort())
    // stars on blocks that now live on the Stats page are dropped, the rest kept
    expect(l.favourites).toEqual(['lent'])
    expect(favouriteColumns(l)).toEqual([['lent'], []])
  })

  it('a block she really hid stays hidden', () => {
    const before = savedBefore()
    for (const s of SECTION_IDS) before.sections[s] = before.sections[s].map((col) => col.filter((id) => id !== 'lent')) as never
    const l = cleanLayout({ ...before, hidden: ['heatmap', 'lent'] })
    expect(l.hidden).toEqual(['lent'])
  })
})

describe('the Wishlist block is gone (D-0074 §6)', () => {
  it('is no longer a block at all', () => {
    expect(Object.hasOwn(BLOCKS, 'wishlist')).toBe(false)
    expect(SECTION_IDS.flatMap((s) => DEFAULT_LAYOUT.sections[s].flat())).not.toContain('wishlist')
  })

  it('leaves a layout that still names it working, with everything else of hers kept', () => {
    const saved = structuredClone(DEFAULT_LAYOUT) as unknown as { sections: Record<string, string[][]>; hidden: string[]; favourites: string[] }
    saved.sections.today[1] = ['recent', 'wishlist', 'challenge']
    // hidden means out of its section too, as hideBlock leaves it (T-0080)
    saved.sections.today = saved.sections.today.map((col) => col.filter((id) => id !== 'fact'))
    saved.sections.today[1] = ['recent', 'wishlist', 'challenge']
    saved.hidden = ['fact', 'wishlist']
    saved.favourites = ['wishlist', 'lent']
    const loaded = cleanLayout(JSON.parse(JSON.stringify(saved)))
    const all = SECTION_IDS.flatMap((s) => loaded.sections[s].flat())
    expect(all).not.toContain('wishlist')
    expect(loaded.hidden).not.toContain('wishlist')
    expect(loaded.favourites).toEqual(['lent'])
    expect(loaded.hidden).toContain('fact')
    // both still on the dashboard, once each (Today's columns changed in T-0124)
    expect(loaded.sections.today.flat().filter((id) => ['recent', 'challenge'].includes(id)).sort()).toEqual(['challenge', 'recent'])
  })
})

describe('a layout saved before the dashboard was about today (T-0121)', () => {
  it('moves what is left in the other sections into Today, same column, so no lone headings remain', () => {
    const saved = structuredClone(DEFAULT_LAYOUT)
    saved.sections.today = [['waiting', 'lent'], ['challenge']]
    saved.sections.stats = [['myyear'], ['pick', 'pile']]
    saved.sections.fun = [['fact', 'badges'], []]
    const l = cleanLayout(JSON.parse(JSON.stringify(saved)))
    for (const s of SECTION_IDS) if (s !== 'today') expect(l.sections[s]).toEqual([[], []])
    const [left, right] = l.sections.today
    expect(left.indexOf('fact')).toBeGreaterThan(left.indexOf('lent'))
    expect(right.indexOf('pick')).toBeGreaterThan(right.indexOf('challenge'))
  })
})
