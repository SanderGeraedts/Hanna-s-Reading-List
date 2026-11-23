import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Book } from '#/lib/library'
import { deriveCreatures, feedAmount, levelOf } from '#/lib/creatures/creature'
import type { Creatures, Pet } from '#/lib/creatures/creature'
import { feedSay, levelUpLine, levelUpSay } from '#/lib/creatures/words'
import { useCreatureChoices, useSeenLevels } from '../useCreatureChoices'
import type { CreatureChoices } from '../useCreatureChoices'

/**
 * Her creatures for the whole page (T-0029): the choices log and the
 * level-ups seen on this device live here once, so the Creatures tab, the
 * dashboard block and Waiting for you always show the same creature.
 */

export interface CreaturesApi {
  choices: CreatureChoices
  seen: Record<string, number>
  see: (pet: string, level: number) => void
  /** dev only: every hatch comes out shiny (to see one; never in a build) */
  forceShiny: boolean
}

const Ctx = createContext<CreaturesApi | null>(null)

/** In dev, `localStorage['hannas-reading-list:dev-shiny'] = '1'` makes every hatch shiny (Design §14). */
function devShiny(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem('hannas-reading-list:dev-shiny') === '1'
  } catch {
    return false
  }
}

export function CreaturesProvider({ accountId, children }: { accountId: string | null; children: ReactNode }) {
  const choices = useCreatureChoices(accountId)
  const [seen, see] = useSeenLevels(accountId)
  const [forceShiny] = useState(devShiny)
  const value = useMemo(() => ({ choices, seen, see, forceShiny }), [choices, seen, see, forceShiny])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Without a provider (a block rendered on its own, e.g. in a test): an empty log that saves nothing. */
const NO_CHOICES: CreaturesApi = {
  choices: { log: [], hatch: () => {}, rename: () => {}, feed: () => {} },
  seen: {},
  see: () => {},
  forceShiny: false,
}

export function useCreaturesApi(): CreaturesApi {
  return useContext(Ctx) ?? NO_CHOICES
}

/** The device clock, again every minute (moods follow the time of day). */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export interface LevelUp {
  pet: Pet
  text: string
}

/** Her creatures right now, worked out from the books and the log, with what Feed and Waiting for you need. */
export function useCreatures(books: Book[]) {
  const api = useCreaturesApi()
  const now = useMinuteClock()
  const c: Creatures = useMemo(
    () => deriveCreatures(books, api.choices.log, now, { forceShiny: api.forceShiny }),
    [books, api.choices.log, now, api.forceShiny],
  )
  const pet = c.pet
  // the newest level-up not seen on this device; never on its first meeting with a level-1 pet
  const levelUp: LevelUp | null = pet && pet.level > (api.seen[pet.id] ?? 1) ? { pet, text: levelUpLine(pet.name, pet.level, api.seen[pet.id] ?? 1) } : null

  /** One tap on Feed: gives what feedAmount allows; answers what the live region says, or null when nothing was given. */
  const feed = useCallback((): { say: string; levelUp: boolean } | null => {
    if (!pet) return null
    const amount = feedAmount(c.balance)
    if (!amount) return null
    api.choices.feed(pet.id, amount)
    const after = levelOf(pet.growth + amount).level
    // she saw it happen: not in Waiting for you on this device
    if (after > pet.level) {
      api.see(pet.id, after)
      return { say: levelUpSay(pet.name, after, pet.level), levelUp: true }
    }
    return { say: feedSay(pet.name, amount, c.balance - amount), levelUp: false }
  }, [api, c.balance, pet])

  return { c, api, levelUp, feed, now }
}
