import type { Book } from './library'
import { timesRead } from './library'
import { lastFinish } from './ratingAsk'

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
  // T-0041: native names and other spellings (keys without accents, see `fold`)
  nederland: 'Netherlands',
  deutschland: 'Germany',
  belgie: 'Belgium',
  espana: 'Spain',
  italia: 'Italy',
  osterreich: 'Austria',
  oesterreich: 'Austria',
  schweiz: 'Switzerland',
  suisse: 'Switzerland',
  svizzera: 'Switzerland',
  danmark: 'Denmark',
  norge: 'Norway',
  sverige: 'Sweden',
  suomi: 'Finland',
  polska: 'Poland',
  cesko: 'Czechia',
  ελλαδα: 'Greece',
  eire: 'Ireland',
  brasil: 'Brazil',
  'u.s.a.': 'United States of America',
}

/** Lower case without accents ("België" → "belgie", "Ελλάδα" → "ελλαδα"), for the country lookup (T-0041). */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

/**
 * Made-up places that Open Library doesn't always mark as imaginary, with the
 * short name the map counts them under (T-0015): "Hogwarts School of Witchcraft
 * and Wizardry" is Hogwarts, "Middle-earth" is Middle Earth.
 */
const IMAGINARY = new Map([
  ['middle earth', 'Middle Earth'],
  ['middle-earth', 'Middle Earth'],
  ['narnia', 'Narnia'],
  ['westeros', 'Westeros'],
  ['essos', 'Essos'],
  ['panem', 'Panem'],
  ['prythian', 'Prythian'],
  ['hogwarts', 'Hogwarts'],
  ['oz', 'Oz'],
  ['neverland', 'Neverland'],
  ['wonderland', 'Wonderland'],
  ['discworld', 'Discworld'],
  ['earthsea', 'Earthsea'],
  ['fillory', 'Fillory'],
  ['erilea', 'Erilea'],
  ['ravka', 'Ravka'],
  ['roshar', 'Roshar'],
  ['scadrial', 'Scadrial'],
  ['atlantis', 'Atlantis'],
  ['camelot', 'Camelot'],
])

/** A well-known made-up place, also inside a longer name ("Hogwarts School of Witchcraft and Wizardry"): its short name. */
const imaginaryName = (name: string): string | undefined => {
  const words = name.toLowerCase()
  // the names are only letters, spaces and hyphens: no regex characters to escape
  for (const [w, display] of IMAGINARY) if (new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(words)) return display
  return undefined
}

/** The same made-up land in other capitals or spacing ("Velaris", "velaris"): one key. */
export const landKey = (land: string) => land.toLowerCase().replace(/[\s-]+/g, ' ').trim()

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

export interface BookPlaces {
  countries: string[]
  imaginary: string[]
}

/** The countries and the made-up places in a book's places list. `known`: the country names on the map. */
export function placesOf(places: string[], known: ReadonlySet<string>): BookPlaces {
  const countries = new Set<string>()
  // key -> the spelling counted: a built-in land's short name, else the first spelling
  const imaginary = new Map<string, string>()
  const knownLower = new Map([...known].map((c) => [fold(c), c]))
  const country = (raw: string) => {
    // "The Netherlands", "the UK" (T-0041)
    const s = fold(clean(raw)).replace(/^the\s+/, '')
    return knownLower.get(s) ?? ALIASES[s]
  }
  for (const place of places) {
    const name = clean(place.replace(/\(.*?\)/g, '').split('--')[0])
    // "Hogwarts School … (Imaginary place)", "Narnia (Imaginary place)"
    const builtIn = imaginaryName(name)
    if (/imaginary|fictitious|fictional|mythical|legendary/i.test(place) || builtIn) {
      const land = builtIn ?? name
      if (land && !imaginary.has(landKey(land))) imaginary.set(landKey(land), land)
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
  return { countries: [...countries], imaginary: [...imaginary.values()] }
}

export interface WorldMap {
  /** country -> her finished books set there, in tile order (D-0026: books, not counts) */
  countries: Map<string, Book[]>
  /** made-up place -> its finished books, in tile order */
  imaginary: Map<string, Book[]>
  /** finished books whose places haven't been looked up yet */
  waiting: number
  /** finished books with at least one known place */
  placed: number
}

/** A book the map counts: marked read, or read at least once (the travel badges count the same books, D-0037). */
export const finished = (b: Book) => b.status === 'read' || timesRead(b) > 0

/** Tile order (T-0018): most recently finished first, books without a finish date last, ties by title. */
export const tileOrder = (a: Book, b: Book): number => {
  const fa = lastFinish(a)
  const fb = lastFinish(b)
  if (fa !== fb) {
    if (!fa) return 1
    if (!fb) return -1
    return fb.localeCompare(fa)
  }
  return a.title.localeCompare(b.title)
}

export function worldMap(books: Book[], known: ReadonlySet<string>): WorldMap {
  const countries = new Map<string, Book[]>()
  const imaginary = new Map<string, Book[]>()
  // the same land in other capitals on another book counts under the first spelling
  const spelling = new Map<string, string>()
  // each book once per place
  const add = (m: Map<string, Book[]>, place: string, b: Book) => {
    const list = m.get(place)
    if (!list) m.set(place, [b])
    else if (!list.includes(b)) list.push(b)
  }
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
    for (const c of p.countries) add(countries, c, b)
    for (const i of p.imaginary) {
      const land = spelling.get(landKey(i)) ?? i
      spelling.set(landKey(i), land)
      add(imaginary, land, b)
    }
  }
  for (const list of [...countries.values(), ...imaginary.values()]) list.sort(tileOrder)
  return { countries, imaginary, waiting, placed }
}

/** Which books still need their places looked up: finished ones that have none yet. */
export const needsPlaces = (b: Book) => finished(b) && b.places === undefined

/** Places with their books, most books first, ties alphabetical (the order says it; no count is shown, D-0026). */
export const byBooks = (places: Map<string, Book[]>): Array<[string, Book[]]> =>
  [...places].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

/**
 * What a places lookup writes, decided at the moment it writes (D-0023): only
 * when the book still has no places. A list Hanna set or emptied while the
 * lookup was under way stays hers.
 */
export const placesPatch =
  (found: string[]) =>
  (b: Book): Partial<Book> =>
    b.places === undefined ? { places: found } : {}
