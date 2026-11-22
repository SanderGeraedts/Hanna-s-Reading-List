import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
}))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { PileCard } = await import('./DashboardExtras')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A finished book, so the pace line shows. */
const finished = book('done', { status: 'read', finished: [daysAgo(10)], pages: 300 })

/** The mixed shelf of T-0023's Done when, plus a finished book for the pace line. */
const mixed = () => [
  finished,
  book('A', { formats: ['paperback'], pages: 300 }),
  book('B', { formats: ['hardcover'], pages: 300 }),
  book('C', { formats: ['ebook'], pages: 300 }),
  book('D', { formats: ['storytel'], pages: 600, minutes: 600 }),
  book('E', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
  book('F', { formats: ['other'] }),
  book('G', { status: 'read', formats: ['paperback'], pages: 300 }),
]

const nb = ' '
const LINE = /Stacked up|would stand|Your audiobooks? (are|is)|all audiobooks/

/** The paragraph with the height (or listening time) line, if there is one. */
const heightLine = (container: HTMLElement) => [...container.querySelectorAll('p')].find((p) => LINE.test(p.textContent ?? ''))

/** What she sees: the line without the screen-reader-only text. */
const seen = (p: HTMLElement) => {
  const copy = p.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.visually-hidden').forEach((s) => s.remove())
  return copy.textContent
}

/** What a screen reader hears: without the aria-hidden parts. */
const heard = (p: HTMLElement) => {
  const copy = p.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"]').forEach((s) => s.remove())
  return copy.textContent
}

const theSwitch = () => screen.queryByRole('group', { name: 'Which part of the pile' })
const buttonNames = () => within(theSwitch()!).getAllByRole('button').map((b) => b.getAttribute('aria-pressed') + ':' + b.textContent)
const press = (name: string) => fireEvent.click(within(theSwitch()!).getByRole('button', { name }))

/** Everything in the block except the switch and the height line. */
const rest = (container: HTMLElement) => {
  const copy = container.cloneNode(true) as HTMLElement
  copy.querySelector('.pile-kinds')?.remove()
  const line = [...copy.querySelectorAll('p')].find((p) => LINE.test(p.textContent ?? ''))
  line?.remove()
  return copy.textContent
}

afterEach(cleanup)

describe('PileCard: the switch and the lines (T-0023)', () => {
  it('shows All, Paper, E-book and Audiobook on the mixed shelf, All pressed, and each kind’s line', () => {
    const { container } = render(<PileCard books={mixed()} />)
    expect(theSwitch()).toBeTruthy()
    expect(buttonNames()).toEqual(['true:All', 'false:📖 Paper', 'false:📱 E-book', 'false:🎧 Audiobook'])
    let line = heightLine(container)!
    expect(seen(line)).toBe(`📚${nb}Stacked up, your pile would be 13${nb}cm: taller than a mug (10${nb}cm).`)
    expect(heard(line)).toBe('Stacked up, your pile would be 13 centimetres: taller than a mug (10 centimetres).')

    press('Paper')
    line = heightLine(container)!
    expect(seen(line)).toBe(`📖${nb}Your paper books would stand 7${nb}cm: not as tall as a mug (10${nb}cm) yet.`)
    expect(heard(line)).toBe('Your paper books would stand 7 centimetres: not as tall as a mug (10 centimetres) yet.')
    expect(screen.getByRole('button', { name: 'Paper' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Paper' }).className).toBe('active')

    press('E-book')
    line = heightLine(container)!
    expect(seen(line)).toBe(`📱${nb}Your e-book would stand 2${nb}cm: not as tall as a mug (10${nb}cm) yet.`)
    expect(screen.getByRole('button', { name: 'E-book' }).getAttribute('aria-pressed')).toBe('true')

    press('Audiobook')
    line = heightLine(container)!
    expect(seen(line)).toBe(`🎧${nb}Your audiobooks are 22${nb}h: about as long as a whole day and night (24${nb}h).`)
    expect(heard(line)).toBe('Your audiobooks are 22 hours: about as long as a whole day and night (24 hours).')
    expect(line.textContent).not.toMatch(/cm|metre/)
    expect(screen.getByRole('button', { name: 'Audiobook' }).getAttribute('aria-pressed')).toBe('true')

    press('All')
    expect(seen(heightLine(container)!)).toMatch(/^📚.Stacked up, your pile would be 13.cm/)
  })

  it('a pile of paper books only (and one Other) has no switch', () => {
    const shelf = [finished, book('a', { formats: ['paperback'], pages: 300 }), book('o', { formats: ['other'], pages: 300 })]
    const { container } = render(<PileCard books={shelf} />)
    expect(theSwitch()).toBeNull()
    expect(seen(heightLine(container)!)).toMatch(/^📚.Stacked up, your pile would be 4.cm/)
  })

  it('a kind with no books has no button', () => {
    const shelf = [book('p', { formats: ['paperback'], pages: 300 }), book('a', { formats: ['audiobook'], minutes: 600 })]
    render(<PileCard books={shelf} />)
    expect(within(theSwitch()!).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'All',
      '📖 Paper',
      '🎧 Audiobook',
    ])
  })

  it('a pile of only listen-only books shows the All line with a height, no switch, no “all audiobooks” text', () => {
    const shelf = [book('a', { formats: ['storytel'], minutes: 500 }), book('b', { formats: ['audiobook'], minutes: 300 })]
    const { container } = render(<PileCard books={shelf} />)
    const line = heightLine(container)!
    // 250 + 150 pages as paperbacks: 18.5 + 11.5 mm = 3 cm
    expect(seen(line)).toBe(`📚${nb}Stacked up, your pile would be 3${nb}cm: not as tall as a mug (10${nb}cm) yet.`)
    expect(theSwitch()).toBeNull()
    expect(container.textContent).not.toMatch(/all audiobooks/)
    expect(container.textContent).toContain('2 books waiting')
  })

  it('an empty pile shows no line and no switch', () => {
    const { container } = render(<PileCard books={[finished]} />)
    expect(container.querySelector('.big-number')?.textContent).toBe('0 books waiting')
    expect(heightLine(container)).toBeUndefined()
    expect(theSwitch()).toBeNull()
    expect(screen.getByText('Last 6 months')).toBeTruthy()
  })

  it('starts on All again after the card is rendered again', () => {
    const first = render(<PileCard books={mixed()} />)
    press('Audiobook')
    expect(screen.getByRole('button', { name: 'Audiobook' }).getAttribute('aria-pressed')).toBe('true')
    first.unmount()
    const { container } = render(<PileCard books={mixed()} />)
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    expect(seen(heightLine(container)!)).toMatch(/^📚/)
  })

  it('falls back to All when the chosen kind runs out', () => {
    const { rerender, container } = render(<PileCard books={mixed()} />)
    press('E-book')
    rerender(<PileCard books={mixed().filter((b) => b.id !== 'C')} />)
    expect(within(theSwitch()!).queryByRole('button', { name: 'E-book' })).toBeNull()
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    expect(seen(heightLine(container)!)).toMatch(/^📚/)
  })

  it('names the group and buttons without emoji, sits right before the line, which is a live region only with a switch', () => {
    const { container } = render(<PileCard books={mixed()} />)
    const group = theSwitch()!
    expect(group.className).toBe('segmented pile-kinds')
    expect(within(group).getAllByRole('button')).toHaveLength(4)
    for (const name of ['All', 'Paper', 'E-book', 'Audiobook']) {
      expect(within(group).getByRole('button', { name })).toBeTruthy()
    }
    within(group)
      .getAllByRole('button')
      .slice(1)
      .forEach((b) => expect(b.querySelector('[aria-hidden="true"]')).toBeTruthy())
    const line = heightLine(container)!
    expect(group.nextElementSibling).toBe(line)
    expect(group.previousElementSibling?.textContent).toMatch(/pages · .* to listen/)
    expect(line.getAttribute('aria-live')).toBe('polite')
    expect(line.getAttribute('aria-atomic')).toBe('true')
    cleanup()

    const { container: single } = render(<PileCard books={[book('a', { formats: ['paperback'], pages: 300 })]} />)
    const plain = heightLine(single)!
    expect(plain.hasAttribute('aria-live')).toBe(false)
    expect(plain.hasAttribute('aria-atomic')).toBe(false)
    expect(plain.className).toBe('')
  })

  it('keeps the time whole with non-breaking spaces, and says nonstop days in full', () => {
    // 5,180 minutes of audiobooks next to one paperback
    const shelf = [
      book('p', { formats: ['paperback'], pages: 300 }),
      book('a', { formats: ['audiobook'], minutes: 2590 }),
      book('b', { formats: ['storytel'], minutes: 2590 }),
    ]
    const { container } = render(<PileCard books={shelf} />)
    press('Audiobook')
    const line = heightLine(container)!
    expect(seen(line)).toBe(`🎧${nb}Your audiobooks are 86${nb}h${nb}20${nb}min: about as long as listening nonstop for 3½${nb}days.`)
    expect(heard(line)).toBe('Your audiobooks are 86 hours 20 minutes: about as long as listening nonstop for 3 and a half days.')
  })

  it('one audiobook is “Your audiobook is”', () => {
    const shelf = [book('p', { formats: ['paperback'], pages: 300 }), book('a', { formats: ['storytel'] })]
    const { container } = render(<PileCard books={shelf} />)
    press('Audiobook')
    expect(seen(heightLine(container)!)).toBe(`🎧${nb}Your audiobook is 9${nb}h${nb}20${nb}min: longer than a working day (8${nb}h).`)
  })

  it('the rest of the block shows the whole pile and does not change with the switch', () => {
    const { container } = render(<PileCard books={mixed()} />)
    expect(container.textContent).toContain('6 books waiting')
    expect(screen.getByText(/pages · .* to listen/)).toBeTruthy()
    expect(screen.getByText(/At your pace of/)).toBeTruthy()
    expect(screen.getByText('Last 6 months')).toBeTruthy()
    const before = rest(container)
    for (const name of ['Paper', 'E-book', 'Audiobook', 'All']) {
      press(name)
      expect(rest(container)).toBe(before)
    }
  })

  it('keeps the block’s order: pages line, switch, height line, pace line', () => {
    const { container } = render(<PileCard books={mixed()} />)
    const kids = [...container.querySelector('section')!.children]
    const pages = kids.findIndex((el) => /pages · .* to listen/.test(el.textContent ?? ''))
    const sw = kids.indexOf(theSwitch()!)
    const line = kids.indexOf(heightLine(container)!)
    const pace = kids.findIndex((el) => /At your pace of/.test(el.textContent ?? ''))
    expect([sw, line, pace]).toEqual([pages + 1, pages + 2, pages + 3])
  })
})

describe('PileCard: height line edge cases (tester, T-0021, updated for T-0023)', () => {
  it('a pile of 1 book: seen and heard in centimetres, with the mug line', () => {
    const { container } = render(<PileCard books={[finished, book('one', { pages: 400, format: 'paperback' })]} />)
    const line = heightLine(container)!
    // 0.07 × 400 + 1 = 29 mm
    expect(seen(line)).toBe(`📚${nb}Stacked up, your pile would be 3${nb}cm: not as tall as a mug (10${nb}cm) yet.`)
    expect(heard(line)).toBe('Stacked up, your pile would be 3 centimetres: not as tall as a mug (10 centimetres) yet.')
    expect(container.textContent).toContain('1 book waiting')
  })

  it('a very large pile shows whole metres and the Eiffel Tower', () => {
    const shelf = Array.from({ length: 30_000 }, (_, i) => book(`b${i}`, { pages: 300 }))
    const { container } = render(<PileCard books={shelf} />)
    const line = heightLine(container)!
    expect(seen(line)).toBe(`📚${nb}Stacked up, your pile would be 660${nb}m: taller than the Eiffel Tower (330${nb}m).`)
    expect(heard(line)).toBe('Stacked up, your pile would be 660 metres: taller than the Eiffel Tower (330 metres).')
  })
})
