import { STAGE_WORD, hasStar, nextStageLevel, stageOf } from './creature'
import type { Mood, Pet, Stage } from './creature'
import { AN_WORDS, EGG_PRICE, GROWN_FROM, SPECIES_WORD, YOUNG_FROM } from './numbers'
import { TIERS, speciesById } from './species'
import type { Species, SpeciesId, Tier } from './species'
import { minutesText } from './cookies'
import type { Egg, NextEgg } from './eggs'
import { theItem } from './shop'
import type { ShopItem } from './shop'
import { WEATHER_WORDS } from './weather'
import type { Weather } from './weather'

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

// ---- T-0030: eggs, hatches, duplicates, the album, pets and release (Design §13) ----------

const TIER_WORD: Record<Tier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'very rare': 'Very rare',
  epic: 'Epic',
  legendary: 'Legendary',
}
/** "Very rare". */
export const tierWord = (t: Tier) => TIER_WORD[t]
/** 1 to 6 gems: "◆◆◆" for rare. */
export const tierGems = (t: Tier) => '◆'.repeat(TIERS.indexOf(t) + 1)
/** "a common egg", "an uncommon egg", "an epic egg". */
export const eggName = (t: Tier) => `${t === 'uncommon' || t === 'epic' ? 'an' : 'a'} ${t} egg`
/** "A rare egg" at the start of a line. */
export const EggName = (t: Tier) => eggName(t).replace(/^a/, 'A')

/** "koala", "house cat", "Adélie penguin". */
export const speciesWord = (s: SpeciesId) => SPECIES_WORD[s]
/** "a koala", "an otter". */
export const aSpecies = (s: SpeciesId) => `${AN_WORDS.includes(s) ? 'an' : 'a'} ${SPECIES_WORD[s]}`

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st… */
export function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })

/** The reason line of an egg (Design §2). */
export function eggReason(e: Egg): string {
  switch (e.kind) {
    case 'books':
      return `For your ${ordinal(e.n!)} book`
    case 'hours':
      return `For ${e.n} hours of reading`
    case 'streak':
      return `For a ${e.n}-day streak`
    case 'series':
      return `For finishing ${e.label}`
    case 'challenge':
      return `For the challenge ${e.label}`
    case 'month':
      return `For ${MONTH.format(new Date(`${e.label}-01T00:00:00Z`))}'s challenge`
    case 'bingo':
      return 'For a full bingo card'
    case 'shop':
      return 'From the shop'
    default:
      return 'A welcome egg'
  }
}

/** Waiting for you: "A rare egg is waiting for you!" or "3 eggs are waiting for you!". */
export const eggsWaitingLine = (eggs: readonly Egg[]) =>
  eggs.length === 1 ? `${EggName(eggs[0].tier)} is waiting for you!` : `${eggs.length} eggs are waiting for you!`
/** The block: "A rare egg is waiting" or "3 eggs are waiting". */
export const eggsWaitingShort = (eggs: readonly Egg[]) =>
  eggs.length === 1 ? `${EggName(eggs[0].tier)} is waiting` : `${eggs.length} eggs are waiting`

/** "Next egg: 2 more books", "Next rare egg: 3 h 20 min more reading", "Next egg: 4 more days in a row". */
export function nextEggLine(n: NextEgg): string {
  const head = n.tier === 'common' ? 'Next egg' : `Next ${n.tier} egg`
  if (n.kind === 'books') return `${head}: ${n.left} more ${n.left === 1 ? 'book' : 'books'}`
  if (n.kind === 'hours') return `${head}: ${minutesText(n.left)} more reading`
  return `${head}: ${n.left} more ${n.left === 1 ? 'day' : 'days'} in a row`
}

/** The reveal's heading: "It's a koala!", "It's an otter!", or "Another koala!" for a duplicate. */
export const revealHeading = (s: SpeciesId, duplicate: boolean) =>
  duplicate ? `Another ${SPECIES_WORD[s]}!` : `It's ${aSpecies(s)}!`

/** The live region after a hatch: "A rare egg hatched: it's a koala! A shiny one! New in your album!". */
export function hatchSay(tier: Tier, s: SpeciesId, shiny: boolean, firstFind: boolean): string {
  return `${EggName(tier)} hatched: it's ${aSpecies(s)}!${shiny ? ' A shiny one!' : ''}${firstFind ? ' New in your album!' : ''}`
}

/** Half a tier's shop price: what a duplicate turned into cookies gives. */
export const duplicateCookies = (t: Tier) => EGG_PRICE[t] / 2
export const cookiesSay = (n: number) => `${n} ${n === 1 ? 'cookie' : 'cookies'} added.`
export const currentSay = (name: string) => `${name} is your current pet.`
export const releaseSay = (name: string, next: string) => `${name} was released. ${next} is your current pet now.`
/** "Level 6 · Young · Koala" in the pet list. */
export const petLine = (pet: Pick<Pet, 'level' | 'stage' | 'species'>) => `${levelLine(pet)} · ${speciesById(pet.species).name}`

