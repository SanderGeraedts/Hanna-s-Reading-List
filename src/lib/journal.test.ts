import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { MAX_NOTE, hasNote, journalPatch, notesOf } = await import('./journal')
const { mergeBooks } = await import('./merge')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [],
  color: '#888',
  status: 'reading',
  addedAt: 0,
  ...extra,
})

describe('reading journal', () => {
  it('sets, changes and removes a note for a day', () => {
    const a = { ...book('a'), ...journalPatch(book('a'), '2026-11-19', '  Cried at chapter 12 😭 ') }
    expect(a.journal).toEqual({ '2026-11-19': 'Cried at chapter 12 😭' })
    const b = { ...a, ...journalPatch(a, '2026-11-20', 'Couldn’t stop') }
    expect(notesOf(b).map((n) => n.day)).toEqual(['2026-11-20', '2026-11-19'])
    expect(journalPatch(b, '2026-11-20', '   ').journal).toEqual({ '2026-11-19': 'Cried at chapter 12 😭' })
    expect(journalPatch(a, '2026-11-19', '').journal).toBeUndefined()
  })

  it('keeps notes short, and knows which days have one', () => {
    expect(journalPatch(book('a'), '2026-11-19', 'x'.repeat(400)).journal!['2026-11-19'].length).toBe(MAX_NOTE)
    expect(hasNote([book('a', { journal: { '2026-11-19': 'Hi' } })], '2026-11-19')).toBe(true)
    expect(hasNote([book('a')], '2026-11-19')).toBe(false)
  })

  it('merging duplicates keeps both copies’ notes', () => {
    const merged = mergeBooks(book('a', { journal: { '2026-01-01': 'mine' } }), book('b', { journal: { '2026-01-01': 'old', '2026-02-01': 'other' } }))
    expect(merged.journal).toEqual({ '2026-01-01': 'mine', '2026-02-01': 'other' })
  })
})
