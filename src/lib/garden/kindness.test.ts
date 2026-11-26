import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from '../creatures/choices'
import { cleanEvent, mergeLogs, newEventId } from '../creatures/choices'
import { SWAP_KEY_PREFIX } from '../bingoSwap'
import { ITEM_KEY_PREFIX, PLANT_KEY_PREFIX } from './spots'
import {
  KINDNESSES,
  KINDNESS_IDS,
  doKindness,
  doneToday,
  kindnessDays,
  kindnessEvent,
  kindnessGifts,
  kindnessKey,
  kindnessLine,
} from './kindness'
import type { KindnessId } from './kindness'

/**
 * The small kindnesses (D-0083 §3): never needed, never a chore, and one
 * event per kindness in the log for ever.
 */

let n = 0
/** A kindness as it really goes into the log, through the same shape check the server does. */
const saved = (id: KindnessId, day: string, at = ++n): ChoiceEvent => {
  const body = kindnessEvent(id, day)
  const e = cleanEvent({ id: newEventId('place', at, () => 0.5), at, ...body })
  expect(e, `${id} ${day} must be an event the server accepts`).not.toBeNull()
  return e as ChoiceEvent
}

describe('a kindness is remembered the way a swapped bingo square is', () => {
  it('is a place event with a g:k: key the server already accepts', () => {
    const e = kindnessEvent('water', '2026-11-26')
    expect(e.kind).toBe('place')
    expect(e.key).toBe('g:k:water')
    expect(cleanEvent({ id: 'place-x', at: 1, ...e })).not.toBeNull()
  })

  it('keeps its keys clear of the garden’s, bingo’s, the den’s and the two marks', () => {
    for (const id of KINDNESS_IDS) {
      const key = kindnessKey(id)
      expect(key.startsWith(PLANT_KEY_PREFIX)).toBe(false)
      expect(key.startsWith(ITEM_KEY_PREFIX)).toBe(false)
      expect(key.startsWith(SWAP_KEY_PREFIX)).toBe(false)
      expect(key.startsWith('home:')).toBe(false)
      expect(key).not.toBe('f:seen')
      expect(key).not.toBe('c:earned')
      expect(key.length).toBeLessThanOrEqual(60)
    }
  })

  it('leaves the log at three events however long she waters for', () => {
    // a year of watering, seeding and sweeping, every day
    let log: ChoiceEvent[] = []
    for (let d = 1; d <= 28; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`
      log = mergeLogs(log, KINDNESS_IDS.map((id) => saved(id, day)))
    }
    expect(log).toHaveLength(KINDNESS_IDS.length)
    // and what survives is the newest day
    expect(doneToday(log, '2026-11-28').size).toBe(KINDNESS_IDS.length)
  })

  it('reads only the newest day per kindness', () => {
    const log = mergeLogs([saved('water', '2026-11-20'), saved('water', '2026-11-26')])
    expect(kindnessDays(log).get('water')).toBe('2026-11-26')
  })

  it('ignores anything in the log that isn’t one of its own', () => {
    const junk = [
      { id: 'a', at: 1, kind: 'place', key: 'home:3', item: 'rug' },
      { id: 'b', at: 2, kind: 'place', key: 'g:i:2026:pond', slot: 1 },
      { id: 'c', at: 3, kind: 'place', key: 'g:k:nonsense', day: '2026-11-26' },
      { id: 'd', at: 4, kind: 'place', key: 'g:k:water', day: 'whenever' },
      { id: 'e', at: 5, kind: 'feed', pet: 'p', amount: 2 },
    ] as unknown as ChoiceEvent[]
    expect(kindnessDays(junk).size).toBe(0)
  })
})

describe('never needed, never a chore', () => {
  it('gives nothing and asks nothing when she has done none of them', () => {
    expect(kindnessGifts([], '2026-11-26')).toEqual({ bloom: 0, birds: 0, butterflies: 0 })
    expect(kindnessLine(new Set())).toBe('Nothing here needs doing. They are just nice to do.')
  })

  it('costs nothing at all to ignore for a month', () => {
    const log = [saved('water', '2026-10-01'), saved('seed', '2026-10-02'), saved('sweep', '2026-10-03')]
    // a month later, with nothing done since: exactly the garden of someone who never watered
    expect(kindnessGifts(log, '2026-11-26')).toEqual(kindnessGifts([], '2026-11-26'))
    expect(doneToday(log, '2026-11-26').size).toBe(0)
  })

  it('keeps no streak and no count: only whether it was done today', () => {
    const everyDay = ['2026-11-24', '2026-11-25', '2026-11-26'].map((d) => saved('water', d))
    const onlyToday = [saved('water', '2026-11-26')]
    expect(kindnessGifts(mergeLogs(everyDay), '2026-11-26')).toEqual(kindnessGifts(onlyToday, '2026-11-26'))
  })

  it('gives each kindness its own little something', () => {
    expect(kindnessGifts([saved('water', '2026-11-26')], '2026-11-26').bloom).toBe(1)
    expect(kindnessGifts([saved('seed', '2026-11-26')], '2026-11-26').birds).toBe(1)
    expect(kindnessGifts([saved('sweep', '2026-11-26')], '2026-11-26').butterflies).toBe(1)
  })

  it('is three or four things to do, and each one says what it gave', () => {
    expect(KINDNESSES.length).toBeGreaterThanOrEqual(3)
    expect(KINDNESSES.length).toBeLessThanOrEqual(4)
    for (const k of KINDNESSES) {
      expect(k.say.endsWith('.')).toBe(true)
      expect(Object.values(k.gift).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    }
  })
})

describe('doing one', () => {
  it('saves one event and says what it gave', () => {
    const r = doKindness([], 'seed', '2026-11-26')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.event.key).toBe('g:k:seed')
      expect(r.say).toContain('bird')
    }
  })

  it('saves nothing the second time in a day, and does not tell her off', () => {
    const log = [saved('seed', '2026-11-26')]
    const r = doKindness(log, 'seed', '2026-11-26')
    expect(r).toEqual({ ok: false, why: 'already' })
  })

  it('is there again tomorrow, with nothing owed for yesterday', () => {
    const log = [saved('seed', '2026-11-26')]
    expect(doKindness(log, 'seed', '2026-11-27').ok).toBe(true)
  })

  it('thanks her when the garden has had everything, and asks for nothing more', () => {
    expect(kindnessLine(new Set(KINDNESS_IDS))).toContain('Nothing else is needed')
  })
})
