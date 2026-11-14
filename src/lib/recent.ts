import type { Book } from './library'

/** The books added to the shelf last, newest first (#132). */
export function recentlyAdded(books: Book[], n = 10): Book[] {
  return [...books].sort((a, b) => b.addedAt - a.addedAt || a.title.localeCompare(b.title)).slice(0, n)
}

/** "added today", "added yesterday", "added 3 days ago", "added 2 weeks ago", "added in March 2025". */
export function addedText(addedAt: number, now = Date.now()): string {
  const day = (t: number) => {
    const d = new Date(t)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
  }
  const days = day(now) - day(addedAt)
  if (days <= 0) return 'added today'
  if (days === 1) return 'added yesterday'
  if (days < 14) return `added ${days} days ago`
  if (days < 60) return `added ${Math.round(days / 7)} weeks ago`
  return `added in ${new Date(addedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
}
