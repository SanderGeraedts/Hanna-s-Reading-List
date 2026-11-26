import { afterEach, describe, expect, it, vi } from 'vitest'
import { PHONE_SIDE, forgetPictureScale, pictureScale, pictureSide, scaleFor } from './roomPictures'

/** How big the room's pictures are painted (D-0080 §2). */

afterEach(() => {
  forgetPictureScale()
  vi.unstubAllGlobals()
})

describe('the scale for a screen', () => {
  it('is half for a phone and whole for anything bigger', () => {
    expect(scaleFor(390)).toBe(0.5)
    expect(scaleFor(PHONE_SIDE)).toBe(0.5)
    expect(scaleFor(PHONE_SIDE + 1)).toBe(1)
    expect(scaleFor(1440)).toBe(1)
  })

  it('is whole when the screen says nothing useful', () => {
    expect(scaleFor(0)).toBe(1)
    expect(scaleFor(-5)).toBe(1)
  })
})

describe('the scale for this visit', () => {
  const screen = (width: number, height: number) => {
    vi.stubGlobal('window', { innerWidth: width, innerHeight: height })
  }

  it('reads the screen’s shorter side, so turning the phone changes nothing', () => {
    screen(390, 844)
    expect(pictureScale()).toBe(0.5)
    forgetPictureScale()
    // the same phone, held sideways
    screen(844, 390)
    expect(pictureScale()).toBe(0.5)
  })

  it('leaves a computer alone', () => {
    screen(1440, 900)
    expect(pictureScale()).toBe(1)
  })

  it('is decided once and then kept, whatever the screen does next', () => {
    screen(390, 844)
    expect(pictureScale()).toBe(0.5)
    screen(1920, 1080)
    // no repaint mid-visit: the shelf must not stutter to put back detail she can't see
    expect(pictureScale()).toBe(0.5)
  })
})

describe('one side of a picture', () => {
  it('halves it on a phone and leaves it on a computer', () => {
    expect(pictureSide(2048, 0.5)).toBe(1024)
    expect(pictureSide(512, 0.5)).toBe(256)
    expect(pictureSide(2048, 1)).toBe(2048)
  })

  it('never lets a picture become a smudge', () => {
    expect(pictureSide(4, 0.5)).toBe(8)
    expect(pictureSide(1, 0.5)).toBe(8)
  })
})

describe('what it saves', () => {
  it('takes three quarters off the room’s biggest pictures on a phone', () => {
    const bytes = (w: number, h: number, s: number) => pictureSide(w, s) * pictureSide(h, s) * 4
    const room = (s: number) => bytes(2048, 512, s) + bytes(2048, 1024, s) + bytes(96, 2048, s)
    expect(room(0.5) / room(1)).toBeCloseTo(0.25, 2)
    // in megabytes, the two big ones alone
    expect((bytes(2048, 512, 1) + bytes(2048, 1024, 1)) / 1024 / 1024).toBeCloseTo(12, 0)
    expect((bytes(2048, 512, 0.5) + bytes(2048, 1024, 0.5)) / 1024 / 1024).toBeCloseTo(3, 0)
  })
})
