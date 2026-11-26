import { useEffect, useMemo } from 'react'
import type { Book } from '#/lib/library'
import { factsUnlocked } from '#/lib/facts'
import { factsSeen, factsSeenEvent } from '#/lib/factsSeen'
import type { CreatureChoices } from './useCreatureChoices'

/**
 * How far along her facts are (D-0079), and the one place that moves the mark
 * on.
 *
 * It lives on the page and not in the Fact of the day block, because a fact is
 * unlocked by a **reading day**, not by looking at the block: the mark must keep
 * up even on a day she only opens the shelf, and even when she has hidden the
 * block. The mark only ever grows, so a reading day that goes away cannot pull
 * her facts back onto one she has already read.
 */
export function useFactMark(books: Book[], choices: CreatureChoices): number {
  const mark = useMemo(() => factsSeen(choices.log), [choices.log])
  const unlocked = useMemo(() => factsUnlocked(books, new Date(), mark), [books, mark])
  const { record } = choices
  useEffect(() => {
    // writing it makes `mark` catch up, so this settles after one write
    if (unlocked > mark) record(factsSeenEvent(unlocked))
  }, [unlocked, mark, record])
  return mark
}
