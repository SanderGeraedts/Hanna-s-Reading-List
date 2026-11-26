import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lazy } from 'react'
import type React from 'react'
import { PageWhileLoading, usePrefetchPages } from './PageWhileLoading'

/** A page whose file is still on its way, and the quiet fetching (D-0080 §1). */

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('while a page’s file is on its way', () => {
  it('says so, and then shows the page', async () => {
    let arrive: (() => void) | null = null
    const Slow = lazy(
      () =>
        new Promise<{ default: () => React.ReactElement }>((resolve) => {
          arrive = () => resolve({ default: () => <p>The garden</p> })
        }),
    )
    render(
      <PageWhileLoading>
        <Slow />
      </PageWhileLoading>,
    )
    expect(screen.getByText('One moment…')).toBeTruthy()
    arrive!()
    await waitFor(() => expect(screen.getByText('The garden')).toBeTruthy())
    expect(screen.queryByText('One moment…')).toBeNull()
  })

  it('shows nothing of its own once the page is there', () => {
    render(
      <PageWhileLoading>
        <p>Stats</p>
      </PageWhileLoading>,
    )
    expect(screen.queryByText('One moment…')).toBeNull()
    expect(screen.getByText('Stats')).toBeTruthy()
  })
})

describe('fetching the light pages quietly', () => {
  /** counts the idle job without running the real imports */
  const spyIdle = () => {
    const jobs: Array<() => void> = []
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      jobs.push(cb)
      return jobs.length
    })
    vi.stubGlobal('cancelIdleCallback', () => {})
    return jobs
  }

  function Harness({ ready }: { ready: boolean }) {
    usePrefetchPages(ready)
    return null
  }

  it('waits until the shelf is up', () => {
    const jobs = spyIdle()
    render(<Harness ready={false} />)
    expect(jobs).toHaveLength(0)
  })

  it('asks for the files once the shelf is up', () => {
    const jobs = spyIdle()
    render(<Harness ready />)
    expect(jobs).toHaveLength(1)
  })

  it('falls back to a timer on a browser without idle time', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    const spy = vi.spyOn(globalThis, 'setTimeout')
    render(<Harness ready />)
    expect(spy).toHaveBeenCalled()
  })
})
