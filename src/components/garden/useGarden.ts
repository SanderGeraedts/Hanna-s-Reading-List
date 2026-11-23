import { useCallback, useMemo } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { deriveGarden } from '#/lib/garden/garden'
import type { Garden, Plant, YearGarden } from '#/lib/garden/garden'
import type { GardenItemId } from '#/lib/garden/numbers'
import { freeItemSlot, movePlant, placeItem, removeItem, tidyYear } from '#/lib/garden/tend'
import type { PlaceEvent, Tended } from '#/lib/garden/tend'
import type { Spot } from '#/lib/garden/spots'
import { useCreaturesApi } from '../creatures/CreaturesContext'

/**
 * The garden for a page or a block (T-0060 … T-0065): worked out from her books
 * and her choice log, with the three things she can do to it. The log is the
 * one the creatures already keep (D-0052) — the same storage and the same
 * route, with garden keys — so nothing of the creatures' own game is read here.
 */

export interface GardenHandle {
  garden: Garden
  /** moves a plant; the answer says what the status should say */
  move: (year: YearGarden, plantId: string, to: Spot) => Tended
  place: (year: number, item: GardenItemId) => Tended
  takeAway: (year: number, item: GardenItemId) => Tended
  /** puts a year garden in reading order; the answer carries the events that undo it */
  tidy: (year: YearGarden) => Tended
  /** writes a set of events back as they are: the way Undo puts the old spots back */
  apply: (events: PlaceEvent[]) => void
}

export function useGarden(books: Book[], opts: { phone?: boolean; today?: string } = {}): GardenHandle {
  const api = useCreaturesApi()
  const log = api.choices.log
  const today = opts.today ?? localDay()
  const phone = !!opts.phone
  const garden = useMemo(() => deriveGarden(books, log, { today, phone }), [books, log, today, phone])

  const write = useCallback(
    (events: PlaceEvent[]) => {
      for (const e of events) api.choices.record(e as unknown as Parameters<typeof api.choices.record>[0])
    },
    [api],
  )

  const move = useCallback(
    (year: YearGarden, plantId: string, to: Spot) => {
      const r = movePlant(year, plantId, to)
      if (r.ok) write(r.events)
      return r
    },
    [write],
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

  const tidy = useCallback(
    (year: YearGarden) => {
      const r = tidyYear(year)
      if (r.ok) write(r.events)
      return r
    },
    [write],
  )

  return { garden, move, place, takeAway, tidy, apply: write }
}

export type { Plant }
