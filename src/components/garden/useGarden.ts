import { useCallback, useMemo } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { deriveGarden } from '#/lib/garden/garden'
import type { Garden, Plant } from '#/lib/garden/garden'
import type { GardenItemId } from '#/lib/garden/numbers'
import { freeItemSlot, placeItem, removeItem } from '#/lib/garden/tend'
import type { PlaceEvent, Tended } from '#/lib/garden/tend'
import type { Season } from '#/lib/garden/seasons'
import { useCreaturesApi } from '../creatures/CreaturesContext'

/**
 * The garden for a page or a block (T-0060 … T-0065, D-0071): worked out from
 * her books and her choice log. A plant is never moved, so the only thing she
 * can do to the garden is put an item in it or take one away. The log is the
 * one the creatures already keep (D-0052) — the same storage and the same
 * route, with garden keys — so nothing of the creatures' own game is read here.
 */

export interface GardenHandle {
  garden: Garden
  place: (year: number, item: GardenItemId) => Tended
  takeAway: (year: number, item: GardenItemId) => Tended
}

export function useGarden(books: Book[], opts: { phone?: boolean; today?: string; season?: Season } = {}): GardenHandle {
  const api = useCreaturesApi()
  const log = api.choices.log
  const today = opts.today ?? localDay()
  const phone = !!opts.phone
  const season = opts.season
  const garden = useMemo(() => deriveGarden(books, log, { today, phone, season }), [books, log, today, phone, season])

  const write = useCallback(
    (events: PlaceEvent[]) => {
      for (const e of events) api.choices.record(e as unknown as Parameters<typeof api.choices.record>[0])
    },
    [api],
  )

  const place = useCallback(
    (year: number, item: GardenItemId) => {
      const y = garden.years.find((x) => x.year === year)
      const slot = y ? freeItemSlot(y) : null
      if (slot === null) return { ok: false as const, why: 'no-slot' as const }
      const r = placeItem(garden, year, item, slot)
      if (r.ok) write(r.events)
      return r
    },
    [garden, write],
  )

  const takeAway = useCallback(
    (year: number, item: GardenItemId) => {
      const r = removeItem(garden, year, item)
      if (r.ok) write(r.events)
      return r
    },
    [garden, write],
  )

  return { garden, place, takeAway }
}

export type { Plant }
