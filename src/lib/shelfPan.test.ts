import { afterEach, describe, expect, it } from 'vitest'
import {
  BUTTON_STEP_SHARE,
  KEY_STEP_SHARE,
  SHELF_CONTROLS_ATTR,
  arrowKeyDirection,
  buttonStep,
  clampPan,
  keyStep,
  keyTarget,
  mousePress,
  panEdges,
} from './shelfPan'
import type { ArrowKeyInput, MousePressInput } from './shelfPan'

describe('clampPan', () => {
  it('stops a step past either end at ±xMax', () => {
    expect(clampPan(0.4, 0.25)).toBe(0.25)
    expect(clampPan(-0.4, 0.25)).toBe(-0.25)
    expect(clampPan(0.1, 0.25)).toBe(0.1)
  })
  it('keeps the pan at 0 when the shelf cannot move', () => {
    expect(clampPan(0.2, 0)).toBe(0)
    expect(clampPan(-0.2, 0)).toBe(0)
  })
})

describe('panEdges', () => {
  it('cannot pan at or below the 3 cm threshold', () => {
    expect(panEdges(0, 0.03).canPan).toBe(false)
    expect(panEdges(0, 0.02).canPan).toBe(false)
    expect(panEdges(0, 0).canPan).toBe(false)
    expect(panEdges(0, 0.031).canPan).toBe(true)
  })
  it('is at the start within 1 mm of -xMax and at the end within 1 mm of xMax', () => {
    expect(panEdges(-0.25, 0.25)).toEqual({ canPan: true, atStart: true, atEnd: false })
    expect(panEdges(-0.2495, 0.25).atStart).toBe(true)
    expect(panEdges(-0.248, 0.25).atStart).toBe(false)
    expect(panEdges(0.25, 0.25)).toEqual({ canPan: true, atStart: false, atEnd: true })
    expect(panEdges(0.2495, 0.25).atEnd).toBe(true)
    expect(panEdges(0.248, 0.25).atEnd).toBe(false)
  })
  it('is at neither end in the middle', () => {
    expect(panEdges(0, 0.25)).toEqual({ canPan: true, atStart: false, atEnd: false })
  })
  it('is at no end when the shelf cannot pan', () => {
    expect(panEdges(0, 0.02)).toEqual({ canPan: false, atStart: false, atEnd: false })
  })
})

describe('steps', () => {
  it('moves a button press 0.75 and a key press 0.2 of the visible width', () => {
    expect(BUTTON_STEP_SHARE).toBe(0.75)
    expect(KEY_STEP_SHARE).toBe(0.2)
    expect(buttonStep(1, 0.4)).toBeCloseTo(0.3)
    expect(keyStep(1, 0.4)).toBeCloseTo(0.08)
  })
  it('moves x down for ‹ / ← and up for › / →', () => {
    expect(buttonStep(-1, 0.4)).toBeLessThan(0)
    expect(keyStep(-1, 0.4)).toBeLessThan(0)
    expect(buttonStep(1, 0.4)).toBeGreaterThan(0)
    expect(keyStep(1, 0.4)).toBeGreaterThan(0)
  })
})

describe('arrowKeyDirection', () => {
  const ok: ArrowKeyInput = {
    key: 'ArrowRight',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    defaultPrevented: false,
    target: 'body',
    bookOpen: false,
    offShelf: false,
    panelOpen: false,
    canPan: true,
  }
  it('gives a step for ← and → on the page, the canvas or a shelf button', () => {
    for (const target of ['body', 'canvas', 'shelf-button'] as const) {
      expect(arrowKeyDirection({ ...ok, target, key: 'ArrowLeft' })).toBe(-1)
      expect(arrowKeyDirection({ ...ok, target, key: 'ArrowRight' })).toBe(1)
    }
  })
  it('gives null for any other key', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'a', 'Enter', ' ']) {
      expect(arrowKeyDirection({ ...ok, key })).toBeNull()
    }
  })
  it('gives null with Shift, Ctrl, Alt or Meta, or when defaultPrevented', () => {
    expect(arrowKeyDirection({ ...ok, shiftKey: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, ctrlKey: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, altKey: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, metaKey: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, defaultPrevented: true })).toBeNull()
  })
  it('gives null with a book open, off the shelf, with a panel open or when the shelf cannot pan', () => {
    expect(arrowKeyDirection({ ...ok, bookOpen: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, offShelf: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, panelOpen: true })).toBeNull()
    expect(arrowKeyDirection({ ...ok, canPan: false })).toBeNull()
  })
  it('gives null for a target outside the shelf', () => {
    expect(arrowKeyDirection({ ...ok, target: 'other' })).toBeNull()
  })
})

describe('keyTarget', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  it('knows the page, the canvas and the shelf buttons', () => {
    const canvas = document.createElement('canvas')
    const group = document.createElement('div')
    group.setAttribute(SHELF_CONTROLS_ATTR, '')
    const button = document.createElement('button')
    group.append(button)
    document.body.append(canvas, group)
    expect(keyTarget(document.body, canvas)).toBe('body')
    expect(keyTarget(canvas, canvas)).toBe('canvas')
    expect(keyTarget(button, canvas)).toBe('shelf-button')
  })
  it('sorts inputs, text areas, selects, editable text and other elements as other', () => {
    const canvas = document.createElement('canvas')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const others = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      editable,
      document.createElement('button'), // a button that isn't one of the shelf's
      document.createElement('span'),
    ]
    // even inside the shelf's controls, only a button counts
    const group = document.createElement('div')
    group.setAttribute(SHELF_CONTROLS_ATTR, '')
    const inner = document.createElement('input')
    group.append(inner)
    document.body.append(canvas, ...others, group)
    for (const el of [...others, inner]) expect(keyTarget(el, canvas)).toBe('other')
    expect(keyTarget(null, canvas)).toBe('other')
    expect(keyTarget(window, canvas)).toBe('other')
  })
})

describe('mousePress', () => {
  const wall: MousePressInput = { moved: 10, pending: false, button: 0, canPan: true, bookOpen: false }
  it('is a book drag past 6 px when a book claimed the press', () => {
    expect(mousePress({ ...wall, pending: true })).toBe('book')
  })
  it('is a wall pan past 6 px on the empty wall with the left button, zoomed in, no book open', () => {
    expect(mousePress(wall)).toBe('wall')
    expect(mousePress({ ...wall, moved: 6 })).toBe('wall')
  })
  it('is nothing when not zoomed in, with the right button, or with a book open', () => {
    expect(mousePress({ ...wall, canPan: false })).toBe('none')
    expect(mousePress({ ...wall, button: 2 })).toBe('none')
    expect(mousePress({ ...wall, bookOpen: true })).toBe('none')
  })
  it('is still undecided under 6 px, so a click stays a click', () => {
    expect(mousePress({ ...wall, moved: 5.9 })).toBe('undecided')
    expect(mousePress({ ...wall, moved: 0, pending: true })).toBe('undecided')
  })
})
