import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { dayText, daysLeftText, daysToFinish, goalForecast } from './finishEstimate'

const book = (extra: Partial<Book>): Book => ({ id: 'b', title: 'B', authors: [], color: '#888888', status: 'reading', addedAt: 0, ...extra })
const TODAY = '2026-11-21' // a Saturday

describe('finish estimates', () => {
  it('works out the days left from the last 14 days, days without reading included', () => {
    // 3 reading days of 10% each in the last two weeks: 30% / 14 days; 50% left -> 24 days
    const b = book({ progress: 0.5, readingLog: { '2026-11-20': 0.1, '2026-11-15': 0.1, '2026-11-10': 0.1 } })
    expect(daysToFinish(b, TODAY)).toBe(24)
  })

  it('says nothing with fewer than 3 reading days, for older reading, or a paused or finished book', () => {
    expect(daysToFinish(book({ progress: 0.5, readingLog: { '2026-11-20': 0.2, '2026-11-19': 0.2 } }), TODAY)).toBeNull()
    expect(daysToFinish(book({ progress: 0.5, readingLog: { '2026-10-01': 0.1, '2026-10-02': 0.1, '2026-10-03': 0.1 } }), TODAY)).toBeNull()
    const log = { '2026-11-20': 0.1, '2026-11-19': 0.1, '2026-11-18': 0.1 }
    expect(daysToFinish(book({ status: 'paused', progress: 0.5, readingLog: log }), TODAY)).toBeNull()
    expect(daysToFinish(book({ progress: 1, readingLog: log }), TODAY)).toBeNull()
    // far too slow: more than a year away
    expect(daysToFinish(book({ progress: 0.05, readingLog: { '2026-11-20': 0.001, '2026-11-19': 0.001, '2026-11-18': 0.001 } }), TODAY)).toBeNull()
  })

  it('names the day: today, tomorrow, a weekday this week, else a date', () => {
    expect(dayText(0, TODAY)).toBe('today')
    expect(dayText(1, TODAY)).toBe('tomorrow')
    expect(dayText(5, TODAY)).toBe('Thursday')
    expect(dayText(21, TODAY)).toBe('12 Dec')
    expect(daysLeftText(4)).toBe('About 4 days left at your pace')
  })

  it('forecasts the reading goal from the books finished this year', () => {
    // 2026-11-21 is day 325: 45 books -> ~0.138 a day; 50 reached in ~37 days (28 Dec)
    expect(goalForecast(45, 50, 2026, TODAY)).toBe("At this pace you'll reach your goal around 28 Dec")
    // too far behind: where the year ends
    expect(goalForecast(30, 52, 2026, TODAY)).toBe("At this pace you'll end the year at 33 of 52")
    expect(goalForecast(52, 52, 2026, TODAY)).toBeNull()
    expect(goalForecast(0, 52, 2026, TODAY)).toBeNull()
    expect(goalForecast(10, 52, 2025, TODAY)).toBeNull()
  })
})
