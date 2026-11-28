import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Book } from '#/lib/library'
import { SeriesPage } from './SeriesPage'

/** The Series page (T-0132, D-0100). */

let n = 0
const book = (title: string, extra: Partial<Book> = {}) => ({ id: `b${n++}`, title, authors: ['Ann'], color: '#333', status: 'want', addedAt: 1, ...extra }) as Book
const shelf = [
  book('Dune', { series: 'Dune', seriesIndex: 1, status: 'read', finished: ['2026-01-02'], authors: ['Herbert'] }),
  book('Dune Messiah', { series: 'Dune', seriesIndex: 2, status: 'reading', progress: 0.3, authors: ['Herbert'] }),
  book('God Emperor', { series: 'Dune', seriesIndex: 4, authors: ['Herbert'] }),
  book('Alpha', { series: 'Alpha', seriesIndex: 1, status: 'read', finished: ['2026-05-01'], authors: ['Zed'] }),
  book('Alpha Two', { series: 'Alpha', seriesIndex: 2, status: 'read', finished: ['2026-05-03'], authors: ['Zed'] }),
]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the Series page', () => {
  it('shows each series A–Z with its covers, read ones lit, a gap for a missing number', () => {
    const onShowBook = vi.fn()
    render(<SeriesPage books={shelf} onShowBook={onShowBook} />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['★ Alpha', 'Dune'])
    expect(screen.getByText('Herbert · 1 of 3 read')).toBeTruthy()
    expect(screen.getByLabelText('Number 3: not on your shelf')).toBeTruthy()
    const read = screen.getByRole('button', { name: '#1 Dune: read' })
    expect(read.closest('li')!.className).toContain('lit')
    expect(screen.getByRole('button', { name: '#4 God Emperor: not read yet' }).closest('li')!.className).not.toContain('lit')
    expect(screen.getByRole('button', { name: '#2 Dune Messiah: reading, 30%' })).toBeTruthy()
    fireEvent.click(read)
    expect(onShowBook).toHaveBeenCalledWith(shelf[0].id)
  })

  it('sorts as she chooses and remembers it on this device, and finds a series', () => {
    render(<SeriesPage books={shelf} onShowBook={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'progress' } })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Dune', '★ Alpha'])
    expect(localStorage.getItem('hannas-reading-list:series-sort')).toBe('progress')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a series' }), { target: { value: 'alp' } })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['★ Alpha'])
  })
})
