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

const PACE = /At your pace of|Once some books have|so there's no pace yet/

/** The pace line (or a no-pace line), if there is one. */
const paceLine = (container: HTMLElement) => [...container.querySelectorAll('p')].find((p) => PACE.test(p.textContent ?? ''))

/** Everything in the block except the switch, the height line and the pace line. */
const rest = (container: HTMLElement) => {
  const copy = container.cloneNode(true) as HTMLElement
  copy.querySelector('.pile-kinds')?.remove()
  const line = [...copy.querySelectorAll('p')].find((p) => LINE.test(p.textContent ?? ''))
  line?.remove()
  paceLine(copy)?.remove()
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
    // T-0024: the height line and the pace line share one live region right after the switch
    const said = group.nextElementSibling!
    expect([...said.children]).toEqual([line, paceLine(container)])
    expect(group.previousElementSibling?.textContent).toMatch(/pages · .* to listen/)
    expect(said.getAttribute('aria-live')).toBe('polite')
    expect(said.getAttribute('aria-atomic')).toBe('true')
    expect(line.hasAttribute('aria-live')).toBe(false)
    expect(line.hasAttribute('aria-atomic')).toBe(false)
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
    cleanup()

    const { container: single } = render(<PileCard books={[book('a', { formats: ['paperback'], pages: 300 })]} />)
    const plain = heightLine(single)!
    expect(plain.hasAttribute('aria-live')).toBe(false)
    expect(plain.hasAttribute('aria-atomic')).toBe(false)
    expect(plain.className).toBe('')
    expect(single.querySelector('[aria-live]')).toBeNull()
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

  it('the rest of the block shows the whole pile and does not change with the switch (the pace line does, T-0024)', () => {
    const { container } = render(<PileCard books={mixed()} />)
    expect(container.textContent).toContain('6 books waiting')
    expect(screen.getByText(/pages · .* to listen/)).toBeTruthy()
    expect(screen.getByText(/At your pace of/)).toBeTruthy()
    expect(screen.getByText('Last 6 months')).toBeTruthy()
    const before = rest(container)
    const paces = new Set<string>()
    for (const name of ['Paper', 'E-book', 'Audiobook', 'All']) {
      press(name)
      expect(rest(container)).toBe(before)
      paces.add(paceLine(container)!.textContent!)
    }
    expect(paces.size).toBe(4)
  })

  it('keeps the block’s order: pages line, switch, height line, pace line', () => {
    const { container } = render(<PileCard books={mixed()} />)
    const kids = [...container.querySelector('section')!.children]
    const pages = kids.findIndex((el) => /pages · .* to listen/.test(el.textContent ?? ''))
    const sw = kids.indexOf(theSwitch()!)
    const said = kids.indexOf(heightLine(container)!.parentElement!)
    expect([sw, said]).toEqual([pages + 1, pages + 2])
    expect([...kids[said].children]).toEqual([heightLine(container), paceLine(container)])
    expect(kids[said + 1].textContent).toMatch(/This month/i)
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

describe('PileCard: more switch cases (tester, T-0023)', () => {
  it('e-books and audiobooks only: All, E-book and Audiobook, and each line', () => {
    const shelf = [book('e', { formats: ['ebook'], pages: 300 }), book('a', { formats: ['storytel'], minutes: 560 })]
    const { container } = render(<PileCard books={shelf} />)
    expect(buttonNames()).toEqual(['true:All', 'false:📱 E-book', 'false:🎧 Audiobook'])
    press('Audiobook')
    expect(seen(heightLine(container)!)).toBe(`🎧${nb}Your audiobook is 9${nb}h${nb}20${nb}min: longer than a working day (8${nb}h).`)
    expect(heard(heightLine(container)!)).toBe('Your audiobook is 9 hours 20 minutes: longer than a working day (8 hours).')
    press('E-book')
    expect(seen(heightLine(container)!)).toBe(`📱${nb}Your e-book would stand 2${nb}cm: not as tall as a mug (10${nb}cm) yet.`)
  })

  it('the switch goes when only one kind is left, and the line is no longer a live region', () => {
    const { rerender, container } = render(<PileCard books={mixed()} />)
    press('Paper')
    rerender(<PileCard books={mixed().filter((b) => ['A', 'B'].includes(b.id))} />)
    expect(theSwitch()).toBeNull()
    expect(seen(heightLine(container)!)).toMatch(/^📚/)
    expect(heightLine(container)!.getAttribute('aria-live')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
  })

  it('pressing the same button twice keeps it pressed', () => {
    const { container } = render(<PileCard books={mixed()} />)
    press('Paper')
    press('Paper')
    expect(screen.getByRole('button', { name: 'Paper' }).getAttribute('aria-pressed')).toBe('true')
    expect(seen(heightLine(container)!)).toMatch(/^📖/)
  })
})

describe('PileCard: the pace line follows the switch (T-0024, D-0031)', () => {
  const read = (id: string, days: number[], extra: Partial<Book>) =>
    book(id, { status: 'read', finished: days.map(daysAgo), ...extra })
  /** The pace shelf of T-0024's Done when. */
  const paceShelf = () => [
    ...[1, 2, 3, 4, 5, 6].map((n) => read(`P${n}`, [n * 20], { formats: ['paperback'], pages: 300 })),
    ...[1, 2, 3].map((n) => read(`E${n}`, [n * 30], { formats: ['ebook'], pages: 300 })),
    read('S1', [40, 200], { formats: ['storytel'], minutes: 600 }),
    read('S2', [50], { formats: ['storytel'] }),
    read('X', [60], { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
    read('Z', [70], { formats: ['storytel'], sleepRead: true, minutes: 1200 }),
    read('O', [80], { formats: ['other'], pages: 200 }),
    read('Old', [400], { formats: ['paperback'], pages: 300 }),
    book('N', { status: 'read', readCount: 1, formats: ['paperback'], pages: 300 }),
    ...Array.from({ length: 11 }, (_, i) => book(`W${i + 1}`, { formats: ['paperback'], pages: 300 })),
    book('WE', { formats: ['ebook'], pages: 300 }),
    book('WS1', { formats: ['storytel'], minutes: 600 }),
    book('WS2', { formats: ['storytel'], minutes: 600 }),
    book('WX', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
  ]
  const ALL = "At your pace of 1.3 a month, that's about 1 year of reading."

  it('shows the All line, then each kind’s line, then the All line again', () => {
    const { container } = render(<PileCard books={paceShelf()} />)
    expect(paceLine(container)!.textContent).toBe(ALL)
    press('Paper')
    expect(paceLine(container)!.textContent).toBe("At your pace of 0.6 paper books a month, that's about 2 years of reading.")
    expect(paceLine(container)!.className).toBe('')
    press('E-book')
    expect(paceLine(container)!.textContent).toBe("At your pace of 0.3 e-books a month, that's 4 months of reading.")
    press('Audiobook')
    const audio = paceLine(container)!
    expect(seen(audio)).toBe(`At your pace of 5.1${nb}h a month, that's 7 months of listening.`)
    expect(heard(audio)).toBe("At your pace of 5.1 hours a month, that's 7 months of listening.")
    expect(audio.className).toBe('')
    press('All')
    expect(paceLine(container)!.textContent).toBe(ALL)
  })

  it('on the mixed shelf (its only finish has no format) each kind shows its no-pace line, All its pace line', () => {
    const { container } = render(<PileCard books={mixed()} />)
    expect(paceLine(container)!.textContent).toBe("At your pace of 0.1 a month, that's about 6 years of reading.")
    const lines = {
      Paper: "You haven't finished a paper book in the last year, so there's no pace yet.",
      'E-book': "You haven't finished an e-book in the last year, so there's no pace yet.",
      Audiobook: "You haven't finished an audiobook in the last year, so there's no pace yet.",
    }
    for (const [name, text] of Object.entries(lines)) {
      press(name)
      const line = paceLine(container)!
      expect(line.textContent).toBe(text)
      expect(line.className).toBe('muted small-text')
      expect(container.textContent).not.toMatch(/At your pace of/)
    }
    press('All')
    expect(paceLine(container)!.textContent).toMatch(/^At your pace of 0\.1 a month/)
  })

  it('with no finish day at all: All shows the “Finished on” line, a kind its no-pace line', () => {
    const { container } = render(<PileCard books={mixed().filter((b) => b.id !== 'done')} />)
    expect(paceLine(container)!.textContent).toBe('Once some books have a “Finished on” date, this shows how long the pile would take.')
    press('E-book')
    expect(paceLine(container)!.textContent).toBe("You haven't finished an e-book in the last year, so there's no pace yet.")
    expect(container.textContent).not.toMatch(/Once some books have/)
  })

  it('a pile with one kind only (no switch) shows the All line only', () => {
    const shelf = [finished, book('a', { formats: ['paperback'], pages: 300 }), book('b', { formats: ['hardcover'], pages: 300 })]
    const { container } = render(<PileCard books={shelf} />)
    expect(theSwitch()).toBeNull()
    expect(paceLine(container)!.textContent).toBe("At your pace of 0.1 a month, that's about 2 years of reading.")
    expect(container.textContent).not.toMatch(/paper book|no pace yet/)
  })

  it('starts on All with the All pace line after unmount and mount', () => {
    const first = render(<PileCard books={paceShelf()} />)
    press('Audiobook')
    expect(paceLine(first.container)!.textContent).toMatch(/of listening/)
    first.unmount()
    const { container } = render(<PileCard books={paceShelf()} />)
    expect(paceLine(container)!.textContent).toBe(ALL)
  })
})
