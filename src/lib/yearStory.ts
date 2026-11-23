import type { Book } from './library'
import { localDay, timesRead } from './library'
import { MAP_COUNTRY_SET } from './mapCountries'
import { byBooks, worldMap } from './places'
import { breakdown, records } from './insights'
import { monthlyCounts } from './insights'
import { periodStats } from './stats'
import { cleanRating } from './ratings'

/**
 * The year wrap-up story (T-0071, D-0061): her year as a handful of slides she
 * taps through, for this year so far or any past year. One slide is one fact;
 * a fact the year has nothing for is left out, so a quiet year is short rather
 * than full of zeros. The last slide sums it up and is the one she shares.
 *
 * Nothing here draws or saves anything: it turns the shelf into slides.
 */

export type SlideKind = 'open' | 'number' | 'book' | 'name' | 'map' | 'summary'

export interface StorySlide {
  /** stable, so a test and a screenshot can name a slide */
  id: string
  kind: SlideKind
  /** the slide's heading, and the story's name while it is showing */
  title: string
  /** the big thing in the middle: a number, a name, a month */
  value?: string
  /** the quiet line under it */
  label?: string
  /** the book a book slide is about */
  book?: Book
  /** her stars for that book, when she gave it any */
  stars?: number
  /** the places on the map slide, most books first */
  places?: string[]
}

export interface YearStory {
  year: number
  /** this year, so the story is still being written */
  current: boolean
  /** nothing finished that year */
  empty: boolean
  slides: StorySlide[]
  /** the summary's lines, and what the share picture says */
  facts: Array<[string, string]>
  /** the closing line on the last slide */
  closing: string
  /** the year's books, latest finish first: the share picture's covers */
  books: Book[]
}

