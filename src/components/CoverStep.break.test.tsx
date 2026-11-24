import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoverAnalysis } from '#/lib/cover'
import type { SearchResult } from '#/server/openLibrary'

/** The tester's gap tests for the cover step: the photo she takes, and the awkward input. */

const analyzeCover = vi.hoisted(() => vi.fn<(url: string) => Promise<CoverAnalysis | null>>())
const getCoverChoices = vi.hoisted(() => vi.fn<() => Promise<number[]>>())
const shrinkImage = vi.hoisted(() => vi.fn<(file: File) => Promise<string>>())
vi.mock('#/lib/cover', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/cover')>()),
  analyzeCover,
}))
vi.mock('#/server/openLibrary', () => ({ getCoverChoices: () => getCoverChoices() }))
// the real one needs createImageBitmap and a canvas; the step's own behaviour is what is tested
vi.mock('#/lib/coverPhoto', () => ({ shrinkImage: (f: File) => shrinkImage(f) }))

const { CoverStep } = await import('./CoverStep')

const PHOTO = 'data:image/jpeg;base64,aaaa'
const ANALYSIS: CoverAnalysis = { color: '#334455', aspect: 0.7, palette: ['#334455'] }

const result = (extra: Partial<SearchResult> = {}): SearchResult => ({
  workKey: '/works/OL45804W',
  title: 'The Night Circus',
  authors: ['Erin Morgenstern'],
  coverId: 11,
  ...extra,
})

async function setup(r: SearchResult = result()) {
  const state = { added: [] as Array<Record<string, unknown>> }
  render(<CoverStep result={r} onAdd={(c) => void state.added.push({ ...c })} onBack={() => {}} />)
  await act(async () => {})
  return state
}

const tiles = () => screen.queryAllByRole('radio')
const photoInput = () => document.querySelector('input[type=file]') as HTMLInputElement
const pick = async (file: File) => {
  Object.defineProperty(photoInput(), 'files', { value: [file], configurable: true })
  await act(async () => {
    fireEvent.change(photoInput())
  })
}
const jpeg = () => new File(['x'], 'copy.jpg', { type: 'image/jpeg' })

afterEach(cleanup)
beforeEach(() => {
  analyzeCover.mockReset()
  analyzeCover.mockResolvedValue(ANALYSIS)
  getCoverChoices.mockReset()
  getCoverChoices.mockResolvedValue([11, 12])
  shrinkImage.mockReset()
  shrinkImage.mockResolvedValue(PHOTO)
})

describe('the cover step, pushed harder (T-0070)', () => {
  it('a photo she takes goes first, picked, and is the cover the book is added with', async () => {
    const state = await setup()
    expect(tiles()).toHaveLength(2)
    await pick(jpeg())
    expect(tiles()).toHaveLength(3)
    expect(tiles()[0].getAttribute('aria-label')).toBe('Your photo')
    expect(tiles()[0].getAttribute('aria-checked')).toBe('true')
    expect(tiles()[0].querySelector('img')?.getAttribute('src')).toBe(PHOTO)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add this one' }))
    })
    expect(state.added).toEqual([{ coverUrl: PHOTO, coverAspect: 0.7, color: '#334455' }])
  })

  it('the camera is asked for the back camera, and only images are accepted', async () => {
    await setup()
    expect(photoInput().getAttribute('accept')).toBe('image/*')
    expect(photoInput().getAttribute('capture')).toBe('environment')
  })

  it('taking a second photo replaces the first, it does not pile up', async () => {
    await setup()
    await pick(jpeg())
    shrinkImage.mockResolvedValue('data:image/jpeg;base64,bbbb')
    await pick(new File(['y'], 'again.jpg', { type: 'image/jpeg' }))
    expect(tiles().filter((t) => t.getAttribute('aria-label') === 'Your photo')).toHaveLength(1)
    expect(tiles()[0].querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,bbbb')
  })

  it('a file that is not a picture says so and changes nothing', async () => {
    const state = await setup()
    await pick(new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect(screen.getByText('Choose an image file.')).toBeTruthy()
    expect(tiles()).toHaveLength(2)
    expect(state.added).toEqual([])
  })

  it('a picture that cannot be read says so and changes nothing', async () => {
    const state = await setup()
    shrinkImage.mockRejectedValue(new Error('no bitmap'))
    await pick(jpeg())
    expect(screen.getByText('That picture could not be read. Try a JPEG or PNG.')).toBeTruthy()
    expect(tiles()).toHaveLength(2)
    expect(state.added).toEqual([])
  })

  it('a photo is the only cover for a work Open Library knows nothing about', async () => {
    getCoverChoices.mockResolvedValue([])
    const state = await setup(result({ coverId: undefined }))
    expect(screen.getByRole('button', { name: 'Add without a cover' })).toBeTruthy()
    await pick(jpeg())
    expect(tiles()).toHaveLength(1)
    // with a cover again, the button goes back to its usual words
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add this one' }))
    })
    expect(state.added).toEqual([{ coverUrl: PHOTO, coverAspect: 0.7, color: '#334455' }])
  })

  it('a very long title and an author list do not break the step', async () => {
    const long = 'A '.repeat(200) + 'Title'
    await setup(result({ title: long, authors: ['One', 'Two', 'Three'] }))
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(long)
    expect(screen.getByText('One, Two, Three')).toBeTruthy()
  })

  it('pressing Add twice in a row adds once, because the button is dead while it works', async () => {
    let settle: (v: CoverAnalysis) => void = () => {}
    analyzeCover.mockReturnValue(new Promise((r) => (settle = r)))
    const state = await setup()
    const add = screen.getByRole('button', { name: 'Add this one' })
    fireEvent.click(add)
    expect(add.hasAttribute('disabled')).toBe(true)
    fireEvent.click(add)
    await act(async () => {
      settle(ANALYSIS)
    })
    expect(state.added).toHaveLength(1)
  })
})
