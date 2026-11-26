import { useMemo, useRef } from 'react'
import type { Garden } from '#/lib/garden/garden'
import type { GardenItemId } from '#/lib/garden/numbers'
import { freshScenery, freshUnlocks, newness, readSeen, snapshot } from '#/lib/garden/seen'
import type { Newness } from '#/lib/garden/seen'
import type { SceneryId } from '#/lib/garden/scenery'

/**
 * What is new in the garden since she last looked (T-0066). The note of how it
 * stood lives in this browser only — the garden may save where things stand and
 * nothing else without Sander (D-0052 §6) — so the phone and the computer each
 * keep their own.
 *
 * `read` is false for the dashboard, which shows the news but does not clear
 * it: only opening the Garden tab counts as having looked.
 */

const KEY = 'hannas-reading-list:garden-seen'

export interface GardenNews {
  plants: Map<string, Newness>
  unlocked: GardenItemId[]
  /** the scenery that has arrived since she last looked (D-0083 §2) */
  scenery: SceneryId[]
}

const NOTHING: GardenNews = { plants: new Map(), unlocked: [], scenery: [] }

function load(garden: Garden) {
  try {
    return readSeen(JSON.parse(localStorage.getItem(KEY) ?? 'null'), garden)
  } catch {
    // a private window, storage switched off, or something else in the key
    return null
  }
}

function save(garden: Garden) {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot(garden)))
  } catch {
    /* nothing of hers is lost: the news simply shows again next time */
  }
}

export function useSeen(garden: Garden, read: boolean): GardenNews {
  // worked out once per visit: the glow must not go out while she is looking at it
  const done = useRef(false)
  return useMemo(() => {
    if (typeof window === 'undefined' || done.current) return NOTHING
    const seen = load(garden)
    const news: GardenNews = { plants: newness(seen, garden), unlocked: freshUnlocks(seen, garden), scenery: freshScenery(seen, garden) }
    if (read) {
      done.current = true
      save(garden)
    }
    return news
    // the garden itself may change as she tends it; the news of this visit stays as it was
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read])
}