const monthName = (month: number) => new Date(2000, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
const plural = (n: number, one: string, many = `${one}s`) => `${n === 1 ? one : many}`
const number = (n: number) => n.toLocaleString('en-GB')

/** The authors of a book, trimmed and without repeats. */
const authorsOf = (b: Book) => [...new Set(b.authors.map((a) => a.trim()).filter(Boolean))]

/** Her most-read author among a year's finished books, ties by name. */
function topAuthor(list: Book[]): { name: string; books: number } | undefined {
  const byName = new Map<string, { name: string; books: number }>()
  for (const b of list)
    for (const raw of authorsOf(b)) {
      const key = raw.toLowerCase()
      const a = byName.get(key) ?? { name: raw, books: 0 }
      a.books++
      byName.set(key, a)
    }
  const best = [...byName.values()].sort((a, b) => b.books - a.books || a.name.localeCompare(b.name))[0]
  return best && best.books > 0 ? best : undefined
}

/** Authors she finished that year and never before it. */
function newAuthors(books: Book[], year: number, list: Book[]): number {
  const before = new Set<string>()
  for (const b of books) {
    if (timesRead(b) === 0) continue
    const days = [...(b.finished ?? [])].sort()
    // a book finished before this year, or finished with no date at all (so: earlier)
    if (days.length === 0 || days[0] < `${year}-01-01`)
      for (const a of authorsOf(b)) before.add(a.toLowerCase())
  }
  const fresh = new Set<string>()
  for (const b of list) for (const a of authorsOf(b)) if (!before.has(a.toLowerCase())) fresh.add(a.toLowerCase())
  return fresh.size
}

export function yearStory(books: Book[], year: number, today = localDay()): YearStory {
  const period = { kind: 'year', year } as const
  const stats = periodStats(books, period)
  const list = stats.list
  const current = year === Number(today.slice(0, 4))
  const closing = current ? '…and the story continues.' : '…and she read happily ever after.'
  const slides: StorySlide[] = [
    { id: 'open', kind: 'open', title: `${year}`, value: `${year}`, label: 'Once upon a time…' },
  ]
  const facts: Array<[string, string]> = []

  if (list.length === 0)
    return {
      year,
      current,
      empty: true,
      slides: [
        ...slides,
        {
          id: 'summary',
          kind: 'summary',
          title: `${year} in books`,
          label: "No books finished yet. The year's story starts with the first one.",
        },
      ],
      facts,
      closing,
      books: [],
    }

  // how many books
  slides.push({
    id: 'books',
    kind: 'number',
    title: 'Books',
    value: number(stats.books),
    label: `${plural(stats.books, 'book')} finished`,
  })
  facts.push(['Books', `${number(stats.books)} ${plural(stats.books, 'book')}`])

  // book of the year: her highest-rated finish
  const rated = list.filter((b) => cleanRating(b.rating) !== undefined)
  const top = [...rated].sort((a, b) => (cleanRating(b.rating) ?? 0) - (cleanRating(a.rating) ?? 0))[0]
  if (top) {
    slides.push({ id: 'topbook', kind: 'book', title: 'Book of the year', book: top, stars: cleanRating(top.rating) })
    facts.push(['Book of the year', top.title])
  }

  // top author
  const author = topAuthor(list)
  if (author && author.books > 0) {
    slides.push({
      id: 'author',
      kind: 'name',
      title: 'Top author',
      value: author.name,
      label: `${number(author.books)} ${plural(author.books, 'book')}`,
    })
    facts.push(['Top author', author.name])
  }

  // top genre
  const genre = breakdown(books, period, 'genre', 99).find((s) => s.label !== 'No genre')
  if (genre) {
    slides.push({
      id: 'genre',
      kind: 'name',
      title: 'Top genre',
      value: genre.label,
      label: `${number(genre.count)} ${plural(genre.count, 'book')}`,
    })
    facts.push(['Top genre', genre.label])
  }

  // the longest book she read that year
  const rec = records(books, period)
  const longest = rec.longest
  if (longest?.pages) {
    slides.push({
      id: 'longest',
      kind: 'book',
      title: 'Longest read',
      book: longest,
      label: `${number(longest.pages)} pages`,
    })
    facts.push(['Longest read', `${longest.title} (${number(longest.pages)} pages)`])
  }

  // busiest month
  const counts = monthlyCounts(books, year)
  const most = Math.max(...counts)
  if (most > 0) {
    const month = counts.indexOf(most) + 1
    slides.push({
      id: 'busiest',
      kind: 'name',
      title: 'Busiest month',
      value: monthName(month),
      label: `${number(most)} ${plural(most, 'book')}`,
    })
    facts.push(['Busiest month', `${monthName(month)} (${number(most)} ${plural(most, 'book')})`])
  }

  // pages and hours
  if (stats.pages > 0) {
    slides.push({ id: 'pages', kind: 'number', title: 'Pages', value: number(stats.pages), label: 'pages turned' })
    facts.push(['Pages', number(stats.pages)])
  }
  const hours = Math.round(stats.minutes / 60)
  if (hours > 0) {
    slides.push({ id: 'hours', kind: 'number', title: 'Hours listened', value: number(hours), label: 'hours listened' })
    facts.push(['Hours listened', number(hours)])
  }

  // authors new to her
  const fresh = newAuthors(books, year, list)
  if (fresh > 0) {
    slides.push({
      id: 'newauthors',
      kind: 'number',
      title: 'New authors',
      value: number(fresh),
      label: `${plural(fresh, 'author')} new to you`,
    })
    facts.push(['New authors', number(fresh)])
  }

  // her map: the countries and made-up lands the year's books are set in
  const map = worldMap(list, MAP_COUNTRY_SET)
  const places = [...byBooks(map.countries), ...byBooks(map.imaginary)].map(([place]) => place)
  if (map.countries.size > 0) {
    slides.push({
      id: 'map',
      kind: 'map',
      title: 'Your map',
      value: number(map.countries.size),
      label: `${plural(map.countries.size, 'country', 'countries')} visited`,
      places: places.slice(0, 8),
    })
    facts.push(['Countries', number(map.countries.size)])
  }

  slides.push({ id: 'summary', kind: 'summary', title: `${year} in books`, label: closing })
  return { year, current, empty: false, slides, facts, closing, books: list }
}

/** The one-line subtitle under the share picture's title. */
export function storySubtitle(story: YearStory): string {
  return story.facts.map(([k, v]) => `${k}: ${v}`).join(' · ')
}
