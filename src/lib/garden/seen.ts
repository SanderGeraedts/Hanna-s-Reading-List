import type { Garden, Stage } from './garden'

/**
 * What is new in the garden since she last looked (T-0066): a plant that has
 * appeared, and a plant that has grown a stage. It is worked out by comparing
 * the garden with a small note of how it stood last time — kept **on this
 * device alone**, because anything the garden saves that is not a spot would
 * need a new kind in the choice log and so Sander (D-0052 §6).
 *
 * No pop-ups and no hint texts (D-0013, D-0014): the garden simply shows it.
 */

/** book id → the stage it stood at when she last looked. */
export type Seen = Record<string, Stage>

export type Newness = 'new' | 'grown'

const ORDER: Record<Stage, number> = { sprout: 0, young: 1, grown: 2 }

/** How the garden stands now, to be kept until the next visit. */
export function snapshot(garden: Garden): Seen {
  const out: Seen = {}
  for (const year of garden.years) for (const p of year.plants) out[p.id] = p.stage
  return out
}

/**
 * The plants that are new or have grown since `seen`. A first visit — no note
 * at all — marks nothing: a whole garden glowing is not news, it is a garden.
 */
export function newness(seen: Seen | null, garden: Garden): Map<string, Newness> {
  const out = new Map<string, Newness>()
  if (!seen) return out
  for (const year of garden.years) {
    for (const p of year.plants) {
      const before = seen[p.id]
      if (before === undefined) out.set(p.id, 'new')
      else if (ORDER[p.stage] > (ORDER[before] ?? 0)) out.set(p.id, 'grown')
    }
  }
  return out
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
