import { describe, expect, it } from 'vitest'
import {
  BLOCKS,
  DEFAULT_LAYOUT,
  SECTION_IDS,
  cleanLayout,
  hideBlock,
  moveBlock,
  placeOf,
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
    expect(l.sections.fun[0]).toEqual(['wrapped'])
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
