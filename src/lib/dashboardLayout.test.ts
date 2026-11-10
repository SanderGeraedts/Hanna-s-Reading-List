import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, cleanLayout, hideBlock, moveBlock, placeOf, showBlock, singleColumn } from './dashboardLayout'
import type { DashboardLayout } from './dashboardLayout'

const small: DashboardLayout = { columns: [['count', 'reading'], ['goal', 'next', 'calendar']], hidden: [] }

describe('dashboard layout (#85, #87)', () => {
  it('starts from the default and adds blocks it does not know yet', () => {
    expect(cleanLayout(null)).toEqual(DEFAULT_LAYOUT)
    const saved = cleanLayout({ columns: [['goal', 'nonsense', 'goal'], []], hidden: ['lent'] })
    expect(saved.columns[0][0]).toBe('goal')
    expect(saved.hidden).toEqual(['lent'])
    // every block exactly once
    const all = [...saved.columns[0], ...saved.columns[1], ...saved.hidden]
    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBe(DEFAULT_LAYOUT.columns.flat().length)
  })

  it('moves a block within and between columns', () => {
    expect(moveBlock(small, 'calendar', 0, 1).columns).toEqual([['count', 'calendar', 'reading'], ['goal', 'next']])
    expect(moveBlock(small, 'count', 0, 5).columns[0]).toEqual(['reading', 'count'])
    expect(placeOf(moveBlock(small, 'goal', 1, 2), 'goal')).toEqual({ column: 1, index: 2 })
  })

  it('hides a block and brings it back on top of the shorter column', () => {
    const hidden = hideBlock(small, 'next')
    expect(hidden.hidden).toEqual(['next'])
    expect(placeOf(hidden, 'next')).toBeNull()
    const back = showBlock(hideBlock(hidden, 'calendar'), 'next')
    expect(back.columns).toEqual([['count', 'reading'], ['next', 'goal']])
    expect(back.hidden).toEqual(['calendar'])
  })

  it('takes turns between the columns on a narrow screen', () => {
    expect(singleColumn(small)).toEqual(['count', 'goal', 'reading', 'next', 'calendar'])
  })
})
