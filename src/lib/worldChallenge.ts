import type { Book } from './library'
import { MAP_COUNTRY_SET } from './mapCountries'
import { placesOf } from './places'
import { sleepReadIds } from './sleepSeries'

/**
 * Around the world (D-0061 §1): books set in 12 different countries in one
 * year. The countries are the ones the world map counts — `placesOf` with
 * `MAP_COUNTRY_SET`, the same source as the map (D-0026) and the
 * `countries-N` badges (D-0037) — taken from the books she finished that
 * year. Imaginary lands do not count, nothing is looked up (D-0018), and
 * sleep reads are left out.
 */

export const WORLD_GOAL = 12

export interface WorldCountry {
  country: string
  /** the book that first brought this country, that year */
  book: Book
  /** the day it was finished */
  day: string
}

/** The countries she has read this year, in the order she first reached each. */
export function worldCountries(books: Book[], year: number): WorldCountry[] {
  const sleep = sleepReadIds(books)
  const found = new Map<string, WorldCountry>()
  const rows: Array<{ book: Book; day: string }> = []
  for (const b of books) {
    if (sleep.has(b.id) || b.places === undefined) continue
    for (const day of b.finished ?? []) if (day.startsWith(`${year}-`)) rows.push({ book: b, day })
  }
  // in the order she finished them, so "first reached" is stable
  rows.sort((a, b) => a.day.localeCompare(b.day) || a.book.id.localeCompare(b.book.id))
  for (const { book, day } of rows) {
    for (const country of placesOf(book.places!, MAP_COUNTRY_SET).countries) {
      if (!found.has(country)) found.set(country, { country, book, day })
    }
  }
  return [...found.values()]
}

export interface WorldProgress {
  countries: WorldCountry[]
  done: number
  goal: number
  complete: boolean
}

export function worldChallenge(books: Book[], year: number, goal = WORLD_GOAL): WorldProgress {
  const countries = worldCountries(books, year)
  return { countries, done: countries.length, goal, complete: countries.length >= goal }
}
