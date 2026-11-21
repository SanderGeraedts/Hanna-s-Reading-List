import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { localDay } from './library'
import { finishPatch, parsePosition, position, quickBooks, stepPatch } from './quickUpdate'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#335577',
  status: 'reading',
  addedAt: 0,
  ...extra,
})

describe('quick update', () => {
  it('offers the books being read, latest touched first, then the paused ones', () => {
    const books = [
      book('old', { editedAt: 1 }),
      book('paused', { status: 'paused', editedAt: 9 }),
      book('new', { editedAt: 5 }),
      book('done', { status: 'read' }),
      book('want', { status: 'want' }),
    ]
    expect(quickBooks(books).map((b) => b.id)).toEqual(['new', 'old', 'paused'])
  })

  it('steps a page at a time, landing on whole pages, never past the ends', () => {
    const b = book('p', { pages: 300, progress: 100 / 300 })
    expect(Math.round(stepPatch(b, 1).progress! * 300)).toBe(101)
    expect(Math.round(stepPatch(b, 10).progress! * 300)).toBe(110)
    expect(Math.round(stepPatch(b, -1).progress! * 300)).toBe(99)
    expect(stepPatch(book('end', { pages: 300, progress: 1 }), 5)).toEqual({})
    const start = stepPatch(book('start', { pages: 300 }), -1)
    expect(start.progress ?? 0).toBe(0)
    expect(start.readingLog).toBeUndefined()
  })

  it('notes a step in today’s reading log, like the slider does', () => {
    const patch = stepPatch(book('log', { pages: 100 }), 10)
    expect(patch.readingLog).toEqual({ [localDay()]: 0.1 })
  })

  it('steps a minute for an audiobook and a percent without a length', () => {
    const audio = book('a', { formats: ['audiobook'], minutes: 600, progress: 0.5 })
    expect(Math.round(stepPatch(audio, 1).progress! * 600)).toBe(301)
    expect(position(audio)).toEqual({ value: '5 h', of: 'of 10 h' })
    const bare = book('b', { progress: 0.42 })
    expect(stepPatch(bare, 1).progress).toBeCloseTo(0.43)
    expect(position(bare)).toEqual({ value: '42%', of: 'read' })
  })

  it('reads a typed page, listening time or percentage', () => {
    expect(parsePosition(book('p', { pages: 200 }), '50')).toBe(0.25)
    expect(parsePosition(book('p', { pages: 200 }), 'fifty')).toBeNull()
    expect(parsePosition(book('a', { formats: ['audiobook'], minutes: 120 }), '1:00')).toBe(0.5)
    expect(parsePosition(book('b'), '30%')).toBe(0.3)
    expect(position(book('p', { pages: 200, progress: 0.25 }))).toEqual({ value: '50', of: 'of 200 pages' })
  })

  it('finishing marks it read at the last page', () => {
    const patch = finishPatch(book('f', { pages: 200, progress: 0.9 }))
    expect(patch.status).toBe('read')
    expect(patch.progress).toBe(1)
  })
})
