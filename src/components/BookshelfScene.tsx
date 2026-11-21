import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book, SortKey } from '#/lib/library'
import { FRAME, SHELF, computeLayout, fitShelf, rowFloorY, topGap } from '#/lib/shelfLayout'
import { arrangementSeparators } from '#/lib/separators'
import type { ShelfLayout } from '#/lib/shelfLayout'
import { BookMesh, RAINBOW } from './BookMesh'
import { Decorations, FairyLights } from './Decorations'
import { BookNooks } from './BookNook'
import { SeriesDividers } from './SeriesDivider'
import { sleepReadIds } from '#/lib/sleepSeries'
import type { InspectTarget } from './BookMesh'
import { FLOOR_TILE_METRES, WALLPAPER_REPEAT_M, floorTexture, wallTexture, woodTexture } from './textures'

export interface BookshelfSceneProps {
  books: Book[]
  selectedId: string | null
  inspect: RefObject<InspectTarget>
  onSelect: (id: string | null) => void
  onReorder: (ids: string[]) => void
  /** the sort last applied to the shelf; 'status' puts book nooks between the groups */
  arrangement?: SortKey | null
  /** share of the screen height covered by the details sheet on phones (0..1) */
  sheet?: RefObject<number>
  /** a search is on: the ids of the books that match it (the rest dim) */
  highlight?: Set<string> | null
  /** how far zoomed in: 1 is the whole case, up to ZOOM_MAX */
  zoom?: number
  onZoom?: (zoom: number) => void
  /** height of the header over the top of the scene, in CSS px (phones keep the case below it) */
  topInset?: number
  /** the browser dropped the 3D drawing (WebGL context lost), e.g. when a phone runs out of memory */
  onContextLost?: () => void
}

export const ZOOM_MAX = 3
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(1, z))

const FOV = 35
const DEFAULT_INSPECT = { fill: 0.6, yShift: 0 }
/** share of a phone screen taken by the header at the top, until its real height is known */
const HEADER_SHARE = 0.1

/**
 * On a phone the details sheet covers the bottom of the screen: fit the
 * inspected book into the space between the header and the sheet.
 */
function portraitInspect(frame: { fill: number; yShift: number }, sheet: number, aspect: number, header = HEADER_SHARE) {
  const s = Math.min(0.9, Math.max(0, sheet))
  const free = Math.max(0.15, 1 - s - header)
  // also keep the widest books (cover aspect up to 0.82) inside the screen width
  const byWidth = (0.88 * aspect) / 0.82
  frame.fill = Math.min(0.6, free * 0.85, byWidth)
  frame.yShift = (s - header) / 2
}

/**
 * Phones get a lighter version of the room: no shadows and one pixel per
 * screen pixel, so a full shelf fits in a phone's graphics memory (#181) and
 * scrolling stays smooth.
 */
function useLite() {
  const [lite, setLite] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 720px), (pointer: coarse)')
    const on = () => setLite(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return lite
}

export function BookshelfScene(props: BookshelfSceneProps) {
  const lite = useLite()
  return (
    <Canvas
      shadows={lite ? false : 'soft'}
      dpr={lite ? 1 : [1, 2]}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 0.7, 4] }}
      gl={{ antialias: !lite, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#2a1f18']} />
      <fog attach="fog" args={['#2a1f18', 6, 14]} />
      <ContextLoss onLost={props.onContextLost} />
      <Scene {...props} lite={lite} />
    </Canvas>
  )
}

/** Tells the page when the browser drops the 3D drawing, so it can say so instead of showing an empty room. */
function ContextLoss({ onLost }: { onLost?: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => watchContextLoss(gl.domElement, () => onLost?.()), [gl, onLost])
  return null
}

/** Calls `onLost` when the canvas loses its WebGL context; returns the clean-up. */
export function watchContextLoss(canvas: HTMLCanvasElement, onLost: () => void) {
  const lost = () => onLost()
  canvas.addEventListener('webglcontextlost', lost)
  return () => canvas.removeEventListener('webglcontextlost', lost)
}

