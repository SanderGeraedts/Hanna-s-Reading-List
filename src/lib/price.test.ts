import { describe, expect, it } from 'vitest'
import type { BookFormat } from './library'
import { asksEbookLink, asksPrice, belowZero, buyingJarLabel, coinText, coinWords, parsePrice, priceCents, priceField } from './price'

const price = (text: string) => {
  const r = parsePrice(text)
  return r.ok ? r.price : r.problem
}

describe('typing a price', () => {
  it('reads a comma or a dot, € before or after, and spaces', () => {
    expect(price('12')).toBe(12)
    expect(price('12,50')).toBe(12.5)
    expect(price('12.50')).toBe(12.5)
    expect(price('€ 7.99')).toBe(7.99)
    expect(price('€7,99')).toBe(7.99)
    expect(price('7.99 €')).toBe(7.99)
    expect(price(' 0 ')).toBe(0)
    expect(price('0,00')).toBe(0)
    expect(price('€0')).toBe(0)
    expect(price('12,5')).toBe(12.5)
    expect(price('9999.99')).toBe(9999.99)
  })

  it('reads empty or spaces as no price', () => {
    expect(parsePrice('')).toEqual({ ok: true, price: undefined })
    expect(parsePrice('   ')).toEqual({ ok: true, price: undefined })
  })

  it('refuses negatives, text and more than two decimals', () => {
    for (const bad of ['-5', '−5', 'twelve', '12a', '7.999', '1.000,50', '12.', ',5', '€12€']) expect(price(bad)).toBe('format')
  })

  it('refuses more than €9,999.99', () => {
    expect(price('10000')).toBe('too-much')
    expect(price('10000,00')).toBe('too-much')
    expect(price('123456789012345678901')).toBe('too-much')
  })

  it('shows a saved price with two decimals, and counts it in cents', () => {
    expect(priceField(12.5)).toBe('12.50')
    expect(priceField(0)).toBe('0.00')
    expect(priceField(undefined)).toBe('')
    expect(priceCents(7.99)).toBe(799)
    expect(priceCents(0.1)).toBe(10)
    expect(priceCents(undefined)).toBe(0)
    expect(priceCents(-3)).toBe(0)
    expect(priceCents(Number.NaN)).toBe(0)
  })
})

describe('the coin text', () => {
  it('shows one decimal, drops .0, and says 1 coin', () => {
    expect(coinText(4.6)).toBe('🪙 4.6 coins')
    expect(coinWords(4.6)).toBe('4.6 coins')
    expect(coinWords(4)).toBe('4 coins')
    expect(coinWords(1)).toBe('1 coin')
    expect(coinWords(0)).toBe('0 coins')
    expect(coinWords(-1.4)).toBe('−1.4 coins')
    expect(coinText(-1.4)).toBe('🪙 −1.4 coins')
  })

  it('rounds half away from zero, and never shows −0', () => {
    expect(coinWords(1.598)).toBe('1.6 coins')
    expect(coinWords(0.15)).toBe('0.2 coins')
    expect(coinWords(-0.15)).toBe('−0.2 coins')
    expect(coinWords(0.04)).toBe('0 coins')
    expect(coinWords(-0.04)).toBe('0 coins')
    expect(coinWords(-0.02)).toBe('0 coins')
    expect(belowZero(-0.02)).toBe(false)
    expect(belowZero(-1.4)).toBe(true)
    expect(coinWords(0.96)).toBe('1 coin')
  })

  it('names the jar for a screen reader', () => {
    expect(buyingJarLabel(4.6)).toBe('Buying jar: 4.6 coins')
    expect(buyingJarLabel(1)).toBe('Buying jar: 1 coin')
    expect(buyingJarLabel(0)).toBe('Buying jar: 0 coins')
    expect(buyingJarLabel(-1.4)).toBe('Buying jar: minus 1.4 coins')
  })
})

describe('who is asked the price', () => {
  it('asks for paperback, hardcover and e-book', () => {
    for (const f of ['paperback', 'hardcover', 'ebook'] as BookFormat[]) expect(asksPrice([f], 'search')).toBe(true)
    // with Storytel or the library chosen as well, it still asks
    expect(asksPrice(['paperback', 'storytel'], 'manual')).toBe(true)
    expect(asksPrice(['ebook', 'library'], 'scan')).toBe(true)
  })

  it('never asks for library, borrowed, audiobook, Storytel or other, or with nothing chosen', () => {
    for (const f of ['library', 'borrowed', 'audiobook', 'storytel', 'other'] as BookFormat[]) expect(asksPrice([f], 'isbn')).toBe(false)
    expect(asksPrice([], 'search')).toBe(false)
  })

  it('never asks for a Storytel import', () => {
    expect(asksPrice(['paperback'], 'storytel')).toBe(false)
    expect(asksPrice(['storytel'], 'storytel')).toBe(false)
  })
})

describe('the link for a free e-book', () => {
  it('asks only for an e-book at exactly €0', () => {
    expect(asksEbookLink(['ebook'], 0)).toBe(true)
    expect(asksEbookLink(['paperback', 'ebook'], 0)).toBe(true)
    expect(asksEbookLink(['ebook'], 0.01)).toBe(false)
    expect(asksEbookLink(['ebook'], 5)).toBe(false)
    expect(asksEbookLink(['ebook'], undefined)).toBe(false)
    expect(asksEbookLink(['paperback'], 0)).toBe(false)
    expect(asksEbookLink(['hardcover'], 0)).toBe(false)
  })
})
