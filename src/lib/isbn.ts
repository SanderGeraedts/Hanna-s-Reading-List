/**
 * The ISBN in a book's barcode. The barcode on the back of a book is an
 * EAN-13 starting with 978 or 979, which is the ISBN-13 itself. Anything else
 * (a price add-on, a shop label, a misread) gives null.
 */
export function isbnFromBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 13 || !/^97[89]/.test(digits)) return null
  const sum = [...digits.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
  const check = (10 - (sum % 10)) % 10
  return check === Number(digits[12]) ? digits : null
}

/** The same ISBN written either way (ISBN-10 or ISBN-13), for spotting a book already on the shelf. */
export function sameIsbn(a: string | undefined, b: string | undefined) {
  const n = (s: string | undefined) => {
    const d = (s ?? '').replace(/[^0-9Xx]/g, '').toUpperCase()
    // ISBN-10 → ISBN-13 body (the check digit differs, so compare without it)
    if (d.length === 10) return `978${d.slice(0, 9)}`
    if (d.length === 13) return d.slice(0, 12)
    return ''
  }
  const x = n(a)
  return x !== '' && x === n(b)
}
