import { useEffect, useMemo } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { earnedThrough, readingDays } from '#/lib/creatures/cookies'
import { cookieMark, cookieMarkEvent } from '#/lib/creatures/cookieMark'
import type { CreatureChoices } from './useCreatureChoices'

/**
 * Keeps the mark of cookies earned up to date (D-0081), so a day corrected
 * downwards can never take back cookies she has already spent.
 *
 * It lives on the page, like the facts' mark (D-0079 §4): cookies are earned by
 * reading, not by opening the Creatures tab, so the mark has to keep up on a
 * day she only looks at her shelf.
 */
export function useCookieMark(books: Book[], choices: CreatureChoices): void {
  const mark = useMemo(() => cookieMark(choices.log), [choices.log])
  const earned = useMemo(() => Math.floor(earnedThrough(readingDays(books), localDay())), [books])
  const { record } = choices
  useEffect(() => {
    // writing it makes `mark` catch up, so this settles after one write
    if (earned > mark) record(cookieMarkEvent(earned))
  }, [earned, mark, record])
}