interface DragState {
  id: string
  order: string[]
}

function Scene({
  books,
  selectedId,
  inspect,
  onSelect,
  onReorder,
  arrangement,
  sheet,
  highlight = null,
  zoom = 1,
  onZoom,
  topInset = 0,
  lite = false,
}: BookshelfSceneProps & { lite?: boolean }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  // handlers read the ref so back-to-back pointer events never see stale state
  const dragRef = useRef<DragState | null>(null)
  const updateDrag = useCallback((d: DragState | null) => {
    dragRef.current = d
    setDrag(d)
  }, [])
  const pending = useRef<{ id: string; x: number; y: number; t: number; touch: boolean } | null>(null)
  const dragPoint = useRef(new THREE.Vector3())
  const gl = useThree((s) => s.gl)

  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const ordered = useMemo(
    () =>
      drag ? drag.order.map((id) => byId.get(id)).filter((b): b is Book => !!b) : books,
    [drag, books, byId],
  )
  const clipColors = useMemo(() => rainbowClips(books), [books])
  const sleepIds = useMemo(() => sleepReadIds(books), [books])
  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(1, size.height)
  const portrait = aspect < 0.8
  // one object, updated in place every frame as the sheet is dragged
  const portraitFrame = useMemo(() => ({ fill: 0.4, yShift: 0.17 }), [])
  const headerShare = topInset > 0 ? topInset / Math.max(1, size.height) : HEADER_SHARE
  useFrame(() => portraitInspect(portraitFrame, sheet?.current ?? 0.45, aspect, headerShare))
  const separators = useMemo(() => arrangementSeparators(ordered, arrangement), [arrangement, ordered])
  // the case's width follows the screen, and widens on big screens so the books stay large (#39)
  const fit = useMemo(() => fitShelf(ordered, aspect, separators), [ordered, aspect, separators])
  const layout = useMemo(() => computeLayout(ordered, fit, separators), [ordered, fit, separators])

  // keep the case size stable while dragging so the camera doesn't jump around
  const stableLayout = useRef<ShelfLayout>(layout)
  if (!drag) stableLayout.current = layout
  const caseLayout = drag ? stableLayout.current : layout

  const scroll = useRef<ScrollState>({ y: null, min: 0, max: 0, worldPerPx: 0, x: 0, xMax: 0 })
  const cameraBase = useCameraRig(caseLayout.caseWidth, caseLayout.caseHeight, {
    parallax: !selectedId,
    portrait,
    scroll,
    dragging: !!drag,
    zoom,
    topInset,
  })
  // the zoom as the input handlers see it, without re-adding them on every change
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const onZoomRef = useRef(onZoom)
  onZoomRef.current = onZoom

  // a new search: scroll (and, zoomed in, pan) to the first book that matches
  useEffect(() => {
    if (!highlight || highlight.size === 0) return
    const first = ordered.find((b) => highlight.has(b.id))
    const slot = first && layout.slots.get(first.id)
    const dims = first && layout.dims.get(first.id)
    const s = scroll.current
    if (!slot || !dims) return
    if (s.max > s.min) s.y = THREE.MathUtils.clamp(slot.y + dims.h / 2, s.min, s.max)
    if (s.xMax > 0) s.x = THREE.MathUtils.clamp(slot.x, -s.xMax, s.xMax)
    // only when the search changes, not when the shelf moves under it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight])

  useEffect(() => {
    gl.domElement.style.cursor = drag ? 'grabbing' : hovered && !selectedId ? 'grab' : 'auto'
  }, [gl, hovered, drag, selectedId])

  // ---- drag-to-reorder --------------------------------------------------
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  const insertionOrder = useCallback(
    (id: string, x: number, y: number): string[] => {
      const others = books.filter((b) => b.id !== id)
      const lay = computeLayout(others, { innerWidth: fit.innerWidth, minRows: caseLayout.rows })
      // which shelf is the pointer over?
      let row = 0
      for (let r = 0; r < lay.rows; r++) {
        if (y >= rowFloorY(r, lay.rows) - SHELF.board) {
          row = r
          break
        }
        row = r
      }
      const inRow = others.filter((b) => lay.slots.get(b.id)!.row === row)
      let index: number
      const before = inRow.find((b) => lay.slots.get(b.id)!.x > x)
      if (before) index = others.indexOf(before)
      else if (inRow.length) index = others.indexOf(inRow[inRow.length - 1]) + 1
      else {
        // empty shelf: go after the last book on any shelf above it
        const above = others.filter((b) => lay.slots.get(b.id)!.row < row)
        index = above.length ? others.indexOf(above[above.length - 1]) + 1 : 0
      }
      const ids = others.map((b) => b.id)
      ids.splice(index, 0, id)
      return ids
    },
    [books, caseLayout.rows, fit.innerWidth],
  )

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, id: string) => {
      if (selectedId || e.button !== 0) return
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      pending.current = {
        id,
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        t: performance.now(),
        touch: e.nativeEvent.pointerType !== 'mouse',
      }
    },
    [selectedId],
  )

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>, id: string) => {
      const p = pending.current
      if (!p || p.id !== id) return
      const drag = dragRef.current
      const moved = Math.hypot(e.nativeEvent.clientX - p.x, e.nativeEvent.clientY - p.y)
      if (!drag && moved < 6) return
      // on touch screens a swipe scrolls the shelf; press and hold a book to move it
      if (!drag && p.touch && performance.now() - p.t < LONG_PRESS_MS) return
      e.stopPropagation()
      dragPlane.constant = -(SHELF.depth / 2 + 0.06)
      if (!e.ray.intersectPlane(dragPlane, hit)) return
      const lim = caseLayout.innerWidth / 2
      dragPoint.current.set(
        THREE.MathUtils.clamp(hit.x, -lim, lim),
        THREE.MathUtils.clamp(hit.y, 0.1, caseLayout.caseHeight),
        hit.z,
      )
      const order = insertionOrder(id, hit.x, hit.y)
      if (!drag) setHovered(null)
      if (!drag || order.join() !== drag.order.join()) updateDrag({ id, order })
    },
    [dragPlane, hit, insertionOrder, caseLayout.caseHeight, caseLayout.innerWidth, updateDrag],
  )

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>, id: string) => {
      const p = pending.current
      if (!p || p.id !== id) return
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
      pending.current = null
      const drag = dragRef.current
      updateDrag(null)
      if (drag) onReorder(drag.order)
      else onSelect(id)
    },
    [onReorder, onSelect, updateDrag],
  )

  // ---- scrolling: mouse wheel, or a swipe on touch screens -------------------
  useEffect(() => {
    if (selectedId) return
    const el = gl.domElement
    let swipe: { id: number; x: number; y: number; t: number; scrolling: boolean } | null = null
    // two fingers on the screen: pinch to zoom
    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { dist: number; zoom: number } | null = null
    const gap = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const zoomTo = (z: number) => onZoomRef.current?.(clampZoom(z))
    const scrollBy = (px: number) => {
      const s = scroll.current
      if (s.y === null || s.max <= s.min) return
      s.y = THREE.MathUtils.clamp(s.y + px * s.worldPerPx, s.min, s.max)
    }
    // zoomed in: move sideways along the shelf
    const panBy = (px: number) => {
      const s = scroll.current
      if (s.xMax <= 0) return
      s.x = THREE.MathUtils.clamp(s.x - px * s.worldPerPx, -s.xMax, s.xMax)
    }
    const wheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : 1
      // Ctrl+scroll, and a trackpad pinch (which comes as Ctrl+scroll): zoom
      if (e.ctrlKey) {
        e.preventDefault()
        zoomTo(zoomRef.current * Math.exp(-e.deltaY * unit * 0.01))
        return
      }
      const sideways = e.shiftKey ? e.deltaY : e.deltaX
      if (sideways && scroll.current.xMax > 0) {
        e.preventDefault()
        panBy(sideways * unit)
      }
      if (!e.shiftKey && e.deltaY && scroll.current.max > scroll.current.min) {
        e.preventDefault()
        scrollBy(-e.deltaY * unit)
      }
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        // a second finger: a pinch, not a swipe or moving a book
        pinch = { dist: gap(), zoom: zoomRef.current }
        swipe = null
        pending.current = null
        if (dragRef.current) updateDrag(null)
        setHovered(null)
        return
      }
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), scrolling: false }
    }
    const move = (e: PointerEvent) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch && touches.size === 2) {
        zoomTo(pinch.zoom * (gap() / Math.max(1, pinch.dist)))
        return
      }
      if (!swipe || e.pointerId !== swipe.id || dragRef.current) return
      const dx = e.clientX - swipe.x
      const dy = e.clientY - swipe.y
      if (!swipe.scrolling) {
        // a press held still is the start of moving a book, not a swipe
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8 || performance.now() - swipe.t > LONG_PRESS_MS) return
        swipe.scrolling = true
        pending.current = null // so lifting the finger doesn't open a book
        setHovered(null)
      }
      scrollBy(dy)
      panBy(dx)
      swipe.x = e.clientX
      swipe.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (swipe && e.pointerId === swipe.id) swipe = null
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [selectedId, gl])

  // ---- inspecting: drag anywhere to turn the book -------------------------
  useEffect(() => {
    if (!selectedId) return
    const el = gl.domElement
    let last: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!last) return
      const t = inspect.current
      t.rotY += (e.clientX - last.x) * 0.012
      t.rotX = THREE.MathUtils.clamp(t.rotX + (e.clientY - last.y) * 0.008, -0.9, 0.9)
      last = { x: e.clientX, y: e.clientY }
    }
    const up = () => {
      last = null
      el.style.cursor = 'grab'
    }
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.style.cursor = 'auto'
    }
  }, [selectedId, gl, inspect])

  return (
    <>
      <Lights caseHeight={caseLayout.caseHeight} caseWidth={caseLayout.caseWidth} cameraBase={cameraBase} lite={lite} />
      <Room />
      <Bookcase layout={caseLayout} />
      <Decorations items={layout.decor} />
      <BookNooks items={layout.nooks} />
      <SeriesDividers items={layout.dividers} />
      <FairyLights width={caseLayout.innerWidth} top={caseLayout.caseHeight} />

      {ordered.map((book) => {
        const slot = layout.slots.get(book.id)
        const dims = layout.dims.get(book.id)
        if (!slot || !dims) return null
        return (
          <BookMesh
            key={book.id}
            book={book}
            clipColor={clipColors.get(book.id)}
            sleep={sleepIds.has(book.id)}
            dims={dims}
            slot={slot}
            selected={book.id === selectedId}
            dragging={drag?.id === book.id}
            hovered={hovered === book.id}
            match={highlight ? (highlight.has(book.id) ? 'glow' : 'dim') : null}
            dragPoint={dragPoint}
            inspect={inspect}
            cameraBase={cameraBase}
            fov={FOV}
            // on phones the details sheet covers the bottom: show the book above it
            inspectFrame={portrait ? portraitFrame : DEFAULT_INSPECT}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onHover={setHovered}
          />
        )
      })}

      <Backdrop active={!!selectedId} cameraBase={cameraBase} onClose={() => onSelect(null)} />
    </>
  )
}

