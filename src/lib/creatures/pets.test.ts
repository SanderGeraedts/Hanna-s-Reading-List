import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { mergeLogs } from './choices'
import type { ChoiceEvent } from './choices'
import { chooseEvent, deriveCreatures, isShinyEgg, releaseEvent } from './creature'
import type { Creatures } from './creature'
import { addDays } from './days'
import { eggSpecies } from './eggs'
import { CREATURES_START, EGG_PRICE, WELCOME_CHOICES, WELCOME_EGG } from './numbers'

/**
 * Several pets (T-0030 Done when 1): hatching milestone eggs, duplicates (keep,
 * cookies, power-up), shiny safety, release with its confirm steps, the
 * current pet, and the same result on two devices from the same choices.
 */

const S = CREATURES_START
const day = (n: number) => addDays(S, n)
const at = (d: string, time = '12:00') => new Date(`${d}T${time}:00`).getTime()
let next = 0
const book = (over: Partial<Book> = {}): Book => ({ id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'read', addedAt: 0, ...over })
/** n short books, the i-th finished on day(i) */
const finished = (n: number) => Array.from({ length: n }, (_, i) => book({ pages: 10, finished: [day(i)] }))

let id = 0
const ev = (e: Record<string, unknown>, when: number): ChoiceEvent => ({ id: `e${id++}`, at: when, ...e }) as unknown as ChoiceEvent
const hatchWelcome = (species: string, when = at(S, '08:00')) => ev({ kind: 'hatch', egg: WELCOME_EGG, species }, when)
const hatchEgg = (egg: string, when: number) => ev({ kind: 'hatch', egg }, when)

/** Common book eggs whose species is (or isn't) the welcome pet's, and shiny or not as a duplicate. */
function bookEgg(want: { dupOf?: string; shiny?: boolean; not?: string[] }) {
  for (let n = 5; n < 5000; n += 5) {
    if (n % 25 === 0) continue
    const egg = `m:books-${n}`
    const s = eggSpecies(egg, 'common')
    if (want.dupOf && s !== want.dupOf) continue
    if (want.not?.includes(s)) continue
    if (want.shiny !== undefined && isShinyEgg(egg, !!want.dupOf) !== want.shiny) continue
    return { egg, n, species: s }
  }
  throw new Error('no egg found')
}

const NOW = new Date(`${day(400)}T12:00:00`)
const derive = (books: Book[], log: ChoiceEvent[]) => deriveCreatures(books, mergeLogs(log), NOW)

describe('hatching milestone eggs', () => {
  it('waits oldest first, and a hatch makes a new pet that does not become current', () => {
    const books = finished(10)
    const welcome = WELCOME_CHOICES.find((w) => w !== eggSpecies('m:books-5', 'common') && w !== eggSpecies('m:books-10', 'common'))!
    let c = derive(books, [hatchWelcome(welcome)])
    expect(c.eggs.map((e) => e.id)).toEqual(['m:books-5', 'm:books-10'])
    c = derive(books, [hatchWelcome(welcome), hatchEgg('m:books-5', at(day(20)))])
    expect(c.eggs.map((e) => e.id)).toEqual(['m:books-10'])
    expect(c.pets.map((p) => p.id)).toEqual([WELCOME_EGG, 'm:books-5'])
    expect(c.pets[1].species).toBe(eggSpecies('m:books-5', 'common'))
    expect(c.pet!.id).toBe(WELCOME_EGG)
    expect(c.found.has(c.pets[1].species)).toBe(true)
  })

  it('hatches the same creature from the same egg on every device', () => {
    const books = finished(50)
    const log = [hatchWelcome('cat'), hatchEgg('m:books-50', at(day(60)))]
    const a = derive(books, log)
    const b = derive(books, [...log].reverse())
    expect(a.pets.map((p) => [p.id, p.species, p.shiny])).toEqual(b.pets.map((p) => [p.id, p.species, p.shiny]))
    expect(a.pets.find((p) => p.id === 'm:books-50')!.tier).toBe('legendary')
  })
})

