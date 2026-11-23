import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { shelfBooks } from './wishlist'
import { breakdown, records, wantPile } from './insights'
import { pileJars } from './pile'
import { pileHeights } from './pileHeight'
import { periodStats } from './stats'
import { pickReadNext, readNextChoices } from './readNext'
import { worldMap } from './places'
import { MAP_COUNTRY_SET } from './mapCountries'
import { challengeNow } from './monthChallenge'
import { bingoYear } from './bingo'
import { alphabetYear } from './alphabet'
import { challengeBooks } from './ownChallenges'
import { badges } from './badges'
import { readingDays } from './creatures/cookies'
import { deriveCreatures } from './creatures/creature'
import { seriesGuesses } from './seriesGuess'

/**
 * **The point of T-0072.** A wish must be counted nowhere. The page splits the
 * library once (D-0053), so the way to prove it is to show that every counter,
 * given `shelfBooks(library)`, gives exactly what it gives for the shelf books
 * on their own — however many wishes sit in the library beside them.
 *
 * Each counter gets its own `it`, so a failure names the counter that started
 * counting wishes.
 */

const TODAY = '2026-11-23'
const YEAR = 2026
const PERIOD = { kind: 'year', year: YEAR } as const
const NOW = new Date('2026-11-23T12:00:00Z')
const day = (d: string) => Date.parse(`${d}T09:00:00Z`)

const shelf: Book[] = [
  {
    id: 's1',
    title: 'The Night Circus',
    authors: ['Erin Morgenstern'],
    color: '#2b2b44',
    status: 'read',
    addedAt: day('2026-01-04'),
    pages: 400,
    genres: ['Fantasy'],
    places: ['London (England)'],
    rating: 4.5,
    readCount: 1,
    finished: ['2026-02-10'],
    readingLog: { '2026-02-10': 1 },
    formats: ['paperback'],
    price: 14.99,
    language: 'en',
    year: 2011,
  },
  {
    id: 's2',
    title: 'Circe',
    authors: ['Madeline Miller'],
    color: '#8a5a2b',
    status: 'read',
    addedAt: day('2026-02-01'),
    pages: 352,
    genres: ['Mythology'],
    places: ['Greece'],
    rating: 5,
    readCount: 1,
    finished: ['2026-03-15'],
    readingLog: { '2026-03-15': 1 },
    formats: ['hardcover'],
    price: 22.5,
    language: 'en',
    year: 2018,
  },
  { id: 's3', title: 'Babel', authors: ['R. F. Kuang'], color: '#1f5f6b', status: 'reading', addedAt: day('2026-09-01'), pages: 560, progress: 0.4, genres: ['Fantasy'], formats: ['paperback'], language: 'en' },
  { id: 's4', title: 'Piranesi', authors: ['Susanna Clarke'], color: '#3d3d3d', status: 'want', addedAt: day('2026-03-01'), pages: 272, formats: ['paperback'], price: 11.5, language: 'en' },
  { id: 's5', title: 'Tress of the Emerald Sea', authors: ['Brandon Sanderson'], color: '#2f5d46', status: 'want', addedAt: day('2026-04-01'), pages: 448, formats: ['hardcover'], language: 'en' },
  { id: 's6', title: 'A Study in Drowning', authors: ['Ava Reid'], color: '#6b4c8a', status: 'want', addedAt: day('2026-05-01'), pages: 384, formats: ['ebook'], price: 9.99, language: 'en' },
  { id: 's7', title: 'The Priory of the Orange Tree', authors: ['Samantha Shannon'], color: '#7a2e2e', status: 'paused', addedAt: day('2026-06-01'), pages: 827, progress: 0.2, language: 'en' },
  { id: 's8', title: 'Mexican Gothic', authors: ['Silvia Moreno-Garcia'], color: '#2e4a7a', status: 'read', addedAt: day('2026-06-20'), pages: 301, rating: 3.5, readCount: 1, finished: ['2026-07-02'], readingLog: { '2026-07-02': 1 }, places: ['Mexico'], language: 'en' },
  { id: 's9', title: 'The Atlas Six', authors: ['Olivie Blake'], color: '#a0522d', status: 'dnf', addedAt: day('2026-07-01'), pages: 383, language: 'en' },
  { id: 's10', title: 'Legends & Lattes', authors: ['Travis Baldree'], color: '#8a5a2b', status: 'read', addedAt: day('2026-08-01'), pages: 304, rating: 5, readCount: 1, finished: ['2026-08-20'], readingLog: { '2026-08-20': 1 }, genres: ['Fantasy'], language: 'en' },
]

