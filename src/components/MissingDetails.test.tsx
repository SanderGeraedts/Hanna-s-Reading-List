import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Book } from '#/lib/library'

vi.mock('#/lib/findBackText', () => ({ findBackText: vi.fn(async (b: Book) => (b.id === 'a' ? 'A found blurb.' : undefined)) }))
vi.mock('#/lib/useBookDetails', () => ({
  lookUpGenres: vi.fn(async (b: Book) => (b.id === 'a' ? ['Mystery'] : [])),
  lookUpPlaces: vi.fn(async () => []),
}))

const { MissingDetails } = await import('./MissingDetails')
const { MissingWalk, walkList } = await import('./MissingWalk')

/** Missing details (T-0129): look up, review, keep what she ticks, and go through the rest one by one. */

const book = (id: string, extra: Partial<Book> = {}) => ({ id, title: id.toUpperCase(), authors: [], color: '#333', status: 'read', addedAt: 1, ...extra }) as Book
const BOOKS = [book('a'), book('b', { description: 'Hers.', genres: ['Crime'], places: ['Peru'], tropes: ['x'], characters: [{ name: 'Ann' }] as Book['characters'] })]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Missing details', () => {
  it('looks up, shows what it found, and saves only what she keeps', async () => {
    HTMLDialogElement.prototype.showModal ??= function () {}
    const onUpdate = vi.fn()
    render(<MissingDetails books={BOOKS} onUpdate={onUpdate} onShowBook={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Look them up (1 book)' }))
    await waitFor(() => expect(screen.getByText('A found blurb.')).toBeTruthy())
    expect(screen.getByText('Mystery')).toBeTruthy()
    // untick the genres, keep the back text
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, patch] = onUpdate.mock.calls[0]
    expect(id).toBe('a')
    expect(patch(BOOKS[0])).toEqual({ description: 'A found blurb.' })
  })

  it('lists per detail the books missing it, tropes and characters included', () => {
    HTMLDialogElement.prototype.showModal ??= function () {}
    render(<MissingDetails books={BOOKS} onUpdate={() => {}} onShowBook={() => {}} onClose={() => {}} />)
    for (const label of ['Back text', 'Genres', 'Country', 'Tropes', 'Characters']) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText('· 1 missing').length).toBe(5)
  })
})

describe('one book at a time', () => {
  it('names what the open book still misses and moves on with Next book', () => {
    const books = [book('a'), book('c'), BOOKS[1]]
    expect(walkList(books).map((b) => b.id)).toEqual(['a', 'c'])
    const onShowBook = vi.fn()
    render(<MissingWalk books={books} currentId="a" onShowBook={onShowBook} onStop={() => {}} />)
    expect(screen.getByText(/still misses back text, genres, country, tropes, characters/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next book ›' }))
    expect(onShowBook).toHaveBeenCalledWith('c')
  })
})
