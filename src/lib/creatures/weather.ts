/**
 * The den window's sky and weather (T-0031 Design §8): from the device's clock
 * and date only, never a weather service. The room never gets darker; only the
 * pane changes.
 */

export type Sky = 'dawn' | 'day' | 'dusk' | 'night'
export type Weather = 'snow' | 'rain' | 'sun'

/** Day 07:00–18:00, dawn 05:00–07:00, dusk 18:00–20:00, night the rest. */
export function skyAt(now: Date): Sky {
  const h = now.getHours() + now.getMinutes() / 60
  if (h >= 7 && h < 18) return 'day'
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 18 && h < 20) return 'dusk'
  return 'night'
}

/** December–February snow, March–April and October–November rain, May–September sun. */
export function weatherAt(now: Date): Weather {
  const m = now.getMonth() + 1
  if (m === 12 || m <= 2) return 'snow'
  if (m <= 4 || m >= 10) return 'rain'
  return 'sun'
}

/** "with snow", "with rain", "with sunshine" for the den's description. */
export const WEATHER_WORDS: Record<Weather, string> = { snow: 'snow', rain: 'rain', sun: 'sunshine' }