describe('duplicates (D-0033 §8)', () => {
  const welcome = 'cat'
  const dup = bookEgg({ dupOf: welcome, shiny: false })
  const books = finished(dup.n)
  const base = () => [hatchWelcome(welcome), ...Array.from({ length: dup.n / 5 }, (_, i) => `m:books-${(i + 1) * 5}`).map((e, i) => hatchEgg(e, at(day(dup.n + 1), `09:${String(i % 60).padStart(2, '0')}`)))]

  it('waits for her choice when it is not shiny, and is no pet yet', () => {
    const c = derive(books, base())
    expect(c.waiting.map((w) => w.egg)).toContain(dup.egg)
    expect(c.pets.some((p) => p.id === dup.egg)).toBe(false)
  })

  it('keep makes it a new pet', () => {
    const c0 = derive(books, base())
    const r = chooseEvent(c0, dup.egg, 'keep')
    expect(r.ok).toBe(true)
    const c = derive(books, [...base(), ev(r.ok ? r.event : {}, at(day(dup.n + 2)))])
    expect(c.pets.filter((p) => p.species === welcome).length).toBe(c0.pets.filter((p) => p.species === welcome).length + 1)
    expect(c.waiting.some((w) => w.egg === dup.egg)).toBe(false)
  })

  it('cookies add half the tier price to the balance', () => {
    const c0 = derive(books, base())
    const r = chooseEvent(c0, dup.egg, 'cookies')
    const c = derive(books, [...base(), ev(r.ok ? r.event : {}, at(day(dup.n + 2)))])
    expect(c.balance - c0.balance).toBe(EGG_PRICE.common / 2)
    expect(c.bonus).toBe(30)
    expect(c.pets.some((p) => p.id === dup.egg)).toBe(false)
  })

  it('a power-up adds 3 levels to her pet of that species', () => {
    const c0 = derive(books, base())
    const before = c0.pets.find((p) => p.id === WELCOME_EGG)!
    const r = chooseEvent(c0, dup.egg, 'power', { target: WELCOME_EGG })
    expect(r.ok).toBe(true)
    const c = derive(books, [...base(), ev(r.ok ? r.event : {}, at(day(dup.n + 2)))])
    const after = c.pets.find((p) => p.id === WELCOME_EGG)!
    expect(after.level).toBe(before.level + 3)
    expect(after.into).toBe(before.into)
    // a power-up needs a pet of the same species
    expect(chooseEvent(c0, dup.egg, 'power', { target: 'nobody' })).toEqual({ ok: false, why: 'target' })
  })

  it('counts a choice made in the same millisecond as its hatch', () => {
    const when = at(day(dup.n + 1), '10:00')
    const log = [...base().filter((e) => (e as { egg?: string }).egg !== dup.egg), { ...ev({ kind: 'hatch', egg: dup.egg }, when), id: 'z-hatch' }, { ...ev({ kind: 'choose', egg: dup.egg, pick: 'cookies' }, when), id: 'a-choose' }] as ChoiceEvent[]
    expect(derive(books, log).bonus).toBe(30)
  })

  it('a later choice for the same egg changes nothing (the first one counts)', () => {
    const c0 = derive(books, base())
    const keep = chooseEvent(c0, dup.egg, 'keep')
    const cookies = chooseEvent(c0, dup.egg, 'cookies')
    const c = derive(books, [...base(), ev(keep.ok ? keep.event : {}, at(day(dup.n + 2))), ev(cookies.ok ? cookies.event : {}, at(day(dup.n + 3)))])
    expect(c.bonus).toBe(0)
    expect(c.pets.some((p) => p.id === dup.egg)).toBe(true)
  })
})

describe('shiny safety (D-0033 §9)', () => {
  const welcome = 'capybara'
  const dup = bookEgg({ dupOf: welcome, shiny: true })
  const books = finished(dup.n)
  const base = () => [hatchWelcome(welcome), ...Array.from({ length: dup.n / 5 }, (_, i) => hatchEgg(`m:books-${(i + 1) * 5}`, at(day(dup.n + 1)) + i))]

  it('a shiny duplicate is kept as a pet when nothing is chosen', () => {
    const c = derive(books, base())
    const pet = c.pets.find((p) => p.id === dup.egg)
    expect(pet?.shiny).toBe(true)
    expect(c.waiting.some((w) => w.egg === dup.egg)).toBe(false)
    expect(c.shinyFound.has(welcome as never)).toBe(true)
  })

  it('refuses cookies or a power-up from a shiny without the hold', () => {
    const c = derive(books, base())
    expect(chooseEvent(c, dup.egg, 'cookies')).toEqual({ ok: false, why: 'shiny' })
    expect(chooseEvent(c, dup.egg, 'power', { target: WELCOME_EGG })).toEqual({ ok: false, why: 'shiny' })
    // and a forged event without the hold is ignored: the shiny stays
    const forged = derive(books, [...base(), ev({ kind: 'choose', egg: dup.egg, pick: 'cookies' }, at(day(dup.n + 2)))])
    expect(forged.pets.some((p) => p.id === dup.egg)).toBe(true)
    expect(forged.bonus).toBe(0)
  })

  it('with the hold, a shiny can become cookies or a power-up', () => {
    const c0 = derive(books, base())
    const r = chooseEvent(c0, dup.egg, 'cookies', { held: true })
    expect(r).toEqual({ ok: true, event: { kind: 'choose', egg: dup.egg, pick: 'cookies', hold: 1 } })
    const c = derive(books, [...base(), ev(r.ok ? r.event : {}, at(day(dup.n + 2)))])
    expect(c.pets.some((p) => p.id === dup.egg)).toBe(false)
    expect(c.bonus).toBe(30)
    // the album keeps its shiny
    expect(c.shinyFound.has(welcome as never)).toBe(true)
  })
})

