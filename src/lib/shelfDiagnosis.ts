/**
 * Why the 3D shelf couldn't be drawn (#181, T-0003), in one short line Hanna
 * can read out or screenshot from the note's "Details": which way it failed,
 * when, with how many books, and the phone's graphics chip. Nothing is sent
 * anywhere.
 */

export type ShelfFailure =
  | { kind: 'error'; message: string }
  | { kind: 'lost'; afterSeconds: number }

export interface DeviceInfo {
  gpu?: string
  maxTexture?: number
  pixelRatio?: number
  width?: number
  height?: number
}

export function describeFailure(f: ShelfFailure, books: number, device: DeviceInfo = {}): string {
  const what =
    f.kind === 'lost' ? `lost after ${Math.round(f.afterSeconds)} s` : `error: ${f.message.replace(/\s+/g, ' ').slice(0, 120)}`
  const parts = [
    what,
    `${books} books`,
    device.width && device.height ? `${device.width}×${device.height}` : undefined,
    device.pixelRatio ? `@${Math.round(device.pixelRatio * 100) / 100}x` : undefined,
    device.maxTexture ? `max texture ${device.maxTexture}` : undefined,
    device.gpu,
  ]
  return parts.filter(Boolean).join(' · ')
}

/** The graphics chip and its largest picture, from a tiny throwaway WebGL context (only asked after a failure). */
export function deviceInfo(): DeviceInfo {
  const out: DeviceInfo = {}
  if (typeof window === 'undefined') return out
  out.pixelRatio = window.devicePixelRatio
  out.width = window.innerWidth
  out.height = window.innerHeight
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) {
      out.gpu = 'no WebGL'
      return out
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    out.gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    out.maxTexture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    /* no details then */
  }
  return out
}
