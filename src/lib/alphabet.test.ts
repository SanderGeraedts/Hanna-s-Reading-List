import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { alphabetYear, letterOf } = await import('./alphabet')

const book = (id: string, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, title: string, day: string, extra: Partial<Book> = {}) =>
  book(id, title, { status: 'read', finished: [day], readCount: 1, ...extra })

describe('A–Z challenge (#143)', () => {
  it('uses the exact title: "The Adventures of Gulliver" is T', () => {
    expect(letterOf('The Adventures of Gulliver')).toBe('T')
    expect(letterOf('A Court of Thorns and Roses')).toBe('A')
    expect(letterOf('De avonden')).toBe('D')
  })

  it('skips only what is not a letter, and reads accents as the plain letter', () => {
    expect(letterOf('‘Salem’s Lot')).toBe('S')
    expect(letterOf('"Quiet"')).toBe('Q')
    expect(letterOf('Ärger im Bus')).toBe('A')
    expect(letterOf('Één dag')).toBe('E')
    expect(letterOf('1984')).toBeUndefined()
    expect(letterOf('')).toBeUndefined()
  })

  it('counts the first book finished that year for each letter', () => {
    const y = alphabetYear(
      [
        read('t1', 'The Hobbit', '2026-02-01'),
        read('t2', 'Twilight', '2026-01-10'),
        read('old', 'Anna Karenina', '2025-05-01'),
        read('g', 'The Adventures of Gulliver', '2026-03-01'),
      ],
      2026,
      '2026-06-01',
    )
    expect([...y.done.keys()]).toEqual(['T'])
    expect(y.done.get('T')!.book.id).toBe('t2')
  })

  it("doesn't count sleep reads, not even their first read", () => {
    const y = alphabetYear([read('s', 'Sleepy Stories', '2026-02-01', { sleepRead: true })], 2026, '2026-06-01')
    expect(y.done.size).toBe(0)
  })

  it('says whether she is on track for the year', () => {
    const letters = 'ABCDEFGHIJKLM'.split('').map((l, i) => read(l, `${l} book`, `2026-0${1 + (i % 6)}-01`))
    // 13 letters by 1 July: halfway through the year, halfway through the alphabet
    expect(alphabetYear(letters, 2026, '2026-07-01')).toMatchObject({ onTrack: true, pace: '13 of 26 · on track' })
    // 13 letters in November: 13 to go in 2 months
    const late = alphabetYear(letters, 2026, '2026-11-16')
    expect(late.onTrack).toBe(false)
    expect(late.pace).toBe('13 of 26 · behind: 6.5 letters a month to go')
  })

  it('suggests a book from her pile for missing letters, by its exact title', () => {
    const y = alphabetYear(
      [
        book('q', 'Quicksilver', { status: 'want' }),
        book('t', 'The Queen of Nothing', { status: 'want' }),
        book('z', 'Zodiac', { status: 'want', sleepRead: true }),
        book('soon', 'Xenia', { status: 'want', published: '2099-01-01' }),
      ],
      2026,
      '2026-06-01',
    )
    expect(y.tips.map((t) => `${t.letter}:${t.book.id}`)).toEqual(['Q:q', 'T:t'])
  })
})
