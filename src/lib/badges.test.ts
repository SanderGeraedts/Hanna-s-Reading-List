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
    expect(secrets.length).toBe(13)
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
      ['continent-europe', '🏰', 'Postcard from Europe'],
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
    // after the variety and author badges (T-0043), before the ratings; Home sweet home with the secrets, before Birthday book
    expect(ids.indexOf('countries-5')).toBe(ids.indexOf('authors-50') + 1)
    expect(ids.indexOf('rated-10')).toBe(ids.indexOf('lands-10') + 1)
    expect(ids.at(-2)).toBe('home-sweet-home')
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

describe('travel badges, trying to break them (T-0040 tester)', () => {
  const at = (id: string, day: string, places: string[], extra: Partial<Book> = {}) => read(id, day, { places, ...extra })
  const earned = (all: ReturnType<typeof badges>) => all.filter((b) => b.earned).map((b) => b.id)
  const postcards = (all: ReturnType<typeof badges>) => earned(all).filter((id) => id.startsWith('continent-'))

  it('gives Egypt, Turkey and Kazakhstan both their continents, but each counts as one country', () => {
    expect(postcards(badges([at('e', '2026-01-01', ['Cairo (Egypt)'])], '2026-11-20')).sort()).toEqual(['continent-africa', 'continent-asia'])
    expect(postcards(badges([at('t', '2026-01-01', ['Istanbul (Turkey)'])], '2026-11-20')).sort()).toEqual(['continent-asia', 'continent-europe'])
    expect(postcards(badges([at('k', '2026-01-01', ['Kazakhstan'])], '2026-11-20')).sort()).toEqual(['continent-asia', 'continent-europe'])
    const all = badges([at('r', '2026-01-01', ['Russia', 'Siberia (Russia)'])], '2026-11-20')
    expect(find(all, 'countries-5').progress).toEqual({ done: 1, goal: 5 })
    expect(find(all, 'continents-6').progress).toEqual({ done: 2, goal: 6 })
  })

  it('counts the French Southern and Antarctic Lands as a country on no continent', () => {
    const all = badges([at('a', '2026-01-01', ['Fr. S. Antarctic Lands'])], '2026-11-20')
    expect(find(all, 'countries-5').progress).toEqual({ done: 1, goal: 5 })
    expect(postcards(all)).toEqual([])
    expect(find(all, 'continents-6').progress).toEqual({ done: 0, goal: 6 })
  })

  it('never counts an imaginary land as a country or a continent, and Middle-earth once', () => {
    const shelf = [
      at('m1', '2026-01-01', ['Middle-earth (Imaginary place)']),
      at('m2', '2026-02-01', ['Middle Earth']),
      at('w', '2026-03-01', ['Westeros (Fictitious place)']),
      at('a', '2026-04-01', ['Atlantis']),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'lands-3')).toMatchObject({ earned: true, on: '2026-04-01' })
    expect(find(all, 'countries-5').progress).toEqual({ done: 0, goal: 5 })
    expect(postcards(all)).toEqual([])
  })

  it('leaves out books that are not finished: reading, paused, did not finish, want to read', () => {
    const shelf = (['reading', 'paused', 'dnf', 'want'] as const).map((status, i) =>
      book(`u${i}`, { status, places: ['Netherlands', 'Japan', 'Kenya', 'Brazil', 'Fiji', 'Canada'] }),
    )
    const travel = earned(badges(shelf, '2026-11-20')).filter((id) => /^(countries|continent|lands|home)/.test(id))
    expect(travel).toEqual([])
  })

  it('counts a book being re-read now from its first finish', () => {
    const again = book('again', { status: 'reading', readCount: 1, finished: ['2025-08-08'], places: ['Japan'] })
    expect(find(badges([again], '2026-11-20'), 'continent-asia')).toMatchObject({ earned: true, on: '2025-08-08' })
  })

  it("doesn't let a re-read move a badge, whatever order the finishes are stored in", () => {
    const shelf = [
      at('c1', '2026-01-01', ['France']),
      at('c2', '2026-02-01', ['Japan']),
      at('c3', '2026-03-01', ['Kenya']),
      at('c4', '2026-04-01', ['Brazil']),
      // first read in 2025, re-read in October: it brought its country first
      book('old', { readCount: 2, finished: ['2026-10-01', '2025-05-05'], places: ['Canada'] }),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'countries-5')).toMatchObject({ earned: true, on: '2026-04-01' })
    expect(find(all, 'continent-north-america')).toMatchObject({ earned: true, on: '2025-05-05' })
  })

  it('counts a finished book with no finish day, with no day on the badge (D-0037)', () => {
    const all = badges([book('nodate', { places: ['Peru'] })], '2026-11-20')
    const b = find(all, 'continent-south-america')
    expect(b.earned).toBe(true)
    expect(b.on).toBeUndefined()
  })

  it("follows Hanna's own places: an empty list counts nothing, and taking a place away takes the badge away", () => {
    expect(postcards(badges([at('none', '2026-01-01', [])], '2026-11-20'))).toEqual([])
    const before = badges([at('own', '2026-01-01', ['Japan', 'Netherlands'])], '2026-11-20')
    expect(find(before, 'home-sweet-home').earned).toBe(true)
    const after = badges([at('own', '2026-01-01', ['Japan'])], '2026-11-20')
    expect(find(after, 'home-sweet-home').earned).toBe(false)
    expect(find(after, 'continent-asia').earned).toBe(true)
  })

  it('unlocks Home sweet home for Netherlands, Holland and Amsterdam in the ways Open Library and Hanna write them', () => {
    for (const place of ['Netherlands', 'netherlands', 'Holland', 'Amsterdam', 'Amsterdam (Netherlands)', 'Netherlands -- Amsterdam', 'Holland -- Amsterdam']) {
      const all = badges([at('nl', '2026-05-05', [place])], '2026-11-20')
      expect(find(all, 'home-sweet-home'), place).toMatchObject({ earned: true, on: '2026-05-05', secret: true })
      expect(find(all, 'countries-5').progress, place).toEqual({ done: 1, goal: 5 })
    }
    // Holland and Amsterdam on one book are one country
    const both = badges([at('nl', '2026-05-05', ['Holland', 'Amsterdam', 'Netherlands'])], '2026-11-20')
    expect(find(both, 'countries-5').progress).toEqual({ done: 1, goal: 5 })
    // a neighbour, or the place in an unfinished book, doesn't
    expect(find(badges([at('be', '2026-05-05', ['Brussels (Belgium)'])], '2026-11-20'), 'home-sweet-home').earned).toBe(false)
    expect(find(badges([book('w', { status: 'want', places: ['Amsterdam'] })], '2026-11-20'), 'home-sweet-home').earned).toBe(false)
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

describe('medal tiers by family (T-0042, D-0038)', () => {
  const all = badges([read('a', '2026-01-02')], '2026-11-20')

  it('gives every badge a tier', () => {
    for (const b of all) expect(['bronze', 'silver', 'gold'], b.id).toContain(b.tier)
  })

  it('follows the family rule over the whole list: lowest bronze, highest gold, the rest silver, alone gold', () => {
    const families = new Map<string, Array<{ n: number; tier: string; id: string }>>()
    for (const b of all) {
      const m = b.id.match(/^(.*)-(\d+)$/)
      const family = m ? m[1] : b.id
      families.set(family, [...(families.get(family) ?? []), { n: m ? Number(m[2]) : 0, tier: b.tier, id: b.id }])
    }
    for (const [family, group] of families) {
      if (group.length === 1) {
        expect(group[0].tier, family).toBe('gold')
        continue
      }
      const sorted = [...group].sort((a, b) => a.n - b.n)
      expect(sorted.map((b) => b.tier), family).toEqual(sorted.map((_, i) => (i === 0 ? 'bronze' : i === sorted.length - 1 ? 'gold' : 'silver')))
    }
  })

  it('spot checks', () => {
    const tier = (id: string) => find(all, id).tier
    expect(tier('books-1')).toBe('bronze')
    for (const n of [5, 10, 25, 50, 100]) expect(tier(`books-${n}`)).toBe('silver')
    expect(tier('books-250')).toBe('gold')
    expect([tier('genres-5'), tier('genres-10')]).toEqual(['bronze', 'gold'])
    expect([tier('listen-10'), tier('listen-100'), tier('listen-1000')]).toEqual(['bronze', 'silver', 'gold'])
    expect([tier('series-1'), tier('series-10')]).toEqual(['bronze', 'gold'])
    expect([tier('streak-3'), tier('streak-100'), tier('streak-365')]).toEqual(['bronze', 'silver', 'gold'])
    expect(find(all, 'reread-3').secret).toBe(true)
    expect([tier('reread-3'), tier('reread-5')]).toEqual(['bronze', 'gold'])
    for (const id of ['continent-europe', 'continents-6', 'bingo', 'home-sweet-home']) expect(tier(id), id).toBe('gold')
  })
})

describe('the twelve new badges (T-0043)', () => {
  const days = (from: string, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${from}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
  const logged = (list: string[]) => book('log', { status: 'reading', pages: 300, readingLog: Object.fromEntries(list.map((d) => [d, 0.01])) })

  it('are all there with their ids, icons and names; 75 in all, 13 secret', () => {
    const all = badges([read('a', '2026-01-02')], '2026-11-20')
    const table: Array<[string, string, string]> = [
      ['streak-365', '🌞', '365-day streak'],
      ['spooky-season', '🎃', 'Spooky season'],
      ['summer-10', '🏖️', 'Summer reader'],
      ['winter-warmer', '🧣', 'Winter warmer'],
      ['author-10', '🤩', 'Superfan'],
      ['authors-25', '👥', 'Wide reader'],
      ['authors-50', '🦉', 'Well-read'],
      ['kinds-3', '🔀', 'Mix it up'],
      ['library-10', '🪪', 'Library lover'],
      ['ebooks-10', '📱', 'E-reader'],
      ['audiobooks-10', '👂', 'All ears'],
      ['birthday', '🎂', 'Birthday book'],
    ]
    for (const [id, icon, name] of table) expect(find(all, id), id).toMatchObject({ id, icon, name, earned: false })
    expect(all).toHaveLength(75)
    expect(all.filter((b) => b.secret)).toHaveLength(13)
    const bday = find(all, 'birthday')
    expect(bday).toMatchObject({ secret: true, riddle: 'Turn the last page on the one day a year the candles are all for you.' })
    expect(bday.riddle!.toLowerCase()).not.toContain('birthday book')
    // where they go
    const ids = all.map((b) => b.id)
    const after = (id: string, prev: string) => expect(ids.indexOf(id), id).toBe(ids.indexOf(prev) + 1)
    after('streak-365', 'streak-100')
    after('author-10', 'languages-3')
    after('authors-25', 'author-10')
    after('authors-50', 'authors-25')
    after('kinds-3', 'listen-1000')
    after('library-10', 'kinds-3')
    after('ebooks-10', 'library-10')
    after('audiobooks-10', 'ebooks-10')
    after('spooky-season', 'monthly')
    after('summer-10', 'spooky-season')
    after('winter-warmer', 'summer-10')
    after('birthday', 'home-sweet-home')
    expect(ids.at(-1)).toBe('birthday')
  })

  it('365-day streak: earned on the 365th day in a row; 364 shows 364 / 365; a gap resets the run', () => {
    const year = days('2025-01-01', 365)
    expect(find(badges([logged(year)], '2026-11-20'), 'streak-365')).toMatchObject({ earned: true, on: year[364] })
    expect(find(badges([logged(year.slice(0, 364))], '2026-11-20'), 'streak-365')).toMatchObject({
      earned: false,
      progress: { done: 364, goal: 365 },
    })
    const gap = [...year.slice(0, 200), ...year.slice(201)]
    expect(find(badges([logged(gap)], '2026-11-20'), 'streak-365')).toMatchObject({ earned: false, progress: { done: 200, goal: 365 } })
  })

  it('Spooky season: a horror, thriller or paranormal book finished in October', () => {
    const spooky = (day: string, genres: string[]) => find(badges([read('s', day, { genres })], '2026-11-20'), 'spooky-season')
    expect(spooky('2025-10-31', ['Horror'])).toMatchObject({ earned: true, on: '2025-10-31', tier: 'gold' })
    expect(spooky('2025-11-01', ['Horror']).earned).toBe(false)
    expect(spooky('2025-10-15', ['Romance']).earned).toBe(false)
    expect(spooky('2025-10-15', ['Paranormal romance'])).toMatchObject({ earned: true, on: '2025-10-15' })
    expect(spooky('2025-10-15', ['thriller'])).toMatchObject({ earned: true, on: '2025-10-15' })
  })

  it('Summer reader: 10 finishes from 1 June to 31 August of one year, re-reads included', () => {
    const summer = days('2026-06-01', 92).filter((_, i) => i % 9 === 0).slice(0, 10)
    expect(summer.at(-1)! <= '2026-08-31').toBe(true)
    const shelf = summer.map((d, i) => read(`s${i}`, d))
    expect(find(badges(shelf, '2026-11-20'), 'summer-10')).toMatchObject({ earned: true, on: summer[9] })
    // 31 May and 1 September don't count
    const edges = [...shelf.slice(0, 9), read('may', '2026-05-31'), read('sep', '2026-09-01')]
    expect(find(badges(edges, '2026-11-20'), 'summer-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
    // 9 in summer 2025 and 1 in summer 2026: the best summer is 9
    const split = [...summer.slice(0, 9).map((d, i) => read(`o${i}`, d.replace('2026', '2025'))), read('n', '2026-07-01')]
    expect(find(badges(split, '2026-11-20'), 'summer-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
    // a re-read in summer counts
    const again = [...shelf.slice(0, 9), book('re', { readCount: 2, finished: ['2024-03-01', '2026-08-31'] })]
    expect(find(badges(again, '2026-11-20'), 'summer-10')).toMatchObject({ earned: true, on: '2026-08-31' })
  })

  it('Winter warmer: a finish on 24, 25 or 26 December, the earliest', () => {
    const winter = (...ds: string[]) => find(badges(ds.map((d, i) => read(`w${i}`, d)), '2026-11-20'), 'winter-warmer')
    for (const d of ['2025-12-24', '2025-12-25', '2025-12-26']) expect(winter(d), d).toMatchObject({ earned: true, on: d })
    expect(winter('2025-12-23').earned).toBe(false)
    expect(winter('2025-12-27').earned).toBe(false)
    expect(winter('2025-12-25', '2024-12-26')).toMatchObject({ earned: true, on: '2024-12-26' })
  })

  it('Superfan: 10 different books by one author, compared trimmed and in lower case', () => {
    const maas = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        read(`m${i}`, `2026-${String(i + 1).padStart(2, '0')}-05`, { authors: [i % 2 ? ' sarah j. maas' : 'Sarah J. Maas'] }),
      )
    expect(find(badges(maas(10), '2026-12-01'), 'author-10')).toMatchObject({ earned: true, on: '2026-10-05', tier: 'gold' })
    expect(find(badges(maas(9), '2026-12-01'), 'author-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
    // a tenth book read twice counts on its first finish
    const twice = [...maas(9), book('m-again', { authors: ['Sarah J. Maas'], readCount: 2, finished: ['2026-11-20', '2026-11-01'] })]
    expect(find(badges(twice, '2026-12-01'), 'author-10')).toMatchObject({ earned: true, on: '2026-11-01' })
    // one book read twice counts once
    const same = maas(9).map((b) => (b.id === 'm0' ? { ...b, readCount: 2, finished: ['2026-01-05', '2026-11-20'] } : b))
    expect(find(badges(same, '2026-12-01'), 'author-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
  })

  it('Wide reader and Well-read: 25 and 50 different first authors', () => {
    const authors = (n: number) => {
      const ds = days('2026-01-01', n)
      return Array.from({ length: n }, (_, i) => read(`a${i}`, ds[i], { authors: [`Writer ${i}`] }))
    }
    expect(find(badges(authors(25), '2026-12-01'), 'authors-25')).toMatchObject({ earned: true, on: '2026-01-25' })
    expect(find(badges(authors(24), '2026-12-01'), 'authors-25')).toMatchObject({ earned: false, progress: { done: 24, goal: 25 } })
    // the same author twice counts once
    const dup = [...authors(24), read('dup', '2026-06-01', { authors: ['writer 3 '] })]
    expect(find(badges(dup, '2026-12-01'), 'authors-25').progress).toEqual({ done: 24, goal: 25 })
    expect(find(badges(authors(50), '2026-12-01'), 'authors-50')).toMatchObject({ earned: true, on: '2026-02-19' })
    expect(find(badges(authors(25), '2026-12-01'), 'authors-50').progress).toEqual({ done: 25, goal: 50 })
  })

  it('Mix it up: a paper book, an e-book and an audiobook', () => {
    const mix = badges(
      [
        read('p', '2026-01-01', { formats: ['paperback'] }),
        read('e', '2026-02-01', { formats: ['ebook'] }),
        read('s', '2026-03-01', { formats: ['storytel'] }),
      ],
      '2026-12-01',
    )
    expect(find(mix, 'kinds-3')).toMatchObject({ earned: true, on: '2026-03-01' })
    const both = badges([read('pa', '2026-01-01', { formats: ['paperback', 'audiobook'] }), read('e', '2026-04-01', { formats: ['ebook'] })], '2026-12-01')
    expect(find(both, 'kinds-3')).toMatchObject({ earned: true, on: '2026-04-01' })
    const other = badges(
      [
        read('o', '2026-01-01', { formats: ['other'] }),
        read('e', '2026-02-01', { formats: ['ebook'] }),
        read('h', '2026-03-01', { formats: ['hardcover'] }),
      ],
      '2026-12-01',
    )
    expect(find(other, 'kinds-3')).toMatchObject({ earned: false, progress: { done: 2, goal: 3 } })
  })

  it('Library lover, E-reader and All ears: 10 different books of that format or kind', () => {
    const ten = (formats: NonNullable<Book['formats']>, n = 10) =>
      Array.from({ length: n }, (_, i) => read(`f${i}`, `2026-${String(i + 1).padStart(2, '0')}-02`, { formats }))
    const cases: Array<[string, NonNullable<Book['formats']>]> = [
      ['library-10', ['library']],
      ['ebooks-10', ['ebook']],
      ['audiobooks-10', ['audiobook']],
      ['audiobooks-10', ['storytel']],
    ]
    for (const [id, formats] of cases) {
      expect(find(badges(ten(formats), '2026-12-01'), id), `${id} ${formats}`).toMatchObject({ earned: true, on: '2026-10-02' })
      expect(find(badges(ten(formats, 9), '2026-12-01'), id), `${id} 9`).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
      // a re-read counts once; a want-to-read one doesn't count
      const nine = [
        ...ten(formats, 8),
        book('again', { formats, readCount: 3, finished: ['2026-09-09', '2026-10-10', '2026-11-11'] }),
        book('want', { formats, status: 'want' }),
      ]
      expect(find(badges(nine, '2026-12-01'), id).progress, `${id} re-read`).toEqual({ done: 9, goal: 10 })
    }
    // Storytel imports without a format count as audiobooks
    const storytel = Array.from({ length: 10 }, (_, i) => read(`st${i}`, `2026-0${(i % 9) + 1}-03`, { storytelId: `x${i}` }))
    expect(find(badges(storytel, '2026-12-01'), 'audiobooks-10').earned).toBe(true)
  })

  it('Birthday book: a finish on this device’s birthday, any year; secret; none without a birthday', () => {
    const shelf = [read('b', '2024-05-14'), read('c', '2025-05-14')]
    expect(find(badges(shelf, '2026-11-20', { birthday: '05-14' }), 'birthday')).toMatchObject({
      earned: true,
      on: '2024-05-14',
      secret: true,
      tier: 'gold',
    })
    expect(find(badges([read('d', '2024-05-15')], '2026-11-20', { birthday: '05-14' }), 'birthday').earned).toBe(false)
    const none = find(badges(shelf, '2026-11-20'), 'birthday')
    expect(none).toMatchObject({ earned: false, secret: true, riddle: 'Turn the last page on the one day a year the candles are all for you.' })
    expect(none.progress).toBeUndefined()
    // 29 February only counts on 29 February
    expect(find(badges([read('l', '2024-02-29')], '2026-11-20', { birthday: '02-29' }), 'birthday').earned).toBe(true)
    expect(find(badges([read('l', '2025-03-01')], '2026-11-20', { birthday: '02-29' }), 'birthday').earned).toBe(false)
  })

  it('a birthday book finished in the last week waits under "Waiting for you"', () => {
    const all = badges([read('b', '2026-11-18')], '2026-11-20', { birthday: '11-18' })
    expect(newBadges(all, '2026-11-20').map((b) => b.id)).toContain('birthday')
  })

  it('rims: streak-365 gold, streak-100 silver; author-5 bronze, author-10 gold; authors-25 bronze, authors-50 gold', () => {
    const all = badges([], '2026-11-20')
    const tier = (id: string) => find(all, id).tier
    expect([tier('streak-100'), tier('streak-365')]).toEqual(['silver', 'gold'])
    expect([tier('author-5'), tier('author-10')]).toEqual(['bronze', 'gold'])
    expect([tier('authors-25'), tier('authors-50')]).toEqual(['bronze', 'gold'])
    for (const id of ['summer-10', 'kinds-3', 'library-10', 'ebooks-10', 'audiobooks-10', 'spooky-season', 'winter-warmer', 'birthday'])
      expect(tier(id), id).toBe('gold')
  })
})

describe('the twelve new badges, trying to break them (T-0043 tester)', () => {
  const days = (from: string, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${from}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
  const logged = (id: string, list: string[], amount = 0.01) =>
    book(id, { status: 'reading', pages: 300, readingLog: Object.fromEntries(list.map((d) => [d, amount])) })
  const T = '2026-11-23'

  it('Spooky season: 30 Sept and 1 Nov never count, 1 Oct does; the earliest October of any year; a re-read in October counts', () => {
    const horror = { genres: ['Horror'] }
    expect(find(badges([read('a', '2025-09-30', horror), read('b', '2025-11-01', horror)], T), 'spooky-season').earned).toBe(false)
    expect(find(badges([read('a', '2025-10-01', horror)], T), 'spooky-season')).toMatchObject({ earned: true, on: '2025-10-01' })
    const years = [read('a', '2026-10-01', horror), read('b', '2024-10-31', { genres: ['Psychological Thrillers'] })]
    expect(find(badges(years, T), 'spooky-season')).toMatchObject({ earned: true, on: '2024-10-31' })
    const reread = book('r', { genres: ['Paranormal'], readCount: 2, finished: ['2025-03-01', '2026-10-13'] })
    expect(find(badges([reread], T), 'spooky-season')).toMatchObject({ earned: true, on: '2026-10-13' })
    // no genres at all, or a horror finish with no day: nothing, and nothing throws
    expect(find(badges([read('a', '2025-10-10'), book('n', { genres: ['Horror'], readCount: 1 })], T), 'spooky-season').earned).toBe(false)
  })

  it('Winter warmer: 23 and 27 Dec, 24–26 Jan and New Year never count; 24–26 Dec across years gives the earliest', () => {
    const misses = ['2025-12-23', '2025-12-27', '2025-12-31', '2026-01-01', '2026-01-24', '2026-01-25', '2026-11-26']
    expect(find(badges(misses.map((d, i) => read(`m${i}`, d)), T), 'winter-warmer').earned).toBe(false)
    const hits = [read('a', '2026-12-24'), read('b', '2025-12-26'), read('c', '2024-12-25')]
    expect(find(badges(hits, T), 'winter-warmer')).toMatchObject({ earned: true, on: '2024-12-25' })
  })

  it('Summer reader counts each year on its own: late August and early June of the next year never add up', () => {
    const late = days('2025-08-27', 5) // 27–31 Aug 2025
    const early = days('2026-06-01', 5) // 1–5 June 2026
    const all = badges([...late, ...early].map((d, i) => read(`s${i}`, d)), T)
    expect(find(all, 'summer-10')).toMatchObject({ earned: false, progress: { done: 5, goal: 10 } })
    // two summers that both reach 10: the first one's 10th finish; a later, bigger summer doesn't move it
    const first = days('2024-07-01', 10)
    const second = days('2026-06-01', 14)
    expect(find(badges([...second, ...first].map((d, i) => read(`t${i}`, d)), T), 'summer-10')).toMatchObject({ earned: true, on: first[9] })
    // finishes with no day never count for a summer
    expect(find(badges([book('u', { readCount: 12 })], T), 'summer-10')).toMatchObject({ earned: false, progress: { done: 0, goal: 10 } })
  })

  it('Superfan, Wide reader and Well-read count the first author only: a co-author adds nothing', () => {
    // 9 by Pratchett alone, and Good Omens with Gaiman first: Pratchett stays at 9
    const pratchett = Array.from({ length: 9 }, (_, i) => read(`p${i}`, `2026-01-0${i + 1}`, { authors: ['Terry Pratchett'] }))
    const omens = read('go', '2026-02-01', { authors: ['Neil Gaiman', 'Terry Pratchett'] })
    expect(find(badges([...pratchett, omens], T), 'author-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
    // with Pratchett first on Good Omens it is his 10th, earned that day
    const omens2 = read('go', '2026-02-01', { authors: ['Terry Pratchett', 'Neil Gaiman'] })
    expect(find(badges([...pratchett, omens2], T), 'author-10')).toMatchObject({ earned: true, on: '2026-02-01' })
    // 24 solo authors plus one book by two new co-authors: 25 first authors, not 26
    const solo = Array.from({ length: 24 }, (_, i) => read(`w${i}`, `2025-01-${String(i + 1).padStart(2, '0')}`, { authors: [`Writer ${i}`] }))
    const duo = read('duo', '2025-02-01', { authors: ['Ann', 'Bob'] })
    expect(find(badges([...solo, duo], T), 'authors-25')).toMatchObject({ earned: true, on: '2025-02-01' })
    expect(find(badges([...solo, duo], T), 'authors-50')).toMatchObject({ earned: false, progress: { done: 25, goal: 50 } })
    // no author, or a blank first author: counted for nobody, and nothing throws
    const none = [read('x', '2025-03-01', { authors: [] }), read('y', '2025-03-02', { authors: ['  '] })]
    expect(find(badges([...solo, ...none], T), 'authors-25')).toMatchObject({ earned: false, progress: { done: 24, goal: 25 } })
  })

  it('Mix it up: library and borrowed are paper, Storytel and an old single format count, Other never does', () => {
    const kinds = (list: Book[]) => find(badges(list, T), 'kinds-3')
    const three = [read('a', '2026-01-01', { formats: ['library'] }), read('b', '2026-01-02', { format: 'ebook' }), read('c', '2026-01-03', { storytelId: '123' })]
    expect(kinds(three)).toMatchObject({ earned: true, on: '2026-01-03' })
    const two = [read('a', '2026-01-01', { formats: ['borrowed'] }), read('b', '2026-01-02', { formats: ['ebook', 'other'] })]
    expect(kinds(two)).toMatchObject({ earned: false, progress: { done: 2, goal: 3 } })
    expect(kinds([read('a', '2026-01-01', { formats: ['other'] }), read('b', '2026-01-02')])).toMatchObject({ earned: false, progress: { done: 0, goal: 3 } })
    // a want-to-read audiobook doesn't count
    const want = book('w', { status: 'want', formats: ['audiobook'] })
    expect(kinds([read('a', '2026-01-01', { formats: ['hardcover'] }), read('b', '2026-01-02', { formats: ['ebook'] }), want])).toMatchObject({
      earned: false,
      progress: { done: 2, goal: 3 },
    })
  })

  it('Library lover counts different finished library books only: not borrowed, not want-to-read, not did-not-finish', () => {
    const lib = (i: number) => read(`l${i}`, `2026-03-0${i + 1}`, { formats: ['library'] })
    const nine = Array.from({ length: 9 }, (_, i) => lib(i))
    const extras = [
      book('w', { status: 'want', formats: ['library'] }),
      book('d', { status: 'dnf', formats: ['library'] }),
      read('b', '2026-04-01', { formats: ['borrowed'] }),
      book('r', { formats: ['library'], readCount: 3, finished: ['2026-03-20', '2026-03-21', '2026-03-22'] }),
    ]
    // the re-read library book counts once: 9 + 1 = 10, on its first finish
    expect(find(badges([...nine, ...extras], T), 'library-10')).toMatchObject({ earned: true, on: '2026-03-20' })
    expect(find(badges([...nine, ...extras.slice(0, 3)], T), 'library-10')).toMatchObject({ earned: false, progress: { done: 9, goal: 10 } })
    // an old shelf's single `format: 'library'` counts too
    expect(find(badges([...nine, read('o', '2026-05-01', { format: 'library' })], T), 'library-10')).toMatchObject({ earned: true, on: '2026-05-01' })
  })

  it('365-day streak runs across New Year and 29 February, counts a day once over several books, and ignores 0 amounts', () => {
    const run = days('2027-06-01', 365) // through 29 Feb 2028
    expect(run).toContain('2028-02-29')
    const zero = logged('z', ['2026-01-01'], 0)
    const split = [logged('a', run.slice(0, 180)), logged('b', run.slice(180)), logged('c', run.slice(100, 120)), zero]
    expect(find(badges(split, T), 'streak-365')).toMatchObject({ earned: true, on: run[364] })
    // a 0 in the middle is a gap
    const holed = book('h', { status: 'reading', readingLog: Object.fromEntries(run.map((d, i) => [d, i === 300 ? 0 : 0.1])) })
    expect(find(badges([holed], T), 'streak-365')).toMatchObject({ earned: false, progress: { done: 300, goal: 365 } })
    // a run longer than a year: earned on its 365th day
    const long = days('2024-01-01', 400)
    expect(find(badges([logged('l', long)], T), 'streak-365')).toMatchObject({ earned: true, on: long[364] })
  })

  it('Birthday book: 29 February counts only on 29 February, never 28 Feb or 1 March of other years', () => {
    const near = [read('a', '2025-02-28'), read('b', '2025-03-01'), read('c', '2026-02-28'), read('d', '2027-03-01')]
    expect(find(badges(near, T, { birthday: '02-29' }), 'birthday').earned).toBe(false)
    expect(find(badges([...near, read('e', '2028-02-29')], T, { birthday: '02-29' }), 'birthday')).toMatchObject({
      earned: true,
      on: '2028-02-29',
      secret: true,
    })
  })

  it('Birthday book: a bad birthday option earns nothing and never throws; the earliest year wins; a re-read counts', () => {
    const shelf = [read('a', '2026-05-14'), read('b', '2024-05-14')]
    for (const bad of ['', '13-40', 'abc', '5-14', '05/14', '2026-05-14', ' 05-14'])
      expect(find(badges(shelf, T, { birthday: bad }), 'birthday').earned, bad).toBe(false)
    expect(find(badges(shelf, T, { birthday: '05-14' }), 'birthday')).toMatchObject({ earned: true, on: '2024-05-14' })
    const reread = book('r', { readCount: 2, finished: ['2020-01-01', '2025-12-31'] })
    expect(find(badges([reread], T, { birthday: '12-31' }), 'birthday')).toMatchObject({ earned: true, on: '2025-12-31' })
    // a hidden medal with no progress, birthday set or not
    expect(find(badges([read('z', '2026-01-01')], T, { birthday: '05-14' }), 'birthday').progress).toBeUndefined()
  })
})
