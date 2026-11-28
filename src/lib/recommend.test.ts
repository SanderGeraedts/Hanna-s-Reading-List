import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { NOTES, authorReason, combineSuggestions, findSuggestions, tasteOf, titleKey, worthSuggesting } = await import('./recommend')
const { DEFAULT_LAYOUT, cleanLayout } = await import('./dashboardLayout')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const r = (title: string, author: string, year: number) => ({
  workKey: `/works/${title}`,
  title,
  authors: [author],
  year,
  coverId: 1 as number | undefined,
})

describe('reading suggestions (no AI)', () => {
  it('compares titles without articles, subtitles or accents', () => {
    expect(titleKey('The Night Circus')).toBe(titleKey('Night Circus: A Novel'))
    expect(titleKey('Café')).toBe('cafe')
  })

  it('her taste: authors she rates best and reads most, genres of finished books', () => {
    const t = tasteOf([
      book('a', { status: 'read', rating: 5, authors: ['Maas'], genres: ['Fantasy'] }),
      book('b', { status: 'read', rating: 4, authors: ['Maas'], genres: ['Fantasy', 'Romance'] }),
      book('c', { status: 'read', rating: 2, authors: ['Other'], genres: ['Crime'] }),
      book('d', { status: 'want', authors: ['Unread'], genres: ['Horror'] }),
    ])
    expect(t.authors).toEqual([
      { name: 'Maas', rating: 4.5 },
      { name: 'Other', rating: 2 },
    ])
    expect(t.genres[0]).toBe('Fantasy')
    expect(t.genres).not.toContain('Horror')
    expect(authorReason(t.authors[0])).toBe('More by Maas, whose books you rate ★4½')
  })

  it('skips box sets, books without a cover and other scripts', () => {
    expect(worthSuggesting(r('House of Flame and Shadow', 'Maas', 2024))).toBe(true)
    expect(worthSuggesting(r('Book One / Book Two / Book Three', 'Maas', 2024))).toBe(false)
    expect(worthSuggesting(r('The Box Set', 'Maas', 2024))).toBe(false)
    expect(worthSuggesting({ ...r('No cover', 'Maas', 2024), coverId: undefined })).toBe(false)
    expect(worthSuggesting(r('暁のヨナ 47', 'X', 2027))).toBe(false)
  })

  it('takes from each list in turn, never a book she has or turned down, new genre books only', () => {
    const out = combineSuggestions(
      [
        { why: 'More by Maas', results: [r('On The Shelf', 'Maas', 2025), r('A', 'Maas', 2025), r('B', 'Maas', 2024)] },
        {
          why: 'New in Fantasy',
          results: [r('Old Fantasy', 'Y', 1999), r('C', 'Y', 2026), r('Nope', 'Z', 2026), r('A', 'Maas', 2025)],
          since: 2025,
        },
      ],
      ['On The Shelf — Maas', 'Nope — Z'],
      4,
    )
    expect(out.map((s) => `${s.title}: ${s.why}`)).toEqual(['A: More by Maas', 'C: New in Fantasy', 'B: More by Maas'])
  })
})

describe('New for you (#186)', () => {
  const shelf = [
    book('a', { status: 'read', rating: 5, title: 'Throne of Glass', authors: ['Maas'], genres: ['Fantasy'] }),
    book('b', { status: 'read', rating: 4, title: 'Crescent City', authors: ['Maas'], genres: ['Fantasy'] }),
  ]

  it("says Open Library can't be reached, without an error, when every request fails", async () => {
    const browse = vi.fn(async () => {
      throw new Error('Open Library request failed (503)')
    })
    await expect(findSuggestions(shelf, [], browse, 2026)).resolves.toEqual({ suggestions: [], note: NOTES.unreachable })
    expect(NOTES.unreachable).toBe("Open Library can't be reached right now. Try again later.")
    // one request per favourite author and genre
    expect(browse.mock.calls).toEqual([[{ author: 'Maas' }], [{ subject: 'Fantasy' }]])
  })

  it('still suggests when only some requests fail, each with its reason, leaving out the shelf and Not for me', async () => {
    const browse = async (q: { author?: string; subject?: string }) => {
      if (q.subject) throw new Error('down')
      return [r('Throne of Glass', 'Maas', 2012), r('Nope', 'Maas', 2025), r('House of Flame and Shadow', 'Maas', 2024)]
    }
    expect(await findSuggestions(shelf, ['Nope — Maas'], browse, 2026)).toEqual({
      suggestions: [
        expect.objectContaining({ title: 'House of Flame and Shadow', author: 'Maas', why: 'More by Maas, whose books you rate ★4½' }),
      ],
    })
  })

  it('has nothing to go on without books read, and says when nothing new turns up', async () => {
    const browse = vi.fn(async () => [])
    expect(await findSuggestions([book('w')], [], browse)).toEqual({ suggestions: [], note: NOTES.nothingToGoOn })
    expect(browse).not.toHaveBeenCalled()
    expect(await findSuggestions(shelf, [], browse)).toEqual({ suggestions: [], note: NOTES.nothingNew })
  })

  it('is one of the turns of Pick of the day now, not a block of its own (T-0124)', () => {
    expect(DEFAULT_LAYOUT.sections.today.flat()).not.toContain('newforyou')
    const saved = structuredClone(DEFAULT_LAYOUT)
    saved.sections.today[1] = ['newforyou', ...saved.sections.today[1]]
    expect(cleanLayout(saved).sections.today.flat()).not.toContain('newforyou')
  })
})