describe('release (D-0033 §9)', () => {
  // the welcome cat and two book eggs of other species, none shiny
  const a = bookEgg({ not: ['cat'], shiny: false })
  const books = finished(a.n + 5)
  const b = { egg: `m:books-${a.n + 5}` }
  const base = () => [hatchWelcome('cat'), ...Array.from({ length: (a.n + 5) / 5 }, (_, i) => hatchEgg(`m:books-${(i + 1) * 5}`, at(day(a.n + 6)) + i))]
  const release = (c: Creatures, pet: string, when: number, opts = { confirmed: true }) => {
    const r = releaseEvent(c, pet, opts)
    if (!r.ok) throw new Error(r.why)
    return ev(r.event, when)
  }

  it('is refused without the confirm, and for her last pet', () => {
    const one = derive([], [hatchWelcome('cat')])
    expect(releaseEvent(one, WELCOME_EGG, { confirmed: true })).toEqual({ ok: false, why: 'last' })
    const c = derive(books, base())
    expect(c.pets.length).toBeGreaterThan(1)
    expect(releaseEvent(c, WELCOME_EGG)).toEqual({ ok: false, why: 'confirm' })
    expect(releaseEvent(c, WELCOME_EGG, { confirmed: true }).ok).toBe(true)
  })

  it('takes the pet from her pets, keeps its species found and gives no cookies back', () => {
    const c0 = derive(books, base())
    const c = derive(books, [...base(), release(c0, WELCOME_EGG, at(day(a.n + 7)))])
    expect(c.pets.some((p) => p.id === WELCOME_EGG)).toBe(false)
    expect(c.found.has('cat')).toBe(true)
    expect(c.balance).toBe(c0.balance)
  })

  it('moves the current pet to her first remaining one', () => {
    const c0 = derive(books, base())
    const second = c0.pets[1].id
    // she picked the second as current, then released it: the first is current again
    const pick = ev({ kind: 'current', key: 'pet', pet: second }, at(day(a.n + 7)))
    const c1 = derive(books, [...base(), pick])
    expect(c1.pet!.id).toBe(second)
    const c = derive(books, [...base(), pick, release(c1, second, at(day(a.n + 8)))])
    expect(c.pet!.id).toBe(WELCOME_EGG)
    // releasing the welcome pet: the next one in hatch order
    const c2 = derive(books, [...base(), release(c0, WELCOME_EGG, at(day(a.n + 8)))])
    expect(c2.pet!.id).toBe(c0.pets[1].id)
  })

  it('never takes her last pet, even when two devices release at once', () => {
    const c0 = derive(books, base())
    const ids = c0.pets.map((p) => p.id)
    const all = ids.map((p, i) => release(c0, p, at(day(a.n + 9)) + i))
    const c = derive(books, [...base(), ...all])
    expect(c.pets.length).toBe(1)
    expect(c.pets[0].id).toBe(ids.at(-1))
  })

  it('needs the hold for a shiny', () => {
    const dup = bookEgg({ dupOf: 'cat', shiny: true })
    const more = finished(dup.n)
    const log = [hatchWelcome('cat'), ...Array.from({ length: dup.n / 5 }, (_, i) => hatchEgg(`m:books-${(i + 1) * 5}`, at(day(dup.n + 1)) + i))]
    const c = derive(more, log)
    expect(releaseEvent(c, dup.egg, { confirmed: true })).toEqual({ ok: false, why: 'shiny' })
    expect(releaseEvent(c, dup.egg, { confirmed: true, held: true }).ok).toBe(true)
    // a forged release without the hold is ignored
    const forged = derive(more, [...log, ev({ kind: 'release', pet: dup.egg, confirm: 1 }, at(day(dup.n + 3)))])
    expect(forged.pets.some((p) => p.id === dup.egg)).toBe(true)
  })

  it('gives the same pets on two devices from the same choices', () => {
    const c0 = derive(books, base())
    const phone = [...base(), release(c0, WELCOME_EGG, at(day(a.n + 7)))]
    const computer = [...base(), ev({ kind: 'current', key: 'pet', pet: b.egg }, at(day(a.n + 6), '23:00'))]
    const one = derive(books, mergeLogs(phone, computer))
    const two = derive(books, mergeLogs(computer, phone))
    expect(one.pets.map((p) => p.id)).toEqual(two.pets.map((p) => p.id))
    expect(one.pet!.id).toBe(two.pet!.id)
    expect(one.balance).toBe(two.balance)
  })
})


