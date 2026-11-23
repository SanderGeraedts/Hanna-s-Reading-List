import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    const svg = await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
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
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
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
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    const { path } = tilesOf(container.querySelector('svg.world-map')!, 'United Kingdom')
    expect(path.querySelector('title')!.textContent).toBe(['United Kingdom', 'Jane Eyre', 'The Philosopher’s Stone', 'Pride and Prejudice', 'Emma'].join('\n'))
  })

  it('lists country names only, most books first', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    expect([...container.querySelectorAll('.world-top li')].map((li) => li.textContent)).toEqual(['United Kingdom', 'France'])
  })

  it('shows one row per land, most books first, one cover per book', async () => {
    render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    expect(screen.getByRole('heading', { name: 'Imaginary lands' })).toBeTruthy()
    const hogwarts = screen.getByRole('list', { name: 'Hogwarts' })
    const narnia = screen.getByRole('list', { name: 'Narnia' })
    // Hogwarts (two books) before Narnia (one)
    expect(hogwarts.compareDocumentPosition(narnia) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // tile order: the Chamber of Secrets (latest) first; it has no cover, so a spine-colour chip
    // (T-0039: each cover is now a button named by its title)
    const covers = within(hogwarts).getAllByRole('button')
    expect(covers.map((c) => c.getAttribute('aria-label'))).toEqual(['The Chamber of Secrets', 'The Philosopher’s Stone'])
    const chip = covers[0].querySelector('.cover-chip')!
    expect(chip.getAttribute('style')).toMatch(/#005555|rgb\(0, 85, 85\)/)
    expect(covers[1].querySelector('img')!.getAttribute('src')).toBe('/api/cover/id/333?size=M')
    expect(covers[1].getAttribute('title')).toBe('The Philosopher’s Stone')
    expect(within(narnia).getAllByRole('button')).toHaveLength(1)
  })

  it('a land cover that fails to load becomes a spine-colour chip', async () => {
    render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    const narnia = screen.getByRole('list', { name: 'Narnia' })
    fireEvent.error(within(narnia).getByRole('button').querySelector('img')!)
    const cover = within(narnia).getByRole('button', { name: 'The Lion, the Witch and the Wardrobe' })
    expect(cover.querySelector('img')).toBeNull()
    expect(cover.querySelector('span.cover-chip')).not.toBeNull()
  })

  it('a map cover that fails to load leaves its spine colour, never a broken-image sign', async () => {
    const { container } = render(<BooksWorldMapCard books={shelf} />)
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    const svg = container.querySelector('svg.world-map')!
    fireEvent.error(tilesOf(svg, 'France').tiles[0].querySelector('image')!)
    const tile = tilesOf(svg, 'France').tiles[0]
    expect(tile.querySelector('image')).toBeNull()
    expect(tile.querySelector('rect')!.getAttribute('fill')).toBe('#aaaa00')
  })

  // tester (T-0018): edge cases not in the developer's tests
  it('a book set in several countries is a tile in each, once, even when a country is named twice', async () => {
    const travels = [
      book('tour', { title: 'Grand Tour', color: '#123456', finished: ['2026-04-01'], places: ['Paris (France)', 'France', 'Rome (Italy)', 'London (England)', 'England -- London'] }),
      book('local', { title: 'Home Ground', color: '#654321', finished: ['2026-03-01'], places: ['England'] }),
    ]
    const { container } = render(<BooksWorldMapCard books={travels} />)
    await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })
    const svg = container.querySelector('svg.world-map')!
    const fills = (c: string) => tilesOf(svg, c).tiles.map((t) => t.querySelector('rect')!.getAttribute('fill'))
    // one book: a 1 × 1 pattern
    expect(fills('France')).toEqual(['#123456'])
    expect(fills('Italy')).toEqual(['#123456'])
    // two books: 2 columns, 1 row, the tour (latest) first, no duplicate
    expect(fills('United Kingdom')).toEqual(['#123456', '#654321'])
    expect(tilesOf(svg, 'France').path.querySelector('title')!.textContent).toBe('France\nGrand Tour')
    expect(svg.getAttribute('aria-label')).toBe('World map of where your books are set: United Kingdom, France, Italy')
  })

  it('a land whose name has a digit shows that name (a name, not a count), merged across spellings', async () => {
    const district = [
      book('hg1', { title: 'The Hunger Games', color: '#aa5500', finished: ['2026-01-01'], places: ['District 12 (Imaginary place)'] }),
      book('hg2', { title: 'Catching Fire', color: '#aa0055', finished: ['2026-02-01'], places: ['district 12 (Imaginary place)', 'District  12 (Imaginary place)'] }),
    ]
    render(<BooksWorldMapCard books={district} />)
    await screen.findByRole('group', { name: 'World map' }, { timeout: 10000 })
    const row = screen.getByRole('list', { name: 'District 12' })
    expect(within(row).getAllByRole('button').map((c) => c.getAttribute('aria-label'))).toEqual(['Catching Fire', 'The Hunger Games'])
    expect(screen.queryByRole('list', { name: 'district 12' })).toBeNull()
    // the only digits in the block are the land's own name
    expect(document.querySelector('.world-card')!.textContent!.replace(/District 12/g, '')).not.toMatch(/\d/)
  })

  it('a land with a dozen books shows all twelve covers in one wrapping row, no "more"', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      book('l' + i, { title: 'Tale ' + String.fromCharCode(65 + i), places: ['Glimmerdale (Imaginary place)'], ...(i % 3 ? { coverUrl: `/api/cover/id/${i + 1}?size=L` } : {}) }),
    )
    const { container } = render(<BooksWorldMapCard books={many} />)
    await screen.findByRole('group', { name: 'World map' }, { timeout: 10000 })
    const row = screen.getByRole('list', { name: 'Glimmerdale' })
    expect(within(row).getAllByRole('button')).toHaveLength(12)
    expect(row.classList.contains('world-land-books')).toBe(true)
    expect(container.textContent).not.toMatch(/\d|more/i)
  })

  it('with no places yet: the plain map and the empty line', async () => {
    render(<BooksWorldMapCard books={[book('x', { title: 'Nowhere', places: [] })]} />)
    const svg = await screen.findByRole('group', { name: 'World map' }, { timeout: 10000 })
    expect(svg.querySelectorAll('pattern')).toHaveLength(0)
    expect(screen.getByText("Open Library doesn't know where your finished books are set yet.")).toBeTruthy()
  })
})

