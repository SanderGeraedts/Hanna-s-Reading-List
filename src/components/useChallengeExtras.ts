import { useMemo } from 'react'
import type { BadgeOptions } from '#/lib/badges'
import { bingoSwaps } from '#/lib/bingoSwap'
import { useOwnChallenges } from './OwnChallenges'
import { useCreatureChoices } from './useCreatureChoices'
import { useAllGoals } from './useYearGoal'

/**
 * What the badges need beyond her books (D-0064 §6, D-0067): her own
 * challenges, her bingo swaps and her reading goals. All three already sync on
 * their own; this hook only puts them in one object so the `challenges-N`
 * medals count the same on the dashboard as on the Challenges page.
 */
export function useChallengeExtras(accountId: string | null): BadgeOptions {
  const [challenges] = useOwnChallenges(accountId)
  const choices = useCreatureChoices(accountId)
  const goals = useAllGoals(accountId)
  const swaps = useMemo(() => bingoSwaps(choices.log), [choices.log])
  return useMemo(() => ({ challenges, swaps, goals }), [challenges, swaps, goals])
}
