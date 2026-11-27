import { useMemo } from 'react'
import type { Bookshop } from '#/lib/bookshop/shop'
import { isNight } from '#/lib/roomExtras'
import { weatherOf } from '#/lib/garden/weather'
import type { GardenWeather } from '#/lib/garden/weather'
import { shopDecorations } from '#/lib/bookshop/season'
import type { ShopDecoration } from '#/lib/bookshop/season'
import { useMinuteClock } from '../creatures/CreaturesContext'
import { useBirthday } from '../NewBlocks'

/**
 * What the shop looks like right now (T-0123): evening from 19:00 to 07:00 (the same hours as
 * her bookshelf room, D-0045), the garden's weather for the day (D-0083: one day, one weather,
 * on every device), and what it is dressed for. Only the picture: the trade is the same.
 */
export function useShopScene(shop: Bookshop): { night: boolean; weather: GardenWeather; decorations: ShopDecoration[] } {
  const now = useMinuteClock()
  const birthday = useBirthday()
  const night = isNight(now)
  return useMemo(
    () => ({ night, weather: weatherOf(shop.today), decorations: shopDecorations(shop.today, birthday) }),
    [night, shop.today, birthday],
  )
}
