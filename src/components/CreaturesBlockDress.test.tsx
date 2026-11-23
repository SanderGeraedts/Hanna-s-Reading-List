import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { CREATURES_START } from '#/lib/creatures/numbers'
import { addDays } from '#/lib/creatures/days'

vi.mock('#/server/shelf', () => ({ loadChallenges: async () => [], saveChallenges: async () => [] }))
vi.mock('#/server/creatures', () => ({ loadCreatures: async () => ({ kept: false }), saveCreatures: async () => ({ kept: false }) }))
// a browser with WebGL; the pictures themselves replaced by what they were asked to draw
vi.mock('./creatures/pose', async (orig) => ({ ...(await orig<typeof import('./creatures/pose')>()), webglAvailable: () => true }))
vi.mock('./creatures/CreatureStill', () => ({
  CreatureStill: (p: { shows: { kind: string; dress?: unknown } }) => <div data-testid="still" data-dress={JSON.stringify(p.shows.kind === 'creature' ? (p.shows.dress ?? null) : null)} />,
}))

const { CreaturesCard } = await import('./CreaturesCard')
const { CreaturesProvider, useCreatures } = await import('./creatures/CreaturesContext')

/** The dashboard block shows her pet dressed (T-0031 Design §7, Done when 7). */

const TODAY = addDays(CREATURES_START, 2)
const BOOKS: Book[] = [{ id: 'b', title: 'B', authors: ['A'], color: '#333', status: 'reading', addedAt: 0, pages: 300, readingLog: { [TODAY]: 0.2 } }]
const at = (t: string) => new Date(`${TODAY}T${t}:00`).getTime()

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
afterAll(() => vi.useRealTimers())
afterEach(() => {
  cleanup()
  localStorage.clear()
})

function Block() {
  const { c, feed } = useCreatures(BOOKS)
  return <CreaturesCard c={c} onFeed={feed} />
}

describe('the dashboard block', () => {
  it("draws the current pet in its outfits (only what it wears, only what she owns)", () => {
    localStorage.setItem(
      'hannas-reading-list:creatures:local',
      JSON.stringify([
        { id: 'h', at: at('08:00'), kind: 'hatch', egg: 'welcome', species: 'cat' },
        { id: 'b1', at: at('08:10'), kind: 'buy', item: 'bobble-hat', price: 30 },
        { id: 'b2', at: at('08:11'), kind: 'buy', item: 'reading-glasses', price: 25 },
        { id: 'w1', at: at('08:12'), kind: 'wear', key: 'welcome:head', item: 'bobble-hat' },
        { id: 'w2', at: at('08:13'), kind: 'wear', key: 'welcome:face', item: 'reading-glasses' },
        // not bought: ignored
        { id: 'w3', at: at('08:14'), kind: 'wear', key: 'welcome:back', item: 'star-cape' },
      ]),
    )
    render(
      <CreaturesProvider accountId={null}>
        <Block />
      </CreaturesProvider>,
    )
    expect(JSON.parse(screen.getByTestId('still').dataset.dress!)).toEqual({ head: 'bobble-hat', face: 'reading-glasses' })
  })
})