describe('power-ups and releases together (tester)', () => {
  // the welcome cat and a later book egg that is a cat duplicate, not shiny
  const dup = bookEgg({ dupOf: 'cat', shiny: false })
  const books = finished(dup.n)
  const base = () => [hatchWelcome('cat'), ...Array.from({ length: dup.n / 5 }, (_, i) => hatchEgg(`m:books-${(i + 1) * 5}`, at(day(dup.n + 1)) + i))]
  const powerOf = (c: Creatures, target: string) => {
    const r = chooseEvent(c, dup.egg, 'power', { target })
    if (!r.ok) throw new Error(r.why)
    return r.event
  }

  it('a power-up for a pet another device released first is ignored, and the duplicate keeps waiting', () => {
    const c0 = derive(books, base())
    const power = powerOf(c0, WELCOME_EGG)
    const t = at(day(dup.n + 3))
    const c = derive(books, [...base(), ev({ kind: 'release', pet: WELCOME_EGG, confirm: 1 }, t), ev(power, t + 1000)])
    expect(c.pets.some((p) => p.id === WELCOME_EGG)).toBe(false)
    expect(c.waiting.some((w) => w.egg === dup.egg)).toBe(true)
    expect(c.duplicates.find((d) => d.egg === dup.egg)!.pick).toBeNull()
  })

  it('a powered-up pet that is released takes its levels with it; the choice is not asked again and the species stays found', () => {
    const c0 = derive(books, base())
    const t = at(day(dup.n + 3))
    const powered = derive(books, [...base(), ev(powerOf(c0, WELCOME_EGG), t)])
    expect(powered.pets.find((p) => p.id === WELCOME_EGG)!.level).toBe(c0.pets.find((p) => p.id === WELCOME_EGG)!.level + 3)
    const c = derive(books, [...base(), ev(powerOf(c0, WELCOME_EGG), t), ev({ kind: 'release', pet: WELCOME_EGG, confirm: 1 }, t + 1000)])
    expect(c.pets.some((p) => p.id === WELCOME_EGG)).toBe(false)
    expect(c.waiting.some((w) => w.egg === dup.egg)).toBe(false)
    expect(c.duplicates.find((d) => d.egg === dup.egg)!.pick).toBe('power')
    expect(c.found.has('cat')).toBe(true)
    expect(c.balance).toBe(powered.balance)
  })
})

describe('a fixed past day after hatching (tester, sent back: un-skip with the fix)', () => {
  // A book egg and the 10-hour egg hatch the same species: the book egg comes first (a pet she
  // named), the hour egg is its duplicate (turned into cookies). Then she un-finishes one book, so
  // the book egg is no longer earned. D-0033 §10: the only way a pet goes is her own release.
  const hs = eggSpecies('m:hours-10', 'common')
  let n = 5
  while (n % 25 === 0 || eggSpecies(`m:books-${n}`, 'common') !== hs) n += 5
  const welcome = WELCOME_CHOICES.find((w) => w !== hs)!
  const shorts = Array.from({ length: n }, (_, i) => book({ pages: 1, finished: [day(i)] }))
  const audio = book({ status: 'reading', formats: ['storytel'], minutes: 600, pages: 600, readingLog: { [day(n + 5)]: 1 } })
  const log = () => {
    const out = [hatchWelcome(welcome)]
    let t = at(day(n + 6))
    for (let k = 5; k <= n; k += 5) out.push(hatchEgg(`m:books-${k}`, t++))
    out.push(hatchEgg('m:hours-10', t++))
    out.push(ev({ kind: 'name', key: `m:books-${n}`, name: 'Precious' }, t++))
    out.push(ev({ kind: 'choose', egg: 'm:hours-10', pick: 'cookies' }, t++))
    return out
  }

  it.skip('keeps her pets, names, duplicates and cookies as they were', () => {
    const before = derive([...shorts, audio], log())
    expect(before.pets.find((p) => p.id === `m:books-${n}`)?.name).toBe('Precious')
    expect(before.bonus).toBe(30)
    const fixed = [{ ...shorts[0], status: 'want', finished: [] } as Book, ...shorts.slice(1), audio]
    const after = derive(fixed, log())
    expect(after.pets.map((p) => [p.id, p.name, p.shiny])).toEqual(before.pets.map((p) => [p.id, p.name, p.shiny]))
    expect(after.waiting.map((w) => w.egg)).toEqual(before.waiting.map((w) => w.egg))
    expect(after.bonus).toBe(before.bonus)
  })
})
