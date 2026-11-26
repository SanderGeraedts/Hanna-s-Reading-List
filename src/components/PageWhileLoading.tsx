import { Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'

/**
 * A page while its file is still on its way (D-0080 §1).
 *
 * Every page but the shelf comes in a file of its own now, so opening the app
 * downloads the shelf and nothing else. The first time she taps a page in a
 * visit, its file has to arrive; this says so instead of showing her a blank.
 * For the light pages it is almost never seen, because `usePrefetchPages` has
 * already fetched them while the shelf sat still.
 */
export function PageWhileLoading({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="page-loading">One moment…</p>}>{children}</Suspense>
}

/** Runs `job` when the browser is next idle, or after `after` ms; gives back the cancel. */
function whenIdle(job: () => void, after: number): () => void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback
  if (idle) {
    const id = idle(job, { timeout: after * 2 })
    return () => (globalThis as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id)
  }
  const id = setTimeout(job, after)
  return () => clearTimeout(id)
}

/**
 * Fetches the light pages quietly once the shelf is up and sitting still
 * (D-0080 §1), so tapping a tab still feels instant.
 *
 * The dashboard first, because it is the most likely next tap; then Stats, the
 * challenges and the calendar. **The garden and the den are deliberately left
 * out**: they carry their own 3D, they are the heavy two, and they already take
 * a moment to draw — fetching them every visit would make her phone do the work
 * even on the days she doesn't open them (Hanna's choice, 26 November 2026).
 */
export function usePrefetchPages(ready: boolean): void {
  useEffect(() => {
    if (!ready) return
    return whenIdle(() => {
      void import('#/components/Dashboard')
      void import('#/components/StatsPage')
      void import('#/components/ChallengesPage')
      void import('#/components/CalendarPage')
    }, 2000)
  }, [ready])
}
