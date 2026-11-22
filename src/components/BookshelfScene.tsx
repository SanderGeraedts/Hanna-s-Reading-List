import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book, SortKey } from '#/lib/library'
import { SHELF, computeLayout, fitShelf, rowFloorY, topGap } from '#/lib/shelfLayout'
import type { BookDims } from '#/lib/shelfLayout'
import { FOV, aimCamera, cameraZ, frameCase, newAim } from './cameraAim'
import { HEADER_SHARE, inspectPlacement, portraitInspect } from './inspectPlacement'
import type { Placement } from './inspectPlacement'
import {
  buttonStep,
  clampPan,
  keyStep,
  keyTarget,
  arrowKeyDirection,
  mousePress,
  panEdges,
  sameEdges,
} from '#/lib/shelfPan'
import type { PanDirection, PanEdges } from '#/lib/shelfPan'
import { arrangementSeparators } from '#/lib/separators'
import type { ShelfLayout } from '#/lib/shelfLayout'
import { BookMesh, RAINBOW, ShelfRidges } from './BookMesh'
import { Decorations, FairyLights, StillDecorations } from './Decorations'
import { BookNooks } from './BookNook'
import { SeriesDividers } from './SeriesDivider'
import { sleepReadIds } from '#/lib/sleepSeries'
import type { InspectTarget } from './BookMesh'
import { FLOOR_TILE_METRES, WALLPAPER_REPEAT_M, floorTexture, wallTexture, woodTexture } from './textures'
import { DEFAULT_ROOM, shownDecor } from '#/lib/room'
import type { Room as RoomChoice, Wallpaper, Wood } from '#/lib/room'

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
  /** her room: the wood, the wallpaper and the decorations (Make the room yours) */
  room?: RoomChoice
  /** another page lies over the shelf: stop drawing it until it's shown again */
  paused?: boolean
  /** the browser dropped the 3D drawing (WebGL context lost), e.g. when a phone runs out of memory */
  onContextLost?: () => void
  /** zoomed in: whether the shelf can move sideways and whether it is at an end; called when that changes */
  onPan?: (edges: PanEdges) => void
  /** the scene puts a function here that moves the shelf one ‹ › step to the left (-1) or right (1) */
  panControl?: RefObject<((direction: PanDirection) => void) | null>
}

export const ZOOM_MAX = 3
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(1, z))

const DEFAULT_INSPECT = { fill: 0.6, yShift: 0 }

/** whether she asked her device for less motion; the camera then jumps instead of gliding (T-0026) */
function useReducedMotion() {
  const reduced = useRef(false)
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!m) return
    const on = () => {
      reduced.current = m.matches
    }
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

