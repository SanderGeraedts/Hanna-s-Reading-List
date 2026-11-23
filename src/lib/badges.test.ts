import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { badges, newBadges } = await import('./badges')
const { rhythm } = await import('./rhythm')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  ...extra,
})
const read = (id: string, day: string, extra: Partial<Book> = {}) => book(id, { finished: [day], readCount: 1, ...extra })
const find = (all: ReturnType<typeof badges>, id: string) => all.find((b) => b.id === id)!

describe('milestones & badges', () => {
  it('earns book badges on the day the count is reached', () => {
    const shelf = Array.from({ length: 10 }, (_, i) => read(`b${i}`, `2026-0${1 + (i % 9)}-1${i % 9}`))
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'books-1')).toMatchObject({ earned: true, on: '2026-01-10' })
    expect(find(all, 'books-10').earned).toBe(true)
    expect(find(all, 'books-50').earned).toBe(false)
  })

  it('counts a finished series, a streak and an old favourite', () => {
    const shelf = [
      read('s1', '2026-03-01', { series: 'Saga', seriesIndex: 1 }),
      read('s2', '2026-04-02', { series: 'Saga', seriesIndex: 2 }),
      book('fav', { readCount: 5, finished: ['2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01', '2025-06-01'] }),
      book('log', {
        status: 'reading',
        pages: 300,
        readingLog: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`2026-11-0${i + 1}`, 0.05])),
      }),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'series-1')).toMatchObject({ earned: true, on: '2026-04-02' })
    expect(find(all, 'streak-7')).toMatchObject({ earned: true, on: '2026-11-07' })
    expect(find(all, 'streak-30').earned).toBe(false)
    expect(find(all, 'reread-5')).toMatchObject({ earned: true, on: '2025-06-01' })
  })

  it('shows badges earned in the last week as new', () => {
    const all = badges([read('a', '2026-11-18')], '2026-11-20')
    expect(newBadges(all, '2026-11-20').map((b) => b.id)).toEqual(['books-1'])
    expect(newBadges(all, '2026-12-01')).toEqual([])
  })
})

describe('more badges, progress and secrets', () => {
  it('shows progress on locked visible badges, never on secret ones', () => {
    const all = badges([read('a', '2026-01-02'), read('b', '2026-01-03')], '2026-11-20')
    expect(find(all, 'books-10').progress).toEqual({ done: 2, goal: 10 })
    expect(find(all, 'books-1').progress).toBeUndefined()
    expect(find(all, 'author-5')).toMatchObject({ earned: false, secret: true })
    expect(find(all, 'author-5').progress).toBeUndefined()
  })

  it('unlocks secret badges: loyal fan, binge, doorstopper, same day', () => {
    const shelf = [
      ...['2026-02-01', '2026-02-03', '2026-02-05', '2026-03-01', '2026-04-01'].map((d, i) => read(`f${i}`, d, { authors: ['Fan Author'] })),
      read('big', '2026-05-01', { pages: 900 }),
      read('fast', '2026-06-10', { started: ['2026-06-10'] }),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'author-5')).toMatchObject({ earned: true, on: '2026-04-01' })
    expect(find(all, 'binge')).toMatchObject({ earned: true, on: '2026-02-05' })
    expect(find(all, 'doorstopper')).toMatchObject({ earned: true, on: '2026-05-01' })
    expect(find(all, 'same-day')).toMatchObject({ earned: true, on: '2026-06-10' })
    expect(find(all, 'new-year').earned).toBe(false)
  })

  it('finds a rainbow of spines', () => {
    const colours = ['#e5484d', '#f2843a', '#f5c842', '#4fb365', '#3d8fe0', '#5b5bd6', '#a35bd0']
    const all = badges(colours.map((c, i) => read(`r${i}`, `2026-0${i + 1}-01`, { color: c })), '2026-11-20')
    expect(find(all, 'rainbow')).toMatchObject({ earned: true, on: '2026-07-01' })
  })
})

