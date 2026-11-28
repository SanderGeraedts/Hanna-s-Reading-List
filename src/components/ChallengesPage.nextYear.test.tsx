import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => null,
  saveGoal: async () => true,
  loadChallenges: async () => null,
  saveChallenges: async () => true,
}))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))
vi.mock('#/server/creatures', () => ({
  loadCreatures: async () => ({ kept: false, events: [] }),
  saveCreatures: async () => ({ kept: false, events: [] }),
}))

const { ChallengesPage } = await import('./ChallengesPage')

/** Drafting next year's challenges already (T-0130, D-0098). */

const shelf = [{ id: 'a', title: 'A', authors: [], color: '#888', status: 'want', addedAt: 0 } as Book]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-28T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('next year on the Challenges page', () => {
  it('opens on this year, goes one year ahead, and offers New challenge there', () => {
    render(<ChallengesPage books={shelf} accountId={null} onShowBook={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('2026')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next year' }))
    expect(screen.getByText('2027')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Next year' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }))
    expect(screen.getByRole('heading', { name: 'New challenge for 2027' })).toBeTruthy()
  })
})
