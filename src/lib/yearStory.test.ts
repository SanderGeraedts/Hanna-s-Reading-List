import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { storySubtitle, yearStory } from './yearStory'

const book = (b: Partial<Book> & { id: string }): Book =>
  ({
    title: b.id,
    authors: [],
    status: 'read',
    color: '#000',
    addedAt: 0,
    readCount: 1,
    ...b,
  }) as Book

const shelf: Book[] = [
  book({
    id: 'a',
    title: 'The Night Circus',
    authors: ['Erin Morgenstern'],
    pages: 500,
    rating: 5,
    genres: ['Fantasy'],
    places: ['London (England)'],
    finished: ['2026-07-04'],
    readingLog: { '2026-07-04': 1 },
  }),
  book({
    id: 'b',
    title: 'Circe',
    authors: ['Madeline Miller'],
    pages: 704,
    rating: 4,
    genres: ['Fantasy'],
    places: ['Greece'],
    finished: ['2026-07-20'],
  }),
  book({
    id: 'c',
    title: 'Piranesi',
    authors: ['Susanna Clarke'],
    pages: 272,
    rating: 3,
    genres: ['Mystery'],
    finished: ['2026-02-02'],
  }),
  book({
    id: 'd',
    title: 'The Fifth Season',
    authors: ['Erin Morgenstern'],
    pages: 400,
    genres: ['Fantasy'],
    finished: ['2026-07-28'],
  }),
  book({
    id: 'e',
    title: 'Legends & Lattes',
    authors: ['Travis Baldree'],
    minutes: 480,
    formats: ['storytel'],
    finished: ['2026-03-03'],
  }),
  // read in 2025: so Susanna Clarke is not new in 2026
  book({ id: 'old', title: 'Jonathan Strange', authors: ['Susanna Clarke'], pages: 1006, finished: ['2025-01-01'] }),
]

const ids = (year: number, today = '2026-11-23') => yearStory(shelf, year, today).slides.map((s) => s.id)

describe('yearStory', () => {
  it('tells a full year in order, one fact per slide', () => {
    expect(ids(2026)).toEqual([
      'open',
      'books',
      'topbook',
      'author',
      'genre',
      'longest',
      'busiest',
      'pages',
      'hours',
      'newauthors',
      'map',
      'summary',
    ])
  })

  it('puts the right thing on each slide', () => {
    const s = yearStory(shelf, 2026, '2026-11-23')
    const by = Object.fromEntries(s.slides.map((x) => [x.id, x]))
    expect(by.books).toMatchObject({ value: '5', label: 'books finished' })
    expect(by.topbook.book?.title).toBe('The Night Circus')
    expect(by.topbook.stars).toBe(5)
    expect(by.author).toMatchObject({ value: 'Erin Morgenstern', label: '2 books' })
    expect(by.genre).toMatchObject({ value: 'Fantasy', label: '3 books' })
    expect(by.longest.book?.title).toBe('Circe')
    expect(by.longest.label).toBe('704 pages')
    expect(by.busiest).toMatchObject({ value: 'July', label: '3 books' })
    expect(by.pages.value).toBe('1,876')
    expect(by.hours).toMatchObject({ value: '8', label: 'hours listened' })
    // Susanna Clarke was read in 2025 already; the other three are new
    expect(by.newauthors).toMatchObject({ value: '3', label: 'authors new to you' })
    expect(by.map).toMatchObject({ value: '2', label: 'countries visited' })
    expect(by.map.places).toEqual(['Greece', 'United Kingdom'])
  })

  it('leaves out a slide the year has nothing for', () => {
    // only an audiobook: no pages, no genre, no rating, no places
    const quiet = [book({ id: 'q', title: 'A Listen', authors: ['Someone'], minutes: 300, formats: ['audiobook'], finished: ['2024-04-04'] })]
    expect(yearStory(quiet, 2024, '2026-11-23').slides.map((s) => s.id)).toEqual([
      'open',
      'books',
      'author',
      'busiest',
      'hours',
      'newauthors',
      'summary',
    ])
  })

  it('a year with no books says so and still ends in the summary', () => {
    const s = yearStory(shelf, 2019, '2026-11-23')
    expect(s.empty).toBe(true)
    expect(s.books).toEqual([])
    expect(s.slides.map((x) => x.id)).toEqual(['open', 'summary'])
    expect(s.slides[1].label).toBe("No books finished yet. The year's story starts with the first one.")
  })

  it('ends on its own line for this year and for a past one', () => {
    expect(yearStory(shelf, 2026, '2026-11-23').closing).toBe('…and the story continues.')
    expect(yearStory(shelf, 2026, '2026-11-23').current).toBe(true)
    expect(yearStory(shelf, 2025, '2026-11-23').closing).toBe('…and she read happily ever after.')
    expect(yearStory(shelf, 2025, '2026-11-23').current).toBe(false)
    // the last slide carries it
    expect(yearStory(shelf, 2025, '2026-11-23').slides.at(-1)?.label).toBe('…and she read happily ever after.')
  })

  it('hands the share picture its covers and a one-line subtitle', () => {
    const s = yearStory(shelf, 2026, '2026-11-23')
    expect(s.books.map((b) => b.title)).toEqual([
      'The Fifth Season',
      'Circe',
      'The Night Circus',
      'Legends & Lattes',
      'Piranesi',
    ])
    expect(storySubtitle(s)).toContain('Books: 5 books')
    expect(storySubtitle(s)).toContain('Top author: Erin Morgenstern')
  })

  it('copes with a shelf of nothing at all', () => {
    const s = yearStory([], 2026, '2026-11-23')
    expect(s.empty).toBe(true)
    expect(s.slides).toHaveLength(2)
    expect(storySubtitle(s)).toBe('')
  })
})
