import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { mergeLogs } from './choices'
import type { ChoiceEvent } from './choices'
import {
  cleanName,
  deriveCreatures,
  feedAmount,
  hatchOf,
  isShinyEgg,
  levelOf,
  moodOf,
  seededHash,
  stageOf,
  suggestedName,
} from './creature'
import { addDays } from './days'
import { CREATURES_START, SUGGESTED_NAMES, WELCOME_CHOICES, WELCOME_EGG, levelCost } from './numbers'
import { cookieNumber, displayName, feedSay, levelUpLine, levelUpSay, moodLine, nextLine } from './words'

/** Her first creature (T-0029): the welcome egg, the hatch, growing, stages and moods. */

const S = CREATURES_START
const day = (n: number) => addDays(S, n)
/** a moment on a day, device time */
const at = (d: string, time = '12:00') => new Date(`${d}T${time}:00`)

let next = 0
function book(over: Partial<Book> = {}): Book {
  return { id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'reading', addedAt: 0, ...over }
}

const hatch = (species: string, when: Date, id = `hatch-${when.getTime()}`): ChoiceEvent =>
  ({ id, at: when.getTime(), kind: 'hatch', egg: WELCOME_EGG, species }) as ChoiceEvent
const feed = (amount: number, when: Date, id = `feed-${when.getTime()}-${amount}`): ChoiceEvent =>
  ({ id, at: when.getTime(), kind: 'feed', pet: WELCOME_EGG, amount }) as ChoiceEvent

describe('the welcome egg', () => {
  it('waits on the start day: one common egg, and no cookies', () => {
    const c = deriveCreatures([], [], at(S))
    expect(c.started).toBe(true)
    expect(c.egg).toBe(true)
    expect(c.pet).toBeNull()
    expect(c.balance).toBe(0)
  })

  it('has a balance of 0 before any reading, also days later', () => {
    expect(deriveCreatures([book({ pages: 300 })], [], at(day(4))).balance).toBe(0)
  })

  it('is not there before the start (a wrong clock)', () => {
    const c = deriveCreatures([], [], at(day(-1)))
    expect(c.started).toBe(false)
    expect(c.egg).toBe(false)
  })

  it('is gone once hatched', () => {
    const c = deriveCreatures([], [hatch('cat', at(S))], at(day(1)))
    expect(c.egg).toBe(false)
    expect(c.pet?.species).toBe('cat')
  })
})

describe('the first hatch', () => {
  it('only lets her pick one of the five commons', () => {
    expect(WELCOME_CHOICES).toEqual(['cat', 'red-fox', 'capybara', 'red-squirrel', 'adelie-penguin'])
    for (const s of WELCOME_CHOICES) expect(deriveCreatures([], [hatch(s, at(S))], at(S)).pet?.species).toBe(s)
    // a rarer creature in a welcome hatch is ignored: the egg still waits
    const sneaky = deriveCreatures([], [hatch('book-dragon', at(S))], at(S))
    expect(sneaky.pet).toBeNull()
    expect(sneaky.egg).toBe(true)
  })

  it('is the same creature on every device: the earliest hatch wins, whatever order the logs merge in', () => {
    const phone = [hatch('red-fox', at(S, '09:00'), 'hatch-a')]
    const computer = [hatch('capybara', at(S, '10:00'), 'hatch-b')]
    const one = deriveCreatures([], mergeLogs(phone, computer), at(day(1)))
    const two = deriveCreatures([], mergeLogs(computer, phone), at(day(1)))
    expect(one.pet?.species).toBe('red-fox')
    expect(two.pet?.species).toBe('red-fox')
    expect(hatchOf(mergeLogs(computer, phone), WELCOME_EGG)?.id).toBe('hatch-a')
  })

  it('is shiny or not the same way for the same egg every time (1 in 20)', () => {
    expect(isShinyEgg(WELCOME_EGG)).toBe(isShinyEgg(WELCOME_EGG))
    const ids = Array.from({ length: 4000 }, (_, i) => `m:books-${i}`)
    const shinies = ids.filter(isShinyEgg).length
    expect(shinies).toBeGreaterThan(140)
    expect(shinies).toBeLessThan(260)
    const c1 = deriveCreatures([], [hatch('cat', at(S))], at(S))
    const c2 = deriveCreatures([], [hatch('cat', at(S, '18:00'))], at(day(3)))
    expect(c1.pet?.shiny).toBe(c2.pet?.shiny)
    expect(c1.pet?.shiny).toBe(isShinyEgg(WELCOME_EGG))
  })

  it('suggests the same name on every device, from the species’ list, and 🎲 goes round it', () => {
    const first = suggestedName('cat', WELCOME_EGG)
    expect(SUGGESTED_NAMES.cat).toContain(first)
    expect(suggestedName('cat', WELCOME_EGG)).toBe(first)
    const round = Array.from({ length: 6 }, (_, i) => suggestedName('cat', WELCOME_EGG, i))
    expect(new Set(round).size).toBe(6)
    expect(suggestedName('cat', WELCOME_EGG, 6)).toBe(first)
    expect(seededHash('welcome')).toBe(seededHash('welcome'))
  })

  it('keeps the first suggestion as the name until she gives one; the newest name wins', () => {
    const log: ChoiceEvent[] = [hatch('cat', at(S))]
    const c = deriveCreatures([], log, at(S))
    expect(c.pet?.name).toBe(c.pet?.suggested)
    const named = [
      ...log,
      { id: 'n1', at: at(S, '13:00').getTime(), kind: 'name', key: WELCOME_EGG, name: 'Mochi' },
      { id: 'n2', at: at(S, '14:00').getTime(), kind: 'name', key: WELCOME_EGG, name: '  Biscuit  ' },
    ] as ChoiceEvent[]
    expect(deriveCreatures([], named, at(S)).pet?.name).toBe('Biscuit')
  })

  it('cleans a name: trimmed, at most 20 characters, empty is no name', () => {
    expect(cleanName('  Biscuit ')).toBe('Biscuit')
    expect(cleanName('   ')).toBeNull()
    expect(cleanName('A'.repeat(30))).toHaveLength(20)
    expect(cleanName('🐱🐱')).toBe('🐱🐱')
  })
})

