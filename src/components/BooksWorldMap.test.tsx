import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { BooksWorldMapCard } from './PictureBlocks'

/**
 * T-0018 *Done when*: the world map block shows her covers and no numbers
 * (D-0026). Titles here contain no digits, so any digit in the block's text
 * would be a count.
 */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: id,
  authors: [],
  color: '#777777',
  status: 'read',
  addedAt: 0,
  readCount: 1,
  ...extra,
})

const shelf: Book[] = [
  // United Kingdom: three books; tile order Jane Eyre (latest), Pride and Prejudice, Emma (no finish date, no cover)
  book('pride', { title: 'Pride and Prejudice', color: '#aa0000', coverUrl: '/api/cover/id/111?size=L', finished: ['2025-03-01'], places: ['England'] }),
  book('jane', { title: 'Jane Eyre', color: '#00aa00', coverUrl: '/api/cover/isbn/9780141441146', finished: ['2026-06-01'], places: ['Yorkshire (England)'] }),
  book('emma', { title: 'Emma', color: '#0000aa', places: ['England'] }),
  // France: one book
  book('miserables', { title: 'Les Misérables', color: '#aaaa00', coverUrl: '/api/cover/id/222?size=L', finished: ['2024-01-01'], places: ['Paris (France)'] }),
  // lands: Hogwarts two books, Narnia one
  book('stone', { title: 'The Philosopher’s Stone', color: '#550055', coverUrl: '/api/cover/id/333?size=L', finished: ['2026-01-01'], places: ['England', 'Hogwarts (Imaginary place)'] }),
  book('chamber', { title: 'The Chamber of Secrets', color: '#005555', finished: ['2026-02-01'], places: ['Hogwarts School of Witchcraft and Wizardry'] }),
  book('wardrobe', { title: 'The Lion, the Witch and the Wardrobe', color: '#553300', coverUrl: '/api/cover/id/444?size=L', places: ['Narnia'] }),
  // still to look up: the waiting line, without its number
  book('waiting', { title: 'Not looked up yet' }),
  // not finished: not on the map
  book('unread', { title: 'Unread', status: 'want', readCount: 0, places: ['Japan'] }),
]

