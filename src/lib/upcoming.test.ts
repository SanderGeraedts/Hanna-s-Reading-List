import { describe, expect, it, vi } from 'vitest'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanReleaseDate, notOutYet, publishedDay, releaseFromPublished } = await import('./upcoming')

const today = '2026-11-12'

describe('books not out yet', () => {
  it('reads release days defensively', () => {
    expect(cleanReleaseDate('2026-12-01T00:00:00Z')).toBe('2026-12-01')
    expect(cleanReleaseDate('soon')).toBeUndefined()
    expect(cleanReleaseDate(20261201)).toBeUndefined()
  })

  it('reads the first day a publication date can mean', () => {
    expect(publishedDay('2027')).toBe('2027-01-01')
    expect(publishedDay('2027-03')).toBe('2027-03-01')
    expect(publishedDay('2027-03-12')).toBe('2027-03-12')
    expect(publishedDay(undefined)).toBeUndefined()
  })

  it('finds a release day only when it is still to come', () => {
    expect(releaseFromPublished({ published: '2026-12-01' }, today)).toBe('2026-12-01')
    expect(releaseFromPublished({ published: '2026-11-12' }, today)).toBeUndefined()
    expect(releaseFromPublished({ published: '2008' }, today)).toBeUndefined()
    expect(releaseFromPublished({ year: 2027 }, today)).toBe('2027-01-01')
    expect(releaseFromPublished({ year: 2026 }, today)).toBeUndefined()
  })

  it('a book is not out yet until its publication or release day', () => {
    expect(notOutYet({ published: '2026-11-13' }, today)).toBe(true)
    expect(notOutYet({ published: today }, today)).toBe(false)
    expect(notOutYet({ year: 2027 }, today)).toBe(true)
    // the Storytel sync's release day counts too
    expect(notOutYet({ releaseDate: '2026-12-01' }, today)).toBe(true)
    expect(notOutYet({ releaseDate: '2026-11-01' }, today)).toBe(false)
    expect(notOutYet({}, today)).toBe(false)
  })
})
