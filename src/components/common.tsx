import { useEffect, useState } from 'react'
import type { Book } from '#/lib/library'
import type { DayEntry } from '#/lib/readingLog'

/**
 * The small pieces nearly every block uses (D-0080 §1).
 *
 * They lived in `Dashboard.tsx`, and because the shelf's own Quick update
 * imports `Cover`, that one import dragged the **whole dashboard** — every
 * block, every chart — into the first download, however carefully the page was
 * split. The build said so out loud: "dynamically imported … but also
 * statically imported by …, dynamic import will not move module into another
 * chunk."
 *
 * They live here now, so the dashboard really is a page of its own and the
 * shelf no longer carries it.
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const monthName = (month: number, style: 'long' | 'short' = 'long') =>
  new Date(2000, month - 1, 1).toLocaleDateString('en-GB', { month: style })

/** A book's cover, or its spine colour with the title on it when it has none. */
export function Cover({ book, small }: { book: Book; small?: boolean }) {
  return book.coverUrl ? (
    <img className={`dash-cover${small ? ' small' : ''}`} src={book.coverUrl} alt="" loading="lazy" />
  ) : (
    <span className={`dash-cover blank${small ? ' small' : ''}`} style={{ background: book.color }} aria-hidden>
      {small ? '' : book.title}
    </span>
  )
}

const NARROW = '(max-width: 860px)'

/** Whether the screen is a narrow one, kept up to date as it changes. */
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(NARROW).matches)
  useEffect(() => {
    const m = window.matchMedia(NARROW)
    const on = () => setNarrow(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

/** What happened to a book on a day, as a class: finished, started or continued. */
export const mark = (e: DayEntry) =>
  e.finished ? ' finished' : e.started ? ' started' : e.amount !== undefined ? ' continued' : ''

/** at most this many covers in a day's pile; more show as "+2" */
export const PILE = 6

/**
 * A day's books as a pile of covers, one layer per book (#102): the top one
 * changes each time the dashboard opens (`shuffle`), the rest lie under it.
 */
export function dayPile(entries: DayEntry[], day: number, shuffle: number) {
  const top = (shuffle + day) % entries.length
  // the top book last, so it is drawn on top
  const order = [...entries.slice(top + 1), ...entries.slice(0, top), entries[top]]
  return order.slice(-PILE)
}