interface ScrollState {
  /** camera height the shelf is scrolled to (null until first framed: start at the top) */
  y: number | null
  min: number
  max: number
  /** world units per screen pixel at the bookcase, for 1:1 swiping */
  worldPerPx: number
  /** zoomed in: how far the camera has moved sideways, and how far it may */
  x: number
  xMax: number
}

const LONG_PRESS_MS = 350

/**
 * Frames the bookcase. On wide screens the whole case fits; on a phone held
 * upright it is framed to the width of the screen and the camera scrolls up
 * and down it instead of shrinking it to fit.
 */
function useCameraRig(
  caseWidth: number,
  caseHeight: number,
  opts: { parallax: boolean; portrait: boolean; scroll: RefObject<ScrollState>; dragging: boolean; zoom: number; topInset: number },
) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const base = useMemo(() => new THREE.Vector3(), [])
  /** height the camera looks at; eased like the camera so the view never jolts */
  const lookY = useRef<number | null>(null)
  /** vertical parallax offset, eased gently like the sideways one */
  const tiltY = useRef(0)

  const aspect = size.width / Math.max(1, size.height)
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  // phones use (nearly) the full width; desktops keep a margin round the case
  const marginW = opts.portrait ? 1.09 : FRAME.horizontal
  const distW = (caseWidth * marginW) / 2 / (tan * aspect)
  // leave room for the header at the top
  const distH = (caseHeight * FRAME.vertical) / 2 / tan
  // desktops show the whole case; phones held upright scroll through it
  const fitted = Math.max(distW, opts.portrait ? 0 : distH, 0.9)
  // zooming in brings the camera closer (1: the whole case, as before)
  const toCase = Math.max(0.35, fitted / Math.max(1, opts.zoom))
  base.z = toCase + SHELF.depth / 2

  const s = opts.scroll.current
  const viewH = 2 * toCase * tan
  s.worldPerPx = viewH / Math.max(1, size.height)
  // zoomed in, the camera can move sideways as far as the case reaches
  s.xMax = Math.max(0, caseWidth / 2 - (viewH * aspect) / 2 + 0.05)
  s.x = THREE.MathUtils.clamp(s.x, -s.xMax, s.xMax)
  // the pages' wallpaper uses the same stripe width on screen as the 3D wall:
  // one stripe is half a repeat, seen at the wall (a little further than the case)
  const stripePx = ((WALLPAPER_REPEAT_M / 2) / s.worldPerPx) * (toCase / (toCase + SHELF.depth))
  useEffect(() => {
    if (Number.isFinite(stripePx) && stripePx > 4) {
      document.documentElement.style.setProperty('--wall-stripe-px', `${Math.round(stripePx)}px`)
    }
  }, [stripePx])
  if (distH <= toCase) {
    // everything fits: centre it, as before
    s.min = s.max = caseHeight / 2 + caseHeight * 0.04
  } else {
    s.min = viewH * 0.42 // bottom: a strip of floor below the case
    // top: clear of the header (on a phone, of its real height: #181)
    s.max = caseHeight - viewH * 0.5 + topGap(viewH, s.worldPerPx, opts.portrait ? opts.topInset : 0)
  }
  s.y = s.y === null ? s.max : THREE.MathUtils.clamp(s.y, s.min, s.max)
  base.set(0, s.y, base.z)

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const c = state.camera
    const sc = opts.scroll.current
    // dragging a book near the top or bottom edge scrolls the shelf
    if (opts.dragging && sc.y !== null && sc.max > sc.min) {
      const edge = state.pointer.y
      const speed = edge > 0.7 ? (edge - 0.7) / 0.3 : edge < -0.7 ? (edge + 0.7) / 0.3 : 0
      sc.y = THREE.MathUtils.clamp(sc.y + speed * 1.2 * d, sc.min, sc.max)
    }
    if (sc.y !== null) base.y = sc.y
    base.x = sc.x
    // a touch of parallax following the mouse
    const px = opts.parallax ? state.pointer.x * 0.06 : 0
    const py = opts.parallax ? state.pointer.y * 0.04 : 0
    lookY.current = THREE.MathUtils.damp(lookY.current ?? base.y, base.y, 6, d)
    tiltY.current = THREE.MathUtils.damp(tiltY.current, py, 3, d)
    c.position.set(
      THREE.MathUtils.damp(c.position.x, base.x + px, 3, d),
      lookY.current + tiltY.current,
      THREE.MathUtils.damp(c.position.z, base.z, 3, d),
    )
    // look straight ahead at the shelf height (not following the parallax),
    // easing at the same rate as the camera so scrolling stays level
    c.lookAt(0, lookY.current, 0)
  })

  useEffect(() => {
    camera.position.copy(base)
    camera.lookAt(0, base.y, 0)
    // jump there on first mount; afterwards the frame loop eases toward the target
  }, [camera])

  return base
}

