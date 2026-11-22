import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const {
  DURATION_THINGS,
  HEIGHT_THINGS,
  audioLine,
  audioMinutes,
  bookKinds,
  bookThickness,
  compareDuration,
  compareHeight,
  comparisonText,
  daysSpoken,
  durationComparisonText,
  heightSpoken,
  heightText,
  kindHeightLine,
  pileHeightLine,
  pileHeights,
  pileKinds,
  timeSpoken,
  timeText,
} = await import('./pileHeight')
const { formatDuration } = await import('./listening')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

/** The mixed shelf of T-0023's Done when. */
const mixed = () => [
  book('A', { formats: ['paperback'], pages: 300 }),
  book('B', { formats: ['hardcover'], pages: 300 }),
  book('C', { formats: ['ebook'], pages: 300 }),
  book('D', { formats: ['storytel'], pages: 600, minutes: 600 }),
  book('E', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
  book('F', { formats: ['other'] }),
  book('G', { status: 'read', formats: ['paperback'], pages: 300 }),
]

describe('bookThickness: real printed books (D-0030)', () => {
  it('a 300-page paperback is 22 mm, a hardcover 26 mm, a book without pages 280 pages, an e-book a paperback', () => {
    expect(bookThickness(book('p', { formats: ['paperback'], pages: 300 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('h', { formats: ['hardcover'], pages: 300 }))).toBeCloseTo(0.026, 10)
    expect(bookThickness(book('n', { formats: ['paperback'] }))).toBeCloseTo(0.0206, 10)
    expect(bookThickness(book('e', { formats: ['ebook'], pages: 300 }))).toBeCloseTo(0.022, 10)
  })

  it('a listen-only book counts as minutes ÷ 2 pages, never its copied pages', () => {
    expect(bookThickness(book('a', { formats: ['audiobook'], pages: 600, minutes: 600 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('b', { formats: ['storytel'], minutes: 600 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('c', { formats: ['storytel'], pages: 300 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('d', { formats: ['audiobook'] }))).toBeCloseTo(0.0206, 10)
  })

  it('ignores 0 and negative pages and minutes', () => {
    expect(bookThickness(book('a', { formats: ['audiobook'], minutes: 0, pages: 300 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('b', { formats: ['audiobook'], minutes: -5, pages: -5 }))).toBeCloseTo(0.0206, 10)
    expect(bookThickness(book('c', { formats: ['paperback'], pages: 0, minutes: 600 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('d', { formats: ['paperback'], pages: -1 }))).toBeCloseTo(0.0206, 10)
  })

  it('a book she does not only listen to uses its pages, then minutes ÷ 2', () => {
    expect(bookThickness(book('p', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }))).toBeCloseTo(0.022, 10)
    expect(bookThickness(book('e', { formats: ['ebook', 'audiobook'], minutes: 600 }))).toBeCloseTo(0.022, 10)
  })

  it('has no minimum: a 1-page paperback is about 1 mm', () => {
    expect(bookThickness(book('t', { pages: 1 }))).toBeCloseTo(0.00107, 10)
    expect(heightText(bookThickness(book('t', { pages: 1 })))).toBe('1 cm')
  })
})

describe('bookKinds and the bindings', () => {
  it('a book with Paperback and Hardcover counts as a hardcover', () => {
    const both = book('b', { formats: ['paperback', 'hardcover'], pages: 300 })
    expect(bookThickness(both)).toBeCloseTo(0.026, 10)
    expect(pileHeights([both]).paper).toBeCloseTo(0.026, 10)
  })

  it('a library or borrowed book counts in Paper as a paperback', () => {
    const lib = book('l', { formats: ['library'], pages: 300 })
    const borrowed = book('b', { formats: ['borrowed'], pages: 300 })
    expect(bookKinds(lib)).toEqual(['paper'])
    expect(bookKinds(borrowed)).toEqual(['paper'])
    expect(pileHeights([lib, borrowed]).paper).toBeCloseTo(0.044, 10)
  })

  it('an old Storytel import (only storytelId) counts in Audiobook', () => {
    const old = book('s', { storytelId: 'x', minutes: 300 })
    expect(bookKinds(old)).toEqual(['audio'])
    expect(pileHeights([old])).toMatchObject({ audioMinutes: 300, counts: { all: 1, audio: 1 } })
  })

  it('Other or no format counts in no kind; a book counts in every kind it has', () => {
    expect(bookKinds(book('o', { formats: ['other'] }))).toEqual([])
    expect(bookKinds(book('n'))).toEqual([])
    expect(bookKinds(book('x', { formats: ['hardcover', 'ebook', 'audiobook'] }))).toEqual(['paper', 'ebook', 'audio'])
  })
})

describe('pileHeights: the mixed shelf (T-0023)', () => {
  it('adds All, Paper, E-book and the audiobook minutes', () => {
    const pile = pileHeights(mixed())
    expect(pile.all).toBeCloseTo(0.1346, 10)
    expect(pile.paper).toBeCloseTo(0.07, 10)
    expect(pile.ebook).toBeCloseTo(0.022, 10)
    expect(pile.audioMinutes).toBe(1320)
    expect(pile.counts).toEqual({ all: 6, paper: 3, ebook: 1, audio: 2 })
    expect(timeText(pile.audioMinutes)).toBe('22 h')
    expect(durationComparisonText(compareDuration(pile.audioMinutes))).toBe('about as long as a whole day and night (24 h)')
  })

  it('F (only Other) counts in All only', () => {
    const f = [book('F', { formats: ['other'] })]
    expect(pileHeights(f)).toMatchObject({ paper: 0, ebook: 0, audioMinutes: 0, counts: { all: 1, paper: 0, ebook: 0, audio: 0 } })
    expect(pileHeights(f).all).toBeCloseTo(0.0206, 10)
  })

  it('never counts read, reading, paused or did-not-finish books', () => {
    const shelf = (['read', 'reading', 'paused', 'dnf'] as const).map((status, i) =>
      book(String(i), { status, formats: ['paperback', 'ebook', 'storytel'], pages: 300, minutes: 600 }),
    )
    expect(pileHeights(shelf)).toEqual({ all: 0, paper: 0, ebook: 0, audioMinutes: 0, counts: { all: 0, paper: 0, ebook: 0, audio: 0 } })
  })

  it('a pile of only audiobooks has a height: 15 audiobooks of 10 hours stand 33 cm', () => {
    const shelf = Array.from({ length: 15 }, (_, i) => book(String(i), { formats: ['audiobook'], minutes: 600, pages: 600 }))
    expect(pileHeightLine(pileHeights(shelf).all)).toBe('Stacked up, your pile would be 33 cm: taller than a cat (25 cm).')
  })
})

describe('pileKinds: which buttons the switch gets', () => {
  it('the mixed shelf has Paper, E-book and Audiobook', () => {
    expect(pileKinds(pileHeights(mixed()))).toEqual(['paper', 'ebook', 'audio'])
  })

  it('only paper books (plus an Other one) give one kind; an empty pile none', () => {
    const paper = [book('a', { formats: ['paperback'] }), book('b', { formats: ['hardcover'] }), book('o', { formats: ['other'] })]
    expect(pileKinds(pileHeights(paper))).toEqual(['paper'])
    expect(pileKinds(pileHeights([]))).toEqual([])
  })
})

describe('the kind lines', () => {
  it('Paper and E-book, plural and singular', () => {
    expect(kindHeightLine('paper', 0.07, 3)).toBe('Your paper books would stand 7 cm: not as tall as a mug (10 cm) yet.')
    expect(kindHeightLine('paper', 0.026, 1)).toBe('Your paper book would stand 3 cm: not as tall as a mug (10 cm) yet.')
    expect(kindHeightLine('ebook', 0.022, 1)).toBe('Your e-book would stand 2 cm: not as tall as a mug (10 cm) yet.')
    expect(kindHeightLine('ebook', 0.15, 7)).toBe('Your e-books would stand 15 cm: taller than a mug (10 cm).')
    expect(kindHeightLine('all', 0.1346, 6)).toBe('Stacked up, your pile would be 13 cm: taller than a mug (10 cm).')
  })
})

describe('audioMinutes: one book (D-0030)', () => {
  it('minutes, else pages × 2, else 560', () => {
    expect(audioMinutes(book('a', { formats: ['audiobook'], minutes: 600 }))).toBe(600)
    expect(audioMinutes(book('b', { formats: ['audiobook'], pages: 300 }))).toBe(600)
    expect(audioMinutes(book('c', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }))).toBe(720)
    expect(audioMinutes(book('d', { formats: ['storytel'] }))).toBe(560)
  })

  it('a read audiobook does not count', () => {
    expect(pileHeights([book('r', { status: 'read', formats: ['audiobook'], minutes: 600 })]).audioMinutes).toBe(0)
  })
})

describe('compareDuration and the audiobook line', () => {
  it.each([
    [1179, 'about as long as all eight Harry Potter films back to back (19 h 39 min)'],
    [480, 'about as long as a working day (8 h)'],
    [2400, 'about as long as a work week (40 h)'],
    [600, 'longer than a working day (8 h)'],
    [1800, 'longer than a whole day and night (24 h)'],
    [2880, 'about as long as listening nonstop for 2 days'],
    [14460, 'about as long as listening nonstop for 10 days'],
    [5180, 'about as long as listening nonstop for 3½ days'],
    [60, 'not as long as a football match (1 h 30 min) yet'],
  ])('%s min → %s', (minutes, text) => {
    expect(durationComparisonText(compareDuration(minutes))).toBe(text)
  })

  it('builds the whole line, singular for one audiobook', () => {
    expect(audioLine(5180, 12)).toBe('Your audiobooks are 86 h 20 min: about as long as listening nonstop for 3½ days.')
    expect(audioLine(560, 1)).toBe('Your audiobook is 9 h 20 min: longer than a working day (8 h).')
    expect(audioLine(1320, 2)).toBe('Your audiobooks are 22 h: about as long as a whole day and night (24 h).')
  })

  it('between 44 h and 48 h it is longer than a work week', () => {
    expect(durationComparisonText(compareDuration(46 * 60))).toBe('longer than a work week (40 h)')
  })

  it('writes every list duration with formatDuration, in order', () => {
    expect(DURATION_THINGS.map((t) => `${t.name} (${formatDuration(t.minutes)})`)).toEqual([
      'a football match (1 h 30 min)',
      'the film Titanic (3 h 14 min)',
      'a working day (8 h)',
      'the nonstop flight from Perth to London (17 h 20 min)',
      'all eight Harry Potter films back to back (19 h 39 min)',
      'a whole day and night (24 h)',
      'a work week (40 h)',
    ])
    const lengths = DURATION_THINGS.map((t) => t.minutes)
    expect([...lengths].sort((a, b) => a - b)).toEqual(lengths)
  })

  it('takes a non-breaking space inside the time for the screen', () => {
    expect(timeText(5180, ' ')).toBe('86 h 20 min')
  })
})

describe('spoken time', () => {
  it('units in full, singular for 1', () => {
    expect(timeSpoken(5180)).toBe('86 hours 20 minutes')
    expect(timeSpoken(90)).toBe('1 hour 30 minutes')
    expect(timeSpoken(2400)).toBe('40 hours')
    expect(timeSpoken(45)).toBe('45 minutes')
    expect(timeSpoken(1)).toBe('1 minute')
    expect(timeSpoken(61)).toBe('1 hour 1 minute')
    expect(daysSpoken(3.5)).toBe('3 and a half days')
    expect(daysSpoken(2)).toBe('2 days')
  })
})

describe('pileHeights: a very large pile (tester, T-0021, updated for T-0023)', () => {
  it('adds up and is written in whole metres', () => {
    const shelf = Array.from({ length: 30_000 }, (_, i) => book(String(i), { pages: 300 }))
    const pile = pileHeights(shelf)
    expect(pile.counts.all).toBe(30_000)
    expect(pile.all).toBeCloseTo(660, 6)
    expect(heightText(pile.all)).toBe('660 m')
    expect(heightSpoken(pile.all)).toBe('660 metres')
    expect(comparisonText(compareHeight(pile.all))).toBe('taller than the Eiffel Tower (330 m)')
  })
})

describe('heightText', () => {
  it.each([
    [0.004, '1 cm'],
    [0.483, '48 cm'],
    [0.996, '1 m'],
    [1.624, '1.62 m'],
    [1.6, '1.6 m'],
    [2, '2 m'],
    [12.44, '12.4 m'],
    [123.4, '123 m'],
  ])('%s → %s', (m, text) => {
    expect(heightText(m)).toBe(text)
  })

  it('takes a non-breaking space for the screen', () => {
    expect(heightText(1.624, ' ')).toBe('1.62 m')
  })

  it('speaks the units in full, singular for 1', () => {
    expect(heightSpoken(1.624)).toBe('1.62 metres')
    expect(heightSpoken(0.483)).toBe('48 centimetres')
    expect(heightSpoken(0.996)).toBe('1 metre')
    expect(heightSpoken(0.004)).toBe('1 centimetre')
  })
})

describe('compareHeight', () => {
  it.each([
    [1.62, 'about as tall as an adult (1.75 m)'],
    [2, 'about as tall as a door (2 m)'],
    [0.97, 'about as tall as a kitchen counter (90 cm)'],
    [3.05, 'taller than a door (2 m)'],
    [400, 'taller than the Eiffel Tower (330 m)'],
    [0.05, 'not as tall as a mug (10 cm) yet'],
  ])('%s → %s', (m, text) => {
    expect(comparisonText(compareHeight(m))).toBe(text)
  })

  it('writes every list height with the same rounding as the pile, in order of height', () => {
    expect(HEIGHT_THINGS.map((t) => `${t.name} (${heightText(t.metres)})`)).toEqual([
      'a mug (10 cm)',
      'a cat (25 cm)',
      'a kitchen counter (90 cm)',
      'a door handle (1.05 m)',
      'an adult (1.75 m)',
      'a door (2 m)',
      'a double-decker bus (4.4 m)',
      'a giraffe (5 m)',
      'a house (8 m)',
      'an oak tree (20 m)',
      'the Leaning Tower of Pisa (56 m)',
      'Big Ben (96 m)',
      'the Eiffel Tower (330 m)',
    ])
    const heights = HEIGHT_THINGS.map((t) => t.metres)
    expect([...heights].sort((a, b) => a - b)).toEqual(heights)
  })

  it('builds the whole line', () => {
    expect(pileHeightLine(1.624)).toBe('Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m).')
    expect(pileHeightLine(12.44)).toBe('Stacked up, your pile would be 12.4 m: taller than a house (8 m).')
    expect(pileHeightLine(0.04)).toBe('Stacked up, your pile would be 4 cm: not as tall as a mug (10 cm) yet.')
  })
})

describe('heightText: rounding boundaries (tester, T-0021)', () => {
  it.each([
    [0, '1 cm'],
    [0.0149, '1 cm'],
    [0.9949, '99 cm'],
    [0.995, '1 m'],
    [1.0051, '1.01 m'],
    [9.994, '9.99 m'],
    [9.996, '10 m'],
    [10, '10 m'],
    [99.94, '99.9 m'],
    [99.96, '100 m'],
    [100, '100 m'],
    [999.5, '1,000 m'],
  ])('%s → %s', (m, text) => {
    expect(heightText(m)).toBe(text)
  })

  it('speaks a value that rounds to 1 in the singular, and anything else in the plural', () => {
    expect(heightSpoken(0.995)).toBe('1 metre')
    expect(heightSpoken(1.004)).toBe('1 metre')
    expect(heightSpoken(1.01)).toBe('1.01 metres')
    expect(heightSpoken(0.02)).toBe('2 centimetres')
    expect(heightSpoken(10)).toBe('10 metres')
  })
})

describe('compareHeight: boundaries and ties (tester, T-0021)', () => {
  it('a pile exactly as tall as a thing is about as tall as it', () => {
    for (const thing of HEIGHT_THINGS) {
      expect(compareHeight(thing.metres)).toEqual({ kind: 'about', thing })
    }
  })

  it('just inside and just outside 10% of a mug', () => {
    expect(comparisonText(compareHeight(0.0905))).toBe('about as tall as a mug (10 cm)')
    expect(comparisonText(compareHeight(0.0895))).toBe('not as tall as a mug (10 cm) yet')
    expect(comparisonText(compareHeight(0.1095))).toBe('about as tall as a mug (10 cm)')
    expect(comparisonText(compareHeight(0.1105))).toBe('taller than a mug (10 cm)')
  })

  it('between two things that are both within 10%, the closer by ratio wins either side of the midpoint', () => {
    // kitchen counter 0.9 and door handle 1.05 meet at √(0.9 × 1.05) ≈ 0.972
    expect(comparisonText(compareHeight(0.97))).toBe('about as tall as a kitchen counter (90 cm)')
    expect(comparisonText(compareHeight(0.975))).toBe('about as tall as a door handle (1.05 m)')
    // a giraffe 5 m and a bus 4.4 m meet at ≈ 4.69
    expect(comparisonText(compareHeight(4.68))).toBe('about as tall as a double-decker bus (4.4 m)')
    expect(comparisonText(compareHeight(4.7))).toBe('about as tall as a giraffe (5 m)')
  })

  it('in a gap between things it is taller than the tallest one it beats', () => {
    expect(comparisonText(compareHeight(0.3))).toBe('taller than a cat (25 cm)')
    expect(comparisonText(compareHeight(12))).toBe('taller than a house (8 m)')
    expect(comparisonText(compareHeight(150))).toBe('taller than Big Ben (96 m)')
    expect(comparisonText(compareHeight(364))).toBe('taller than the Eiffel Tower (330 m)')
    expect(comparisonText(compareHeight(1e6))).toBe('taller than the Eiffel Tower (330 m)')
  })
})
