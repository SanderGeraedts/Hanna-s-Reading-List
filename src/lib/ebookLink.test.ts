import { describe, expect, it } from 'vitest'
import { cleanEbookLink, ebookHost, ebookHref } from './ebookLink'

describe('the e-book link check (#185)', () => {
  it('accepts https:// and http:// links', () => {
    expect(cleanEbookLink('https://drive.google.com/file/d/abc/view')).toBe('https://drive.google.com/file/d/abc/view')
    expect(cleanEbookLink('http://192.168.1.10/books/x.epub')).toBe('http://192.168.1.10/books/x.epub')
    expect(cleanEbookLink('HTTPS://Example.com/Book.epub')).toBe('HTTPS://Example.com/Book.epub')
  })

  it('trims spaces around the link', () => {
    expect(cleanEbookLink('  https://example.com/book.epub \n')).toBe('https://example.com/book.epub')
  })

  it('refuses everything else', () => {
    for (const text of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,x',
      'file:///C:/x.epub',
      'ftp://example.com/x.epub',
      'drive.google.com/file/d/abc',
      'https://',
      '',
      '   ',
      undefined,
    ]) {
      expect(cleanEbookLink(text), JSON.stringify(text)).toBeUndefined()
      expect(ebookHref(text), JSON.stringify(text)).toBeUndefined()
    }
  })

  it('gives the host for the tooltip', () => {
    expect(ebookHost('https://drive.google.com/file/d/abc/view')).toBe('drive.google.com')
    expect(ebookHost('http://192.168.1.10/books/x.epub')).toBe('192.168.1.10')
    expect(ebookHost('javascript:alert(1)')).toBeUndefined()
  })

  it('only ever hands an http(s) address to an href', () => {
    expect(ebookHref('https://example.com/my book.epub')).toBe('https://example.com/my%20book.epub')
    expect(ebookHref('http://192.168.1.10/x.epub')?.startsWith('http://')).toBe(true)
  })
})
