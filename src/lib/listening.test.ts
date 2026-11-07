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
    // a minute is a page for a book she only listens to (#51)
    expect(updates).toEqual([['b', { minutes: 625, pages: 625 }]])
  })
})

describe('pages and listening time move together (#51)', async () => {
  const { lengthPatch, linkOnFormatChange } = await import('./listening')

  it('setting one sets the other for a book she only listens to', () => {
    const audio = book({ formats: ['storytel'] })
    expect(lengthPatch(audio, { pages: 500 })).toEqual({ pages: 500, minutes: 500 })
    expect(lengthPatch(audio, { minutes: 625 })).toEqual({ pages: 625, minutes: 625 })
    expect(lengthPatch(audio, { minutes: undefined })).toEqual({ pages: undefined, minutes: undefined })
  })

  it('a book she also has on paper keeps its own page count', () => {
    expect(lengthPatch(book({ formats: ['paperback', 'storytel'] }), { minutes: 625 })).toEqual({ minutes: 625 })
  })

  it('fills in the other when a book becomes listen-only', () => {
    const paper = book({ formats: ['paperback'], pages: 320 })
    expect(linkOnFormatChange(paper, { ...paper, formats: ['audiobook'] })).toEqual({ minutes: 320 })
    expect(linkOnFormatChange(paper, { ...paper, formats: ['paperback', 'audiobook'] })).toEqual({})
  })

  it('new Storytel books take their pages from the listening time', async () => {
    const added: Array<Partial<Book>> = []
    await importStorytelBooks(
      [{ storytelId: 'n', title: 'Neu', authors: ['A'], status: 'want', durationMs: 300 * 60_000 }] as never,
      [],
      { updateBook: () => {}, addBook: (b: Partial<Book>) => added.push(b), onProgress: () => {} },
    )
    expect(added[0]).toMatchObject({ pages: 300, minutes: 300 })
  })

  it('Storytel corrects the time, and the pages only of a listen-only book', async () => {
    const updates: Array<[string, Partial<Book>]> = []
    const item = { storytelId: 'st', title: 'Tintenherz', authors: ['Cornelia Funke'], status: 'want', durationMs: 625 * 60_000 }
    await importStorytelBooks(
      [item, { ...item, storytelId: 'st2', title: 'Tintenblut' }] as never,
      [
        book({ id: 'a', storytelId: 'st', minutes: 600, pages: 600 }),
        book({ id: 'p', title: 'Tintenblut', storytelId: 'st2', formats: ['paperback', 'storytel'], pages: 700, minutes: 625 }),
      ],
      { updateBook: (id: string, p: Partial<Book>) => updates.push([id, p]), addBook: () => {}, onProgress: () => {} },
    )
    expect(updates).toEqual([['a', { minutes: 625, pages: 625 }]])
  })
})
