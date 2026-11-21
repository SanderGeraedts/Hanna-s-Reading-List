import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

const ol = vi.hoisted(() => ({ browse: vi.fn(), details: vi.fn() }))
vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({
  browseBooks: ({ data }: { data: unknown }) => ol.browse(data),
  getWorkDetails: () => ol.details(),
  searchBooks: async () => [],
}))
// adding a book samples its cover; not in a test
vi.mock('./AddBookDialog', () => ({
  buildBook: async (r: { title: string; authors: string[]; year?: number }) => ({
    title: r.title,
    authors: r.authors,
    year: r.year,
    color: '#123456',
  }),
}))

const { NewForYouCard } = await import('./NewForYouCard')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Maas'],
  color: '#888888',
  status: 'read',
  rating: 5,
  genres: ['Fantasy'],
  addedAt: 0,
  ...extra,
})
const result = (title: string, year = 2025) => ({ workKey: `/works/${title}`, title, authors: ['Maas'], year, coverId: 1 })
const shelf = [book('a', { title: 'Throne of Glass' })]
const NOT_FOR_ME = 'hannas-reading-list:not-for-me:local'

beforeEach(() => {
  localStorage.clear()
  ol.browse.mockReset()
  ol.details.mockReset().mockResolvedValue(null)
})
afterEach(cleanup)

describe('New for you (#186)', () => {
  it("doesn't ask Open Library by itself when the dashboard opens", () => {
    render(<NewForYouCard books={shelf} accountId={null} onAdd={() => {}} />)
    expect(screen.getByRole('heading', { name: 'New for you' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Suggest books' })).toBeTruthy()
    expect(screen.getByText(/New books by your favourite authors/)).toBeTruthy()
    expect(ol.browse).not.toHaveBeenCalled()
  })

  it('shows its note, and no error, when Open Library fails', async () => {
    ol.browse.mockRejectedValue(new Error('Open Library request failed (503)'))
    const { container } = render(<NewForYouCard books={shelf} accountId={null} onAdd={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest books' }))
    expect(screen.getByRole('button', { name: 'Looking…' })).toHaveProperty('disabled', true)
    const note = await screen.findByText("Open Library can't be reached right now. Try again later.")
    expect(note.className).toBe('muted small-text')
    expect(container.querySelector('.error')).toBeNull()
    expect(screen.getByRole('button', { name: 'Suggest books' })).toHaveProperty('disabled', false)
  })

  it('"+ Want to read" puts the book on the shelf as want-to-read and it leaves the list', async () => {
    ol.browse.mockImplementation(async (q: { author?: string }) =>
      q.author ? [result('Throne of Glass', 2012), result('House of Flame and Shadow'), result('A Court of Silver Flames')] : [],
    )
    const onAdd = vi.fn()
    render(<NewForYouCard books={shelf} accountId={null} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest books' }))
    await screen.findByText('House of Flame and Shadow')
    expect(screen.queryByText('Throne of Glass')).toBeNull() // on the shelf already
    expect(screen.getAllByText('More by Maas, whose books you rate ★5')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'New suggestions' })).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add “House of Flame and Shadow” as Want to read' }))
    })
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    expect(onAdd.mock.calls[0][0]).toMatchObject({ title: 'House of Flame and Shadow', authors: ['Maas'], status: 'want' })
    expect(screen.queryByText('House of Flame and Shadow')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('“House of Flame and Shadow” is on your shelf.')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add “A Court of Silver Flames” as Want to read' }))
  })

  it('"Not for me" removes it, also after a reload, and focus goes to the head button when the list is empty', async () => {
    ol.browse.mockImplementation(async (q: { author?: string }) => (q.author ? [result('Nope')] : []))
    const first = render(<NewForYouCard books={shelf} accountId={null} onAdd={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest books' }))
    await screen.findByText('Nope')
    fireEvent.click(screen.getByRole('button', { name: 'Not for me: “Nope”' }))
    expect(screen.queryByText('Nope')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Suggest books' }))
    expect(JSON.parse(localStorage.getItem(NOT_FOR_ME)!)).toEqual(['Nope — Maas'])
    first.unmount()

    // after a reload, asking again doesn't bring it back
    render(<NewForYouCard books={shelf} accountId={null} onAdd={() => {}} />)
    expect(screen.queryByText('Nope')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Suggest books' }))
    await screen.findByText('Nothing new found just now. Try again later.')
    expect(screen.queryByText('Nope')).toBeNull()
  })

  it('respects "Not for me" choices stored before the block was removed (#123)', async () => {
    localStorage.setItem(NOT_FOR_ME, JSON.stringify(['Old No — Maas']))
    ol.browse.mockImplementation(async (q: { author?: string }) => (q.author ? [result('Old No'), result('Fresh')] : []))
    render(<NewForYouCard books={shelf} accountId={null} onAdd={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest books' }))
    await screen.findByText('Fresh')
    expect(screen.queryByText('Old No')).toBeNull()
  })
})
