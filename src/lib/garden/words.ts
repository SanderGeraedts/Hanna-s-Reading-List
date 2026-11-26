import type { Garden, Plant, YearGarden } from './garden'
import { SEASON_ICON, SEASON_LABEL } from './seasons'
import type { Season } from './seasons'
import { WEATHER_LINE } from './weather'
import type { GardenWeather } from './weather'
import { scenerySpec } from './scenery'
import type { SceneryId } from './scenery'

/**
 * Every word the garden says (T-0061 … T-0065). No hint texts (D-0014): the
 * lines here are labels, the state of the garden, and what a screen reader
 * hears instead of the picture.
 */

const STAGE_WORD = { sprout: 'a sprout', young: 'growing', grown: 'grown' } as const

/** "oak of The Name of the Wind": a plant in the middle of a sentence. */
export const plantLine = (p: Plant) => `${p.kind.name.toLowerCase()} of ${p.book.title}`

/** A plant's button label: "Oak · The Name of the Wind · grown · 🌙 night-blooming · read 2 times". */
export function plantLabel(p: Plant): string {
  const parts = [p.kind.name, p.book.title, STAGE_WORD[p.stage]]
  if (p.night) parts.push('🌙 night-blooming')
  if (p.reads > 1) parts.push(`read ${p.reads} times`)
  return parts.join(' · ')
}

/** An empty spot's button label. */
export const spotLabel = (bed: number, spot: number) => `Empty spot, bed ${bed + 1}, spot ${spot + 1}`

/** The label a spot gets while a plant is picked up. */
export const putHereLabel = (p: Plant, bed: number, spot: number) =>
  `Put the ${plantLine(p)} in bed ${bed + 1}, spot ${spot + 1}`

export const pickedUpSay = (p: Plant) => `Picked up the ${plantLine(p)}. Choose a spot.`
export const LEFT_SAY = 'Left where it was.'

export const seasonChip = (season: Season) => `${SEASON_ICON[season]} ${SEASON_LABEL[season]}`

/**
 * "Next to arrive: a potting shed, after 12 more reading days" — the one quiet
 * line about scenery on its way (D-0083 §2). It is never a goal: nothing has to
 * be done for it, it simply comes.
 */
export function nextSceneryLine(garden: Garden): string {
  if (!garden.nextScenery) return 'Everything has arrived in the garden.'
  const { name, toGo } = garden.nextScenery
  return `Next to arrive: ${withArticle(name.toLowerCase())}, after ${toGo}`
}

/** "A hedge, a fence and a brook." — the scenery standing in the garden, for a screen reader. */
export function sceneryLine(ids: readonly SceneryId[]): string {
  if (!ids.length) return ''
  const names = ids.map((id) => withArticle(scenerySpec(id).name.toLowerCase()))
  return `${list(names).replace(/^./, (c) => c.toUpperCase())}.`
}

/** "114 plants · 12 in bloom". */
export function countLine(year: YearGarden): string {
  const n = year.plants.length
  return `${n} plant${n === 1 ? '' : 's'} · ${year.blooming} in bloom`
}

/** "Next: a pond at 25 books (6 to go)", or that she has them all. */
export function nextLine(garden: Garden): string {
  if (!garden.next) return 'Every garden item unlocked.'
  const { name, books, toGo } = garden.next
  return `Next: ${withArticle(name.toLowerCase())} at ${books} books (${toGo} to go)`
}

/** "a bench", "lanterns": a plural item takes no article. */
export const withArticle = (name: string) => (name.endsWith('s') ? name : `a ${name}`)

/** A locked item's line in the strip: "Pond · at 25 books". */
export const lockedLine = (name: string, books: number) => `${name} · at ${books} books`

const list = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

const count = (n: number, one: string, many: string) => `${n === 1 ? 'one' : n === 2 ? 'two' : n} ${n === 1 ? one : many}`

/**
 * The whole garden in one sentence, for a screen reader instead of the picture
 * (T-0061 §5): "Your 2026 garden in winter: 114 plants in 10 beds, 12 in bloom,
 * with a bench, a pond and a greenhouse, and two bees."
 *
 * The day's weather and the scenery that has arrived are said here too
 * (D-0083), so what she hears is what she would have seen.
 */
export function gardenSentence(year: YearGarden, season: Season, weather?: GardenWeather, scenery: readonly SceneryId[] = []): string {
  const n = year.plants.length
  const where = year.year === 0 ? 'Your earlier garden' : `Your ${year.year} garden`
  const sky = weather ? `, with ${WEATHER_LINE[weather]}` : ''
  if (n === 0) return `${where} in ${SEASON_LABEL[season].toLowerCase()}${sky}: nothing planted yet.`
  const parts = [`${n} plant${n === 1 ? '' : 's'} in ${year.beds} bed${year.beds === 1 ? '' : 's'}`, `${year.blooming} in bloom`]
  // at most three items: ten of them read as a list, not as a garden
  const items = [...year.items.keys()].slice(0, 3).map((i) => `a ${i === 'lanterns' ? 'set of lanterns' : i}`)
  if (items.length) parts.push(`with ${list(items)}`)
  const guests: string[] = []
  if (year.visitors.bees) guests.push(count(year.visitors.bees, 'bee', 'bees'))
  if (year.visitors.butterflies) guests.push(count(year.visitors.butterflies, 'butterfly', 'butterflies'))
  if (year.visitors.birds) guests.push(count(year.visitors.birds, 'bird', 'birds'))
  if (guests.length) parts.push(`and ${list(guests)}`)
  const around = sceneryLine(scenery)
  return `${where} in ${SEASON_LABEL[season].toLowerCase()}${sky}: ${parts.join(', ')}.${around ? ` ${around}` : ''}`
}

export const EMPTY_GARDEN = 'Finish a book and the first plant appears.'
export const emptyYear = (label: string) => (label === 'Earlier' ? 'Nothing finished before the dates were noted.' : `Nothing finished in ${label}.`)
