import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { newSeriesPick, pickableSeries, seriesDone, seriesPicks, seriesRows } from './seriesChallenge'
import type { OwnChallenge } from './ownChallenges'
import { cleanChallenges } from './ownChallenges'

/** Read the series (T-0091, D-0061 §4). */

const book = (id: string, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const readBook = (id: string, title: string, extra: Partial<Book> = {}) =>
  book(id, title, { status: 'read', readCount: 1, finished: ['2026-03-01'], ...extra })

/** Three books of one series, `read` of them finished. */
const seriesOf = (name: string, size: number, read: number) =>
  Array.from({ length: size }, (_, i) =>
    (i < read ? readBook : book)(`${name}-${i}`, `Book ${i + 1}`, { series: name, seriesIndex: i + 1 }),
  )

describe('read the series: picking', () => {
  it('saves a pick as a finishseries challenge with the series size as its target', () => {
    const shelf = seriesOf('Throne of Glass', 8, 5)
    const pick = newSeriesPick('throne of glass', 'Throne of Glass', shelf, 2026)
    expect(pick).toMatchObject({ rule: 'finishseries', value: 'throne of glass', target: 8, year: 2026, name: 'Throne of Glass' })
    expect(cleanChallenges([pick])).toEqual([pick])
    expect(cleanChallenges([{ ...pick, value: '' }])).toEqual([])
  })

  it('never offers a series with one book on the shelf, and never offers one twice', () => {
    const shelf = [...seriesOf('Throne of Glass', 3, 1), book('lonely', 'Lonely One', { series: 'Only Ever', seriesIndex: 1 })]
    expect(pickableSeries(shelf, [], 2026).map((o) => o.label)).toEqual(['Throne of Glass'])
    const pick = newSeriesPick('throne of glass', 'Throne of Glass', shelf, 2026)
    expect(pickableSeries(shelf, [pick], 2026)).toEqual([])
    expect(seriesPicks([pick], 2026)).toHaveLength(1)
    expect(seriesPicks([pick], 2025)).toHaveLength(0)
  })
})

describe('read the series: progress', () => {
  it('counts every book of the series she has read, whenever she read it', () => {
    const shelf = seriesOf('Throne of Glass', 8, 5)
    // one of them was read years ago
    shelf[0].finished = ['2019-01-01']
    const pick = newSeriesPick('throne of glass', 'Throne of Glass', shelf, 2026)
    const rows = seriesRows([pick], shelf, 2026)
    expect(rows[0]).toMatchObject({ name: 'Throne of Glass', done: 5, total: 8, complete: false })
    expect(seriesDone(rows)).toBe(0)
  })

  it('is complete when every book of it on the shelf is read', () => {
    const shelf = seriesOf('The Lord of the Rings', 3, 3)
    const pick = newSeriesPick('the lord of the rings', 'The Lord of the Rings', shelf, 2026)
    const rows = seriesRows([pick], shelf, 2026)
    expect(rows[0]).toMatchObject({ done: 3, total: 3, complete: true })
    expect(seriesDone(rows)).toBe(1)
  })

  it('a series that shrank to one book shows 0 of 1 unread and 1 of 1 read, and never throws', () => {
    const saved: OwnChallenge = { id: 'c1', name: 'Kane', target: 3, year: 2026, rule: 'finishseries', value: 'the kane chronicles' }
    const unread = [book('k0', 'Book 1', { series: 'The Kane Chronicles', seriesIndex: 1 })]
    expect(seriesRows([saved], unread, 2026)[0]).toMatchObject({ done: 0, total: 3, complete: false })
    const read = [readBook('k0', 'Book 1', { series: 'The Kane Chronicles', seriesIndex: 1 })]
    // one book alone is no series on the shelf, so the saved target stands
    expect(seriesRows([saved], read, 2026)[0]).toMatchObject({ done: 0, total: 3 })
  })

  it('a pick whose series is gone keeps its saved name and target', () => {
    const saved: OwnChallenge = { id: 'c1', name: 'Gone Series', target: 7, year: 2026, rule: 'finishseries', value: 'gone series' }
    const rows = seriesRows([saved], [book('other', 'Something Else')], 2026)
    expect(rows[0]).toMatchObject({ name: 'Gone Series', done: 0, total: 7, complete: false })
  })

  it('no picks is no rows, not a crash', () => {
    expect(seriesRows([], [], 2026)).toEqual([])
    expect(seriesDone([])).toBe(0)
  })
})
