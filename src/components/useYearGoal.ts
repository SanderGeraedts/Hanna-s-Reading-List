import { useEffect, useState } from 'react'
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