/**
 * A cosy reading-room light: warm and soft, with gentle shadows, and a
 * reading lamp at the top left that makes gold details (medals, gilded signs)
 * catch the light. Phones get smaller, sharper-edged shadows (lite).
 */
function Lights({
  caseHeight,
  caseWidth,
  cameraBase,
  lite,
}: {
  caseHeight: number
  caseWidth: number
  cameraBase: THREE.Vector3
  lite: boolean
}) {
  const keyLight = useRef<THREE.DirectionalLight>(null)
  // the shadow frustum follows the bookcase height; three.js needs telling when it changes
  useEffect(() => {
    keyLight.current?.shadow.camera.updateProjectionMatrix()
  }, [caseHeight])
  return (
    <>
      <hemisphereLight args={['#ffe8cc', '#4a2f1e', 1.3]} />
      <ambientLight intensity={0.28} color="#ffdcb4" />
      <directionalLight
        ref={keyLight}
        position={[0.9, caseHeight + 0.9, 4.2]}
        intensity={2.4}
        color="#ffdcae"
        castShadow
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        // Bias is a fraction of the shadow camera's depth range, so keep that range
        // tight around the bookcase: with the default 0.5–500 m, even a tiny bias
        // shifts shadows by decimetres and they float away from what casts them.
        shadow-camera-near={1}
        shadow-camera-far={10}
        shadow-bias={-0.0001}
        shadow-normalBias={0.01}
        shadow-radius={lite ? 3 : 7}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={caseHeight + 0.6}
        shadow-camera-bottom={-1.2}
      />
      {/* the reading lamp: warm, from the top left, without shadows of its own */}
      <pointLight
        position={[-caseWidth / 2 - 0.25, caseHeight + 0.35, 1.1]}
        intensity={2.2}
        distance={5}
        decay={1.6}
        color="#ffc27a"
      />
      {/* soft light near the viewer so an inspected book is well lit */}
      <pointLight
        position={[cameraBase.x - 0.4, cameraBase.y + 0.5, cameraBase.z - 0.2]}
        intensity={1.6}
        distance={4}
        color="#fff4e6"
      />
    </>
  )
}

