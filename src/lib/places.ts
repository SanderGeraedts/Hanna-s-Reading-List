import type { Book } from './library'
import { timesRead } from './library'

/**
 * Where Hanna's books are set (reading in pictures, part 4). Open Library
 * lists places per work ("London (England)", "Paris (France)",
 * "Hogwarts School of Witchcraft and Wizardry (Imaginary place)"); they are
 * looked up once per finished book and kept on it (`places`). Here they
 * become countries for the map, and made-up places for "Imaginary lands".
 */

/** Cities, regions and other names Open Library uses, to the country name on the map (world-atlas). */
const ALIASES: Record<string, string> = {
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  'northern ireland': 'United Kingdom',
  'great britain': 'United Kingdom',
  britain: 'United Kingdom',
  uk: 'United Kingdom',
  london: 'United Kingdom',
  oxford: 'United Kingdom',
  cambridge: 'United Kingdom',
  yorkshire: 'United Kingdom',
  cornwall: 'United Kingdom',
  edinburgh: 'United Kingdom',
  glasgow: 'United Kingdom',
  bath: 'United Kingdom',
  'united states': 'United States of America',
  usa: 'United States of America',
  'u.s.': 'United States of America',
  america: 'United States of America',
  'new york': 'United States of America',
  'n.y.': 'United States of America',
  'new york (state)': 'United States of America',
  california: 'United States of America',
  'calif.': 'United States of America',
  'los angeles': 'United States of America',
  chicago: 'United States of America',
  'ill.': 'United States of America',
  boston: 'United States of America',
  massachusetts: 'United States of America',
  'mass.': 'United States of America',
  texas: 'United States of America',
  florida: 'United States of America',
  'washington (d.c.)': 'United States of America',
  'new orleans': 'United States of America',
  'la.': 'United States of America',
  alaska: 'United States of America',
  hawaii: 'United States of America',
  paris: 'France',
  provence: 'France',
  rome: 'Italy',
  venice: 'Italy',
  florence: 'Italy',
  sicily: 'Italy',
  naples: 'Italy',
  milan: 'Italy',
  tokyo: 'Japan',
  kyoto: 'Japan',
  moscow: 'Russia',
  'saint petersburg': 'Russia',
  'st. petersburg': 'Russia',
  siberia: 'Russia',
  'soviet union': 'Russia',
  berlin: 'Germany',
  munich: 'Germany',
  hamburg: 'Germany',
  amsterdam: 'Netherlands',
  holland: 'Netherlands',
  madrid: 'Spain',
  barcelona: 'Spain',
  dublin: 'Ireland',
  athens: 'Greece',
  troy: 'Turkey',
  istanbul: 'Turkey',
  constantinople: 'Turkey',
  cairo: 'Egypt',
  beijing: 'China',
  shanghai: 'China',
  'hong kong': 'China',
  mumbai: 'India',
  bombay: 'India',
  delhi: 'India',
  calcutta: 'India',
  kolkata: 'India',
  sydney: 'Australia',
  melbourne: 'Australia',
  toronto: 'Canada',
  montreal: 'Canada',
  vancouver: 'Canada',
  'mexico city': 'Mexico',
  prague: 'Czechia',
  'czech republic': 'Czechia',
  vienna: 'Austria',
  stockholm: 'Sweden',
  oslo: 'Norway',
  copenhagen: 'Denmark',
  reykjavik: 'Iceland',
  lisbon: 'Portugal',
  brussels: 'Belgium',
  warsaw: 'Poland',
  budapest: 'Hungary',
  seoul: 'South Korea',
  korea: 'South Korea',
  'south korea': 'South Korea',
  'korea (south)': 'South Korea',
  'north korea': 'North Korea',
  jerusalem: 'Israel',
  tehran: 'Iran',
  kabul: 'Afghanistan',
  'buenos aires': 'Argentina',
  'rio de janeiro': 'Brazil',
  havana: 'Cuba',
  nairobi: 'Kenya',
  'cape town': 'South Africa',
  johannesburg: 'South Africa',
  transylvania: 'Romania',
}