/**
 * T-0039 *Done when*: tap a country for a card under the map, zoom and pan, keyboard, and still no
 * numbers. The buttons' glide is skipped (reduced motion) so the viewBox changes at once.
 */
describe('Where your books are set: tap a country, zoom the map (T-0039)', () => {
  const realMatchMedia = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({
      matches: /reduce/.test(q),
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    window.matchMedia = realMatchMedia
  })

  const setup = async (books: Book[] = shelf) => {
    const onShowBook = vi.fn()
    const utils = render(<BooksWorldMapCard books={books} onShowBook={onShowBook} />)
    const svg = (await screen.findByRole('group', { name: /^World map/ }, { timeout: 10000 })) as unknown as SVGSVGElement
    const block = utils.container.querySelector('.world-card') as HTMLElement
    const country = (name: string) => svg.querySelector(`path.world-country[data-country="${name}"]`) as SVGPathElement
    const card = () => block.querySelector('.world-pick') as HTMLElement | null
    const names = () => block.querySelector('.world-top') as HTMLElement
    const viewBox = () => svg.getAttribute('viewBox')!.split(' ').map(Number)
    const zoomButtons = () => within(screen.getByRole('group', { name: 'Zoom' })).getAllByRole('button') as HTMLButtonElement[]
    return { ...utils, onShowBook, svg, block, country, card, names, viewBox, zoomButtons }
  }
  /** no digit in the block's text, nor in any aria-label, title or alt inside it (D-0026) */
  const noDigits = (block: HTMLElement) => {
    expect(block.textContent).not.toMatch(/\d/)
    for (const el of block.querySelectorAll('[aria-label], [title], [alt]'))
      for (const a of ['aria-label', 'title', 'alt']) expect(el.getAttribute(a) ?? '').not.toMatch(/\d/)
    for (const t of block.querySelectorAll('title')) expect(t.textContent).not.toMatch(/\d/)
  }

  it('clicking a lit country opens a card under the map: its name, one button per book in tile order, each opening its book', async () => {
    const { country, card, names, block, onShowBook } = await setup()
    expect(card()).toBeNull()
    fireEvent.click(country('United Kingdom'))
    const c = card()!
    expect(c).not.toBeNull()
    expect(within(c).getByRole('heading', { level: 3 }).textContent).toBe('United Kingdom')
    // under the map frame, above the list of names
    const frame = block.querySelector('.world-map-frame')!
    expect(frame.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(c.compareDocumentPosition(names()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const covers = within(c.querySelector('.world-covers') as HTMLElement).getAllByRole('button')
    expect(covers.map((b) => b.getAttribute('aria-label'))).toEqual(['Jane Eyre', 'The Philosopher’s Stone', 'Pride and Prejudice', 'Emma'])
    // named by the title only: the image inside says nothing, a chip has no role of its own
    expect(covers[0].querySelector('img')!.getAttribute('alt')).toBe('')
    expect(covers[3].querySelector('.cover-chip')!.getAttribute('role')).toBeNull()
    fireEvent.click(covers[2])
    expect(onShowBook).toHaveBeenCalledWith('pride')
    // the card stays open behind the book
    expect(card()).not.toBeNull()
    // the chosen country carries the solid gold mark
    expect(block.querySelectorAll('.world-marks .world-mark:not(.focus)')).toHaveLength(1)
    expect(block.querySelector('.world-marks .world-mark-edge.plain')).toBeNull()
  })

  it('clicking a plain country shows its name and exactly "No books set here yet."', async () => {
    const { country, card, block } = await setup()
    fireEvent.click(country('Japan'))
    const c = card()!
    expect(within(c).getByRole('heading', { level: 3 }).textContent).toBe('Japan')
    expect(c.querySelector('p')!.textContent).toBe('No books set here yet.')
    expect(c.querySelector('.world-covers')).toBeNull()
    expect(within(c).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Close'])
    // a plain chosen country gets the gold wash as well as the mark
    expect(block.querySelector('.world-marks .world-mark-edge.plain')).not.toBeNull()
    // × puts focus on the block's title (a plain country can't take focus)
    fireEvent.click(within(c).getByRole('button', { name: 'Close' }))
    expect(card()).toBeNull()
    expect(document.activeElement?.id).toBe('world-title')
  })

  it('a name in the list opens the same card; the country again, ×, or Escape close it; another country switches it', async () => {
    const { country, card, names, block } = await setup()
    const ukName = within(names()).getByRole('button', { name: 'United Kingdom' })
    expect(ukName.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(ukName)
    expect(within(card()!).getByRole('heading').textContent).toBe('United Kingdom')
    expect(ukName.getAttribute('aria-expanded')).toBe('true')
    expect(ukName.getAttribute('aria-controls')).toBe(card()!.id)
    expect(ukName.classList.contains('chosen')).toBe(true)
    // the same country on the map closes it
    fireEvent.click(country('United Kingdom'))
    expect(card()).toBeNull()
    // the name again closes it
    fireEvent.click(ukName)
    fireEvent.click(ukName)
    expect(card()).toBeNull()
    // × closes it and puts focus back on the name that opened it
    fireEvent.click(ukName)
    fireEvent.click(within(card()!).getByRole('button', { name: 'Close' }))
    expect(card()).toBeNull()
    expect(document.activeElement).toBe(ukName)
    // Escape, with focus in the card, closes it
    fireEvent.click(ukName)
    expect(document.activeElement?.tagName).toBe('H3')
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(card()).toBeNull()
    expect(document.activeElement).toBe(ukName)
    // another country switches the card in place
    fireEvent.click(ukName)
    const first = card()
    fireEvent.click(country('France'))
    expect(card()).toBe(first)
    expect(within(card()!).getByRole('heading').textContent).toBe('France')
    expect(within(card()!).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Les Misérables', 'Close'])
    expect(ukName.getAttribute('aria-expanded')).toBe('false')
    expect(block.querySelector('.world-name.chosen')!.textContent).toBe('France')
  })

  it('a lit country is focusable and Enter opens its card; Escape puts focus back on it; plain ones are not Tab stops', async () => {
    const { country, card } = await setup()
    const uk = country('United Kingdom')
    expect(uk.getAttribute('tabindex')).toBe('0')
    expect(uk.getAttribute('role')).toBe('button')
    expect(uk.getAttribute('aria-label')).toBe('United Kingdom')
    expect(uk.getAttribute('aria-expanded')).toBe('false')
    expect(country('Japan').getAttribute('tabindex')).toBeNull()
    act(() => uk.focus())
    fireEvent.keyDown(uk, { key: 'Enter' })
    expect(within(card()!).getByRole('heading').textContent).toBe('United Kingdom')
    expect(uk.getAttribute('aria-expanded')).toBe('true')
    // focus moves to the card's heading
    expect(document.activeElement).toBe(within(card()!).getByRole('heading'))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(card()).toBeNull()
    expect(document.activeElement).toBe(uk)
    // Space opens too, and Enter on the chosen one closes it
    fireEvent.keyDown(uk, { key: ' ' })
    expect(card()).not.toBeNull()
    fireEvent.keyDown(uk, { key: 'Enter' })
    expect(card()).toBeNull()
  })

  it('the lit countries come in alphabetical order, before the zoom buttons, the names and the lands', async () => {
    const { svg, block } = await setup()
    expect([...svg.querySelectorAll('path.world-country.lit')].map((p) => p.getAttribute('aria-label'))).toEqual(['France', 'United Kingdom'])
    const order = [...block.querySelectorAll('[tabindex="0"], button:not(:disabled)')].map((e) => e.getAttribute('aria-label') ?? e.textContent)
    expect(order).toEqual([
      'France',
      'United Kingdom',
      'Zoom in',
      'United Kingdom',
      'France',
      'The Chamber of Secrets',
      'The Philosopher’s Stone',
      'The Lion, the Witch and the Wardrobe',
    ])
  })

  it('an imaginary-land cover is a button and clicking it opens its book', async () => {
    const { onShowBook } = await setup()
    const narnia = screen.getByRole('list', { name: 'Narnia' })
    fireEvent.click(within(narnia).getByRole('button', { name: 'The Lion, the Witch and the Wardrobe' }))
    expect(onShowBook).toHaveBeenCalledWith('wardrobe')
  })

  it('a tiny lit country’s tap zone opens its card; zones are pointer targets only', async () => {
    const { svg, card } = await setup()
    // happy-dom draws nothing, so every lit country counts as tiny here
    const zone = svg.querySelector('.world-zone[data-country="France"]')!
    expect(zone.closest('[aria-hidden]')).not.toBeNull()
    expect(zone.getAttribute('tabindex')).toBeNull()
    fireEvent.click(zone)
    expect(within(card()!).getByRole('heading').textContent).toBe('France')
  })

  it('a tap zone never steals a tap that lands on another lit country’s own shape', async () => {
    const { svg, card, country } = await setup()
    const zone = svg.querySelector('.world-zone[data-country="France"]')!
    const real = document.elementsFromPoint
    // the press lands on France's zone, right over the United Kingdom's own shape
    document.elementsFromPoint = () => [zone, country('United Kingdom'), svg]
    try {
      fireEvent.click(zone, { clientX: 10, clientY: 10 })
      expect(within(card()!).getByRole('heading').textContent).toBe('United Kingdom')
      // over the sea or a plain country, the zone wins
      document.elementsFromPoint = () => [zone, country('Japan'), svg]
      fireEvent.click(zone, { clientX: 10, clientY: 10 })
      expect(within(card()!).getByRole('heading').textContent).toBe('France')
    } finally {
      document.elementsFromPoint = real
    }
  })

  it('a drag never opens a card; a press that stays put does', async () => {
    const { country, card } = await setup()
    const fr = country('France')
    const press = (dx: number) => {
      fireEvent.pointerDown(fr, { pointerId: 7, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 })
      fireEvent.pointerMove(fr, { pointerId: 7, pointerType: 'mouse', clientX: 50 + dx, clientY: 50 })
      fireEvent.pointerUp(fr, { pointerId: 7, pointerType: 'mouse', clientX: 50 + dx, clientY: 50 })
      fireEvent.click(fr)
    }
    press(20)
    expect(card()).toBeNull()
    press(3)
    expect(card()).not.toBeNull()
  })

  it('no digit in the block with a card open (lit and plain) and with the map zoomed in', async () => {
    const { block, country, zoomButtons } = await setup()
    fireEvent.click(country('United Kingdom'))
    noDigits(block)
    fireEvent.click(country('Japan'))
    noDigits(block)
    fireEvent.click(zoomButtons()[0])
    fireEvent.click(zoomButtons()[0])
    noDigits(block)
  })

  it('the zoom buttons: + − ⤢ in that order, named, + zooms in, − and ⤢ are disabled at zoom one and bring it back', async () => {
    const { viewBox, zoomButtons, svg } = await setup()
    const [zoomIn, zoomOut, whole] = zoomButtons()
    expect(zoomButtons().map((b) => [b.textContent, b.getAttribute('aria-label'), b.getAttribute('title')])).toEqual([
      ['+', 'Zoom in', 'Zoom in (Ctrl + scroll)'],
      ['−', 'Zoom out', 'Zoom out'],
      ['⤢', 'Show the whole map', 'Show the whole map'],
    ])
    expect(viewBox()).toEqual([0, 0, 360, expect.any(Number)])
    const fullW = viewBox()[2]
    expect(zoomOut.disabled).toBe(true)
    expect(whole.disabled).toBe(true)
    expect(svg.getAttribute('tabindex')).toBeNull()
    expect(svg.style.touchAction).toBe('pan-x pan-y')
    // one press doubles the zoom
    fireEvent.click(zoomIn)
    expect(viewBox()[2]).toBeCloseTo(fullW / 2)
    expect(zoomOut.disabled).toBe(false)
    expect(whole.disabled).toBe(false)
    expect(svg.getAttribute('tabindex')).toBe('0')
    expect(svg.style.touchAction).toBe('none')
    // − halves it again
    fireEvent.click(zoomOut)
    expect(viewBox()[2]).toBeCloseTo(fullW)
    expect(zoomOut.disabled).toBe(true)
    // three presses reach the maximum (8×)
    fireEvent.click(zoomIn)
    fireEvent.click(zoomIn)
    expect(zoomIn.disabled).toBe(false)
    fireEvent.click(zoomIn)
    expect(viewBox()[2]).toBeCloseTo(fullW / 8)
    expect(zoomIn.disabled).toBe(true)
    // ⤢ shows the whole map
    fireEvent.click(whole)
    expect(viewBox()).toEqual([0, 0, fullW, expect.any(Number)])
    expect(whole.disabled).toBe(true)
  })

  it('Ctrl+wheel zooms and calls preventDefault; a plain wheel does neither', async () => {
    const { svg, viewBox } = await setup()
    const plain = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    act(() => void svg.dispatchEvent(plain))
    expect(plain.defaultPrevented).toBe(false)
    expect(viewBox()[2]).toBe(360)
    // happy-dom's WheelEvent has no ctrlKey of its own (it isn't a MouseEvent there): set it as a browser would
    const ctrl = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true })
    Object.defineProperty(ctrl, 'ctrlKey', { value: true })
    act(() => void svg.dispatchEvent(ctrl))
    expect(ctrl.defaultPrevented).toBe(true)
    expect(viewBox()[2]).toBeLessThan(360)
  })

  it('at zoom one an arrow key does not pan; zoomed in, an arrow key moves the viewBox', async () => {
    const { svg, viewBox, zoomButtons, country } = await setup()
    const uk = country('United Kingdom')
    fireEvent.keyDown(uk, { key: 'ArrowRight' })
    expect(viewBox()).toEqual([0, 0, 360, expect.any(Number)])
    fireEvent.click(zoomButtons()[0])
    const [x, y, w, h] = viewBox()
    fireEvent.keyDown(svg, { key: 'ArrowRight' })
    expect(viewBox()[0]).toBeCloseTo(x + w / 5)
    fireEvent.keyDown(uk, { key: 'ArrowUp' })
    expect(viewBox()[1]).toBeCloseTo(y - h / 5)
    // + and − on the map zoom too
    fireEvent.keyDown(svg, { key: '+' })
    expect(viewBox()[2]).toBeCloseTo(w / 2)
    fireEvent.keyDown(svg, { key: '-' })
    expect(viewBox()[2]).toBeCloseTo(w)
  })
})
