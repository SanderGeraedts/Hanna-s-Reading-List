import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { wishBooks } from '#/lib/wishlist'
import { WishlistCard } from './WishlistCard'

afterEach(cleanup)

const wish = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Wish ${id}`,
  authors: ['Someone'],
  color: '#884422',
  status: 'want',
  wish: true,
  addedAt: Number(id),
  ...extra,
})

const THREE = [
  wish('1', { title: 'The Hurricane Wars', authors: ['Thea Guanzon'], price: 18.99, buyUrl: 'https://example.com/hw' }),
  wish('2', { title: 'Babel', authors: ['R. F. Kuang'], price: 22.49, buyUrl: 'https://example.com/babel' }),
  wish('3', { title: 'A Study in Drowning', authors: ['Ava Reid'] }),
]

/** the block the way the dashboard uses it, with the wish really leaving the list */
function setup(initial: Book[]) {
  const state = { bought: [] as string[], removed: [] as string[] }
  function Harness() {
    const [list, setList] = useState(initial)
    return (
      <WishlistCard
        wishes={wishBooks(list)}
        onBought={(id) => {
          // twice in a row moves it once: the second press finds no wish
          if (!list.some((b) => b.wish && b.id === id)) return
          state.bought.push(id)
          setList((l) => l.map((b) => (b.id === id ? { ...b, wish: undefined } : b)))
        }}
        onRemove={(id) => {
          state.removed.push(id)
          setList((l) => l.filter((b) => b.id !== id))
        }}
      />
    )
  }
  render(<Harness />)
  return state
}

const rows = () => screen.queryAllByRole('listitem')

describe('the Wishlist block (T-0062)', () => {
  it('is empty before she wishes for anything, and says so', () => {
    setup([])
    expect(screen.getByRole('heading', { name: 'Wishlist' })).toBeTruthy()
    expect(screen.getByText('Nothing on your wishlist yet.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows the wishes newest first, with the count and the total', () => {
    setup(THREE)
    expect(screen.getByText('3 books · €41.48')).toBeTruthy()
    expect(rows().map((li) => li.querySelector('strong')?.textContent)).toEqual([
      'A Study in Drowning',
      'Babel',
      'The Hurricane Wars',
    ])
    expect(within(rows()[2]).getByText('Thea Guanzon')).toBeTruthy()
  })

  it('a wish with no price shows nothing at all, not €0 and not a dash', () => {
    setup(THREE)
    const row = rows()[0]
    expect(row.querySelector('strong')!.textContent).toBe('A Study in Drowning')
    expect(row.textContent).not.toContain('€')
    expect(within(rows()[1]).getByText('€22.49')).toBeTruthy()
  })

  it('a buy link opens in a new tab, and is simply absent when there is none', () => {
    setup(THREE)
    const link = within(rows()[1]).getByRole('link', { name: 'Buy Babel' }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://example.com/babel')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
    expect(within(rows()[0]).queryByRole('link')).toBeNull()
  })

  it('a link that is not a web link is never put behind the button', () => {
    setup([wish('9', { title: 'Shady', buyUrl: 'javascript:alert(1)' })])
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button', { name: 'I bought Shady' })).toBeTruthy()
  })

  it('"I bought it" reports that wish once, however often it is pressed', () => {
    const state = setup(THREE)
    const bought = () => screen.queryByRole('button', { name: 'I bought Babel' })
    fireEvent.click(bought()!)
    expect(state.bought).toEqual(['2'])
    // it has left the list, so a second press (a double tap) cannot move it again
    expect(bought()).toBeNull()
    expect(rows()).toHaveLength(2)
    expect(state.bought).toEqual(['2'])
  })

  it('a wish can be taken off the list', () => {
    const state = setup(THREE)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Babel from the wishlist' }))
    expect(state.removed).toEqual(['2'])
    expect(rows()).toHaveLength(2)
  })

  it('leaves priceless wishes out of the total, and says just the count when none has a price', () => {
    cleanup()
    setup([wish('1'), wish('2')])
    expect(screen.getByText('2 books')).toBeTruthy()
    cleanup()
    setup([wish('1', { price: 10 }), wish('2')])
    expect(screen.getByText('2 books · €10.00')).toBeTruthy()
  })

  it('is one section with a heading, and every control is named by its book', () => {
    setup(THREE)
    const section = screen.getByRole('region', { name: 'Wishlist' })
    expect(section).toBeTruthy()
    expect(within(section).getAllByRole('listitem')).toHaveLength(3)
    for (const title of ['The Hurricane Wars', 'Babel', 'A Study in Drowning']) {
      expect(screen.getByRole('button', { name: `I bought ${title}` })).toBeTruthy()
      expect(screen.getByRole('button', { name: `Remove ${title} from the wishlist` })).toBeTruthy()
    }
  })
})