/** three wishes, each one deliberately the kind of book that would change a count */
const wishes: Book[] = [
  // a finished-looking, rated, placed, priced wish: it would land in nearly every count
  {
    id: 'w1',
    title: 'The Hurricane Wars',
    authors: ['Thea Guanzon'],
    color: '#7a2e2e',
    status: 'read',
    wish: true,
    // bought-looking and added since the buying jar started counting (D-0024): it would spend
    addedAt: day('2026-11-05'),
    pages: 464,
    rating: 5,
    readCount: 1,
    finished: ['2026-10-05'],
    readingLog: { '2026-10-05': 1 },
    genres: ['Romantasy'],
    places: ['Japan'],
    formats: ['hardcover'],
    price: 24.99,
    language: 'en',
    year: 2023,
  },
  { id: 'w2', title: 'Yellowface', authors: ['R. F. Kuang'], color: '#d1a000', status: 'want', wish: true, addedAt: day('2026-10-10'), pages: 336, formats: ['paperback'], price: 16.5, language: 'en' },
  { id: 'w3', title: 'The Wishlist Book', authors: ['Nobody'], color: '#444444', status: 'want', wish: true, addedAt: day('2026-11-20') },
]

const library = [...shelf.slice(0, 5), wishes[0], ...shelf.slice(5), wishes[1], wishes[2]]
const filtered = shelfBooks(library)

describe('a wish is counted nowhere (T-0072, D-0053)', () => {
  it('the filter really does give back the shelf, in order', () => {
    expect(filtered.map((b) => b.id)).toEqual(shelf.map((b) => b.id))
  })

  it('the want-to-read pile', () => {
    expect(wantPile(filtered, NOW)).toEqual(wantPile(shelf, NOW))
  })

  it('the buying jar', () => {
    expect(pileJars(filtered, TODAY)).toEqual(pileJars(shelf, TODAY))
    // and the wishes really would have changed it
    expect(pileJars(library, TODAY)).not.toEqual(pileJars(shelf, TODAY))
  })

  it('the pile height', () => {
    expect(pileHeights(filtered)).toEqual(pileHeights(shelf))
  })

  it('the statistics', () => {
    expect(periodStats(filtered, PERIOD)).toEqual(periodStats(shelf, PERIOD))
    expect(periodStats(library, PERIOD)).not.toEqual(periodStats(shelf, PERIOD))
  })

  it('what I read (the breakdown)', () => {
    for (const by of ['genre', 'format', 'language'] as const) {
      expect(breakdown(filtered, PERIOD, by)).toEqual(breakdown(shelf, PERIOD, by))
    }
  })

  it('the records', () => {
    expect(records(filtered, PERIOD)).toEqual(records(shelf, PERIOD))
  })

  it('the suggestions', () => {
    expect(readNextChoices(filtered, TODAY).map((b) => b.id)).toEqual(readNextChoices(shelf, TODAY).map((b) => b.id))
    const pickFrom = (books: Book[]) => pickReadNext(readNextChoices(books, TODAY), null, () => 0)?.id
    expect(pickFrom(filtered)).toBe(pickFrom(shelf))
    expect(readNextChoices(library, TODAY).map((b) => b.id)).not.toEqual(readNextChoices(shelf, TODAY).map((b) => b.id))
  })

  it('the world map', () => {
    expect(worldMap(filtered, MAP_COUNTRY_SET)).toEqual(worldMap(shelf, MAP_COUNTRY_SET))
    expect(worldMap(library, MAP_COUNTRY_SET)).not.toEqual(worldMap(shelf, MAP_COUNTRY_SET))
  })

  it('the monthly challenge', () => {
    expect(challengeNow(filtered, TODAY)).toEqual(challengeNow(shelf, TODAY))
  })

  it('book bingo', () => {
    expect(bingoYear(filtered, YEAR, TODAY)).toEqual(bingoYear(shelf, YEAR, TODAY))
  })

  it('the A–Z challenge', () => {
    for (const kind of ['title', 'author'] as const) {
      expect(alphabetYear(filtered, YEAR, TODAY, kind)).toEqual(alphabetYear(shelf, YEAR, TODAY, kind))
    }
  })

  it('her own challenges', () => {
    const challenge = { id: 'c1', year: YEAR, name: 'Read 12', target: 12, rule: 'any' as const }
    expect(challengeBooks(challenge, filtered).map((b) => b.id)).toEqual(
      challengeBooks(challenge, shelf).map((b) => b.id),
    )
    expect(challengeBooks(challenge, library).map((b) => b.id)).not.toEqual(
      challengeBooks(challenge, shelf).map((b) => b.id),
    )
  })

  it('the badges', () => {
    expect(badges(filtered, TODAY)).toEqual(badges(shelf, TODAY))
    expect(badges(library, TODAY)).not.toEqual(badges(shelf, TODAY))
  })

  it('the creatures (and the Reading Garden, which is given the same books)', () => {
    expect([...readingDays(filtered).keys()]).toEqual([...readingDays(shelf).keys()])
    expect(deriveCreatures(filtered, [], NOW)).toEqual(deriveCreatures(shelf, [], NOW))
  })

  it('the series guess at add time', () => {
    const guess = (books: Book[]) => seriesGuesses({ title: 'Yellowface and the Sea', authors: ['R. F. Kuang'] }, books)
    expect(guess(filtered)).toEqual(guess(shelf))
  })
})
