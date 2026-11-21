import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { AgainCard } = await import('./AgainCard')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Madeline Miller'],
  color: '#888888',
  status: 'dnf',
  addedAt: 0,
  ...extra,
})

/** The block on a shelf that changes like the app's does. */
function Shelf({ start, onShowBook = () => {} }: { start: Book[]; onShowBook?: (id: string) => void }) {
  const [books, setBooks] = useState(start)
  const onUpdate = (id: string, patch: Partial<Book> | ((b: Book) => Partial<Book>)) =>
    setBooks((all) => all.map((b) => (b.id === id ? { ...b, ...(typeof patch === 'function' ? patch(b) : patch) } : b)))
  return (
    <>
      <AgainCard books={books} onShowBook={onShowBook} onUpdate={onUpdate} day="2026-11-21" />
      <ul aria-label="reading">
        {books.filter((b) => b.status === 'reading').map((b) => (
          <li key={b.id}>
            {b.title} {Math.round((b.progress ?? 0) * 100)}
          </li>
        ))}
      </ul>
    </>
  )
}

afterEach(cleanup)

describe('Give it another try (#187)', () => {
  it('shows only its title and "No books put aside." when there are none', () => {
    render(<Shelf start={[book('a', { status: 'reading' })]} />)
    expect(screen.getByRole('heading', { name: 'Give it another try' })).toBeTruthy()
    expect(screen.getByText('No books put aside.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('"Try again" sets the book back to Reading with its progress, says so and moves focus', () => {
    render(<Shelf start={[book('circe', { title: 'Circe', progress: 0.42 })]} />)
    expect(screen.getByText('Stopped at 42%')).toBeTruthy()
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Try again' })))
    expect(screen.getByRole('status').textContent).toBe('“Circe” is back in Currently reading.')
    expect(screen.getByText('No books put aside.')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'reading' }).textContent).toBe('Circe 42')
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Give it another try' }))
  })

  it('with more books, shows the next one after "Try again", with no explanation line (D-0014)', () => {
    render(<Shelf start={[book('a'), book('b'), book('c')]} />)
    expect(screen.queryByText(/put aside/)).toBeNull()
    const first = screen.getByRole('button', { name: /^Open Book / }).getAttribute('aria-label')
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Try again' })))
    expect(screen.getByRole('button', { name: /^Open Book / }).getAttribute('aria-label')).not.toBe(first)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }))
  })

  it('opens the book on the shelf from the cover, the title and "Show on the shelf"', () => {
    const onShowBook = vi.fn()
    render(<Shelf start={[book('circe', { title: 'Circe' })]} onShowBook={onShowBook} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Circe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Circe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show on the shelf' }))
    expect(onShowBook.mock.calls).toEqual([['circe'], ['circe'], ['circe']])
  })
})
