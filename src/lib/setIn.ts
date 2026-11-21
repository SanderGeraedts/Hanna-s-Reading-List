import { MAP_COUNTRIES, MAP_COUNTRY_SET } from './mapCountries'
import { placesOf } from './places'

/**
 * "Set in" in the book panel (T-0015): the places of one book as chips, and
 * what she adds or removes. Once she edits, the list is hers (D-0023): every
 * change returns an array, never undefined, so Open Library never looks it up
 * again. Countries are stored with the map's own names; a made-up place gets
 * Open Library's "(Imaginary place)" suffix, so the map counts it as an
 * imaginary land.
 */

export type PlaceKind = 'country' | 'imaginary' | 'other'

const SUFFIX = ' (Imaginary place)'

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()

/** On the map as a country, a made-up place, or something the map ignores ("4 Privet Drive"). */
export function placeKind(place: string): PlaceKind {
  const p = placesOf([place], MAP_COUNTRY_SET)
  return p.imaginary.length ? 'imaginary' : p.countries.length ? 'country' : 'other'
}

/** The name on the chip: a made-up place without "(Imaginary place)". */
export function placeLabel(place: string): string {
  return placeKind(place) === 'imaginary' ? tidy(place.replace(/\(\s*imaginary place\s*\)/gi, '')) : place
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const onBook = (places: readonly string[], label: string) => places.some((p) => same(placeLabel(p), label))

/** Her places with one more, unless it's already there (by its name, ignoring capitals). */
export function addPlace(places: readonly string[] | undefined, place: string): string[] {
  const current = places ?? []
  return onBook(current, placeLabel(place)) ? [...current] : [...current, place]
}

/** Her places without this one: Open Library's too. An emptied list stays [] (D-0023). */
export function removePlace(places: readonly string[] | undefined, place: string): string[] {
  return (places ?? []).filter((p) => p !== place)
}

/** The made-up places on other books, for the suggestions (each name once, first spelling wins). */
export function landsOn(placeLists: Array<readonly string[] | undefined>): string[] {
  const lands = new Map<string, string>()
  for (const list of placeLists)
    for (const land of placesOf([...(list ?? [])], MAP_COUNTRY_SET).imaginary)
      if (!lands.has(land.toLowerCase())) lands.set(land.toLowerCase(), land)
  return [...lands.values()]
}

/**
 * What she typed, as it would be stored: a map country by the map's name
 * ("france" → France); a name the map knows as a country ("England", "Paris")
 * as typed, with a capital; anything else as a made-up place, spelled like the
 * same land on another book ("narnia" → Narnia), or with a capital.
 */
export function placeFromTyped(typed: string, lands: readonly string[]): { place: string; kind: 'country' | 'imaginary' } | null {
  const name = tidy(typed.replace(/\(\s*imaginary place\s*\)/gi, ''))
  if (!name) return null
  const country = MAP_COUNTRIES.find((c) => same(c, name))
  if (country) return { place: country, kind: 'country' }
  const capital = name.charAt(0).toUpperCase() + name.slice(1)
  if (placeKind(capital) === 'country') return { place: capital, kind: 'country' }
  const land = lands.find((l) => same(l, name)) ?? capital
  return { place: land + SUFFIX, kind: 'imaginary' }
}

export interface PlaceRow {
  /** what is stored when she picks it */
  place: string
  /** what the row shows */
  label: string
  kind: 'country' | 'imaginary'
  /** the last row: add what she typed */
  add?: boolean
}

/**
 * The rows under the Add box while typing: up to five map countries and lands
 * from her other books that contain what she typed (the ones starting with it
 * first, then alphabetical), without places already on this book; then, unless
 * what she typed is one of those rows or already on the book, a row to add it.
 */
export function placeSuggestions(typed: string, places: readonly string[] | undefined, lands: readonly string[], n = 5): PlaceRow[] {
  const q = tidy(typed).toLowerCase()
  if (!q) return []
  const current = places ?? []
  const options: PlaceRow[] = [
    ...MAP_COUNTRIES.map((c) => ({ place: c, label: c, kind: 'country' as const })),
    ...lands.map((l) => ({ place: l + SUFFIX, label: l, kind: 'imaginary' as const })),
  ]
  const rank = (r: PlaceRow) => {
    const l = r.label.toLowerCase()
    return l === q ? 0 : l.startsWith(q) ? 1 : 2
  }
  const rows = options
    .filter((r) => r.label.toLowerCase().includes(q) && !onBook(current, r.label))
    .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label))
    .slice(0, n)
  if (rows.some((r) => r.label.toLowerCase() === q) || onBook(current, tidy(typed))) return rows
  const typedPlace = placeFromTyped(typed, lands)
  if (!typedPlace || onBook(current, placeLabel(typedPlace.place))) return rows
  return [...rows, { ...typedPlace, label: placeLabel(typedPlace.place), add: true }]
}
