import { useEffect, useMemo, useState } from 'react'
import { loadGoals } from '#/server/shelf'
import { goalKey, readLocalGoal } from './DashboardExtras'

/** A year's reading goal: the copy in this browser, then the server's. */
export function useYearGoal(accountId: string | null, year: number): number | null {
  const key = goalKey(accountId, year)
  const [goal, setGoal] = useState(() => readLocalGoal(key))
  useEffect(() => {
    setGoal(readLocalGoal(key))
    if (!accountId) return
    let live = true
    loadGoals()
      .then((goals) => {
        const remote = goals?.[String(year)]
        if (live && typeof remote === 'number') setGoal(remote)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [accountId, key, year])
  return goal
}

/** Every goal this browser knows, as year → books, from its own storage. */
function readLocalGoals(accountId: string | null): Record<number, number> {
  const prefix = goalKey(accountId, 0).slice(0, -1)
  const out: Record<number, number> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(prefix)) continue
      const year = Number(k.slice(prefix.length))
      const n = readLocalGoal(k)
      if (Number.isInteger(year) && year > 1900 && year < 3000 && n) out[year] = n
    }
  } catch {
    /* storage blocked: no goals, which only means the goal challenge counts for nothing */
  }
  return out
}

/**
 * Every year's reading goal (D-0060 §6): the badge family counts finished
 * challenges over every year, so it needs them all, not only this year's.
 * The server's copy wins, as it does for one year.
 */
export function useAllGoals(accountId: string | null): Record<number, number> {
  const [local] = useState(() => readLocalGoals(accountId))
  const [remote, setRemote] = useState<Record<number, number> | null>(null)
  useEffect(() => {
    if (!accountId) return
    let live = true
    loadGoals()
      .then((goals) => {
        if (!live || !goals) return
        const out: Record<number, number> = {}
        for (const [year, n] of Object.entries(goals)) if (typeof n === 'number' && n > 0) out[Number(year)] = n
        setRemote(out)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [accountId])
  return useMemo(() => ({ ...local, ...(remote ?? {}) }), [local, remote])
}
