import type { Garden, Stage } from './garden'
import { itemSpec } from './numbers'
import type { GardenItemId } from './numbers'
import { withArticle } from './words'

/**
 * What is new in the garden since she last looked (T-0066): a plant that has
 * appeared, a plant that has grown a stage, and a garden item that has
 * unlocked. It is worked out by comparing the garden with a small note of how
 * it stood last time — kept **on this device alone**, because anything the
 * garden saves that is not a spot would need a new kind in the choice log and
 * so Sander (D-0052 §6).
 *
 * No pop-ups and no hint texts (D-0013, D-0014): the garden shows it, the
 * dashboard block says it, and "Waiting for you" offers the way in (D-0050
 * §11).
 */

/** How the garden stood when she last looked. */
export interface GardenSeen {
  /** book id → the stage its plant stood at */
  plants: Record<string, Stage>
  /** the garden items that were already unlocked */
  items: GardenItemId[]
}

export type Newness = 'new' | 'grown'

const ORDER: Record<Stage, number> = { sprout: 0, young: 1, grown: 2 }

/** How the garden stands now, to be kept until the next visit. */
export function snapshot(garden: Garden): GardenSeen {
  const plants: Record<string, Stage> = {}
  for (const year of garden.years) for (const p of year.plants) plants[p.id] = p.stage
  return { plants, items: [...garden.unlocked] }
}

/**
 * A note read back from the device. The first shape this was stored in was the
 * plain plant map; it is read as plants with **every unlock already seen**, so
 * an update can never announce a pond she unlocked months ago.
 */
export function readSeen(raw: unknown, garden: Garden): GardenSeen | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.plants && typeof o.plants === 'object' && !Array.isArray(o.plants))
    return { plants: o.plants as Record<string, Stage>, items: Array.isArray(o.items) ? (o.items as GardenItemId[]) : [...garden.unlocked] }
  return { plants: o as Record<string, Stage>, items: [...garden.unlocked] }
}

/**
 * The plants that are new or have grown since `seen`. A first visit — no note
 * at all — marks nothing: a whole garden glowing is not news, it is a garden.
 */
export function newness(seen: GardenSeen | null, garden: Garden): Map<string, Newness> {
  const out = new Map<string, Newness>()
  if (!seen) return out
  for (const year of garden.years) {
    for (const p of year.plants) {
      const before = seen.plants[p.id]
      if (before === undefined) out.set(p.id, 'new')
      else if (ORDER[p.stage] > (ORDER[before] ?? 0)) out.set(p.id, 'grown')
    }
  }
  return out
}

/** The garden items unlocked since she last looked, in the order they unlock. */
export function freshUnlocks(seen: GardenSeen | null, garden: Garden): GardenItemId[] {
  if (!seen) return []
  const had = new Set(seen.items)
  return garden.unlocked.filter((id) => !had.has(id))
}

export interface NewsCount {
  fresh: number
  grew: number
}

export const countNews = (news: ReadonlyMap<string, Newness>): NewsCount => ({
  fresh: [...news.values()].filter((n) => n === 'new').length,
  grew: [...news.values()].filter((n) => n === 'grown').length,
})

/** "2 new plants · 3 grew", or nothing at all when there is no news. */
export function newsLine(news: ReadonlyMap<string, Newness>): string {
  const { fresh, grew } = countNews(news)
  const parts: string[] = []
  if (fresh) parts.push(`${fresh} new plant${fresh === 1 ? '' : 's'}`)
  if (grew) parts.push(`${grew} grew`)
  return parts.join(' · ')
}

/**
 * The whole line for "Waiting for you" (D-0050 §11): the plants and the items
 * together, as a sentence rather than a count — "2 new plants, 1 grew and a
 * pond has unlocked". Empty when nothing has happened, and the dashboard then
 * leaves the line out.
 */
export function waitingLine(news: ReadonlyMap<string, Newness>, unlocked: readonly GardenItemId[]): string {
  const { fresh, grew } = countNews(news)
  const parts: string[] = []
  if (fresh) parts.push(`${fresh} new plant${fresh === 1 ? '' : 's'}`)
  if (grew) parts.push(`${grew} grew`)
  if (unlocked.length) {
    const names = unlocked.map((id) => withArticle(itemSpec(id).name.toLowerCase()))
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    parts.push(`${list} ${unlocked.length === 1 && !names[0].endsWith('s') ? 'has' : 'have'} unlocked`)
  }
  if (!parts.length) return ''
  const line = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `In your garden: ${line}.`
}