describe('growing', () => {
  it('starts at level 1 with growth 0, and each level costs 20 + 5 per level, at most 80', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 20 })
    expect(levelCost(1)).toBe(20)
    expect(levelCost(2)).toBe(25)
    expect(levelCost(20)).toBe(80)
    expect(levelCost(40)).toBe(80)
    expect(levelOf(20)).toEqual({ level: 2, into: 0, need: 25 })
    expect(levelOf(44)).toEqual({ level: 2, into: 24, need: 25 })
  })

  it('grows by itself only on reading days from the hatch day on; skipped days pause it', () => {
    const books = [book({ pages: 300, readingLog: { [day(-1)]: 0.1, [day(0)]: 0.01, [day(2)]: 0.01, [day(5)]: 0.01 } })]
    const log = [hatch('cat', at(day(0), '08:00'))]
    // day -1 is before the start and the hatch; days 1, 3, 4 have no reading
    expect(deriveCreatures(books, log, at(day(1))).pet?.growth).toBe(3)
    expect(deriveCreatures(books, log, at(day(4))).pet?.growth).toBe(6)
    expect(deriveCreatures(books, log, at(day(5))).pet?.growth).toBe(9)
  })

  it('grows 1 per cookie fed, and feeding lowers the balance', () => {
    const books = [book({ pages: 400, readingLog: { [day(0)]: 0.25 } })] // 150 minutes = 30 cookies
    const log = [hatch('cat', at(day(0), '08:00')), feed(5, at(day(0), '20:00')), feed(3, at(day(0), '20:01'))]
    const c = deriveCreatures(books, log, at(day(0), '21:00'))
    expect(c.earned).toBe(30)
    expect(c.spent).toBe(8)
    expect(c.balance).toBe(22)
    expect(c.pet?.growth).toBe(8 + 3)
  })

  it('shows a negative balance after a fix to a past day, and then nothing can be fed', () => {
    const log = [hatch('cat', at(day(0))), feed(5, at(day(0), '13:00'))]
    const c = deriveCreatures([], log, at(day(1)))
    expect(c.balance).toBe(-5)
    expect(feedAmount(c.balance)).toBe(0)
  })

  it('feeds 5, or what’s left when fewer', () => {
    expect(feedAmount(23)).toBe(5)
    expect(feedAmount(3)).toBe(3)
    expect(feedAmount(0)).toBe(0)
    expect(feedAmount(-4)).toBe(0)
  })

  it('has stages by level: Baby 1–3, Young 4–9, Grown-up 10 and up', () => {
    expect([1, 2, 3].map(stageOf)).toEqual(['baby', 'baby', 'baby'])
    expect([4, 9].map(stageOf)).toEqual(['young', 'young'])
    expect([10, 11, 40].map(stageOf)).toEqual(['grown', 'grown', 'grown'])
  })

  it('says what comes next, naming a new stage', () => {
    expect(nextLine({ level: 2, into: 13, need: 25 })).toBe('Next: level 3 · 12 🍪 to go')
    expect(nextLine({ level: 3, into: 18, need: 30 })).toBe('Next: young at level 4 · 12 🍪 to go')
    expect(nextLine({ level: 9, into: 20, need: 60 })).toBe('Next: grown-up at level 10 · 40 🍪 to go')
    expect(nextLine({ level: 12, into: 0, need: 75 })).toBe('Next: level 13 · 75 🍪 to go')
  })

  it('puts a star by the name from level 11 and a sparkle by a shiny', () => {
    expect(displayName({ name: 'Biscuit', level: 10, shiny: false })).toBe('Biscuit')
    expect(displayName({ name: 'Biscuit', level: 11, shiny: false })).toBe('Biscuit ⭐')
    expect(displayName({ name: 'Biscuit', level: 3, shiny: true })).toBe('Biscuit ✨')
  })

  it('words a level-up for Waiting for you and the live region', () => {
    expect(levelUpLine('Biscuit', 5, 4)).toBe('Biscuit reached level 5!')
    expect(levelUpLine('Biscuit', 4, 3)).toBe('Biscuit is young now!')
    expect(levelUpLine('Biscuit', 6, 2)).toBe('Biscuit is young now!')
    expect(levelUpLine('Biscuit', 10, 9)).toBe('Biscuit is all grown up!')
    expect(levelUpSay('Biscuit', 4, 3)).toBe('Biscuit reached level 4 and is young now!')
    expect(levelUpSay('Biscuit', 5, 4)).toBe('Biscuit reached level 5!')
    expect(feedSay('Biscuit', 5, 18)).toBe('Biscuit ate 5 cookies. 18 cookies left.')
  })
})

