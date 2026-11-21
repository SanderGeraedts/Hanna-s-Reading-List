import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { MAP_COUNTRY_SET } from './mapCountries'
import { byCount, needsPlaces, placesOf, placesPatch, worldMap } from './places'
import { addPlace, landsOn, placeFromTyped, placeKind, placeLabel, placeSuggestions, removePlace } from './setIn'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: id,
  authors: [],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  readCount: 1,
  ...extra,
})

describe('Set in: what kind of place a chip is', () => {
  it('marks map countries, names the map turns into one, made-up places and the rest', () => {
    expect(placeKind('France')).toBe('country')
    expect(placeKind('England')).toBe('country')
    expect(placeKind('Paris')).toBe('country')
    expect(placeKind('Prythian (Imaginary place)')).toBe('imaginary')
    expect(placeKind('Hogwarts School of Witchcraft and Wizardry')).toBe('imaginary')
    expect(placeKind('4 Privet Drive')).toBe('other')
  })

  it('shows a made-up place without its suffix', () => {
    expect(placeLabel('Prythian (Imaginary place)')).toBe('Prythian')
    expect(placeLabel('France')).toBe('France')
    expect(placeLabel('4 Privet Drive')).toBe('4 Privet Drive')
  })
})

describe('Set in: adding and removing places', () => {
  it('adds a country, and a second country to the same book', () => {
    const one = addPlace(undefined, 'France')
    expect(one).toEqual(['France'])
    expect(addPlace(one, 'Italy')).toEqual(['France', 'Italy'])
  })

  it('adds no duplicates, ignoring capitals and the imaginary suffix', () => {
    expect(addPlace(['France'], 'France')).toEqual(['France'])
    expect(addPlace(['Narnia (Imaginary place)'], 'narnia (Imaginary place)')).toEqual(['Narnia (Imaginary place)'])
    expect(addPlace(['Narnia'], 'Narnia (Imaginary place)')).toEqual(['Narnia'])
  })

  it('removes a chip, Open Library’s too, and an emptied list stays empty', () => {
    const fromOpenLibrary = ['England', 'Hogwarts School of Witchcraft and Wizardry', '4 Privet Drive']
    expect(removePlace(fromOpenLibrary, '4 Privet Drive')).toEqual(['England', 'Hogwarts School of Witchcraft and Wizardry'])
    expect(removePlace(['France'], 'France')).toEqual([])
  })
})

describe('Set in: what she typed', () => {
  it('stores a map country by the map’s name', () => {
    expect(placeFromTyped('france', [])).toEqual({ place: 'France', kind: 'country' })
    expect(placeFromTyped('  united   kingdom ', [])).toEqual({ place: 'United Kingdom', kind: 'country' })
  })

  it('keeps a name the map knows as a country (England, Paris) as that country', () => {
    expect(placeFromTyped('england', [])).toEqual({ place: 'England', kind: 'country' })
    expect(placesOf(['England'], MAP_COUNTRY_SET).countries).toEqual(['United Kingdom'])
    expect(placeFromTyped('Paris', [])).toEqual({ place: 'Paris', kind: 'country' })
  })

  it('stores a made-up place so the map counts it as imaginary, also one it has never heard of', () => {
    const prythian = placeFromTyped('prythian', [])!
    expect(prythian).toEqual({ place: 'Prythian (Imaginary place)', kind: 'imaginary' })
    const unknown = placeFromTyped('Glimmerdale', [])!.place
    expect(unknown).toBe('Glimmerdale (Imaginary place)')
    expect(placesOf([unknown], MAP_COUNTRY_SET)).toEqual({ countries: [], imaginary: ['Glimmerdale'] })
    const m = worldMap([book('a', { places: addPlace([], unknown) })], MAP_COUNTRY_SET)
    expect([...m.imaginary]).toEqual([['Glimmerdale', 1]])
  })

  it('spells a land like the same land on another book', () => {
    expect(placeFromTyped('narnia', ['Narnia'])!.place).toBe('Narnia (Imaginary place)')
  })
})

