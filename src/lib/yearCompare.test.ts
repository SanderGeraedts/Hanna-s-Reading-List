import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { compareChoices, compareLine, readingDays, statsPeriod, yearLabel, yearNumbers } from './yearCompare'

const book = (b: Partial<Book> & { id: string }): Book => ({
  title: b.id,
  authors: [],
  status: 'read',
  color: '#000',
  addedAt: 0,
  ...b,
}) as Book

const shelf: Book[] = [
  book({ id: 'a', pages: 300, finished: ['2026-03-01'], readCount: 1, readingLog: { '2026-02-27': 0.5, '2026-03-01': 0.5 } }),
  book({ id: 'b', pages: 200, finished: ['2026-07-04'], readCount: 1, readingLog: { '2026-07-04': 1 } }),
  book({ id: 'c', pages: 400, finished: ['2025-05-05'], readCount: 1, readingLog: { '2025-05-05': 1 } }),
  book({ id: 'd', minutes: 600, formats: ['storytel'], finished: ['2026-09-09'], readCount: 1, readingLog: { '2026-09-09': 1 } }),
]

describe('statsPeriod and yearLabel', () => {
  it('turns the picker into a period', () => {
    expect(statsPeriod('all')).toEqual({ kind: 'all' })
    expect(statsPeriod(2026)).toEqual({ kind: 'year', year: 2026 })
  })
  it('labels all time', () => {
    expect(yearLabel('all')).toBe('all time')
    expect(yearLabel(2026)).toBe('2026')
  })
})

describe('readingDays', () => {
  it('counts the days with reading in a year', () => {
    expect(readingDays(shelf, 2026)).toBe(4)
    expect(readingDays(shelf, 2025)).toBe(1)
    expect(readingDays(shelf, 2024)).toBe(0)
  })
  it('counts every day for all time', () => {
    expect(readingDays(shelf, 'all')).toBe(5)
  })
})

describe('yearNumbers', () => {
  it('adds up books, pages, hours and reading days', () => {
    expect(yearNumbers(shelf, 2026)).toEqual({ books: 3, pages: 500, hours: 10, readingDays: 4 })
  })
  it('is all zeros for a year with nothing', () => {
    expect(yearNumbers(shelf, 2024)).toEqual({ books: 0, pages: 0, hours: 0, readingDays: 0 })
  })
  it('has everything for all time', () => {
    expect(yearNumbers(shelf, 'all')).toEqual({ books: 4, pages: 900, hours: 10, readingDays: 5 })
  })
})

describe('compareLine', () => {
  it('is nothing without a compare year', () => {
    expect(compareLine(48, undefined, undefined)).toBeNull()
    expect(compareLine(48, 36, undefined)).toBeNull()
  })
  it('counts up', () => {
    expect(compareLine(48, 36, 2025)).toEqual({ text: '↑ 12 vs 2025', spoken: '12 more than in 2025', kind: 'up' })
  })
  it('counts down', () => {
    expect(compareLine(32, 36, 2025)).toEqual({ text: '↓ 4 vs 2025', spoken: '4 fewer than in 2025', kind: 'down' })
  })
  it('says when nothing changed, also comparing a year with itself', () => {
    expect(compareLine(48, 48, 2026)).toEqual({ text: 'same as 2026', spoken: 'the same as in 2026', kind: 'same' })
  })
  it('says so when the other year has nothing, instead of a big fall', () => {
    expect(compareLine(48, 0, 2024)).toEqual({ text: '2024: nothing', spoken: 'nothing in 2024', kind: 'none' })
    expect(compareLine(0, 0, 2024)).toEqual({ text: '2024: nothing', spoken: 'nothing in 2024', kind: 'none' })
  })
  it('groups big numbers', () => {
    expect(compareLine(14_218, 2_000, 2025)?.text).toBe('↑ 12,218 vs 2025')
  })
})

describe('compareChoices', () => {
  it('offers the other years, newest first', () => {
    expect(compareChoices([2026, 2025, 2024], 2026)).toEqual([2025, 2024])
  })
  it('offers nothing against all time', () => {
    expect(compareChoices([2026, 2025], 'all')).toEqual([])
  })
  it('offers nothing in her first year', () => {
    expect(compareChoices([2026], 2026)).toEqual([])
  })
})
