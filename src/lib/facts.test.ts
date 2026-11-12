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
})
