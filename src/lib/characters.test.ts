import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { addCharacter, charactersOf, favouriteCharacters, foldName, removeCharacter, toggleFavourite } from './characters'

/** T-0048 / D-0042: names per book, a ♥ for her favourites. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b', title: 'T', authors: [], color: '#000', status: 'read', addedAt: 1, ...over }) as Book

describe('characters on a book', () => {
  it('treats no list and an empty list the same', () => {
    expect(charactersOf(book())).toEqual([])
    expect(charactersOf(book({ characters: [] }))).toEqual([])
    expect(favouriteCharacters([book({ characters: [] }), book()])).toEqual([])
  })

  it('refuses the same name twice on one book, however it is typed', () => {
    const b = book({ characters: [{ name: 'Feyre' }] })
    expect(addCharacter(b, '  feyre ')).toBe(null)
    expect(addCharacter(b, 'Rhysand')).toEqual({ characters: [{ name: 'Feyre' }, { name: 'Rhysand' }] })
    expect(addCharacter(b, '   ')).toBe(null)
    expect(foldName('  Féyre  ')).toBe('feyre')
  })

  it('cuts a very long name at 60 characters', () => {
    expect(addCharacter(book(), 'x'.repeat(200))?.characters?.[0].name.length).toBe(60)
  })

  it('gives a ♥ and takes it away again', () => {
    const b = book({ characters: [{ name: 'Feyre' }, { name: 'Nesta' }] })
    const on = toggleFavourite(b, 'feyre')
    expect(on.characters).toEqual([{ name: 'Feyre', fav: true }, { name: 'Nesta' }])
    expect(toggleFavourite({ ...b, ...on } as Book, 'Feyre').characters).toEqual([{ name: 'Feyre' }, { name: 'Nesta' }])
  })

  it('leaves no empty list behind when the last character goes', () => {
    expect(removeCharacter(book({ characters: [{ name: 'Feyre' }] }), 'FEYRE')).toEqual({ characters: undefined })
  })
})

describe('favouriteCharacters', () => {
  it('lists every ♥ with its book, newest book first, and the same name on two books twice', () => {
    const a = book({ id: 'a', title: 'A', addedAt: 1, characters: [{ name: 'Feyre', fav: true }, { name: 'Nesta' }] })
    const c = book({ id: 'c', title: 'C', addedAt: 2, characters: [{ name: 'Feyre', fav: true }] })
    const favs = favouriteCharacters([a, c])
    expect(favs.map((f) => [f.name, f.book.id])).toEqual([
      ['Feyre', 'c'],
      ['Feyre', 'a'],
    ])
  })
})