/** must match WALL_HEIGHT_M in textures.ts so the gradient stops land at real heights */
const WALL_HEIGHT = 8
const WALL_WIDTH = 30
const FLOOR_SIZE = 30

function Room() {
  const wall = useMemo(() => {
    const t = wallTexture()
    // the striped wallpaper repeats sideways along the whole wall
    t.repeat.set(WALL_WIDTH / WALLPAPER_REPEAT_M, 1)
    return t
  }, [])
  const floor = useMemo(() => {
    const t = floorTexture()
    // boards run away from the viewer
    t.center.set(0.5, 0.5)
    t.rotation = Math.PI / 2
    t.repeat.set(FLOOR_SIZE / FLOOR_TILE_METRES, FLOOR_SIZE / FLOOR_TILE_METRES)
    return t
  }, [])
  useEffect(
    () => () => {
      wall.dispose()
      floor.dispose()
    },
    [wall, floor],
  )
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial map={floor} color="#f2ebe2" roughness={0.55} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, -SHELF.depth / 2 - 0.02]} receiveShadow>
        <planeGeometry args={[WALL_WIDTH, WALL_HEIGHT]} />
        <meshStandardMaterial map={wall} roughness={1} />
      </mesh>
    </>
  )
}

function Bookcase({ layout }: { layout: ShelfLayout }) {
  const wood = useMemo(() => woodTexture(), [])
  // the texture tile is 1.6 m x 0.4 m of wood; repeat it on the tall back panel so grain isn't stretched
  const backWood = useMemo(() => {
    const t = wood.clone()
    t.repeat.set(1, layout.caseHeight / 0.4)
    return t
  }, [wood, layout.caseHeight])
  useEffect(() => () => wood.dispose(), [wood])
  useEffect(() => () => backWood.dispose(), [backWood])
  const { rows, caseHeight } = layout
  const W = layout.innerWidth
  const D = SHELF.depth
  const outer = W + SHELF.side * 2

  // satin oil finish on walnut: fairly matte with a soft sheen
  const mat = <meshStandardMaterial map={wood} color="#f3ece4" roughness={0.55} />
  // the crown on top: stepped mouldings, a little wider each step (no moulding
  // at the bottom: it stood in front of the bottom row of books)
  const crown: Array<[number, number, number]> = [
    // [extra width, height, extra depth]
    [0.03, 0.022, 0.02],
    [0.07, 0.016, 0.045],
    [0.1, 0.03, 0.06],
    [0.075, 0.012, 0.04],
  ]
  let crownY = caseHeight
  return (
    <group>
      {crown.map(([w, h, d], i) => {
        const y = crownY + h / 2
        crownY += h
        return (
          <mesh key={`crown-${i}`} position={[0, y, d / 2 - 0.005]} castShadow receiveShadow>
            <boxGeometry args={[outer + w, h, D + d]} />
            {mat}
          </mesh>
        )
      })}
      {/* a thin gilded line along the crown, which catches the lamp */}
      <mesh position={[0, caseHeight + 0.045, D / 2 + 0.034]}>
        <boxGeometry args={[outer + 0.07, 0.004, 0.003]} />
        <meshStandardMaterial color="#d9a85b" metalness={0.8} roughness={0.32} />
      </mesh>
      {/* sides */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (W / 2 + SHELF.side / 2), caseHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[SHELF.side, caseHeight, D]} />
          {mat}
        </mesh>
      ))}
      {/* boards: bottom, one under each shelf, and the top */}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <mesh
          key={i}
          position={[0, i * SHELF.rowHeight + SHELF.board / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[i === rows ? outer + 0.03 : W, SHELF.board, i === rows ? D + 0.02 : D]} />
          {mat}
        </mesh>
      ))}
      {/* back panel */}
      <mesh position={[0, caseHeight / 2, -D / 2 + 0.005]} receiveShadow>
        <boxGeometry args={[W, caseHeight, 0.01]} />
        <meshStandardMaterial map={backWood} color="#c9b6a3" roughness={0.75} />
      </mesh>
    </group>
  )
}

