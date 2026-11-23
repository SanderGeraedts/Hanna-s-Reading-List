import { STAGE_WORD, hasStar, nextStageLevel, stageOf } from './creature'
import type { Mood, Pet, Stage } from './creature'
import { GROWN_FROM, SPECIES_WORD, YOUNG_FROM } from './numbers'
import { speciesById } from './species'

/** Every sentence the creatures show (T-0029 Design §13), worked out in one place so tab, block and tests agree. */

/** "🍪 23", "🍪 −4" (a real minus). */
export const cookieNumber = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

/** "Biscuit ⭐ ✨": a star from level 11, a sparkle for a shiny. */
export function displayName(pet: Pick<Pet, 'name' | 'level' | 'shiny'>): string {
  return `${pet.name}${hasStar(pet.level) ? ' ⭐' : ''}${pet.shiny ? ' ✨' : ''}`
}

/** "Level 3 · Baby". */
export const levelLine = (pet: Pick<Pet, 'level' | 'stage'>) => `Level ${pet.level} · ${STAGE_WORD[pet.stage]}`

/** "Next: level 4 · 12 🍪 to go", "Next: young at level 4 · 12 🍪 to go", "Next: grown-up at level 10 · 40 🍪 to go". */
export function nextLine(pet: Pick<Pet, 'level' | 'into' | 'need'>): string {
  const next = pet.level + 1
  const toGo = pet.need - pet.into
  const stage = nextStageLevel(pet.level) === next ? (next === YOUNG_FROM ? 'young' : next === GROWN_FROM ? 'grown-up' : null) : null
  return `Next: ${stage ? `${stage} at ` : ''}level ${next} · ${toGo} 🍪 to go`
}

/** "18 of 30 to level 4" for the growth bar. */
export const growthText = (pet: Pick<Pet, 'level' | 'into' | 'need'>) => `${pet.into} of ${pet.need} to level ${pet.level + 1}`

export function moodLine(name: string, mood: Mood | null): string | null {
  if (mood === 'missing') return `💤 ${name} misses you`
  if (mood === 'sleepy') return `🌙 ${name} is sleepy`
  if (mood === 'back') return `💛 ${name} is so happy you're back!`
  return null
}

const STAGE_DESCRIPTION: Record<Stage, string> = { baby: 'a baby', young: 'young', grown: 'all grown up' }

/** The text next to the den's canvas (Design §10). */
export function denDescription(pet: Pick<Pet, 'name' | 'species' | 'stage' | 'mood'>): string {
  const word = SPECIES_WORD[pet.species] ?? speciesById(pet.species).name.toLowerCase()
  const mood = pet.mood === 'missing' ? ' It misses you.' : pet.mood === 'sleepy' ? ' It is sleepy.' : ''
  return `${pet.name} the ${word}, ${STAGE_DESCRIPTION[pet.stage]}, sitting on its cushion in the den.${mood}`
}

/** The text next to the block's picture: "Biscuit the house cat, level 3." */
export function stillDescription(pet: Pick<Pet, 'name' | 'species' | 'level'>): string {
  const word = SPECIES_WORD[pet.species] ?? speciesById(pet.species).name.toLowerCase()
  return `${pet.name} the ${word}, level ${pet.level}.`
}

export const EGG_DESCRIPTION = 'A welcome egg on a cushion.'

/** Waiting for you (Design §11): "Biscuit reached level 5!", or at a new stage "Biscuit is young now!" / "Biscuit is all grown up!". */
export function levelUpLine(name: string, level: number, seenLevel: number): string {
  const stage = stageOf(level)
  if (stage !== stageOf(seenLevel)) return stage === 'grown' ? `${name} is all grown up!` : `${name} is young now!`
  return `${name} reached level ${level}!`
}

/** The live region after a feed that levelled up: "Biscuit reached level 4 and is young now!" or "Biscuit reached level 5!". */
export function levelUpSay(name: string, level: number, before: number): string {
  const stage = stageOf(level)
  if (stage === stageOf(before)) return `${name} reached level ${level}!`
  return `${name} reached level ${level} and is ${stage === 'grown' ? 'all grown up' : 'young'} now!`
}

/** The live region after a feed: "Biscuit ate 5 cookies. 18 cookies left." */
export function feedSay(name: string, amount: number, left: number): string {
  return `${name} ate ${amount} ${amount === 1 ? 'cookie' : 'cookies'}. ${cookieNumber(left)} ${Math.abs(left) === 1 ? 'cookie' : 'cookies'} left.`
}
