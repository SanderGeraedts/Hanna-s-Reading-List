import { describe, expect, it } from 'vitest'
import { storytelLink } from './storytelLink'

describe('open in Storytel (#65)', () => {
  it('links to the book page, letting Storytel pick the country', () => {
    expect(storytelLink({ title: 'The Swallowed Man', storytelId: '994201' })).toBe(
      'https://www.storytel.com/books/the-swallowed-man-994201',
    )
  })

  it('writes German and Dutch titles the way Storytel does', () => {
    expect(storytelLink({ title: 'Percy Jackson, Teil 4: Die Schlacht um das Labyrinth', storytelId: '12' })).toBe(
      'https://www.storytel.com/books/percy-jackson-teil-4-die-schlacht-um-das-labyrinth-12',
    )
    expect(storytelLink({ title: 'Die Heiligtümer des Todes – Groß', storytelId: '7' })).toBe(
      'https://www.storytel.com/books/die-heiligtumer-des-todes-gross-7',
    )
    expect(storytelLink({ title: '???', storytelId: '7' })).toBe('https://www.storytel.com/books/7')
  })

  it('has no link for a book that is not on Storytel', () => {
    expect(storytelLink({ title: 'Paperback only' })).toBeUndefined()
    expect(storytelLink({ title: 'Odd id', storytelId: '../x' })).toBeUndefined()
  })
})
