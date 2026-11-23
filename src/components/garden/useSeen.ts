import { useMemo, useRef } from 'react'
import type { Garden } from '#/lib/garden/garden'
import { newness, snapshot } from '#/lib/garden/seen'
import type { Newness, Seen } from '#/lib/garden/seen'

/**
 * What is new in the garden since she last looked (T-0066). The note of how it
 * stood lives in this browser only — the garden may save where things stand and
 * nothing else without Sander (D-0052 §6) — so the phone and the computer each
 * keep their own.
 *
 * `read` is false for the dashboard block, which shows the news but does not
 * clear it: only opening the Garden tab counts as having looked.
 */

const KEY = 'hannas-reading-list:garden-seen'

function load(): Seen | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Seen) : null
  } catch {
    // a private window, storage switched off, or something else in the key
    return null
  }
}

function save(seen: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen))
  } catch {
    /* nothing of hers is lost: the glow simply shows again next time */
  }
}

export function useSeen(garden: Garden, read: boolean): Map<string, Newness> {
  // worked out once per visit: the glow must not go out while she is looking at it
  const done = useRef(false)
  return useMemo(() => {
    if (typeof window === 'undefined') return new Map<string, Newness>()
    if (done.current) return new Map<string, Newness>()
    const news = newness(load(), garden)
    if (read) {
      done.current = true
      save(snapshot(garden))
    }
    return news
    // the garden itself may change as she tends it; the news of this visit stays as it was
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read])
}
