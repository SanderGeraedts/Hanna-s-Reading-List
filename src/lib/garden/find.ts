import type { Garden, Plant } from './garden'

/**
 * Finding a book's plant (T-0066): she types a title or an author and gets the
 * plants that match, across **every** reading year — a book finished in 2019 is
 * found from the 2026 garden, which is the whole point of searching.
 *
 * Nothing here reads or writes anything: it is a look over the garden she
 * already has.
 */

export interface Found {
  plant: Plant
  /** the year garden it stands in */
  year: number
  /** "2026" or "Earlier" */
  label: string
}

/** How many matches are offered at once: a list, not a second shelf. */
export const FIND_LIMIT = 8

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    // accents away, so "Brontë" is found by typing "bronte"
    .replace(/[̀-ͯ]/g, '')
    .trim()

/**
 * The plants whose book matches `query`, best first: a title that starts with
 * what she typed before one that merely contains it, and a title before an
 * author. An empty or whitespace query finds nothing.
 */
export function findPlants(garden: Garden, query: string, limit = FIND_LIMIT): Found[] {
  const q = fold(query)
  if (!q) return []
  const hits: Array<{ found: Found; rank: number }> = []
  for (const year of garden.years) {
    for (const plant of year.plants) {
      const title = fold(plant.book.title ?? '')
      const author = fold((plant.book.authors ?? []).join(' '))
      const rank = title.startsWith(q) ? 0 : title.includes(q) ? 1 : author.startsWith(q) ? 2 : author.includes(q) ? 3 : -1
      if (rank < 0) continue
      hits.push({ found: { plant, year: year.year, label: year.label }, rank })
    }
  }
  hits.sort((a, b) => a.rank - b.rank || a.found.plant.book.title.localeCompare(b.found.plant.book.title))
  return hits.slice(0, limit).map((h) => h.found)
}
