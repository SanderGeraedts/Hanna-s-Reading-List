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
  toggleFavourite,
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
    expect(old.sections.challenges).toEqual([['goal', 'alphabet'], ['bingo']])
    expect(old.sections.stats[0].slice(0, 1)).toEqual(['count'])
    expect(old.sections.stats[1].slice(0, 1)).toEqual(['records'])
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
    expect(singleColumn([['count', 'reading'], ['goal', 'next', 'calendar']])).toEqual([
      'count',
      'goal',
      'reading',
      'next',
      'calendar',
    ])
  })
})

describe('favourites on top', async () => {
  const { favouriteColumns, toggleFavourite } = await import('./dashboardLayout')

  it('stars blocks in order, in two columns, and takes the star off again', () => {
    let l = toggleFavourite(DEFAULT_LAYOUT, 'goal')
    l = toggleFavourite(l, 'bingo')
    l = toggleFavourite(l, 'fact')
    expect(l.favourites).toEqual(['goal', 'bingo', 'fact'])
    expect(favouriteColumns(l)).toEqual([['goal', 'fact'], ['bingo']])
    // still in their own sections too
    expect(placeOf(l, 'goal')?.section).toBe('challenges')
    expect(toggleFavourite(l, 'bingo').favourites).toEqual(['goal', 'fact'])
  })

  it('drops a hidden block from the favourites, and keeps favourites when saved', () => {
    const l = hideBlock(toggleFavourite(DEFAULT_LAYOUT, 'fact'), 'fact')
    expect(l.favourites).toEqual([])
    const saved = cleanLayout(JSON.parse(JSON.stringify(toggleFold(toggleFavourite(DEFAULT_LAYOUT, 'goal'), 'favourites'))))
    expect(saved.favourites).toEqual(['goal'])
    expect(saved.folded).toEqual(['favourites'])
    expect(cleanLayout({ ...saved, favourites: ['goal', 'nonsense', 'goal'] }).favourites).toEqual(['goal'])
  })

  it('Reset puts the default layout back but leaves the favourites alone (#182)', () => {
    let l = toggleFavourite(toggleFavourite(DEFAULT_LAYOUT, 'goal'), 'calendar')
    l = toggleFold(hideBlock(moveBlock(l, 'pace', 'fun', 1, 0), 'fact'), 'stats')
    const reset = resetLayout(l)
    expect(reset).toEqual({ ...DEFAULT_LAYOUT, favourites: ['goal', 'calendar'] })
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
  const [a, b, c, d, e] = ['goal', 'reading', 'calendar', 'pace', 'fact'] as BlockId[]
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
    const arranged = toggleFold(hideBlock(moveBlock(five, 'bingo', 'today', 1, 0), 'records'), 'stats')
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
    before.favourites = ['goal', 'challenge']
    const loaded = cleanLayout(JSON.parse(JSON.stringify(before)))
    expect(loaded.sections.today[1].slice(0, 2)).toEqual(['challenge', 'creatures'])
    expect(loaded.favourites).toEqual(['goal', 'challenge'])
    // and it can be starred like every block
    expect(cleanLayout({ ...loaded, favourites: ['creatures'] }).favourites).toEqual(['creatures'])
  })
})

describe('the Wishlist block (T-0072, D-0053)', () => {
  it('joins Today on a dashboard arranged before it existed, keeping her order, hidden blocks and favourites', () => {
    expect(BLOCKS.wishlist).toBe('Wishlist')
    expect(DEFAULT_LAYOUT.sections.today[1].at(-1)).toBe('wishlist')
    // a layout she saved before the block existed, with her own order and a hidden block
    const before = structuredClone(DEFAULT_LAYOUT)
    before.sections.today[1] = ['recent', 'challenge', 'next']
    before.hidden = ['fact']
    before.favourites = ['goal', 'pile']
    before.folded = ['fun']
    const loaded = cleanLayout(JSON.parse(JSON.stringify(before)))
    expect(loaded.sections.today[1]).toContain('wishlist')
    // her order is kept, and nothing she had moved around has shifted section
    expect(loaded.sections.today[1].filter((id) => ['recent', 'challenge', 'next'].includes(id))).toEqual([
      'recent',
      'challenge',
      'next',
    ])
    expect(loaded.hidden).toEqual(['fact'])
    expect(loaded.favourites).toEqual(['goal', 'pile'])
    expect(loaded.folded).toEqual(['fun'])
    // the block appears exactly once, wherever it lands
    const all = SECTION_IDS.flatMap((s) => loaded.sections[s].flat())
    expect(all.filter((id) => id === 'wishlist')).toHaveLength(1)
  })

  it('can be hidden, shown again and starred like every other block', () => {
    const hidden = hideBlock(structuredClone(DEFAULT_LAYOUT), 'wishlist')
    expect(hidden.hidden).toContain('wishlist')
    expect(SECTION_IDS.flatMap((s) => hidden.sections[s].flat())).not.toContain('wishlist')
    const shown = showBlock(hidden, 'wishlist')
    expect(shown.hidden).not.toContain('wishlist')
    expect(shown.sections.today.flat()).toContain('wishlist')
    expect(toggleFavourite(shown, 'wishlist').favourites).toEqual(['wishlist'])
  })
})
