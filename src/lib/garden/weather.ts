import { mixedHash } from '../creatures/hash'
import { realDay, seasonOf } from './seasons'
import type { Season } from './seasons'

/**
 * The weather in the garden (D-0083 §1): April showers, a still bright day in
 * July, November mist. It is **invented from the date, never fetched**. There
 * is no weather service behind it, so it is the same on her phone and on the
 * computer, it never waits for the internet, it never fails, and it can be
 * tested — which is exactly why Hanna chose it over real weather.
 *
 * One day is one weather, worked out from the `yyyy-mm-dd` day alone with the
 * same hash the creatures use (D-0033 §7), drawn from the month's own weighted
 * list. The lists are what make a month feel like itself: showers in April,
 * long bright days in July, mist in November, snow in the deep of winter.
 *
 * Weather sits **beside** the season, it does not fight it (D-0050): winter's
 * snowy ground is the season's and stays whatever the weather is; `snow` only
 * adds falling snow to it. Nothing about the weather is ever saved, and like a
 * season or the night it can be looked at without being kept (D-0071 §6).
 */

export type GardenWeather = 'sun' | 'cloud' | 'shower' | 'rain' | 'mist' | 'snow' | 'frost'

export const WEATHERS: readonly GardenWeather[] = ['sun', 'cloud', 'shower', 'rain', 'mist', 'snow', 'frost']

export const WEATHER_LABEL: Record<GardenWeather, string> = {
  sun: 'Bright',
  cloud: 'Cloudy',
  shower: 'Showers',
  rain: 'Rain',
  mist: 'Mist',
  snow: 'Snow',
  frost: 'Frost',
}

export const WEATHER_ICON: Record<GardenWeather, string> = {
  sun: '☀️',
  cloud: '☁️',
  shower: '🌦️',
  rain: '🌧️',
  mist: '🌫️',
  snow: '🌨️',
  frost: '🧊',
}

/** What a screen reader hears instead of the drawing, in her words. */
export const WEATHER_LINE: Record<GardenWeather, string> = {
  sun: 'a bright still day',
  cloud: 'a soft grey sky',
  shower: 'showers coming and going',
  rain: 'steady rain',
  mist: 'mist lying over the beds',
  snow: 'snow falling',
  frost: 'a white frost',
}

/** Rain of any kind: the garden shows drops and the leaves shine. */
export const isWet = (w: GardenWeather) => w === 'rain' || w === 'shower'

/**
 * Each month's own weather, as weights. A weather left out of a month simply
 * never happens then: no snow in July, no showers in the frost. Tunable here
 * without a new decision; that the weather is invented and never fetched is
 * D-0083's.
 */
const MONTHS: ReadonlyArray<ReadonlyArray<readonly [GardenWeather, number]>> = [
  // January: cold, grey, and the snow that winter already lies under
  [
    ['snow', 3],
    ['frost', 3],
    ['cloud', 3],
    ['mist', 1],
    ['rain', 1],
    ['sun', 1],
  ],
  // February
  [
    ['snow', 2],
    ['frost', 3],
    ['cloud', 3],
    ['mist', 1],
    ['rain', 2],
    ['sun', 1],
  ],
  // March: the first bright days between the rain
  [
    ['cloud', 3],
    ['shower', 3],
    ['rain', 2],
    ['sun', 2],
    ['mist', 1],
    ['frost', 1],
  ],
  // April: showers, which is the whole point of April
  [
    ['shower', 5],
    ['sun', 3],
    ['cloud', 3],
    ['rain', 1],
  ],
  // May
  [
    ['sun', 4],
    ['shower', 3],
    ['cloud', 3],
    ['rain', 1],
  ],
  // June
  [
    ['sun', 5],
    ['cloud', 3],
    ['shower', 2],
  ],
  // July: still bright days, one after another
  [
    ['sun', 6],
    ['cloud', 2],
    ['shower', 2],
  ],
  // August
  [
    ['sun', 5],
    ['cloud', 3],
    ['shower', 2],
  ],
  // September: mist in the mornings
  [
    ['sun', 3],
    ['cloud', 4],
    ['shower', 2],
    ['mist', 2],
  ],
  // October
  [
    ['cloud', 4],
    ['rain', 3],
    ['mist', 3],
    ['sun', 2],
  ],
  // November: mist, and plenty of it
  [
    ['mist', 5],
    ['cloud', 4],
    ['rain', 3],
    ['frost', 1],
    ['sun', 1],
  ],
  // December
  [
    ['snow', 3],
    ['cloud', 3],
    ['frost', 2],
    ['mist', 2],
    ['rain', 2],
    ['sun', 1],
  ],
]

/** The weathers a month can have at all, in the order they are weighted. */
export const weathersOfMonth = (month: number): GardenWeather[] => (MONTHS[month - 1] ?? MONTHS[0]).map(([w]) => w)

/**
 * The weather of a day. A day that does not exist (2027-02-29) or isn't a day
 * at all has no weather of its own and gets the quietest sky there is, so a
 * caller never has to handle null.
 */
export function weatherOf(day: string): GardenWeather {
  if (!realDay(day)) return 'cloud'
  const month = Number(day.slice(5, 7))
  const list = MONTHS[month - 1] ?? MONTHS[0]
  let total = 0
  for (const [, weight] of list) total += weight
  // the same number for the same day on every device, for ever
  let n = mixedHash(`garden-weather:${day}`) % total
  for (const [weather, weight] of list) {
    if (n < weight) return weather
    n -= weight
  }
  return list[list.length - 1][0]
}

/** The season the weather belongs to, for a caller that has only the day. */
export const seasonOfWeather = (day: string): Season => seasonOf(day) ?? 'winter'

/** "🌦️ Showers" for a chip. */
export const weatherChip = (w: GardenWeather) => `${WEATHER_ICON[w]} ${WEATHER_LABEL[w]}`