/** The album's label in words (Design §6). */
export function albumLabel(s: Species): string {
  if (!s.redList) return 'Fantasy creature'
  if (s.redList.category === 'domestic') return 'Domestic animal'
  return s.redList.category
}
/** The source line under it, or null for a fantasy creature. */
export function albumSource(s: Species): string | null {
  if (!s.redList) return null
  if (s.redList.category === 'domestic') return 'Not on the IUCN Red List'
  return s.redList.year ? `IUCN Red List, ${s.redList.year}` : 'IUCN Red List'
}
export const shiniesLine = (n: number) => `✨ ${n} ${n === 1 ? 'shiny' : 'shinies'}`

/** The den's text during a hatch: "A rare egg on a cushion." */
export const eggOnCushion = (t: Tier) => `${EggName(t)} on a cushion.`

// ---- T-0031: the shop (Design §14) ----------------------------------------------------------

const left = (n: number) => `${cookieNumber(n)} ${Math.abs(n) === 1 ? 'cookie' : 'cookies'} left.`
const The = (i: Pick<ShopItem, 'name'>) => `The ${i.name.toLowerCase()}`

/** "Bought the bobble hat. 52 cookies left." */
export const boughtSay = (i: Pick<ShopItem, 'name'>, balance: number) => `Bought ${theItem(i)}. ${left(balance)}`
/** "Bought a rare egg. It's waiting in your eggs." */
export const eggBoughtSay = (t: Tier) => `Bought ${eggName(t)}. It's waiting in your eggs.`
/** "Biscuit ate the honey cake. 70 cookies left." */
export const foodSay = (name: string, i: Pick<ShopItem, 'name'>, balance: number) => `${name} ate ${theItem(i)}. ${left(balance)}`
export const NOT_ENOUGH = 'Not enough cookies any more.'
/** "Biscuit is wearing the bobble hat." */
export const wearSay = (name: string, i: Pick<ShopItem, 'name'>) => `${name} is wearing ${theItem(i)}.`
/** "Took off the bobble hat." */
export const takeOffSay = (i: Pick<ShopItem, 'name'>) => `Took off ${theItem(i)}.`
/** "The reading lamp is in the den." or, with a replace, "The slide is in the den. The ball is put away." */
export const placeSay = (i: Pick<ShopItem, 'name'>, replaced?: Pick<ShopItem, 'name'>) =>
  `${The(i)} is in the den.${replaced ? ` ${The(replaced)} is put away.` : ''}`
/** "Put the reading lamp away." */
export const putAwaySay = (i: Pick<ShopItem, 'name'>) => `Put ${theItem(i)} away.`
/** "The forest is your habitat now." */
export const habitatSay = (i: Pick<ShopItem, 'name'>) => `${The(i)} is your habitat now.`
/** "The snow globe is in your reading room." / "The snow globe is hidden in the room on this device." */
export const decorSay = (i: Pick<ShopItem, 'name'>, on: boolean) =>
  on ? `${The(i)} is in your reading room.` : `${The(i)} is hidden in the room on this device.`
/** "the bobble hat and the reading glasses", "a, b and c". */
export function andList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/**
 * The den's hidden description with what she sees (Design §12): "Biscuit the house cat, a baby,
 * wearing the bobble hat and the reading glasses, on the cloud cushion in the forest. In the den:
 * the window with snow, the mini bookcase and the reading lamp." Short when nothing is bought: as T-0029.
 */
export function denShopDescription(
  pet: Pick<Pet, 'name' | 'species' | 'stage' | 'mood'>,
  worn: readonly ShopItem[],
  bed: ShopItem | null,
  habitat: ShopItem | null,
  items: readonly ShopItem[],
  weather: Weather,
): string {
  if (!worn.length && !bed && !habitat && !items.length) return denDescription(pet)
  const word = SPECIES_WORD[pet.species] ?? speciesById(pet.species).name.toLowerCase()
  const wearing = worn.length ? ` wearing ${andList(worn.map(theItem))},` : ''
  const seat = bed ? theItem(bed) : 'its cushion'
  const where = habitat ? ` in ${theItem(habitat)}` : ' in the den'
  const mood = pet.mood === 'missing' ? ' It misses you.' : pet.mood === 'sleepy' ? ' It is sleepy.' : ''
  const things = items.map((i) => (i.id === 'weather-window' ? `the window with ${WEATHER_WORDS[weather]}` : theItem(i)))
  return `${pet.name} the ${word}, ${STAGE_DESCRIPTION[pet.stage]},${wearing} on ${seat}${where}.${things.length ? ` In the den: ${andList(things)}.` : ''}${mood}`
}
