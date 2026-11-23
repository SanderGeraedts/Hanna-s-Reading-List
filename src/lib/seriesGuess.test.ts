import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { MAX_GUESSES, guessPatch, seriesGuesses, shelfSeries, typedSeriesPatch } from './seriesGuess'

let n = 0
const book = (title: string, author: string, extra: Partial<Book> = {}): Book => ({
  id: `b${++n}`,
  title,
  authors: [author],
  color: '#884422',
  status: 'want',
  addedAt: n,
  ...extra,
})

/** a shelf with a Percy Jackson series (two books make a series, seriesGroups' rule) */
const percy = () => [
  book('Percy Jackson, Teil 1: Diebe im Olymp', 'Rick Riordan'),
  book('Percy Jackson, Teil 2: Im Bann des Zyklopen', 'Rick Riordan'),
]

const names = (gs: ReturnType<typeof seriesGuesses>) => gs.map((g) => g.name)

describe('the rule-based series guess (T-0060, D-0017: no AI)', () => {
  it('reads the series and its number out of the title, first of all', () => {
    const gs = seriesGuesses({ title: 'Dune Messiah (Dune Chronicles, #2)', authors: ['Frank Herbert'] }, [])
    expect(gs[0]).toEqual({ name: 'Dune Chronicles', index: 2, from: 'title' })
  })

  it('matches a title against a series already on her shelf', () => {
    const gs = seriesGuesses({ title: "Percy Jackson and the Titan's Curse", authors: ['Rick Riordan'] }, percy())
    expect(names(gs)).toContain('Percy Jackson')
    expect(gs.find((g) => g.name === 'Percy Jackson')?.from).toBe('shelf')
  })

  it('takes a number in the title along as the position', () => {
    const gs = seriesGuesses({ title: 'Percy Jackson 5', authors: ['Rick Riordan'] }, percy())
    expect(gs[0].index).toBe(5)
  })

  it("offers her author's series too, after the stronger rules", () => {
    const gs = seriesGuesses({ title: 'The Sun and the Star', authors: ['Rick Riordan'] }, percy())
    expect(names(gs)).toEqual(['Percy Jackson'])
    expect(gs[0].from).toBe('author')
    expect(gs[0].index).toBeUndefined()
  })

  it('puts the title rule before the shelf rule and the shelf rule before the author rule', () => {
    const shelf = [
      ...percy(),
      book('Die Kane-Chroniken 1: Die rote Pyramide', 'Rick Riordan'),
      book('Die Kane-Chroniken 2: Der Feuerthron', 'Rick Riordan'),
    ]
    const gs = seriesGuesses({ title: 'Percy Jackson, Teil 4: Die Schlacht um das Labyrinth', authors: ['Rick Riordan'] }, shelf)
    expect(gs[0].from).toBe('title')
    expect(gs.map((g) => g.from)).toEqual([...new Set(gs.map((g) => g.from))])
    // the one the title named is never repeated by the other two rules
    expect(names(gs).filter((x) => x === 'Percy Jackson')).toHaveLength(1)
  })

  it('offers nothing at all when there is no signal', () => {
    expect(seriesGuesses({ title: 'Piranesi', authors: ['Susanna Clarke'] }, percy())).toEqual([])
    expect(seriesGuesses({ title: 'Piranesi', authors: [] }, [])).toEqual([])
    expect(seriesGuesses({ title: '', authors: [] }, [])).toEqual([])
  })

  it('offers nothing for a book that already has a series', () => {
    expect(seriesGuesses({ title: 'Percy Jackson 5', authors: ['Rick Riordan'], series: 'Percy Jackson' }, percy())).toEqual([])
  })

  it('never offers the same series twice, and never more than three', () => {
    const shelf = [
      ...percy(),
      book('Kane 1: A', 'Rick Riordan'),
      book('Kane 2: B', 'Rick Riordan'),
      book('Olymp 1: C', 'Rick Riordan'),
      book('Olymp 2: D', 'Rick Riordan'),
      book('Apollo 1: E', 'Rick Riordan'),
      book('Apollo 2: F', 'Rick Riordan'),
    ]
    const gs = seriesGuesses({ title: 'Percy Jackson and the Last Olympian', authors: ['Rick Riordan'] }, shelf)
    expect(gs.length).toBeLessThanOrEqual(MAX_GUESSES)
    expect(new Set(names(gs)).size).toBe(gs.length)
  })

  it('never offers the "shared opening …" name with its ellipsis', () => {
    const shelf = [
      book('Harry Potter and the Philosopher’s Stone', 'J. K. Rowling'),
      book('Harry Potter and the Chamber of Secrets', 'J. K. Rowling'),
    ]
    // detectSeries names a shared opening like this; the step must not offer it as it stands
    expect(shelfSeries(shelf).map((s) => s.name)).toEqual(['Harry Potter and the …'])
    const gs = seriesGuesses({ title: 'Harry Potter and the Goblet of Fire', authors: ['J. K. Rowling'] }, shelf)
    expect(names(gs)).toEqual(['Harry Potter'])
    expect(names(gs)[0]).not.toContain('…')
  })

  it('matches an author however the initials are spelled', () => {
    const shelf = [book('Kane 1: A', 'J.R.R. Tolkien'), book('Kane 2: B', 'J.R.R. Tolkien')]
    expect(names(seriesGuesses({ title: 'Unfinished Tales', authors: ['J. R. R. Tolkien'] }, shelf))).toEqual(['Kane'])
  })

  it('needs two books before a series on her shelf counts as one', () => {
    const one = [book('Percy Jackson, Teil 1: Diebe im Olymp', 'Rick Riordan')]
    expect(shelfSeries(one)).toEqual([])
    expect(seriesGuesses({ title: 'The Sun and the Star', authors: ['Rick Riordan'] }, one)).toEqual([])
  })

  it('what an answer saves', () => {
    expect(guessPatch({ name: 'Dune Chronicles', index: 2, from: 'title' })).toEqual({
      series: 'Dune Chronicles',
      seriesIndex: 2,
      seriesAsked: true,
    })
    expect(guessPatch({ name: 'Percy Jackson', from: 'author' })).toEqual({ series: 'Percy Jackson', seriesAsked: true })
    expect(typedSeriesPatch('  Throne of Glass ')).toEqual({ series: 'Throne of Glass', seriesAsked: true })
    // nothing typed: "not in a series", and it is never asked again
    expect(typedSeriesPatch('   ')).toEqual({ seriesAsked: true })
  })

  it('is rules only: no AI client, no key and no network (D-0017, D-0018)', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'lib', 'seriesGuess.ts'), 'utf8')
    for (const forbidden of ['fetch(', 'anthropic', 'openai', 'API_KEY', 'googleapis', 'books/v1']) {
      expect(src.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
    // and it imports nothing from the server
    expect(src).not.toContain("from '#/server")
  })
})