/** Dims the room while a book is pulled out; clicking it puts the book back. */
function Backdrop({
  active,
  cameraBase,
  onClose,
}: {
  active: boolean
  cameraBase: THREE.Vector3
  onClose: () => void
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (!mat.current || !mesh.current) return
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, active ? 0.62 : 0, 5, Math.min(dt, 0.05))
    mesh.current.visible = mat.current.opacity > 0.01
    mesh.current.position.set(cameraBase.x, cameraBase.y, cameraBase.z - 1.25)
  })
  return (
    <mesh
      ref={mesh}
      visible={false}
      renderOrder={10}
      raycast={active ? THREE.Mesh.prototype.raycast : () => null}
      onClick={(e) => {
        e.stopPropagation()
        // only when the backdrop itself was clicked (not the book in front of it),
        // and not at the end of a rotate-drag
        if (e.intersections[0]?.object === mesh.current && e.delta < 5) onClose()
      }}
    >
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial ref={mat} color="#140d08" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/**
 * Each book being read gets the next rainbow colour, in the order they were
 * added, so a book keeps its clip colour when the shelf is sorted or rearranged.
 */
function rainbowClips(books: Book[]) {
  const reading = books
    .filter((b) => b.status === 'reading' || b.status === 'paused')
    .sort((a, b) => (a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : a.id.localeCompare(b.id)))
  return new Map(reading.map((b, i) => [b.id, RAINBOW[i % RAINBOW.length]]))
}