const tilesOf = (svg: Element, country: string) => {
  const path = [...svg.querySelectorAll('path.world-country')].find((p) => p.querySelector('title')?.textContent?.split('\n')[0] === country)!
  const fill = path.getAttribute('style') ?? ''
  const id = /url\(#?["']?#?([^"')]+)["']?\)/.exec(fill)?.[1]
  const pattern = id ? svg.querySelector(`pattern[id="${id}"]`) : null
  return { path, tiles: pattern ? [...pattern.querySelectorAll('.world-tile')] : [] }
}

afterEach(cleanup)

describe('Where your books are set: covers, no numbers (T-0018)', () => {
  it('shows no digit anywhere: text, hover titles, map label, waiting line', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    const svg = await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    expect(container.textContent).not.toMatch(/\d/)
    for (const t of container.querySelectorAll('title')) expect(t.textContent).not.toMatch(/\d/)
    expect(svg.getAttribute('aria-label')).not.toMatch(/\d/)
    expect(svg.getAttribute('aria-label')).toBe('World map of where your books are set: United Kingdom, France')
    expect(screen.getByText('Looking up where more of your books are set…')).toBeTruthy()
    for (const el of container.querySelectorAll('[aria-label], [title], [alt]'))
      for (const a of ['aria-label', 'title', 'alt']) expect(el.getAttribute(a) ?? '').not.toMatch(/\d/)
  })

  it('fills a lit country with one tile per book in tile order, spine colour behind each, small covers', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    const svg = container.querySelector('svg.world-map')!
    const uk = tilesOf(svg, 'United Kingdom')
    expect(uk.path.classList.contains('lit')).toBe(true)
    // four books in the UK (the Philosopher's Stone too), about square: 2 columns, 2 rows
    expect(uk.tiles.length).toBeGreaterThanOrEqual(4)
    const colours = uk.tiles.slice(0, 4).map((t) => t.querySelector('rect')!.getAttribute('fill'))
    expect(colours).toEqual(['#00aa00', '#550055', '#aa0000', '#0000aa'])
    // covers at the small size; Emma (no cover) is only its spine colour
    expect(uk.tiles[0].querySelector('image')!.getAttribute('href')).toBe('/api/cover/isbn/9780141441146?size=S')
    expect(uk.tiles[2].querySelector('image')!.getAttribute('href')).toBe('/api/cover/id/111?size=S')
    expect(uk.tiles[3].querySelector('image')).toBeNull()
    // a plain country has no tiles and keeps its name as hover text
    const japan = [...svg.querySelectorAll('path.world-country')].find((p) => p.querySelector('title')?.textContent === 'Japan')!
    expect(japan.classList.contains('lit')).toBe(false)
    expect(japan.getAttribute('style') ?? '').not.toMatch(/url/)
    // every lit country gets an outline on top
    expect(svg.querySelectorAll('.world-outlines .world-outline')).toHaveLength(2)
  })

  it('hover text of a lit country: its name, then its books’ titles, one per line', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    const { path } = tilesOf(container.querySelector('svg.world-map')!, 'United Kingdom')
    expect(path.querySelector('title')!.textContent).toBe(['United Kingdom', 'Jane Eyre', 'The Philosopher’s Stone', 'Pride and Prejudice', 'Emma'].join('\n'))
  })

  it('lists country names only, most books first', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    expect([...container.querySelectorAll('.world-top li')].map((li) => li.textContent)).toEqual(['United Kingdom', 'France'])
  })

  it('shows one row per land, most books first, one cover per book', async () => {
    render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    expect(screen.getByRole('heading', { name: 'Imaginary lands' })).toBeTruthy()
    const hogwarts = screen.getByRole('list', { name: 'Hogwarts' })
    const narnia = screen.getByRole('list', { name: 'Narnia' })
    // Hogwarts (two books) before Narnia (one)
    expect(hogwarts.compareDocumentPosition(narnia) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // tile order: the Chamber of Secrets (latest) first; it has no cover, so a spine-colour chip
    const covers = within(hogwarts).getAllByRole('img')
    expect(covers.map((c) => c.getAttribute('aria-label') ?? c.getAttribute('alt'))).toEqual(['The Chamber of Secrets', 'The Philosopher’s Stone'])
    expect(covers[0].classList.contains('cover-chip')).toBe(true)
    expect(covers[0].getAttribute('style')).toMatch(/#005555|rgb\(0, 85, 85\)/)
    expect(covers[1].getAttribute('src')).toBe('/api/cover/id/333?size=M')
    expect(covers[1].getAttribute('title')).toBe('The Philosopher’s Stone')
    expect(within(narnia).getAllByRole('img')).toHaveLength(1)
  })

  it('a land cover that fails to load becomes a spine-colour chip', async () => {
    render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    const narnia = screen.getByRole('list', { name: 'Narnia' })
    fireEvent.error(within(narnia).getByRole('img'))
    const chip = within(narnia).getByRole('img', { name: 'The Lion, the Witch and the Wardrobe' })
    expect(chip.tagName).toBe('SPAN')
    expect(chip.classList.contains('cover-chip')).toBe(true)
  })

  it('a map cover that fails to load leaves its spine colour, never a broken-image sign', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('img', { name: /^World map/ }, { timeout: 10000 })
    const svg = container.querySelector('svg.world-map')!
    fireEvent.error(tilesOf(svg, 'France').tiles[0].querySelector('image')!)
    const tile = tilesOf(svg, 'France').tiles[0]
    expect(tile.querySelector('image')).toBeNull()
    expect(tile.querySelector('rect')!.getAttribute('fill')).toBe('#aaaa00')
  })

  it('with no places yet: the plain map and the empty line', async () => {
    render(<BooksWorldMapCard books={[book('x', { title: 'Nowhere', places: [] })]} />)
    const svg = await screen.findByRole('img', { name: 'World map' }, { timeout: 10000 })
    expect(svg.querySelectorAll('pattern')).toHaveLength(0)
    expect(screen.getByText("Open Library doesn't know where your finished books are set yet.")).toBeTruthy()
  })
})
