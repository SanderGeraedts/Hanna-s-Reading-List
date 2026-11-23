import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { TropesCard, tropesBlock } from './TropesCard'

/** T-0048 / D-0042: the dashboard block Tropes & characters. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b', title: 'Title', authors: ['Writer'], color: '#123456', status: 'read', readCount: 1, addedAt: 1, ...over }) as Book

afterEach(cleanup)

describe('what the block has to show', () => {
  it('is empty with nothing noted anywhere', () => {
    expect(tropesBlock([book(), book({ id: '2', tropes: [], characters: [] })]).empty).toBe(true)
  })

  it('counts only finished books for the tropes, but every book for the favourites', () => {
    const books = [
      book({ id: '1', tropes: ['Found family'] }),
      book({ id: '2', status: 'want', readCount: 0, tropes: ['Found family'], characters: [{ name: 'Mo', fav: true }] }),
    ]
    const b = tropesBlock(books)
    expect(b.tropes).toEqual([{ name: 'Found family', count: 1 }])
    expect(b.favourites.map((f) => f.name)).toEqual(['Mo'])
    expect(b.empty).toBe(false)
  })

  it('shows at most six tropes and eight favourites', () => {
    const tropes = Array.from({ length: 9 }, (_, i) => book({ id: `t${i}`, tropes: [`Trope ${i}`] }))
    const favs = Array.from({ length: 12 }, (_, i) =>
      book({ id: `f${i}`, addedAt: i, characters: [{ name: `Name ${i}`, fav: true }] }),
    )
    const b = tropesBlock([...tropes, ...favs])
    expect(b.tropes.length).toBe(6)
    expect(b.favourites.length).toBe(8)
  })
})

describe('the block', () => {
  it('shows the tropes biggest first with a count a screen reader can read', () => {
    const books = [
      book({ id: '1', tropes: ['Found family', 'Slow burn'] }),
      book({ id: '2', tropes: ['Found family'] }),
    ]
    render(<TropesCard books={books} onShowBook={() => {}} />)
    expect(screen.getByText('Most-read tropes')).toBeTruthy()
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(rows[0]).toContain('Found family')
    expect(rows[0]).toContain('2 books')
    expect(rows[1]).toContain('1 book')
  })

  it('opens the book behind a favourite character', () => {
    const onShowBook = vi.fn()
    const books = [book({ id: '7', title: 'Her Book', characters: [{ name: 'Feyre', fav: true }] })]
    render(<TropesCard books={books} onShowBook={onShowBook} />)
    fireEvent.click(screen.getByRole('button', { name: 'Feyre, from Her Book' }))
    expect(onShowBook).toHaveBeenCalledWith('7')
  })

  it('leaves out the half it has nothing for', () => {
    render(<TropesCard books={[book({ tropes: ['Slow burn'] })]} onShowBook={() => {}} />)
    expect(screen.queryByText('Favourites')).toBeNull()
    cleanup()
    render(<TropesCard books={[book({ characters: [{ name: 'Mo', fav: true }] })]} onShowBook={() => {}} />)
    expect(screen.queryByText('Most-read tropes')).toBeNull()
    expect(screen.getByText('Favourites')).toBeTruthy()
  })
})
