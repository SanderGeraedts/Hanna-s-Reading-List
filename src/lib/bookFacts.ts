/**
 * A book's ISBN and publication date (#43, #44): reading what Hanna types or
 * what Open Library says, and showing it again.
 *
 * A publication date is kept as much as is known: "2008", "2008-03" or
 * "2008-03-12". The book's `year` always follows it, so sorting by year keeps
 * working for books that only have a year.
 */

const MONTHS: Record<string, number> = {}
;[
  ['january', 'januar', 'jan', 'jän'],
  ['february', 'februar', 'feb'],
  ['march', 'märz', 'maerz', 'mar', 'mär'],
  ['april', 'apr'],
  ['may', 'mai'],
  ['june', 'juni', 'jun'],
  ['july', 'juli', 'jul'],
  ['august', 'aug'],
  ['september', 'sept', 'sep'],
  ['october', 'oktober', 'oct', 'okt'],
  ['november', 'nov'],
  ['december', 'dezember', 'dec', 'dez'],
].forEach((names, i) => names.forEach((n) => (MONTHS[n] = i + 1)))

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

function build(y: number, m?: number, d?: number): string | null {
  if (!Number.isInteger(y) || y < 1000 || y > new Date().getFullYear() + 2) return null
  if (m === undefined) return String(y)
  if (!Number.isInteger(m) || m < 1 || m > 12) return null
  if (d === undefined) return `${y}-${pad(m)}`
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (!Number.isInteger(d) || d < 1 || d > days) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/**
 * A publication date from free text, or null when it can't be read:
 * "2008", "2008-03-12", "12.03.2008", "12/03/2008" (day first), "3.2008",
 * "March 2008", "12 March 2008", "March 12, 2008", "12. März 2008".
 */
export function parsePublished(raw: string | undefined): string | null {
  const s = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return null
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d{4})$/))) return build(+m[1])
  if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) return build(+m[1], +m[2], m[3] ? +m[3] : undefined)
  if ((m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/))) return build(+m[3], +m[2], +m[1])
  if ((m = s.match(/^(\d{1,2})[./](\d{4})$/))) return build(+m[2], +m[1])
  // with a month name, in either order
  const words = s.replace(/[.,]/g, ' ').trim().split(/\s+/)
  const month = words.map((w) => MONTHS[w]).find(Boolean)
  const year = words.find((w) => /^\d{4}$/.test(w))
  if (month && year) {
    const day = words.find((w) => /^\d{1,2}$/.test(w))
    return build(+year, month, day ? +day : undefined)
  }
  // anything else with a single year in it, e.g. "c1998" or "1998 printing"
  const years = s.match(/(?<!\d)\d{4}(?!\d)/g)
  return years?.length === 1 ? build(+years[0]) : null
}

/** "12 March 2008", "March 2008" or "2008". */
export function formatPublished(published: string): string {
  const [y, m, d] = published.split('-').map(Number)
  if (!m) return String(y)
  return d ? `${d} ${MONTH_NAMES[m - 1]} ${y}` : `${MONTH_NAMES[m - 1]} ${y}`
}

/** The year of a publication date. */
export const publishedYear = (published: string) => Number(published.slice(0, 4))

/** The digits of an ISBN as typed (hyphens and spaces dropped), or null if it isn't a valid ISBN-10 or ISBN-13. */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{13}$/.test(s)) {
    const sum = [...s.slice(0, 12)].reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0)
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((t, c, i) => t + (c === 'X' ? 10 : Number(c)) * (10 - i), 0)
    return sum % 11 === 0 ? s : null
  }
  return null
}
