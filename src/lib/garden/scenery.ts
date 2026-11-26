/**
 * The scenery that arrives with her reading (D-0083 §2): a hedge grows up
 * along the back, a fence goes round, stepping stones appear over the brook, a
 * potting shed, a birdhouse, a beehive. She does not buy them and she does not
 * put them anywhere — **they arrive on their own** when her reading reaches a
 * milestone, and then they stay for good.
 *
 * It is worked out from her shelf exactly as the plants are (D-0050 §1):
 * finished books and reading days in, scenery out. **Nothing is saved** — not
 * on the device and not on the server — so her phone and the computer show the
 * same garden with no sync and nothing waiting for Sander (D-0052 §6).
 *
 * This is a different thing from the garden **items** of D-0050 §8 (`g:i:`
 * keys, `numbers.ts`), which she unlocks by reading and then places herself
 * with a tap. Those are hers to arrange; these simply turn up. The two never
 * share an id, a key or a place in the garden: scenery stands in the grass
 * border round the beds, items stand in the strip along the bottom.
 */

export type SceneryId = 'hedge' | 'stones' | 'fence' | 'brook' | 'birdhouse' | 'shed' | 'beehive'

export interface ScenerySpec {
  readonly id: SceneryId
  /** what she sees it called */
  readonly name: string
  /** finished books it waits for (0: it doesn't wait for books) */
  readonly books: number
  /** days she has read on that it waits for (0: it doesn't wait for days) */
  readonly days: number
  /** the quiet line that says it has arrived */
  readonly line: string
}

/**
 * In the order they arrive for a reader who reads most days. Some pieces come
 * from finishing books and some from the days she reads at all, so a long slow
 * book still brings something.
 */
export const SCENERY: readonly ScenerySpec[] = [
  { id: 'hedge', name: 'Hedge', books: 3, days: 0, line: 'A hedge has grown up along the back.' },
  { id: 'stones', name: 'Stepping stones', books: 0, days: 25, line: 'Stepping stones have been laid across the grass.' },
  { id: 'fence', name: 'Fence', books: 12, days: 0, line: 'A low fence has gone up round the garden.' },
  { id: 'brook', name: 'Brook', books: 0, days: 60, line: 'A little brook runs along the bottom now.' },
  { id: 'birdhouse', name: 'Birdhouse', books: 30, days: 0, line: 'Someone has put up a birdhouse.' },
  { id: 'shed', name: 'Potting shed', books: 0, days: 120, line: 'There is a potting shed in the corner.' },
  { id: 'beehive', name: 'Beehive', books: 60, days: 0, line: 'A beehive stands at the edge of the garden.' },
]

export const SCENERY_IDS: readonly SceneryId[] = SCENERY.map((s) => s.id)

export const scenerySpec = (id: SceneryId): ScenerySpec => SCENERY.find((s) => s.id === id) ?? SCENERY[0]

export const isSceneryId = (x: unknown): x is SceneryId => typeof x === 'string' && (SCENERY_IDS as readonly string[]).includes(x)

/** How far along her reading is, as the scenery measures it. */
export interface ReadingSoFar {
  /** books finished, all time (the same count the garden items unlock on) */
  finished: number
  /** days she has read something on, all time */
  readingDays: number
}

/** Her reading so far, from the two counts the garden already works out. */
export const readingSoFar = (finished: number, readingDays: number): ReadingSoFar => ({ finished, readingDays })

/** Whether one piece has arrived yet. */
export const hasArrived = (spec: ScenerySpec, so: ReadingSoFar) => so.finished >= spec.books && so.readingDays >= spec.days

/** Everything standing in the garden now, in the order it arrived. */
export const sceneryFor = (so: ReadingSoFar): SceneryId[] => SCENERY.filter((s) => hasArrived(s, so)).map((s) => s.id)

export interface NextScenery {
  id: SceneryId
  name: string
  /** what it is still waiting for, in her words: "3 more books" or "5 more reading days" */
  toGo: string
}

/**
 * The next piece on its way, or null when everything has arrived. It is said
 * quietly, as one line under the garden, never as a goal and never as a nag:
 * it arrives when it arrives.
 */
export function nextScenery(so: ReadingSoFar): NextScenery | null {
  const waiting = SCENERY.filter((s) => !hasArrived(s, so))
  if (!waiting.length) return null
  // the one that needs the least more reading
  const scored = waiting.map((s) => ({
    s,
    books: Math.max(0, s.books - so.finished),
    days: Math.max(0, s.days - so.readingDays),
  }))
  scored.sort((a, b) => a.books + a.days - (b.books + b.days) || SCENERY_IDS.indexOf(a.s.id) - SCENERY_IDS.indexOf(b.s.id))
  const { s, books, days } = scored[0]
  const parts: string[] = []
  if (books > 0) parts.push(`${books} more book${books === 1 ? '' : 's'}`)
  if (days > 0) parts.push(`${days} more reading day${days === 1 ? '' : 's'}`)
  return { id: s.id, name: s.name, toGo: parts.join(' and ') }
}

/** "A hedge has grown up along the back." — the line for a piece that has just arrived. */
export const arrivalLine = (id: SceneryId) => scenerySpec(id).line

/**
 * The lines for everything that arrived while she wasn't looking, one after
 * another. More than two at once is said as a count instead, so a first visit
 * with a full shelf doesn't read like a list.
 */
export function arrivalLines(ids: readonly SceneryId[]): string {
  if (!ids.length) return ''
  if (ids.length <= 2) return ids.map(arrivalLine).join(' ')
  return `${ids.length} new things have arrived in the garden.`
}