describe('Set in: suggestions while typing', () => {
  it('shows nothing before a letter is typed', () => {
    expect(placeSuggestions('', [], [])).toEqual([])
    expect(placeSuggestions('  ', [], [])).toEqual([])
  })

  it('puts France first for "fra", and no add row for an exact country', () => {
    expect(placeSuggestions('fra', [], [])[0]).toEqual({ place: 'France', label: 'France', kind: 'country' })
    expect(placeSuggestions('France', [], []).some((r) => r.add)).toBe(false)
  })

  it('shows at most five matches plus the add row, starting ones first, then alphabetical', () => {
    const rows = placeSuggestions('an', [], [])
    expect(rows.filter((r) => !r.add)).toHaveLength(5)
    expect(rows.filter((r) => !r.add).map((r) => r.label)).toEqual(['Angola', 'Afghanistan', 'Albania', 'Azerbaijan', 'Bangladesh'])
    expect(rows.at(-1)).toMatchObject({ add: true, kind: 'imaginary', label: 'An' })
  })

  it('offers lands from other books, and adds a new made-up place as the last row', () => {
    expect(placeSuggestions('Nar', [], ['Narnia'])).toEqual([
      { place: 'Narnia (Imaginary place)', label: 'Narnia', kind: 'imaginary' },
      { place: 'Nar (Imaginary place)', label: 'Nar', kind: 'imaginary', add: true },
    ])
    expect(placeSuggestions('Prythian', [], [])).toEqual([
      { place: 'Prythian (Imaginary place)', label: 'Prythian', kind: 'imaginary', add: true },
    ])
  })

  it('offers "Add England" as a country', () => {
    expect(placeSuggestions('England', [], []).at(-1)).toEqual({ place: 'England', label: 'England', kind: 'country', add: true })
  })

  it('leaves out places already on this book', () => {
    expect(placeSuggestions('fra', ['France'], []).some((r) => r.label === 'France')).toBe(false)
    expect(placeSuggestions('Narnia', ['Narnia (Imaginary place)'], ['Narnia'])).toEqual([])
  })

  it('finds the lands on other books once, by name', () => {
    expect(landsOn([['Narnia (Imaginary place)', 'England'], ['narnia'], undefined, ['Hogwarts School of Witchcraft and Wizardry']])).toEqual([
      'Narnia',
      'Hogwarts School of Witchcraft and Wizardry',
    ])
  })
})

describe('the map: imaginary lands with counts', () => {
  it('counts each land once per finished book, most first, ties alphabetical', () => {
    const hp = (id: string) => book(id, { places: ['England', 'Hogwarts (Imaginary place)'] })
    const books = [
      hp('a'),
      hp('b'),
      hp('c'),
      book('d', { places: ['Hogwarts', 'Narnia (Imaginary place)', 'Hogwarts (Imaginary place)'] }),
      book('e', { places: ['Narnia'] }),
      book('f', { places: ['Middle Earth (Imaginary place)'] }),
      book('g', { places: ['Atlantis'] }),
      book('h', { status: 'want', readCount: 0, places: ['Narnia (Imaginary place)'] }),
    ]
    const lands = byCount(worldMap(books, MAP_COUNTRY_SET).imaginary)
    expect(lands).toEqual([
      ['Hogwarts', 4],
      ['Narnia', 2],
      ['Atlantis', 1],
      ['Middle Earth', 1],
    ])
  })

  it('counts a made-up place she added on a finished book', () => {
    const places = addPlace(['England'], placeFromTyped('Prythian', [])!.place)
    expect(byCount(worldMap([book('a', { places })], MAP_COUNTRY_SET).imaginary)).toEqual([['Prythian', 1]])
  })
})

describe('her places are hers (D-0023)', () => {
  it('never looks up an emptied or edited list again', () => {
    expect(needsPlaces(book('a', { places: [] }))).toBe(false)
    expect(needsPlaces(book('b', { places: removePlace(['England', '4 Privet Drive'], '4 Privet Drive') }))).toBe(false)
    expect(needsPlaces(book('c', { places: addPlace(undefined, 'France') }))).toBe(false)
    expect(needsPlaces(book('d'))).toBe(true)
  })

  it('a lookup that finishes after she edited doesn’t overwrite her list', () => {
    const write = placesPatch(['London (England)', 'Diagon Alley'])
    expect(write(book('a'))).toEqual({ places: ['London (England)', 'Diagon Alley'] })
    expect(write(book('b', { places: ['Prythian (Imaginary place)'] }))).toEqual({})
    expect(write(book('c', { places: [] }))).toEqual({})
  })
})