/** Made-up places that Open Library doesn't always mark as imaginary. */
const IMAGINARY = new Set([
  'middle earth',
  'middle-earth',
  'narnia',
  'westeros',
  'essos',
  'panem',
  'prythian',
  'hogwarts',
  'oz',
  'neverland',
  'wonderland',
  'discworld',
  'earthsea',
  'fillory',
  'erilea',
  'ravka',
  'roshar',
  'scadrial',
  'atlantis',
  'camelot',
])

/** A well-known made-up place, also inside a longer name ("Hogwarts School of Witchcraft and Wizardry"). */
const imaginaryName = (name: string) => {
  const words = name.toLowerCase()
  // the names are only letters, spaces and hyphens: no regex characters to escape
  return [...IMAGINARY].some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(words))
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

export interface BookPlaces {
  countries: string[]
  imaginary: string[]
}

/** The countries and the made-up places in a book's places list. `known`: the country names on the map. */
export function placesOf(places: string[], known: ReadonlySet<string>): BookPlaces {
  const countries = new Set<string>()
  const imaginary = new Set<string>()
  const knownLower = new Map([...known].map((c) => [c.toLowerCase(), c]))
  const country = (raw: string) => {
    const s = clean(raw).toLowerCase()
    return knownLower.get(s) ?? ALIASES[s]
  }
  for (const place of places) {
    const name = clean(place.replace(/\(.*?\)/g, '').split('--')[0])
    // "Hogwarts School … (Imaginary place)", "Narnia (Imaginary place)"
    if (/imaginary|fictitious|fictional|mythical|legendary/i.test(place) || imaginaryName(name)) {
      if (name) imaginary.add(name)
      continue
    }
    // the place itself, then what's in brackets ("Paris (France)"), then each part ("England -- London")
    const parts = [name, ...[...place.matchAll(/\((.*?)\)/g)].map((m) => m[1]), ...place.split(/--|,/)]
    for (const part of parts) {
      const c = country(part)
      if (c) {
        countries.add(c)
        break
      }
    }
  }
  return { countries: [...countries], imaginary: [...imaginary] }
}

export interface WorldMap {
  /** country -> how many of her books are set there */
  countries: Map<string, number>
  /** made-up place -> how many books */
  imaginary: Map<string, number>
  /** finished books whose places haven't been looked up yet */
  waiting: number
  /** finished books with at least one known place */
  placed: number
}

const finished = (b: Book) => b.status === 'read' || timesRead(b) > 0

export function worldMap(books: Book[], known: ReadonlySet<string>): WorldMap {
  const countries = new Map<string, number>()
  const imaginary = new Map<string, number>()
  let waiting = 0
  let placed = 0
  for (const b of books) {
    if (!finished(b)) continue
    if (b.places === undefined) {
      waiting++
      continue
    }
    const p = placesOf(b.places, known)
    if (p.countries.length || p.imaginary.length) placed++
    for (const c of p.countries) countries.set(c, (countries.get(c) ?? 0) + 1)
    for (const i of p.imaginary) imaginary.set(i, (imaginary.get(i) ?? 0) + 1)
  }
  return { countries, imaginary, waiting, placed }
}

/** Which books still need their places looked up: finished ones that have none yet. */
export const needsPlaces = (b: Book) => finished(b) && b.places === undefined

/** A count list most first, ties alphabetical: "Hogwarts 4 · Narnia 2 · Middle Earth 1". */
export const byCount = (counts: Map<string, number>): Array<[string, number]> =>
  [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

/**
 * What a places lookup writes, decided at the moment it writes (D-0023): only
 * when the book still has no places. A list Hanna set or emptied while the
 * lookup was under way stays hers.
 */
export const placesPatch =
  (found: string[]) =>
  (b: Book): Partial<Book> =>
    b.places === undefined ? { places: found } : {}
