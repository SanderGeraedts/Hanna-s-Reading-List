import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { FACTS, dailyFact } = await import('./facts')

let n = 0
const book = (readingLog?: Record<string, number>): Book => ({
  id: String(n++),
  title: 'A book',
  authors: [],
  color: '#888888',
  status: 'reading',
  addedAt: 0,
  readingLog,
})

const facts = ['one', 'two', 'three']
const now = new Date(2026, 10, 12, 20, 0)

describe('dailyFact (#101)', () => {
  it('shows the first fact before any reading day', () => {
    expect(dailyFact([], now, facts)).toEqual({ fact: 'one', today: false })
  })

  it('moves on one fact for each reading day, counting a day once', () => {
    const books = [book({ '2026-11-10': 0.1, '2026-11-11': 0.1 }), book({ '2026-11-11': 0.2 })]
    expect(dailyFact(books, now, facts)).toEqual({ fact: 'two', today: false })
  })

  it('gives a new fact once today is a reading day, and not before', () => {
    const before = [book({ '2026-11-10': 0.1, '2026-11-11': 0.1 })]
    const after = [book({ '2026-11-10': 0.1, '2026-11-11': 0.1, '2026-11-12': 0.05 })]
    expect(dailyFact(before, now, facts).fact).toBe('two')
    expect(dailyFact(after, now, facts)).toEqual({ fact: 'three', today: true })
  })

  it('starts over after the last fact', () => {
    const books = [book({ '2026-11-09': 0.1, '2026-11-10': 0.1, '2026-11-11': 0.1, '2026-11-12': 0.1 })]
    expect(dailyFact(books, now, facts).fact).toBe('one')
  })

  it('has no fact twice', () => {
    expect(new Set(FACTS).size).toBe(FACTS.length)
  })

  it('has no near-duplicate facts (same first six words)', () => {
    const words = (f: string) =>
      f
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(Boolean)
    const seen = new Map<string, string>()
    const doubles: string[][] = []
    for (const fact of FACTS) {
      const key = words(fact).slice(0, 6).join(' ')
      const other = seen.get(key)
      if (other) doubles.push([other, fact])
      seen.set(key, fact)
    }
    expect(doubles).toEqual([])
  })

  it('has enough facts to last over a year of reading days', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(350)
  })
})

describe('general facts and looking back (#145, #146)', async () => {
  const { GENERAL_FACTS } = await import('./generalFacts')
  const { unlockedSequence, unlockedFacts, MIX_FROM } = await import('./facts')
  const bookFacts = ['b1', 'b2', 'b3', 'b4']
  const general = ['g1', 'g2']

  it('keeps the book facts of reading days before the mix starts, then takes turns', () => {
    const days = ['2026-11-01', '2026-11-02', MIX_FROM, '2026-11-21', '2026-11-22', '2026-11-23']
    expect(unlockedSequence(days, bookFacts, general)).toEqual(['b1', 'b2', 'g1', 'b3', 'g2', 'b4'])
  })

  it('lists every unlocked fact once, newest first', () => {
    const later = new Date(2026, 11, 1, 12)
    const books = [book({ '2026-11-01': 0.1, '2026-11-02': 0.1, '2026-11-20': 0.1, '2026-11-21': 0.1 })]
    expect(unlockedFacts(books, later, bookFacts, general)).toEqual(['b3', 'g1', 'b2', 'b1'])
    expect(unlockedFacts([], later, bookFacts, general)).toEqual([])
  })

  it('has a few hundred general facts, none twice and none like a book fact', () => {
    expect(GENERAL_FACTS.length).toBeGreaterThanOrEqual(200)
    const all = [...FACTS, ...GENERAL_FACTS]
    expect(new Set(all).size).toBe(all.length)
    const key = (f: string) =>
      f
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6)
        .join(' ')
    const keys = all.map(key)
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([])
  })
})

/** A fact never comes round twice (#272-era follow-up, D-0079). */
describe('the mark: facts only ever go forward', async () => {
  const { unlockedSequence, factCount, factsUnlocked, factForDay, unlockedFacts } = await import('./facts')
  const general = ['g1', 'g2', 'g3']
  const mix = '2026-11-20'
  const days = (...ds: string[]) => ds
  const three = book({ '2026-11-20': 0.2, '2026-11-21': 0.2, '2026-11-22': 0.2 })

  it('used to slip back a fact when a reading day went away, and no longer does', () => {
    const before = unlockedSequence(days('2026-11-20', '2026-11-21', '2026-11-22'), facts, general, mix)
    const after = unlockedSequence(days('2026-11-20', '2026-11-22'), facts, general, mix)
    // the old behaviour, still there when nothing has been marked: the run is a step shorter
    expect(before.at(-1)).not.toBe(after.at(-1))
    // with the mark, the count cannot fall back
    expect(factCount(days('2026-11-20', '2026-11-22'), 3)).toBe(3)
    const held = unlockedSequence(days('2026-11-20', '2026-11-22'), facts, general, mix, 3)
    expect(held).toHaveLength(3)
    expect(held.at(-1)).toBe(before.at(-1))
  })

  it('carries the taking-turns on into the facts the mark holds', () => {
    const seq = unlockedSequence(days('2026-11-20'), facts, general, mix, 4)
    expect(seq).toEqual(['g1', 'one', 'g2', 'two'])
  })

  it('counts a reading day she has not reached yet, and never goes below the mark', () => {
    const nowThen = new Date(2026, 10, 23, 12, 0)
    expect(factsUnlocked([three], nowThen, 0)).toBe(3)
    expect(factsUnlocked([three], nowThen, 7)).toBe(7)
    expect(factsUnlocked([], nowThen, 7)).toBe(7)
  })

  it("keeps today's fact where it was when a day is corrected away", () => {
    const nowThen = new Date(2026, 10, 23, 12, 0)
    const full = dailyFact([three], nowThen, facts, general, 0)
    const shortened = book({ '2026-11-20': 0.2, '2026-11-22': 0.2 })
    expect(dailyFact([shortened], nowThen, facts, general, 0).fact).not.toBe(full.fact)
    expect(dailyFact([shortened], nowThen, facts, general, 3).fact).toBe(full.fact)
  })

  it('keeps every fact in her list when a day goes away', () => {
    const nowThen = new Date(2026, 10, 23, 12, 0)
    const shortened = book({ '2026-11-20': 0.2, '2026-11-22': 0.2 })
    expect(unlockedFacts([three], nowThen, facts, general, 0)).toHaveLength(3)
    expect(unlockedFacts([shortened], nowThen, facts, general, 3)).toHaveLength(3)
  })

  it('gives the fact a reading day unlocked, and nothing for a day without reading', () => {
    const nowThen = new Date(2026, 10, 23, 12, 0)
    expect(factForDay([three], '2026-11-20', nowThen, facts, general)).toBe('g1')
    expect(factForDay([three], '2026-11-21', nowThen, facts, general)).toBe('one')
    expect(factForDay([three], '2026-11-22', nowThen, facts, general)).toBe('g2')
    expect(factForDay([three], '2026-11-23', nowThen, facts, general)).toBeNull()
    expect(factForDay([three], '2026-11-19', nowThen, facts, general)).toBeNull()
  })

  it('gives a day the same fact the dashboard gave it that day', () => {
    const nowThen = new Date(2026, 10, 22, 12, 0)
    expect(factForDay([three], '2026-11-22', nowThen, facts, general)).toBe(dailyFact([three], nowThen, facts, general).fact)
  })
})
