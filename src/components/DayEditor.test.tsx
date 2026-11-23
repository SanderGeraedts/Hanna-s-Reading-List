import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
  browseBooks: async () => [],
  lookupIsbn: async () => null,
  getPublishDate: async () => null,
  getCoverChoices: async () => [],
}))

const { AddBookForDay, DayChangeEditor } = await import('./DayEditor')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'reading',
  addedAt: 0,
  ...extra,
})

afterEach(cleanup)

/**
 * Fix a past day (T-0045): the Change editor saves only readingLog[day] on
 * the book, and the + Add a book panel offers the books she is reading first,
 * then searches across the shelf.
 */
describe('Day editor (T-0045)', () => {
  it('Change saves only readingLog[day], not progress or status', () => {
    const onUpdate = vi.fn()
    const b = book('a', { pages: 200, progress: 0.5, status: 'reading' })
    render(
      <DayChangeEditor
        book={b}
        day="2026-11-08"
        entry={{ book: b, amount: undefined }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Pages read'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, patch] = onUpdate.mock.calls[0]
    expect(id).toBe('a')
    expect(patch).toEqual({ readingLog: { '2026-11-08': 0.15 } })
    expect('progress' in patch).toBe(false)
    expect('status' in patch).toBe(false)
  })

  it('Save with an empty amount takes the book off the day', () => {
    const onUpdate = vi.fn()
    const b = book('a', { pages: 200, readingLog: { '2026-11-08': 0.15 } })
    render(
      <DayChangeEditor
        book={b}
        day="2026-11-08"
        entry={{ book: b, amount: 0.15 }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    const input = screen.getByLabelText('Pages read') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledWith('a', { readingLog: undefined })
  })

  it('Remove drops the day', () => {
    const onUpdate = vi.fn()
    const b = book('a', { pages: 200, readingLog: { '2026-11-08': 0.15, '2026-11-09': 0.2 } })
    render(
      <DayChangeEditor
        book={b}
        day="2026-11-08"
        entry={{ book: b, amount: 0.15 }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onUpdate).toHaveBeenCalledWith('a', { readingLog: { '2026-11-09': 0.2 } })
  })

  it('a negative or huge amount is rejected or clamped', () => {
    const onUpdate = vi.fn()
    const b = book('a', { pages: 200 })
    render(
      <DayChangeEditor
        book={b}
        day="2026-11-08"
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    const input = screen.getByLabelText('Pages read') as HTMLInputElement
    // negative
    fireEvent.change(input, { target: { value: '-5' } })
    fireEvent.blur(input)
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    // huge: clamps to the whole book (share 1)
    fireEvent.change(input, { target: { value: '9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledWith('a', { readingLog: { '2026-11-08': 1 } })
  })

  it('a listen-only book takes minutes', () => {
    const onUpdate = vi.fn()
    const b = book('a', { minutes: 600, pages: 600, formats: ['storytel'] })
    render(
      <DayChangeEditor
        book={b}
        day="2026-11-08"
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Minutes listened'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledWith('a', { readingLog: { '2026-11-08': 0.1 } })
  })

  it('+ Add a book lists her reading books first, then searches', () => {
    const onUpdate = vi.fn()
    const books = [
      book('r1', { title: 'Reading One', status: 'reading', started: ['2026-11-01'] }),
      book('r2', { title: 'Reading Two', status: 'reading', started: ['2026-11-05'] }),
      book('done', { title: 'Done Long Ago', status: 'read', finished: ['2020-01-01'], pages: 100 }),
      book('other', { title: 'Zebra Something', status: 'want', pages: 100 }),
    ]
    render(
      <AddBookForDay
        books={books}
        day="2026-11-08"
        entries={[]}
        onUpdate={onUpdate}
        onClose={() => {}}
      />,
    )
    // Reading group shown with recently-started first
    const readingGroup = screen.getByRole('button', { name: /Reading Two/ })
    expect(readingGroup).toBeDefined()
    // Search finds a book that wasn't in the groups
    fireEvent.change(screen.getByLabelText('Find a book'), { target: { value: 'zebra' } })
    const zebra = screen.getByRole('button', { name: /Zebra Something/ })
    fireEvent.click(zebra)
    // the editor opens with the picked book
    const input = screen.getByLabelText('Pages read')
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledWith('other', { readingLog: { '2026-11-08': 0.1 } })
  })

  it('+ Add a book: a book already in the day is not offered', () => {
    const b = book('a', { title: 'Alpha', status: 'reading', started: ['2026-11-01'] })
    render(
      <AddBookForDay
        books={[b]}
        day="2026-11-08"
        entries={[{ book: b, amount: 0.1 }]}
        onUpdate={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
    // search also leaves it out
    fireEvent.change(screen.getByLabelText('Find a book'), { target: { value: 'Alpha' } })
    expect(screen.queryByRole('button', { name: /Alpha/ })).toBeNull()
  })
})