describe('riddles for the hidden badges', () => {
  it('every secret badge has a riddle, and the riddle never gives its name away', () => {
    const all = badges([read('a', '2026-01-02')], '2026-11-20')
    const secrets = all.filter((b) => b.secret)
    expect(secrets.length).toBe(12)
    for (const b of secrets) {
      expect(b.riddle, b.id).toBeTruthy()
      expect(b.riddle!.toLowerCase()).not.toContain(b.name.toLowerCase())
    }
    expect(all.filter((b) => !b.secret).every((b) => b.riddle === undefined)).toBe(true)
  })
})

describe('every badge', () => {
  it('has a unique name and a unique id', () => {
    const all = badges([read('a', '2026-01-02')], '2026-11-20')
    expect(new Set(all.map((b) => b.name)).size).toBe(all.length)
    expect(new Set(all.map((b) => b.id)).size).toBe(all.length)
  })
})

describe('travel badges (T-0040, D-0037)', () => {
  const at = (id: string, day: string, places: string[], extra: Partial<Book> = {}) => read(id, day, { places, ...extra })
  const countries = ['France', 'Japan', 'Kenya', 'Brazil', 'Canada', 'Peru']

  it('are all there, with their icons and names, in the table order', () => {
    const all = badges([], '2026-11-20')
    const table: Array<[string, string, string]> = [
      ['countries-5', '🛂', 'Passport stamped'],
      ['countries-10', '✈️', 'Frequent flyer'],
      ['countries-25', '🧳', 'World traveller'],
      ['countries-50', '🌐', 'Around the world'],
      ['continent-europe', '🗼', 'Postcard from Europe'],
      ['continent-asia', '🏯', 'Postcard from Asia'],
      ['continent-africa', '🦒', 'Postcard from Africa'],
      ['continent-north-america', '🗽', 'Postcard from North America'],
      ['continent-south-america', '🦜', 'Postcard from South America'],
      ['continent-oceania', '🦘', 'Postcard from Oceania'],
      ['continents-6', '🌏', 'World tour'],
      ['lands-3', '🦄', 'Dreamwalker'],
      ['lands-10', '🐉', 'Realm hopper'],
      ['home-sweet-home', '🌷', 'Home sweet home'],
    ]
    for (const [id, icon, name] of table) expect(find(all, id), id).toMatchObject({ id, icon, name, earned: false })
    const ids = all.map((b) => b.id)
    // after the variety badges, before the ratings; Home sweet home with the secrets, at the end
    expect(ids.indexOf('countries-5')).toBe(ids.indexOf('languages-3') + 1)
    expect(ids.indexOf('rated-10')).toBe(ids.indexOf('lands-10') + 1)
    expect(ids.at(-1)).toBe('home-sweet-home')
  })

  it('earns Passport stamped on the first finish of the book that brought the fifth country', () => {
    const shelf = countries.slice(0, 5).map((c, i) => at(`c${i}`, `2026-0${i + 1}-10`, [c]))
    expect(find(badges(shelf, '2026-11-20'), 'countries-5')).toMatchObject({ earned: true, on: '2026-05-10' })
    const four = badges(shelf.slice(0, 4), '2026-11-20')
    expect(find(four, 'countries-5')).toMatchObject({ earned: false, progress: { done: 4, goal: 5 } })
  })

  it('counts both countries of a book, a re-read book once, and only finished books with known places', () => {
    const shelf = [
      at('two', '2026-01-10', ['Paris (France)', 'Tokyo (Japan)']),
      book('twice', { places: ['Kenya'], readCount: 2, finished: ['2026-02-10', '2026-08-01'] }),
      book('want', { status: 'want', places: ['Brazil', 'Canada'] }),
      read('unknown', '2026-03-10'),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'countries-5').progress).toEqual({ done: 3, goal: 5 })
    const five = badges([...shelf, at('more', '2026-04-10', ['Peru', 'Canada'])], '2026-11-20')
    expect(find(five, 'countries-5')).toMatchObject({ earned: true, on: '2026-04-10' })
    // the re-read in August didn't move Kenya's day
    expect(find(five, 'continent-africa')).toMatchObject({ earned: true, on: '2026-02-10' })
  })

  it('gives a book set in Russia a postcard from Europe and from Asia', () => {
    const all = badges([at('r', '2026-03-03', ['Moscow (Russia)', 'Russia'])], '2026-11-20')
    expect(find(all, 'continent-europe')).toMatchObject({ earned: true, on: '2026-03-03' })
    expect(find(all, 'continent-asia')).toMatchObject({ earned: true, on: '2026-03-03' })
    expect(find(all, 'continent-africa').earned).toBe(false)
  })

  it('earns World tour on the day of the sixth continent, with 5 of 6 before', () => {
    const six = ['France', 'Japan', 'Kenya', 'Canada', 'Brazil', 'Fiji'].map((c, i) => at(`w${i}`, `2026-0${i + 1}-01`, [c]))
    expect(find(badges(six, '2026-11-20'), 'continents-6')).toMatchObject({ earned: true, on: '2026-06-01' })
    expect(find(badges(six.slice(0, 5), '2026-11-20'), 'continents-6')).toMatchObject({ earned: false, progress: { done: 5, goal: 6 } })
  })

  it('counts an imaginary land once in any spelling, and earns Dreamwalker on the third land', () => {
    const shelf = [
      at('n1', '2026-01-01', ['Narnia (Imaginary place)']),
      at('n2', '2026-02-01', ['narnia (Imaginary place)']),
      at('h', '2026-03-01', ['Hogwarts School of Witchcraft and Wizardry (Imaginary place)']),
    ]
    expect(find(badges(shelf, '2026-11-20'), 'lands-3')).toMatchObject({ earned: false, progress: { done: 2, goal: 3 } })
    const three = [...shelf, at('m', '2026-04-01', ['Middle Earth (Imaginary place)']), at('hw', '2026-05-01', ['Hogwarts'])]
    expect(find(badges(three, '2026-11-20'), 'lands-3')).toMatchObject({ earned: true, on: '2026-04-01' })
    expect(find(badges(three, '2026-11-20'), 'lands-10').progress).toEqual({ done: 3, goal: 10 })
  })

  it('unlocks the secret Home sweet home with a book set in Amsterdam', () => {
    const locked = find(badges([at('x', '2026-01-01', ['France'])], '2026-11-20'), 'home-sweet-home')
    expect(locked).toMatchObject({
      earned: false,
      secret: true,
      riddle: 'No passport needed: a story set among the tulips, windmills and canals.',
    })
    expect(locked.progress).toBeUndefined()
    const all = badges([book('a', { places: ['Amsterdam (Netherlands)'], readCount: 2, finished: ['2026-09-01', '2026-06-15'] })], '2026-11-20')
    expect(find(all, 'home-sweet-home')).toMatchObject({ earned: true, on: '2026-06-15', secret: true })
  })

  it('counts a place Hanna set herself like one from Open Library (D-0023)', () => {
    const all = badges([at('own', '2026-07-07', ['Netherlands'])], '2026-11-20')
    expect(find(all, 'home-sweet-home')).toMatchObject({ earned: true, on: '2026-07-07' })
    expect(find(all, 'continent-europe')).toMatchObject({ earned: true, on: '2026-07-07' })
  })
})

describe('when I read most', () => {
  it('finds the weekday with the most reading days', () => {
    // 2026-11-01 and 2026-11-08 are Sundays, 2026-11-03 a Tuesday
    const r = rhythm([book('x', { readingLog: { '2026-11-01': 0.1, '2026-11-08': 0.1, '2026-11-03': 0.1 } })], 2026, '2026-11-20')
    expect(r.weekdays[6]).toBe(2)
    expect(r.line).toBe('You read most on Sundays.')
    expect(r.months[10]).toBe(3)
    expect(rhythm([], 2026, '2026-11-20').line).toBeUndefined()
  })
})
