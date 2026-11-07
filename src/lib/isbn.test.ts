import { describe, expect, it } from 'vitest'
import { isbnFromBarcode, sameIsbn } from './isbn'

describe('reading the ISBN from a barcode (#19)', () => {
  it('accepts a book barcode with a valid check digit', () => {
    expect(isbnFromBarcode('9780141439518')).toBe('9780141439518')
    expect(isbnFromBarcode('9783791504650')).toBe('9783791504650')
    expect(isbnFromBarcode('979-10-90636-07-1')).toBe('9791090636071')
  })

  it('refuses misreads and barcodes that are not books', () => {
    expect(isbnFromBarcode('9780141439519')).toBeNull() // wrong check digit
    expect(isbnFromBarcode('4006381333931')).toBeNull() // a pen, not a book
    expect(isbnFromBarcode('51299')).toBeNull() // the price add-on
    expect(isbnFromBarcode('')).toBeNull()
  })

  it('sees the same book behind an ISBN-10 and an ISBN-13', () => {
    expect(sameIsbn('0141439513', '9780141439518')).toBe(true)
    expect(sameIsbn('978-0-14-143951-8', '9780141439518')).toBe(true)
    expect(sameIsbn('9780141439518', '9783791504650')).toBe(false)
    expect(sameIsbn(undefined, '9780141439518')).toBe(false)
  })
})