/**
 * Phones get a lighter version of the room: no shadows and at most 1.5
 * pixels per screen point, so a full shelf fits in a phone's graphics memory (#181) and
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
      // another page (Dashboard, Challenges, Calendar) covers the shelf: don't keep drawing it
      frameloop={props.paused ? 'never' : 'always'}
      shadows={lite ? false : 'soft'}
      // 1.5 pixels per screen point on a phone: sharp titles, still much lighter than the screen's own 2–3
      dpr={lite ? [1, 1.5] : [1, 2]}
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
  room: roomChoice,
  paused = false,
  onPan,
  panControl,
  lite = false,
}: BookshelfSceneProps & { lite?: boolean }) {
  const [hovered, setHoveredState] = useState<string | null>(null)
  // a mouse drag on the empty wall is moving the shelf (T-0025); books don't lift under it meanwhile
  const [wallPanning, setWallPanningState] = useState(false)
  const wallPanRef = useRef(false)
  const setWallPanning = useCallback((on: boolean) => {
    wallPanRef.current = on
    setWallPanningState(on)
  }, [])
  const setHovered = useCallback((id: string | null) => {
    if (id && wallPanRef.current) return
    setHoveredState(id)
  }, [])
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
  const room = roomChoice ?? DEFAULT_ROOM
  // the decorations only (not the wood or Detailed books), so switching those moves nothing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const decorKinds = useMemo(() => shownDecor(room), [room.decor])
  const layout = useMemo(() => computeLayout(ordered, fit, separators, decorKinds), [ordered, fit, separators, decorKinds])
  // Detailed books (D-0035): hardcovers, or the simple blocks, on any device
  const detailed = room.detailedBooks
  // every book on the shelf has a place for its ridges in one instanced mesh
  const ridges = useRef<THREE.InstancedMesh>(null)
  const ridgeSlots = useMemo(() => {
    const slots = new Map<string, number>()
    for (const b of ordered) if (layout.slots.has(b.id) && layout.dims.has(b.id)) slots.set(b.id, slots.size)
    return slots
  }, [ordered, layout])

  // keep the case size stable while dragging so the camera doesn't jump around
  const stableLayout = useRef<ShelfLayout>(layout)
  if (!drag) stableLayout.current = layout
  const caseLayout = drag ? stableLayout.current : layout

  const scroll = useRef<ScrollState>({ y: null, min: 0, max: 0, worldPerPx: 0, x: 0, xMax: 0, viewW: 0 })
  const inspectFrame = portrait ? portraitFrame : DEFAULT_INSPECT
  const { base: cameraBase, placement } = useCameraRig(caseLayout.caseWidth, caseLayout.caseHeight, {
    parallax: !selectedId,
    portrait,
    scroll,
    dragging: !!drag,
    zoom,
    topInset,
    open: (selectedId && layout.dims.get(selectedId)) || null,
    inspectFrame,
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

  // ---- moving along the zoomed-in shelf (T-0025) -----------------------------
  // `scroll.current.x` is the one source of the pan; the page hears when "can pan" or an end changes
  const [pan, setPan] = useState<PanEdges>({ canPan: false, atStart: false, atEnd: false })
  const panRef = useRef(pan)
  const onPanRef = useRef(onPan)
  onPanRef.current = onPan
  useFrame(() => {
    const s = scroll.current
    const edges = panEdges(s.x, s.xMax)
    if (sameEdges(edges, panRef.current)) return
    panRef.current = edges
    setPan(edges)
    onPanRef.current?.(edges)
  })
  // the ‹ › buttons: three quarters of the visible width per press, eased by the camera
  useEffect(() => {
    if (!panControl) return
    panControl.current = (direction) => {
      const s = scroll.current
      s.x = clampPan(s.x + buttonStep(direction, s.viewW), s.xMax)
    }
    return () => {
      panControl.current = null
    }
  }, [panControl])
  // ← →: a fifth of the visible width, only while nothing else has the keyboard
  useEffect(() => {
    if (selectedId || paused) return
    const key = (e: KeyboardEvent) => {
      const s = scroll.current
      const direction = arrowKeyDirection({
        key: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        defaultPrevented: e.defaultPrevented,
        target: keyTarget(e.target, gl.domElement),
        bookOpen: !!selectedId,
        offShelf: paused,
        // the room panel, Make a wish, the quick update, the wrap-up, adding a book, …
        panelOpen: !!document.querySelector('[role="dialog"], dialog[open]'),
        canPan: panEdges(s.x, s.xMax).canPan,
      })
      if (direction === null) return
      e.preventDefault()
      s.x = clampPan(s.x + keyStep(direction, s.viewW), s.xMax)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [selectedId, paused, gl])

  // one place decides the cursor; with a book open the turn-the-book drag sets its own
  useEffect(() => {
    if (selectedId) return
    gl.domElement.style.cursor =
      drag || wallPanning ? 'grabbing' : hovered ? 'grab' : pan.canPan ? 'grab' : 'auto'
  }, [gl, hovered, drag, selectedId, wallPanning, pan.canPan])

  // ---- drag-to-reorder --------------------------------------------------
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  const insertionOrder = useCallback(
    (id: string, x: number, y: number): string[] => {
      const others = books.filter((b) => b.id !== id)
      const lay = computeLayout(others, { innerWidth: fit.innerWidth, minRows: caseLayout.rows }, undefined, decorKinds)
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
        // scrolling to the right shows the books to the right (panBy follows a finger, so the other way round)
        panBy(-sideways * unit)
      }
      if (!e.shiftKey && e.deltaY && scroll.current.max > scroll.current.min) {
        e.preventDefault()
        scrollBy(-e.deltaY * unit)
      }
    }
    // a mouse press: decided at the first move past 6 px, once a book's own handler has had its say
    let press: { id: number; x: number; y: number; button: number; wall: boolean } | null = null
    const endWallPan = () => {
      if (!press) return
      if (press.wall) {
        if (el.hasPointerCapture(press.id)) el.releasePointerCapture(press.id)
        setWallPanning(false)
      }
      press = null
    }
    const mouseMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      if (!press.wall) {
        const decided = mousePress({
          moved: Math.hypot(e.clientX - press.x, e.clientY - press.y),
          pending: !!pending.current || !!dragRef.current,
          button: press.button,
          canPan: panEdges(scroll.current.x, scroll.current.xMax).canPan,
          bookOpen: false,
        })
        if (decided === 'undecided') return
        if (decided !== 'wall') {
          // a book drag (exactly as before), or nothing
          press = null
          return
        }
        press.wall = true
        el.setPointerCapture(e.pointerId)
        setWallPanning(true)
        setHovered(null)
      }
      // like dragging a map: 1:1 with the mouse, sideways and, when the case is taller than the screen, up and down
      panBy(e.clientX - press.x)
      scrollBy(e.clientY - press.y)
      press.x = e.clientX
      press.y = e.clientY
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        endWallPan()
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, button: e.button, wall: false }
        return
      }
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
      if (e.pointerType === 'mouse') return mouseMove(e)
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
      if (press && e.pointerId === press.id) endWallPan()
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (swipe && e.pointerId === swipe.id) swipe = null
    }
    const lost = (e: PointerEvent) => {
      if (press?.wall && e.pointerId === press.id) endWallPan()
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    el.addEventListener('lostpointercapture', lost)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      endWallPan()
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('lostpointercapture', lost)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [selectedId, gl, setHovered, setWallPanning])

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
      <Room wallpaper={room.wallpaper} />
      <Bookcase layout={caseLayout} wood={room.wood} />
      <StillDecorations.Provider value={lite}>
        <Decorations items={layout.decor} />
      <StillDecorations.Provider value={lite}>
        <BookNooks items={layout.nooks} />
      </StillDecorations.Provider>
      <SeriesDividers items={layout.dividers} />
        <FairyLights width={caseLayout.innerWidth} top={caseLayout.caseHeight} />
      </StillDecorations.Provider>

      {detailed && <ShelfRidges books={ridgeSlots.size} meshRef={ridges} />}
      {ordered.map((book) => {
        const slot = layout.slots.get(book.id)
        const dims = layout.dims.get(book.id)
        if (!slot || !dims) return null
        return (
          <BookMesh
            key={book.id}
            book={book}
            detailed={detailed}
            lite={lite}
            ridges={ridges}
            ridgeSlot={ridgeSlots.get(book.id)}
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
            inspectFrame={inspectFrame}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onHover={setHovered}
          />
        )
      })}

      <Backdrop active={!!selectedId} cameraBase={cameraBase} placement={placement} onClose={() => onSelect(null)} />
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
  /** width of the view at the bookcase, in world units (a ‹ › press moves 3/4 of it) */
  viewW: number
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
  opts: {
    parallax: boolean
    portrait: boolean
    scroll: RefObject<ScrollState>
    dragging: boolean
    zoom: number
    topInset: number
    /** the size of the book taken out, or null */
    open: BookDims | null
    /** how much of the view it fills and how far up it sits (follows the phone's sheet) */
    inspectFrame: { fill: number; yShift: number }
  },
) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const base = useMemo(() => new THREE.Vector3(), [])
  /** where the camera looks (the pan and the shelf height) and its tilt, eased between frames */
  const aim = useMemo(newAim, [])
  const parallax = useMemo(() => ({ x: 0, y: 0 }), [])
  /** where the open book and the dimming stand; kept after closing, so both fade out where they were */
  const placement = useMemo<Placement>(() => ({ cameraZ: 0, bookZ: 0, backdropZ: 0 }), [])
  const reducedMotion = useReducedMotion()
  const wasOpen = useRef<BookDims | null>(null)

  const aspect = size.width / Math.max(1, size.height)
  const { toCase, viewH, xMax, fitsH } = frameCase(caseWidth, caseHeight, aspect, opts.portrait, opts.zoom)
  // the camera at her zoom; while a book is out it may step back from here (T-0026)
  const zoomZ = cameraZ(toCase)
  base.z = zoomZ

  const s = opts.scroll.current
  s.worldPerPx = viewH / Math.max(1, size.height)
  s.viewW = s.worldPerPx * size.width
  // zoomed in, the camera can move sideways as far as the case reaches
  s.xMax = xMax
  s.x = clampPan(s.x, s.xMax)
  // the pages' wallpaper uses the same stripe width on screen as the 3D wall:
  // one stripe is half a repeat, seen at the wall (a little further than the case)
  const stripePx = ((WALLPAPER_REPEAT_M / 2) / s.worldPerPx) * (toCase / (toCase + SHELF.depth))
  useEffect(() => {
    if (Number.isFinite(stripePx) && stripePx > 4) {
      document.documentElement.style.setProperty('--wall-stripe-px', `${Math.round(stripePx)}px`)
    }
  }, [stripePx])
  if (fitsH) {
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
    // zoomed in, dragging a book near the left or right edge pans, so it can go anywhere (T-0025)
    if (opts.dragging && panEdges(sc.x, sc.xMax).canPan) {
      const edge = state.pointer.x
      const speed = edge > 0.7 ? (edge - 0.7) / 0.3 : edge < -0.7 ? (edge + 0.7) / 0.3 : 0
      sc.x = clampPan(sc.x + speed * 1.2 * d, sc.xMax)
    }
    if (sc.y !== null) base.y = sc.y
    base.x = sc.x
    // a book is out: step back as far as it and the dimming need to stand in front of the case;
    // the pan and the scroll stay, so closing it brings back exactly her zoom and pan
    const open = opts.open
    base.z = zoomZ
    if (open) {
      Object.assign(
        placement,
        inspectPlacement({
          cameraZ: zoomZ,
          caseFront: SHELF.depth / 2,
          bookH: open.h,
          bookW: open.w,
          bookT: open.t,
          fill: opts.inspectFrame.fill,
          fov: FOV,
        }),
      )
      base.z = placement.cameraZ
    }
    // a touch of parallax following the mouse: it moves the camera, never the aim (no bobbing)
    parallax.x = opts.parallax ? state.pointer.x * 0.06 : 0
    parallax.y = opts.parallax ? state.pointer.y * 0.04 : 0
    aimCamera(c, base, aim, parallax, dt)
    // reduced motion: no gliding back and forth; the camera is there in the frame the book comes out
    // (and back at her zoom in the frame it goes back)
    if (reducedMotion.current && (open || wasOpen.current !== open)) c.position.z = base.z
    wasOpen.current = open
  })

  useEffect(() => {
    camera.position.copy(base)
    camera.lookAt(base.x, base.y, 0)
    // jump there on first mount; afterwards the frame loop eases toward the target
  }, [camera])

  return { base, placement }
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
      {/* on a phone every light costs work on every pixel: only the main light there */}
      {!lite && (
        <>
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
      )}
    </>
  )
}

/** must match WALL_HEIGHT_M in textures.ts so the gradient stops land at real heights */
const WALL_HEIGHT = 8
const WALL_WIDTH = 30
const FLOOR_SIZE = 30

function Room({ wallpaper }: { wallpaper: Wallpaper }) {
  const wall = useMemo(() => {
    const t = wallTexture(wallpaper)
    // the striped wallpaper repeats sideways along the whole wall
    t.repeat.set(WALL_WIDTH / WALLPAPER_REPEAT_M, 1)
    return t
  }, [wallpaper])
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

function Bookcase({ layout, wood: woodKind }: { layout: ShelfLayout; wood: Wood }) {
  const wood = useMemo(() => woodTexture(woodKind), [woodKind])
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
  placement,
  onClose,
}: {
  active: boolean
  cameraBase: THREE.Vector3
  /** where the open book stands: the dimming goes between it and the case (T-0026) */
  placement: Placement
  onClose: () => void
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (!mat.current || !mesh.current) return
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, active ? 0.62 : 0, 5, Math.min(dt, 0.05))
    mesh.current.visible = mat.current.opacity > 0.01
    mesh.current.position.set(cameraBase.x, cameraBase.y, placement.backdropZ)
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


