import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { UPGRADES } from './numbers'
import type { Bookshop, Line } from './shop'
import { awaySentence, lastsSentence, lineText, nextUpgrade, savingSentence, stockSentence, titleList, tradeSentence, upgradeEffect } from './words'

/** The shop in her words (T-0113): plain English, and never a number without a noun. */

const book = (title: string): Book => ({ id: title, title, authors: [], color: '#333', status: 'read', addedAt: 0 })
const line = (title: string, copies: number): Line => ({ id: title, book: book(title), copies })

const shop = (over: Partial<Bookshop> = {}): Bookshop => ({
  start: '2026-11-26',
  open: true,
  today: '2026-12-01',
  todayShare: 0.5,
  titles: 3,
  shelf: [],
  stock: 0,
  earned: 0,
  spent: 0,
  coins: 0,
  sold: 0,
  bought: [],
  owned: new Set(),
  trading: { customers: 6, price: 2 },
  recent: [],
  recentFrom: '2026-11-26',
  ...over,
})

const away = (copies: number, titles: Line[], days = 3) => ({ from: '2026-11-28', days, copies, coins: copies * 2, titles, capped: false })

describe('what sold while she was away', () => {
  it('names the book when it was only one', () => {
    expect(awaySentence(away(3, [line('Babel', 3)]))).toBe('3 copies of Babel sold while you were away.')
  })
  it('says “1 copy”, not “1 copies”', () => {
    expect(awaySentence(away(1, [line('Babel', 1)]))).toBe('1 copy of Babel sold while you were away.')
  })
  it('names a few of them when there were more', () => {
    const lines = [line('Babel', 4), line('Piranesi', 3), line('Circe', 2), line('Hild', 1)]
    expect(awaySentence(away(10, lines))).toBe('10 copies sold while you were away: Babel, Piranesi and 2 more.')
  })
  it('does not pretend when nobody came in', () => {
    expect(awaySentence(away(0, []))).toBe('Nobody came in while you were away.')
  })
})

describe('the shelves', () => {
  it('says what is on them', () => {
    expect(stockSentence(shop({ stock: 12, shelf: [line('Babel', 7), line('Circe', 5)] }))).toBe('12 copies on the shelves, of 2 titles.')
  })
  it('says the shelves are bare without making her feel told off', () => {
    expect(stockSentence(shop({ stock: 0, titles: 4 }))).toBe('The shelves are bare. Read a little and they fill again.')
  })
  it('tells a brand new shop what to do', () => {
    expect(stockSentence(shop({ stock: 0, titles: 0 }))).toBe('The shelves are empty — finish a book and it goes on sale.')
  })
  it('guesses how long the stock will last, and only ever “about”', () => {
    expect(lastsSentence(shop({ stock: 60 }))).toBe('Enough on the shelves for about 10 days.')
    expect(lastsSentence(shop({ stock: 6 }))).toBe('Enough on the shelves for about 1 day.')
    expect(lastsSentence(shop({ stock: 2 }))).toBe('Enough on the shelves for the rest of today.')
    expect(lastsSentence(shop({ stock: 0 }))).toBe('Nothing left to sell.')
  })
})

describe('the till', () => {
  it('says what the shop draws and charges', () => {
    expect(tradeSentence(shop())).toBe('6 customers a day, 2 coins a copy.')
  })
  it('says what she is saving up for and how far off it is', () => {
    expect(savingSentence(shop({ coins: 22 }))).toBe('A sign over the door costs 40 coins — 18 to go.')
  })
  it('says when she can afford it', () => {
    expect(savingSentence(shop({ coins: 40 }))).toBe('You can afford a sign over the door.')
  })
  it('says when there is nothing left to buy', () => {
    const all = shop({ owned: new Set(UPGRADES.map((u) => u.id)), coins: 9999 })
    expect(nextUpgrade(all)).toBeNull()
    expect(savingSentence(all)).toBe('Everything is bought. The shop is as good as it gets.')
  })
})

describe('small bits', () => {
  it('writes a shelf line', () => {
    expect(lineText(line('Babel', 3))).toBe('3 × Babel')
  })
  it('lists titles the way she would say them', () => {
    expect(titleList([line('Babel', 1)])).toBe('Babel')
    expect(titleList([line('Babel', 1), line('Circe', 1)])).toBe('Babel and Circe')
    expect(titleList([])).toBe('')
  })
  it('says what every thing in the shop does', () => {
    for (const u of UPGRADES) expect(upgradeEffect(u)).not.toBe('')
    expect(upgradeEffect(UPGRADES[0])).toBe('+2 customers a day')
  })
})
