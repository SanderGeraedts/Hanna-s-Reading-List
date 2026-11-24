import { useEffect, useState } from 'react'
import type { Book } from '#/lib/library'
import { deriveCreatures } from '#/lib/creatures/creature'
import { cheerKey, finishedToday } from '#/lib/creatures/shelfPet'
import type { CreaturesApi } from './CreaturesContext'
import type { ShelfPetShows } from './ShelfPet'
import { SLEEPY_FROM, SLEEPY_UNTIL } from '#/lib/creatures/numbers'
import { addDays } from '#/lib/creatures/days'

/** Days read in a row up to and including today, or 0. */
function currentStreak(days: ReadonlyMap<string, unknown>, today: string): number {
  let n = 0
  let day = today
  while (days.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

/**
 * The shelf pet right now (T-0033 Design §8): nothing saved on the shelf, just
 * what she sees. Reads `shelfPetId` from the derived creatures, looks up the
 * pet and composes the one ShelfPetShows the scene renders.
 */
export function useShelfPet(books: Book[], api: CreaturesApi): ShelfPetShows | null {
  // re-run every minute so the night mode flips at 22:30
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const c = deriveCreatures(books, api.choices.log, now, { forceShiny: api.forceShiny, challenges: api.challenges })
  const id = c.shelfPetId
  if (!id) return null
  const pet = c.pets.find((p) => p.id === id)
  if (!pet) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  // shelf night: 22:30 – 07:00 (SLEEPY_UNTIL + 1 h, T-0033 §8c)
  const night = minutes >= SLEEPY_FROM || minutes < SLEEPY_UNTIL + 60
  const today = c.today
  let alreadyCheered = false
  try {
    alreadyCheered = typeof localStorage !== 'undefined' && localStorage.getItem(cheerKey(today)) === '1'
  } catch {
    /* no storage */
  }
  const cheer = !alreadyCheered && finishedToday(books, today)
  const streak = currentStreak(c.days, today)
  const reading = books.filter((b) => b.status === 'reading')
  return {
    species: pet.species,
    stage: pet.stage,
    shiny: pet.shiny,
    name: pet.name,
    night,
    cheer,
    streak,
    pointAt: reading.length > 0,
    onCheered: () => {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(cheerKey(today), '1')
      } catch {
        /* no storage */
      }
    },
  }
}