describe('moods', () => {
  const hatchDay = day(0)

  it('misses her after 3 days without reading, and is happy she is back on the next reading day', () => {
    const days = [day(1)]
    expect(moodOf(days, hatchDay, at(day(3)))).toBeNull()
    expect(moodOf(days, hatchDay, at(day(4)))).toBe('missing')
    expect(moodOf(days, hatchDay, at(day(9)))).toBe('missing')
    // she reads on day 9: the mood is gone, and it says it's happy she's back
    expect(moodOf([...days, day(9)], hatchDay, at(day(9)))).toBe('back')
    // the day after that, nothing special
    expect(moodOf([...days, day(9), day(10)], hatchDay, at(day(10)))).toBeNull()
  })

  it('misses her 3 days after the hatch when she hasn’t read since', () => {
    expect(moodOf([day(-5)], hatchDay, at(day(2)))).toBeNull()
    expect(moodOf([day(-5)], hatchDay, at(day(3)))).toBe('missing')
  })

  it('is not "back" on the hatch day itself', () => {
    expect(moodOf([day(-10), day(0)], hatchDay, at(day(0)))).toBeNull()
  })

  it('is sleepy from 22:30 to 06:00 on the device, but missing her wins', () => {
    const days = [day(1)]
    expect(moodOf(days, hatchDay, at(day(2), '22:29'))).toBeNull()
    expect(moodOf(days, hatchDay, at(day(2), '22:30'))).toBe('sleepy')
    expect(moodOf(days, hatchDay, at(day(2), '05:59'))).toBe('sleepy')
    expect(moodOf(days, hatchDay, at(day(2), '06:00'))).toBeNull()
    expect(moodOf(days, hatchDay, at(day(5), '23:00'))).toBe('missing')
  })

  it('never changes cookies or levels', () => {
    const books = [book({ pages: 300, readingLog: { [day(0)]: 0.1 } })]
    const log = [hatch('cat', at(day(0)))]
    const sad = deriveCreatures(books, log, at(day(6)))
    const night = deriveCreatures(books, log, at(day(1), '23:00'))
    expect(sad.pet?.mood).toBe('missing')
    expect(night.pet?.mood).toBe('sleepy')
    expect(sad.balance).toBe(night.balance)
    expect(sad.pet?.level).toBe(night.pet?.level)
  })

  it('has a line for each mood', () => {
    expect(moodLine('Biscuit', 'missing')).toBe('💤 Biscuit misses you')
    expect(moodLine('Biscuit', 'sleepy')).toBe('🌙 Biscuit is sleepy')
    expect(moodLine('Biscuit', 'back')).toBe("💛 Biscuit is so happy you're back!")
    expect(moodLine('Biscuit', null)).toBeNull()
  })
})

describe('balance and moods edge cases (tester)', () => {
  it('shows a negative balance when two devices fed the same cookies offline, and Feed then waits', () => {
    const books = [book({ pages: 100, readingLog: { [day(0)]: 0.2 } })] // 30 minutes = 6 cookies
    const base = [hatch('cat', at(day(0), '08:00'))]
    const phone = mergeLogs(base, [feed(5, at(day(0), '20:00'), 'feed-phone')])
    const laptop = mergeLogs(base, [feed(5, at(day(0), '20:05'), 'feed-laptop')])
    expect(deriveCreatures(books, phone, at(day(0), '21:00')).balance).toBe(1)
    expect(deriveCreatures(books, laptop, at(day(0), '21:00')).balance).toBe(1)
    const both = deriveCreatures(books, mergeLogs(phone, laptop), at(day(0), '21:00'))
    expect(both.balance).toBe(-4)
    expect(feedAmount(both.balance)).toBe(0)
    expect(cookieNumber(both.balance)).toBe('−4')
    // both feeds still grew it: nothing she did is taken back
    expect(both.pet?.fed).toBe(10)
  })

  it('is sleepy, not "back", when she reads again late at night', () => {
    expect(moodOf([day(1), day(6)], day(0), at(day(6), '23:00'))).toBe('sleepy')
    expect(moodOf([day(1), day(6)], day(0), at(day(6), '21:00'))).toBe('back')
  })
})
