import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach } from 'vitest'
import { ShelfBar } from './ShelfBar'
import { START_VIEW, filterOptions } from '#/lib/shelfFilter'
import type { ShelfView } from '#/lib/shelfFilter'
import type { Book } from '#/lib/library'

afterEach(cleanup)

const book = (over: Partial<Book> = {}): Book => ({
  id: over.id ?? 'b',
  title: 'A Book',
  authors: ['A. Author'],
  color: '#334455',
  status: 'want',
  addedAt: 1,
  ...over,
})

const shelf = [
  book({ id: '1', status: 'read', rating: 5, spice: 3, language: 'en', genres: ['Fantasy'], finished: ['2026-02-01'], tropes: ['Slow burn'] }),
  book({ id: '2', status: 'want', language: 'nl' }),
]

function bar(view: ShelfView = START_VIEW, books: Book[] = shelf, empty = false) {
  const onView = vi.fn()
  render(<ShelfBar view={view} options={filterOptions(books)} onView={onView} empty={empty} />)
  return onView
}

describe('the bar above the shelf (T-0051, D-0046)', () => {
  it('shows the four bookcases with All chosen', () => {
    bar()
    const group = screen.getByRole('group', { name: 'Bookcase' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['All', 'Read', 'To read', 'Digital'])
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Read' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('calls back with the bookcase and leaves the filters alone', () => {
    const onView = bar({ bookcase: 'all', filters: { ...START_VIEW.filters, year: 2026 } })
    fireEvent.click(screen.getByRole('button', { name: 'Digital' }))
    expect(onView).toHaveBeenCalledWith({ bookcase: 'digital', filters: { ...START_VIEW.filters, year: 2026 } })
  })

  it('shows only the filters this shelf offers', () => {
    bar(START_VIEW, [book({ id: 'x' })])
    expect(screen.queryByText('Rating')).toBeNull()
    expect(screen.queryByText('Trope')).toBeNull()
    bar()
    expect(screen.getAllByText('Rating')).toHaveLength(1)
    expect(screen.getAllByText('Trope')).toHaveLength(1)
  })

  it('calls back with a chosen filter, as a number where it is one', () => {
    const onView = bar()
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '4' } })
    expect(onView).toHaveBeenCalledWith({ bookcase: 'all', filters: { ...START_VIEW.filters, rating: 4 } })
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'en' } })
    expect(onView).toHaveBeenLastCalledWith({ bookcase: 'all', filters: { ...START_VIEW.filters, language: 'en' } })
  })

  it('has no Clear until a filter is set, and then clears the filters and not the bookcase', () => {
    bar()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    cleanup()
    const onView = bar({ bookcase: 'read', filters: { ...START_VIEW.filters, rating: 4 } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onView).toHaveBeenCalledWith({ bookcase: 'read', filters: START_VIEW.filters })
  })

  it('marks a set filter so she can see it is on', () => {
    bar({ bookcase: 'all', filters: { ...START_VIEW.filters, rating: 4 } })
    expect(screen.getByLabelText('Rating').closest('label')!.className).toContain('active')
    expect(screen.getByLabelText('Genre').closest('label')!.className).not.toContain('active')
  })

  it('says why the bookcase is empty, with the right words', () => {
    bar(START_VIEW, shelf, true)
    expect(screen.getByText('No books here yet.')).toBeTruthy()
    cleanup()
    bar({ bookcase: 'read', filters: { ...START_VIEW.filters, rating: 5 } }, shelf, true)
    expect(screen.getByText('No books match these filters.')).toBeTruthy()
    cleanup()
    bar()
    expect(screen.queryByText(/No books/)).toBeNull()
  })
})
