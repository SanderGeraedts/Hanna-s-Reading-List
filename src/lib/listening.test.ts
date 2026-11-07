import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { formatDuration, listenOnly, parseDuration, thicknessPages } = await import('./listening')
const { bookDims } = await import('./shelfLayout')
const { importStorytelBooks } = await import('./storytelImport')

const book = (extra: Partial<Book> = {}): Book => ({
  id: 'b',
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('listening time for audiobooks (#48)', () => {
  it('reads the ways a length is written', () => {
    expect(parseDuration('10:25')).toBe(625)
    expect(parseDuration('10:25:30')).toBe(625)
    expect(parseDuration('10h 25m')).toBe(625)
    expect(parseDuration('10 h 25 min')).toBe(625)
    expect(parseDuration('10 Std. 25 Min.')).toBe(625)
    expect(parseDuration('10,5 h')).toBe(630)
    expect(parseDuration('45 min')).toBe(45)
    expect(parseDuration('625')).toBe(625)
    expect(parseDuration('soon')).toBeNull()
    expect(parseDuration('0')).toBeNull()
  })

  it('shows it again in hours and minutes, and reads that back', () => {
    expect(formatDuration(625)).toBe('10 h 25 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(180)).toBe('3 h')
    expect(parseDuration(formatDuration(625))).toBe(625)
  })

  it('a book she only listens to is as thick as its minutes are pages', () => {
    const audio = book({ formats: ['storytel'], pages: 300, minutes: 700 })
    expect(listenOnly(audio)).toBe(true)
    expect(thicknessPages(audio)).toBe(700)
    expect(bookDims(audio).t).toBeCloseTo(bookDims(book({ pages: 700 })).t)
    // Storytel imports without formats count as Storytel
    expect(thicknessPages(book({ storytelId: 's', minutes: 500 }))).toBe(500)
  })

  it('a paper copy keeps its pages; minutes only stand in when pages are unknown', () => {
    expect(thicknessPages(book({ formats: ['paperback', 'audiobook'], pages: 300, minutes: 700 }))).toBe(300)
    expect(thicknessPages(book({ formats: ['paperback', 'audiobook'], minutes: 700 }))).toBe(700)
    expect(thicknessPages(book({ formats: ['audiobook'], pages: 300 }))).toBe(300)
  })

  it('Storytel refresh gives books from before the listening time it', async () => {
    const updates: Array<[string, Partial<Book>]> = []
    const onShelf = book({ storytelId: 'st', status: 'reading', progress: 0.5 })
    await importStorytelBooks(
      [{ storytelId: 'st', title: 'Tintenherz', authors: ['Cornelia Funke'], status: 'reading', progress: 0.5, durationMs: 625 * 60_000 }] as never,
      [onShelf],
      { updateBook: (id: string, p: Partial<Book>) => updates.push([id, p]), addBook: () => {}, onProgress: () => {} },
    )
    expect(updates).toEqual([['b', { minutes: 625 }]])
  })
})
