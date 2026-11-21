import { describe, expect, it, vi } from 'vitest'

// The real plugins aren't needed: only the options vite.config.ts hands to the Netlify plugin.
const netlify = vi.hoisted(() => vi.fn(() => ({ name: 'netlify-stub' })))
vi.mock('@netlify/vite-plugin-tanstack-start', () => ({ default: netlify }))
vi.mock('@tanstack/react-start/plugin/vite', () => ({ tanstackStart: () => ({ name: 'tanstack-stub' }) }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react-stub' }) }))

describe('vite.config.ts', () => {
  it('never loads the Netlify site environment into the dev server (#156)', async () => {
    await import('./vite.config')
    expect(netlify).toHaveBeenCalledTimes(1)
    const options = (netlify.mock.calls[0] as unknown[])[0] as {
      dev?: { environmentVariables?: { enabled?: boolean }; edgeFunctions?: { enabled?: boolean } }
    }
    expect(options.dev?.environmentVariables).toEqual({ enabled: false })
    expect(options.dev?.edgeFunctions).toEqual({ enabled: false })
  })
})
