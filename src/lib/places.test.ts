import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { byBooks, needsPlaces, placesOf, worldMap } from './places'
import { coverAtSize } from './cover'
import { badges } from './badges'
import { MAP_COUNTRY_SET } from './mapCountries'

const KNOWN = new Set(['United Kingdom', 'France', 'United States of America', 'Japan', 'Italy', 'Greece'])

describe('where the books are set', () => {
  it('finds countries in Open Library place names', () => {
    expect(placesOf(['London (England)'], KNOWN).countries).toEqual(['United Kingdom'])
    expect(placesOf(['Paris (France)', 'France'], KNOWN).countries).toEqual(['France'])
    expect(placesOf(['New York (N.Y.)'], KNOWN).countries).toEqual(['United States of America'])
    expect(placesOf(['England -- London'], KNOWN).countries).toEqual(['United Kingdom'])
    expect(placesOf(['Japan'], KNOWN).countries).toEqual(['Japan'])
    expect(placesOf(['Venice'], KNOWN).countries).toEqual(['Italy'])
  })

  it('puts made-up places in the imaginary lands', () => {
    const p = placesOf(['Hogwarts School of Witchcraft and Wizardry (Imaginary place)', 'Narnia', 'Middle Earth (Imaginary place)', 'England'], KNOWN)
    expect(p.imaginary).toEqual(['Hogwarts', 'Narnia', 'Middle Earth'])
    expect(p.countries).toEqual(['United Kingdom'])
  })

  it('reads Open Library’s real places for Harry Potter', () => {
    const p = placesOf(['England', 'Hogwarts School of Witchcraft and Wizardry', '4 Privet Drive', 'Diagon Alley'], KNOWN)
    expect(p.countries).toEqual(['United Kingdom'])
    expect(p.imaginary).toEqual(['Hogwarts'])
    // a real place name with a short made-up word inside it is not imaginary
    expect(placesOf(['Ozark Mountains'], KNOWN).imaginary).toEqual([])
  })

  it('ignores places it can’t place', () => {
    expect(placesOf(['Somewhere vague'], KNOWN)).toEqual({ countries: [], imaginary: [] })
  })

  it('gives the finished books per country, and counts the ones still to look up', () => {
    const books = [
      b('a', { places: ['London (England)'] }),
      b('b', { places: ['Oxford (England)', 'Greece'] }),
      b('c', { places: [] }),
      b('d', {}),
      b('e', { status: 'want', readCount: 0, places: ['France'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect([...m.countries].map(([c, list]) => [c, ids(list)])).toEqual([
      ['United Kingdom', ['a', 'b']],
      ['Greece', ['b']],
    ])
    expect(m.waiting).toBe(1)
    expect(m.placed).toBe(2)
    expect(books.filter(needsPlaces).map((x) => x.id)).toEqual(['d'])
  })
})

const b = (id: string, extra: Partial<Book> = {}): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, ...extra })
const ids = (list: Book[]) => list.map((x) => x.id)

describe('the map: books per place in tile order (T-0018)', () => {
  it('puts the most recently finished first, no finish date last, ties by title', () => {
    const books = [
      b('old', { title: 'Old', finished: ['2024-03-01'], places: ['France'] }),
      b('none-z', { title: 'Zebra', places: ['France'] }),
      b('new', { title: 'New', finished: ['2023-01-01', '2026-10-01'], places: ['Paris (France)'] }),
      b('none-a', { title: 'Apple', places: ['France'] }),
      b('tie-b', { title: 'Beta', finished: ['2025-05-05'], places: ['France'] }),
      b('tie-a', { title: 'Alpha', finished: ['2025-05-05'], places: ['France'] }),
    ]
    expect(ids(worldMap(books, KNOWN).countries.get('France')!)).toEqual(['new', 'tie-a', 'tie-b', 'old', 'none-a', 'none-z'])
  })

  it('has each book once per country and once per land, in the same order for lands', () => {
    const books = [
      b('a', { title: 'A', finished: ['2025-01-01'], places: ['London (England)', 'Oxford (England)', 'Narnia', 'Narnia (Imaginary place)'] }),
      b('c', { title: 'C', finished: ['2026-01-01'], places: ['narnia (Imaginary place)', 'England'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect(ids(m.countries.get('United Kingdom')!)).toEqual(['c', 'a'])
    expect(ids(m.imaginary.get('Narnia')!)).toEqual(['c', 'a'])
  })

  it('sorts places most books first, ties alphabetical, for countries and lands', () => {
    const books = [
      b('a', { places: ['Japan', 'Oz'] }),
      b('b', { places: ['Italy', 'Narnia'] }),
      b('c', { places: ['Italy', 'Narnia'] }),
      b('d', { places: ['France', 'Atlantis'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect(byBooks(m.countries).map(([c, list]) => [c, ids(list)])).toEqual([
      ['Italy', ['b', 'c']],
      ['France', ['d']],
      ['Japan', ['a']],
    ])
    expect(byBooks(m.imaginary).map(([l]) => l)).toEqual(['Narnia', 'Atlantis', 'Oz'])
  })
})

describe('more spellings of a country (T-0041)', () => {
  const countryOf = (place: string) => placesOf([place], MAP_COUNTRY_SET).countries

  it('maps native names, accents and other spellings to the map’s country', () => {
    const cases: Array<[string, string]> = [
      ['Nederland', 'Netherlands'],
      ['Deutschland', 'Germany'],
      ['België', 'Belgium'],
      ['Belgie', 'Belgium'],
      ['España', 'Spain'],
      ['Espana', 'Spain'],
      ['Italia', 'Italy'],
      ['Österreich', 'Austria'],
      ['Oesterreich', 'Austria'],
      ['Schweiz', 'Switzerland'],
      ['Suisse', 'Switzerland'],
      ['Svizzera', 'Switzerland'],
      ['Danmark', 'Denmark'],
      ['Norge', 'Norway'],
      ['Sverige', 'Sweden'],
      ['Suomi', 'Finland'],
      ['Polska', 'Poland'],
      ['Česko', 'Czechia'],
      ['Ελλάδα', 'Greece'],
      ['Éire', 'Ireland'],
      ['Brasil', 'Brazil'],
      ['México', 'Mexico'],
      ['U.S.A.', 'United States of America'],
      ['United States of America', 'United States of America'],
      ['Great Britain', 'United Kingdom'],
      ['Amsterdam (Nederland)', 'Netherlands'],
    ]
    for (const [place, country] of cases) expect([place, countryOf(place)]).toEqual([place, [country]])
  })

  it('ignores a leading “the”, only as a whole word', () => {
    expect(countryOf('The Netherlands')).toEqual(['Netherlands'])
    expect(countryOf('the Netherlands')).toEqual(['Netherlands'])
    expect(countryOf('THE  NETHERLANDS')).toEqual(['Netherlands'])
    expect(countryOf('the UK')).toEqual(['United Kingdom'])
    expect(countryOf('The United States')).toEqual(['United States of America'])
    expect(countryOf('The Czech Republic')).toEqual(['Czechia'])
    expect(countryOf('Thessaloniki')).toEqual([])
    expect(countryOf('The')).toEqual([])
  })

  it('leaves imaginary lands as they are', () => {
    expect(placesOf(['The Shire (Imaginary place)', 'Narnia'], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: ['The Shire', 'Narnia'] })
  })

  it('counts the same country in two spellings once', () => {
    expect(placesOf(['The Netherlands', 'Nederland', 'Holland'], MAP_COUNTRY_SET).countries).toEqual(['Netherlands'])
    const m = worldMap([b('nl', { places: ['The Netherlands', 'Nederland'] })], MAP_COUNTRY_SET)
    expect([...m.countries].map(([c, list]) => [c, ids(list)])).toEqual([['Netherlands', ['nl']]])
  })

  it('unlocks Home sweet home for “The Netherlands” and for “Nederland”', () => {
    for (const place of ['The Netherlands', 'Nederland']) {
      const all = badges([b('nl', { finished: ['2026-08-01'], places: [place] })], '2026-11-20')
      expect([place, all.find((x) => x.id === 'home-sweet-home')]).toMatchObject([place, { earned: true, on: '2026-08-01' }])
    }
  })
})

describe('more spellings of a country: tester’s checks (T-0041)', () => {
  const countryOf = (place: string) => placesOf([place], MAP_COUNTRY_SET).countries
  // what the map lights up and which travel badges a finished book with these places earns
  const seen = (places: string[]) => {
    const book = b('x', { finished: ['2026-08-01'], places })
    const map = [...worldMap([book], MAP_COUNTRY_SET).countries.keys()].sort()
    const earned = badges([book], '2026-11-20')
      .filter((x) => x.earned && (x.id.startsWith('continent-') || x.id === 'home-sweet-home'))
      .map((x) => x.id)
      .sort()
    return { map, earned }
  }

  it('leaves “the” inside a name alone', () => {
    expect(countryOf('Thessaloniki')).toEqual([])
    expect(countryOf('Thessaloniki (Greece)')).toEqual(['Greece'])
    expect(countryOf('Thailand')).toEqual(['Thailand'])
    expect(countryOf('Netherlands Antilles')).toEqual([])
    expect(countryOf('The Netherlands Antilles')).toEqual([])
    expect(countryOf('Thenetherlands')).toEqual([])
    expect(countryOf('The The Netherlands')).toEqual([])
  })

  it('ignores capitals and extra spaces, tabs and non-breaking spaces', () => {
    for (const place of ['  tHe    nEtHeRlAnDs  ', 'The Netherlands', '\tNederland\n', 'NEDERLAND', 'the\tnetherlands'])
      expect([place, countryOf(place)]).toEqual([place, ['Netherlands']])
  })

  it('ignores accents on the map’s own names too', () => {
    for (const place of ["Côte d'Ivoire", "Cote d'Ivoire", "COTE D'IVOIRE", "Côte d'Ivoire", "the Côte d'Ivoire"])
      expect([place, countryOf(place)]).toEqual([place, ["Côte d'Ivoire"]])
    expect(countryOf('Reykjavík')).toEqual(['Iceland'])
    expect(countryOf('ΕΛΛΆΔΑ')).toEqual(['Greece'])
  })

  it('doesn’t turn a made-up land that starts with “The” into a country', () => {
    expect(placesOf(['The Shire'], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: [] })
    expect(placesOf(['The Shire (Imaginary place)'], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: ['The Shire'] })
    expect(placesOf(['The Narnia'], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: ['Narnia'] })
    expect(placesOf(['Deutschland (Imaginary place)'], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: ['Deutschland'] })
  })

  it('reads Open Library’s places with the country in brackets or after a comma', () => {
    for (const place of ['Amsterdam (Netherlands)', 'Amsterdam (The Netherlands)', 'Utrecht (Nederland)', 'Leiden (Netherlands) -- Fiction', 'Amsterdam, The Netherlands'])
      expect([place, countryOf(place)]).toEqual([place, ['Netherlands']])
  })

  it('lights up the same countries on the map as the travel badges count', () => {
    expect(seen(['The Netherlands'])).toEqual({ map: ['Netherlands'], earned: ['continent-europe', 'home-sweet-home'] })
    expect(seen(['Amsterdam (Nederland)', "Cote d'Ivoire"])).toEqual({
      map: ["Côte d'Ivoire", 'Netherlands'],
      earned: ['continent-africa', 'continent-europe', 'home-sweet-home'],
    })
    expect(seen(['The Bahamas', 'Brasil', 'Ελλάδα'])).toEqual({
      map: ['Bahamas', 'Brazil', 'Greece'],
      earned: ['continent-europe', 'continent-north-america', 'continent-south-america'],
    })
    expect(seen(['Thessaloniki', 'The Shire'])).toEqual({ map: [], earned: [] })
  })
})

describe('the map: small covers (T-0018)', () => {
  it('asks the app’s cover route for another size', () => {
    expect(coverAtSize('/api/cover/id/8231856?size=L', 'S')).toBe('/api/cover/id/8231856?size=S')
    expect(coverAtSize('/api/cover/isbn/9780140328721', 'S')).toBe('/api/cover/isbn/9780140328721?size=S')
    expect(coverAtSize('/api/cover/id/8231856?size=L', 'M')).toBe('/api/cover/id/8231856?size=M')
  })

  it('leaves own photos, Storytel covers and empty ones as they are', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQ'
    expect(coverAtSize(photo, 'S')).toBe(photo)
    const storytel = '/api/remote-cover?url=https%3A%2F%2Fexample.com%2Fc.jpg%3Fsize%3DL'
    expect(coverAtSize(storytel, 'S')).toBe(storytel)
    expect(coverAtSize('', 'S')).toBe('')
  })
})
