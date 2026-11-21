import { describe, expect, it, vi } from 'vitest'
import { watchContextLoss } from './BookshelfScene'

describe('noticing when the browser drops the 3D drawing (#181)', () => {
  it('calls back on webglcontextlost, and stops after clean-up', () => {
    const canvas = document.createElement('canvas')
    const onLost = vi.fn()
    const stop = watchContextLoss(canvas, onLost)
    canvas.dispatchEvent(new Event('webglcontextlost'))
    expect(onLost).toHaveBeenCalledTimes(1)
    stop()
    canvas.dispatchEvent(new Event('webglcontextlost'))
    expect(onLost).toHaveBeenCalledTimes(1)
  })
})
