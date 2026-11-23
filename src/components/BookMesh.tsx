import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book } from '#/lib/library'
import { hasMedal, timesRead } from '#/lib/library'
import type { BookDims, Slot } from '#/lib/shelfLayout'
import { METALS, medalFaceTexture, medalLayout, medalTier, pageTextures, paintBack, paintEdges, paintFallbackCover, paintSpine, plainTexture } from './textures'
import { cleanEdges } from '#/lib/edges'
import { inspectDistance } from './inspectPlacement'
import type { InspectFrame } from './inspectPlacement'
import { coverSize, facesToPaint } from '#/lib/bookFaces'

export interface InspectTarget {
  rotY: number
  rotX: number
}

export interface BookMeshProps {
  book: Book
  /** paperclip colour, for books being read */
  clipColor?: string
  /** a sleep read: a small moon on the spine */
  sleep?: boolean
  /**
   * Detailed books (D-0035): the book as a hardcover; off, as one simple block,
   * as before the hardcovers (#181). Follows the room panel, not the device.
   */
  detailed?: boolean
  /** a phone (T-0003): medals without their rim */
  lite?: boolean
  /** the shelf's gilded ridges, one instanced mesh for every book (see ShelfRidges) */
  ridges?: RefObject<THREE.InstancedMesh | null>
  /** this book's place in `ridges` */
  ridgeSlot?: number
  dims: BookDims
  slot: Slot
  selected: boolean
  dragging: boolean
  hovered: boolean
  /** a search is on: this book matches it (glows, stands out a little) or not (dims) */
  match?: 'glow' | 'dim' | null
  dragPoint: RefObject<THREE.Vector3>
  inspect: RefObject<InspectTarget>
  /** where the camera sits (not the animated camera, the resting one) */
  cameraBase: THREE.Vector3
  fov: number
  /** fraction of the view height the inspected book fills, and how far up and sideways it sits */
  inspectFrame: InspectFrame
  /** the ids of books put back and still flying home: this book is in it until it is back (T-0037) */
  flyingHome?: Set<string>
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
  onPointerMove: (e: ThreeEvent<PointerEvent>, id: string) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>, id: string) => void
  onHover: (id: string | null) => void
}

const SPINE_OUT = Math.PI / 2
const TAU = Math.PI * 2
const damp = THREE.MathUtils.damp
const smooth = THREE.MathUtils.smoothstep

/** While searching (#184): the glow a match gets on top of the shelf's lighting. */
export const MATCH_GLOW = 0.6
/** While searching: how much a book that doesn't match dims (0.82 leaves it at 18%). */
export const MATCH_DIM = 0.82
/** While searching: how far a match comes forward off the shelf (a hover is 0.035). */
export const MATCH_FORWARD = 0.06

/**
 * How a book is lit: `fly` from 0 (on the shelf) to 1 (taken out, lit evenly),
 * `glow` and `dim` from 0 to 1 while a search is on. `emissive` is the glow on
 * top of the scene's light; `shade` the brightness of the lit colour.
 */
export function bookLight(fly: number, glow: number, dim: number) {
  return {
    emissive: fly + MATCH_GLOW * glow * (1 - fly),
    shade: (1 - fly) * (1 - MATCH_DIM * dim),
  }
}

/** Shift `angle` by whole turns so it is as close as possible to `ref`. */
export function nearestTurn(angle: number, ref: number) {
  return angle + Math.round((ref - angle) / TAU) * TAU
}

function useCoverTexture(url: string | undefined, bookAspect: number) {
  // url is only set once the book has been taken out (see facesToPaint)
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  // the url whose image could not be loaded (then the painted stand-in shows)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let disposed = false
    let loaded: THREE.Texture | null = null
    new THREE.TextureLoader().load(
      url,
      (t) => {
        // big covers are drawn smaller first, so each takes little picture memory
        const src = t.image as HTMLImageElement
        const size = coverSize(src.width, src.height)
        if (size.width < src.width && typeof document !== 'undefined') {
          const c = document.createElement('canvas')
          c.width = size.width
          c.height = size.height
          c.getContext('2d')?.drawImage(src, 0, 0, size.width, size.height)
          // three.js uploads a canvas just like an image
          t.image = c as unknown as HTMLImageElement
        }
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        // centre-crop covers that are wider than the book (e.g. square audiobook art)
        const img = t.image as { width: number; height: number }
        const imgAspect = img.width / img.height
        if (imgAspect > bookAspect * 1.04) {
          t.repeat.x = bookAspect / imgAspect
          t.offset.x = (1 - t.repeat.x) / 2
        }
        if (disposed) return t.dispose()
        loaded = t
        setTex(t)
      },
      undefined,
      () => {
        if (disposed) return
        setTex(null)
        setFailedUrl(url)
      },
    )
    return () => {
      disposed = true
      loaded?.dispose()
      setTex(null)
    }
  }, [url, bookAspect])
  return { tex, failed: !!url && failedUrl === url }
}

export function BookMesh(props: BookMeshProps) {
  const {
    book,
    dims,
    slot,
    selected,
    dragging,
    hovered,
    match = null,
    dragPoint,
    inspect,
    cameraBase,
    fov,
    inspectFrame,
    sleep = false,
    detailed = true,
    lite = false,
    ridges,
    ridgeSlot = 0,
    flyingHome,
  } = props
  const group = useRef<THREE.Group>(null)

  // ---- textures ---------------------------------------------------------
  // the back and the cover are only needed once the book has been taken out, and kept after that
  const [takenOut, setTakenOut] = useState(selected)
  if (selected && !takenOut) setTakenOut(true)
  // out of the shelf right now, or still flying back: the full parts; on the shelf, the light piece
  const [out, setOut] = useState(selected)
  if (selected && !out) setOut(true)
  const look = bookLook({ detailed, takenOut: out })
  const { tex: cover, failed: coverFailed } = useCoverTexture(takenOut ? book.coverUrl : undefined, dims.w / dims.h)
  const paint = facesToPaint({ coverUrl: book.coverUrl, coverFailed, takenOut })
  // repaint only when something visible changes
  const looks = [book.title, book.authors.join(), book.color, book.status, book.readCount, book.language, book.description, book.isbn, book.pages, book.minutes, book.formats, book.format, dims.w, dims.h, dims.t]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spineTex = useMemo(() => paintSpine(book, dims, sleep), [...looks, sleep])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const backTex = useMemo(() => (paint.back ? paintBack(book, dims) : null), [...looks, paint.back])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fallbackTex = useMemo(() => (paint.fallback ? paintFallbackCover(book, dims) : null), [...looks, paint.fallback])
  useEffect(() => () => spineTex.dispose(), [spineTex])
  useEffect(() => () => backTex?.dispose(), [backTex])
  useEffect(() => () => fallbackTex?.dispose(), [fallbackTex])
  const plain = plainTexture(book.color)
  const painted = { spine: spineTex, back: backTex ?? plain, fallback: fallbackTex ?? plain }

  // her own page edges (#98), or the plain paper every book shares
  const edgesKey = JSON.stringify(cleanEdges(book.edges) ?? null)
  const edges = useMemo(() => {
    const e = cleanEdges(JSON.parse(edgesKey))
    return e ? paintEdges(e, dims, book.id) : null
  }, [edgesKey, dims, book.id])
  useEffect(
    () => () => {
      edges?.fore.dispose()
      edges?.topBottom.dispose()
    },
    [edges],
  )

  const materials = useMemo(() => {
    const pages = edges ?? pageTextures()
    const paper = { roughness: 0.95, metalness: 0 }
    const coverMat = { roughness: 0.55, metalness: 0.02 }
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    // local frame: front cover +z, spine -x, fore-edge +x
    // Each face also carries its picture as an emissive map. On the shelf that
    // glow is off; taken out to look at, it takes over from the lighting, so
    // the book shows its own colours from every side with no shading (#99).
    const face = (map: THREE.Texture, look: typeof paper) =>
      new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0, ...look })
    const fore = face(pages.fore, paper)
    const topBottom = face(pages.topBottom, paper)
    const spine = face(painted.spine, coverMat)
    const front = face(cover ?? painted.fallback, coverMat)
    const back = face(painted.back, coverMat)
    // the boards' thin edges, in the cloth of the spine
    const edge = face(painted.spine, coverMat)
    return {
      all: [fore, topBottom, spine, front, back, edge],
      // per part, in BoxGeometry face order
      pages: [fore, topBottom, topBottom, topBottom, topBottom, topBottom],
      front: [edge, edge, edge, edge, front, edge],
      back: [edge, edge, edge, edge, edge, back],
      spine: [edge, spine, edge, edge, edge, edge],
      // the simple block: fore-edge, spine, top, bottom, front, back
      block: [fore, spine, topBottom, topBottom, front, back],
      // on the shelf, the simple block or the merged hardcover: the paper, then the
      // spine's cloth (see shelfBlock and shelfHardcover)
      shelf: [topBottom, spine],
    }
    // painted is a new object every render: depend on the textures in it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spineTex, backTex, fallbackTex, plain, cover, edges])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])

  // every book is a hardcover: two boards and a spine round a page block that
  // is a little smaller, so the covers stick out past the pages (a few mm),
  // with softly rounded board edges. On the shelf it is one merged piece of two
  // draws (D-0035); only the book that is out gets the separate parts.
  const parts = useMemo(() => {
    if (look === 'block') return { block: new THREE.BoxGeometry(dims.w, dims.h, dims.t) }
    if (look === 'shelf-block') return { shelfBlock: shelfBlock(dims) }
    if (look === 'shelf-hardcover') return { shelfHardcover: takeShelfHardcover(dims) }
    const { board, round, pagesW, pagesX, over } = hardcoverSizes(dims)
    return {
      hardcover: {
        board,
        pages: { geometry: new THREE.BoxGeometry(pagesW, dims.h - 2 * over, dims.t - 2 * board), x: pagesX },
        board3: new RoundedBoxGeometry(dims.w - board, dims.h, board, 1, round),
        spine: new RoundedBoxGeometry(board, dims.h, dims.t, 1, round),
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.w, dims.h, dims.t, look])
  useEffect(
    () => () => {
      parts.block?.dispose()
      parts.shelfBlock?.dispose()
      parts.shelfHardcover?.release()
      parts.hardcover?.pages.geometry.dispose()
      parts.hardcover?.board3.dispose()
      parts.hardcover?.spine.dispose()
    },
    [parts],
  )
  const hc = parts.hardcover

  // the gilded ridges: this book's matrices in the shelf's one instanced mesh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ridgeMatrices = useMemo(() => ridgesFor(book, dims).map(ridgeMatrix), [dims.w, dims.h, dims.t, hasMedal(book)])
  const ridgeState = useRef({ mesh: null as THREE.InstancedMesh | null, slot: -1, ridges: ridgeMatrices, matrix: new THREE.Matrix4() })

  // ---- animation --------------------------------------------------------
  const anim = useRef({
    shelf: new THREE.Vector3(slot.x, slot.y, slot.z),
    drag: new THREE.Vector3(slot.x, slot.y, slot.z),
    dragAmt: 0,
    hover: 0,
    progress: 0,
    rotY: SPINE_OUT,
    glow: 0,
    dim: 0,
    rotX: 0,
    wasSelected: false,
  })
  const tmp = useMemo(() => ({ base: new THREE.Vector3(), target: new THREE.Vector3() }), [])
  // a book removed or re-keyed mid-flight is no longer on its way home
  useEffect(() => () => void flyingHome?.delete(book.id), [flyingHome, book.id])

  useFrame((state, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05)
    const a = anim.current

    damp3(a.shelf, slot.x, slot.y, slot.z, 9, dt)
    if (dragging) a.drag.lerp(dragPoint.current, 1 - Math.exp(-25 * dt))
    else a.drag.copy(a.shelf)
    a.dragAmt = damp(a.dragAmt, dragging ? 1 : 0, 12, dt)
    a.hover = damp(a.hover, hovered && !dragging && !selected ? 1 : 0, 12, dt)
    a.glow = damp(a.glow, match === 'glow' && !selected ? 1 : 0, 8, dt)
    a.dim = damp(a.dim, match === 'dim' && !selected ? 1 : 0, 8, dt)
    a.progress = damp(a.progress, selected ? 1 : 0, selected ? 3.2 : 4.5, dt)

    if (selected) {
      a.rotY = damp(a.rotY, inspect.current.rotY, 7, dt)
      a.rotX = damp(a.rotX, inspect.current.rotX, 7, dt)
    } else {
      if (a.wasSelected) a.rotY = nearestTurn(a.rotY, SPINE_OUT)
      a.rotY = damp(a.rotY, SPINE_OUT, 6, dt)
      a.rotX = damp(a.rotX, 0, 6, dt)
    }
    a.wasSelected = selected

    // pulled straight out of the shelf first, then flown to the camera
    const p = a.progress
    const out = smooth(p, 0, 0.35)
    const fly = smooth(p, 0.2, 1)
    tmp.base.lerpVectors(a.shelf, a.drag, a.dragAmt)
    tmp.base.z += 0.035 * a.hover + 0.28 * out + MATCH_FORWARD * a.glow
    tmp.base.y += 0.01 * a.hover

    // while out: `dist` in front of the camera's target (which steps back so this is in front of the
    // case, T-0026), where the book fills `fill` of the view height. Flying home it keeps the last
    // spot, so it doesn't jump when the camera eases back to her zoom.
    if (selected) {
      const dist = inspectDistance(dims.h, inspectFrame.fill, fov)
      const viewHeight = 2 * dist * Math.tan(THREE.MathUtils.degToRad(fov / 2))
      const viewWidth = viewHeight * (state.camera as THREE.PerspectiveCamera).aspect
      tmp.target.set(cameraBase.x + viewWidth * inspectFrame.xShift, cameraBase.y + viewHeight * inspectFrame.yShift, cameraBase.z - dist)
    }
    g.position.lerpVectors(tmp.base, tmp.target, fly)

    g.rotation.set(
      a.rotX * fly,
      THREE.MathUtils.lerp(SPINE_OUT, a.rotY, fly),
      -0.12 * a.dragAmt,
    )

    // fade from lit to evenly lit as the book flies out (and back as it returns);
    // a search match glows, the other books dim
    const { emissive: glowing, shade } = bookLight(fly, a.glow, a.dim)
    const first = materials.all[0]
    if (Math.abs(first.emissiveIntensity - glowing) > 0.001 || Math.abs(first.color.r - shade) > 0.001) {
      for (const m of materials.all) {
        m.emissiveIntensity = glowing
        m.color.setScalar(shade)
      }
    }

    // back on the shelf: the light piece again
    if (!selected && out && a.progress < 0.001) setOut(false)
    // put back and not home yet: with reduced motion the camera waits for it (T-0037)
    if (flyingHome) {
      if (!selected && a.progress >= 0.001) flyingHome.add(book.id)
      else flyingHome.delete(book.id)
    }

    // the ridges follow the book (hover, drag, taken out), written only when it moved
    const rm = ridges?.current
    if (rm && detailed) {
      g.updateMatrix()
      const st = ridgeState.current
      const base = ridgeSlot * RIDGES_PER_BOOK
      if (base + RIDGES_PER_BOOK <= rm.instanceMatrix.count && (st.mesh !== rm || st.slot !== ridgeSlot || st.ridges !== ridgeMatrices || !g.matrix.equals(st.matrix))) {
        for (let k = 0; k < RIDGES_PER_BOOK; k++) {
          const local = ridgeMatrices[k]
          rm.setMatrixAt(base + k, local ? ridgeTmp.multiplyMatrices(g.matrix, local) : NO_RIDGE)
        }
        rm.instanceMatrix.needsUpdate = true
        st.mesh = rm
        st.slot = ridgeSlot
        st.ridges = ridgeMatrices
        st.matrix.copy(g.matrix)
      }
    }
  })

  // what every part of the book shares: shadows and being picked up
  const part = {
    // taken out to look at, the book is lit evenly: no shadow on it, and it
    // throws none onto the bookcase while it turns
    castShadow: !selected,
    receiveShadow: !selected,
    onPointerDown: (e: ThreeEvent<PointerEvent>) => props.onPointerDown(e, book.id),
    onPointerMove: (e: ThreeEvent<PointerEvent>) => props.onPointerMove(e, book.id),
    onPointerUp: (e: ThreeEvent<PointerEvent>) => props.onPointerUp(e, book.id),
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      props.onHover(book.id)
    },
    onPointerOut: () => props.onHover(null),
  }

  return (
    <group ref={group} position={[slot.x, slot.y, slot.z]} rotation={[0, SPINE_OUT, 0]}>
      {/* on the shelf two draws (paper and spine) instead of six or more; out, every side with its picture */}
      {parts.block && <mesh {...part} material={materials.block} geometry={parts.block} />}
      {parts.shelfBlock && <mesh {...part} material={materials.shelf} geometry={parts.shelfBlock} />}
      {parts.shelfHardcover && <mesh {...part} material={materials.shelf} geometry={parts.shelfHardcover.geometry} />}
      {hc && (
        <>
          <mesh {...part} material={materials.pages} geometry={hc.pages.geometry} position={[hc.pages.x, 0, 0]} />
          <mesh {...part} material={materials.front} geometry={hc.board3} position={[hc.board / 2, 0, dims.t / 2 - hc.board / 2]} />
          <mesh {...part} material={materials.back} geometry={hc.board3} position={[hc.board / 2, 0, -dims.t / 2 + hc.board / 2]} />
          <mesh {...part} material={materials.spine} geometry={hc.spine} position={[-dims.w / 2 + hc.board / 2, 0, 0]} />
        </>
      )}
      {hasClip(book) && (
        <Bookmark dims={dims} progress={book.progress ?? 0} color={props.clipColor ?? RAINBOW[0]} />
      )}
      {/* the rim follows the phone, not Detailed books (T-0034 design) */}
      {hasMedal(book) && <Medal dims={dims} count={timesRead(book)} rim={!lite} />}
    </group>
  )
}

export type BookLook = 'shelf-hardcover' | 'hardcover' | 'shelf-block' | 'block'

/**
 * Which look a book gets (D-0035), on a phone or a computer alike: with
 * Detailed books a hardcover, as one merged piece on the shelf and as its
 * separate parts (cover picture, painted back) while it is taken out; without,
 * the simple block, on the shelf or taken out.
 */
export function bookLook({ detailed, takenOut }: { detailed: boolean; takenOut: boolean }): BookLook {
  if (detailed) return takenOut ? 'hardcover' : 'shelf-hardcover'
  return takenOut ? 'block' : 'shelf-block'
}

/**
 * The hardcover's measurements: boards thick enough and a clear overhang, so it
 * reads as a hardcover from the shelf; the page block sits between the boards.
 */
export function hardcoverSizes(dims: BookDims) {
  const board = THREE.MathUtils.clamp(dims.t * 0.1, 0.0018, 0.0032)
  const over = Math.min(0.0045, dims.w * 0.04, dims.h * 0.025)
  const round = board * 0.45
  const pagesW = dims.w - board - over
  return { board, over, round, pagesW, pagesX: -dims.w / 2 + board + pagesW / 2 }
}

/**
 * Where on the spine picture the boards' outer faces take their colour: the
 * plain cloth in the middle of the spine (u 0.5, where the shading is the book's
 * own colour), between the top bands and the title (7.5 % from the top).
 * On the shelf those faces lie against the neighbouring books.
 */
const CLOTH_UV = [0.5, 0.925] as const

/**
 * A hardcover on the shelf as ONE geometry with two groups (D-0035): first the
 * paper (the page block's fore-edge, top and bottom), then the cloth (the
 * rounded spine with its picture, and the two rounded boards). The same
 * shapes, sizes and places as the separate parts of a taken-out book, so
 * nothing jumps when it leaves or reaches the shelf.
 */
export function shelfHardcover(dims: BookDims) {
  const s = hardcoverSizes(dims)
  // only the page block's sides that show: the spine and the boards cover the others
  const box = new THREE.BoxGeometry(s.pagesW, dims.h - 2 * s.over, dims.t - 2 * s.board)
  const pages = keepSides(box, [0, 2, 3]).translate(s.pagesX, 0, 0)
  box.dispose()
  const rounded = (w: number, d: number, x: number, z: number, outer: number | null) => {
    const g = new RoundedBoxGeometry(w, dims.h, d, 1, s.round)
    // RoundedBoxGeometry is unindexed, side after side in BoxGeometry order (+x, -x, +y, -y, +z, -z)
    if (outer !== null) {
      const uv = g.attributes.uv
      const per = uv.count / 6
      for (let i = outer * per; i < (outer + 1) * per; i++) uv.setXY(i, CLOTH_UV[0], CLOTH_UV[1])
    }
    g.translate(x, 0, z)
    // share the corners of each side's grid: about a sixth of the vertices
    const merged = mergeVertices(g, 1e-7)
    g.dispose()
    return merged
  }
  const spine = rounded(s.board, dims.t, -dims.w / 2 + s.board / 2, 0, null)
  const front = rounded(dims.w - s.board, s.board, s.board / 2, dims.t / 2 - s.board / 2, 4)
  const back = rounded(dims.w - s.board, s.board, s.board / 2, -dims.t / 2 + s.board / 2, 5)
  const pieces = [pages, spine, front, back]
  const g = mergeGeometries(pieces, false)
  pieces.forEach((p) => p.dispose())
  const paper = pages.index!.count
  g.clearGroups()
  g.addGroup(0, paper, 0)
  g.addGroup(paper, g.index!.count - paper, 1)
  return g
}

/** Only the given sides of a one-segment BoxGeometry, with only the vertices they use. */
function keepSides(box: THREE.BufferGeometry, sides: number[]) {
  const index = box.index!.array
  const idx = sides.flatMap((i) => Array.from(index.slice(i * 6, i * 6 + 6)))
  const used = [...new Set(idx)].sort((a, b) => a - b)
  const at = new Map(used.map((v, i) => [v, i]))
  const g = new THREE.BufferGeometry()
  for (const name of ['position', 'normal', 'uv']) {
    const a = box.getAttribute(name)
    const arr = new Float32Array(used.length * a.itemSize)
    used.forEach((v, i) => {
      for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a.array[v * a.itemSize + k]
    })
    g.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize))
  }
  g.setIndex(idx.map((v) => at.get(v)!))
  return g
}

/**
 * Books of the same size (to 0.1 mm) share one shelf hardcover geometry; it is
 * freed when the last of them lets go of it.
 */
const shelfHardcovers = new Map<string, { geometry: THREE.BufferGeometry; users: number }>()
function takeShelfHardcover(dims: BookDims) {
  const key = [dims.w, dims.h, dims.t].map((v) => Math.round(v * 1e4)).join(':')
  let entry = shelfHardcovers.get(key)
  if (!entry) {
    entry = { geometry: shelfHardcover(dims), users: 0 }
    shelfHardcovers.set(key, entry)
  }
  entry.users++
  const e = entry
  let released = false
  return {
    geometry: e.geometry,
    release: () => {
      if (released) return
      released = true
      if (--e.users > 0) return
      e.geometry.dispose()
      shelfHardcovers.delete(key)
    },
  }
}

/**
 * A book's block for the shelf on a phone, drawn in two parts instead of six:
 * every side but the spine with one material (the paper), then the spine
 * (BoxGeometry side 1, -x). Front and back face the books next to it there.
 */
export function shelfBlock(dims: BookDims) {
  const g = new THREE.BoxGeometry(dims.w, dims.h, dims.t)
  const index = g.index!.array
  // BoxGeometry with one segment: six indices per side, in side order +x, -x, +y, -y, +z, -z
  const side = (i: number) => Array.from(index.slice(i * 6, i * 6 + 6))
  g.setIndex([...side(0), ...side(2), ...side(3), ...side(4), ...side(5), ...side(1)])
  g.clearGroups()
  g.addGroup(0, 30, 0)
  g.addGroup(30, 6, 1)
  return g
}

function damp3(v: THREE.Vector3, x: number, y: number, z: number, lambda: number, dt: number) {
  v.set(damp(v.x, x, lambda, dt), damp(v.y, y, lambda, dt), damp(v.z, z, lambda, dt))
}

// ---------------------------------------------------------------------------
// Bookmark: a large coated paperclip clipped onto the page you are on. It
// stands upright in the plane of the pages and pokes out of the top edge, so
// from the shelf it reads as a pin sticking up at the reading position.
// ---------------------------------------------------------------------------

/** Paperclip colours, handed out in order to the books being read. */
export const RAINBOW = ['#e5484d', '#f2843a', '#f5c842', '#4fb365', '#3d8fe0', '#5b5bd6', '#a35bd0']

/** a book she is reading or has paused carries a paper clip on its page */
export const hasClip = (book: Book) => book.status === 'reading' || book.status === 'paused'

const CLIP = {
  width: 0.02,
  height: 0.07,
  wire: 0.0015, // tube radius
  out: 0.042, // how far it sticks out above the pages
  fromSpine: 0.012, // gap between the spine and the clip's outer leg
}
/** how far the paper clip sticks out above the pages: the opened book's framing makes room for it (T-0037) */
export const CLIP_OUT = CLIP.out

/**
 * Gem-style paperclip as one continuous wire, in units of the clip width.
 * Legs at x = +0.2, -0.3, +0.5, -0.5 joined by three U-turns.
 */
function paperclipPoints(width: number, height: number) {
  const hgt = height / width
  const pts: THREE.Vector3[] = []
  const line = (x: number, y0: number, y1: number) => {
    const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) * 6))
    for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(x, y0 + ((y1 - y0) * i) / n, 0))
  }
  // half-turn from angle a0 to a1 round (cx, cy)
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const n = 14
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0))
    }
  }
  const outerTop = hgt - 0.5
  const innerTop = outerTop - 0.32
  line(0.2, 0.95, innerTop) // innermost leg, up
  arc(-0.05, innerTop, 0.25, 0, Math.PI) // small top turn
  line(-0.3, innerTop, 0.4) // down
  arc(0.1, 0.4, 0.4, Math.PI, TAU) // wide bottom turn
  line(0.5, 0.4, outerTop) // up the outside
  arc(0, outerTop, 0.5, 0, Math.PI) // big top turn
  line(-0.5, outerTop, 0.75) // down the outside, ending short
  pts.push(new THREE.Vector3(-0.5, 0.75, 0))
  return pts.map((p) => p.multiplyScalar(width))
}

function paperclipGeometry() {
  const curve = new THREE.CatmullRomCurve3(paperclipPoints(CLIP.width, CLIP.height), false, 'centripetal')
  return new THREE.TubeGeometry(curve, 220, CLIP.wire, 8, false)
}

function Bookmark({
  dims,
  progress,
  color,
}: {
  dims: BookDims
  progress: number
  color: string
}) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(paperclipGeometry, [])
  const material = useMemo(
    // plastic-coated wire: glossy with a hint of metal
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.25 }),
    [color],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // local frame: front cover at +z, back cover at -z; page 1 sits just behind the front cover
  const inset = CLIP.wire + 0.003
  const span = Math.max(0, dims.t / 2 - inset)
  const targetZ = THREE.MathUtils.lerp(span, -span, THREE.MathUtils.clamp(progress, 0, 1))
  // clip's outer leg near the spine, top poking out above the pages
  const x = -dims.w / 2 + CLIP.fromSpine + CLIP.width / 2
  const y = dims.h / 2 + CLIP.out - CLIP.height

  useFrame((_, dt) => {
    const g = group.current
    if (g) g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, 8, Math.min(dt, 0.05))
  })

  return (
    <group ref={group} position={[0, 0, targetZ]}>
      <mesh castShadow geometry={geometry} material={material} position={[x, y, 0]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Medal: a bronze, silver or gold medal (read once, twice, three times or more) pinned to the bottom of the spine of a finished book.
// Its ribbon is painted on the spine texture (see paintSpine); the medal
// itself is a thin gold disc standing just proud of the spine.
// ---------------------------------------------------------------------------

const MEDAL_DEPTH = 0.0018

const medalMaterials = new Map<string, { face: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial }>()
export function getMedalMaterials(count: number) {
  // shared by every medal with the same metal and number, never disposed
  const tier = medalTier(count)
  const key = `${tier}:${count}`
  let mats = medalMaterials.get(key)
  if (!mats) {
    mats = {
      face: new THREE.MeshStandardMaterial({
        map: medalFaceTexture(tier, count),
        metalness: 0.55,
        roughness: 0.32,
        emissive: METALS[tier].dark,
        emissiveIntensity: 0.25,
      }),
      rim: new THREE.MeshStandardMaterial({ color: METALS[tier].rim, metalness: 0.7, roughness: 0.3 }),
    }
    medalMaterials.set(key, mats)
  }
  return mats
}

function Medal({ dims, count, rim = true }: { dims: BookDims; count: number; rim?: boolean }) {
  const { r, fromBottom } = medalLayout(dims)
  const mats = getMedalMaterials(count)
  return (
    // spine is the -x face; the disc faces outwards along -x
    <group position={[-dims.w / 2, -dims.h / 2 + fromBottom, 0]}>
      {/* on a phone just the face: the thin rim is one more draw for every finished book */}
      {rim && (
        <mesh castShadow material={mats.rim} position={[-MEDAL_DEPTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, MEDAL_DEPTH, 40, 1, true]} />
        </mesh>
      )}
      <mesh material={mats.face} position={[-MEDAL_DEPTH, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[r, 40]} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Raised bands: the gilded ridges across the spine of an old hardcover, a
// pair near the top and a pair near the bottom (none at the bottom when a
// medal hangs there). Every ridge on the shelf is one instance of a single
// InstancedMesh (D-0035: no draw per book); each book writes its own ridges'
// matrices as it moves, so they follow it on hover, drag and taken out.
// ---------------------------------------------------------------------------

const ridgeMaterial = new THREE.MeshStandardMaterial({ color: '#c99a45', metalness: 0.75, roughness: 0.35 })

/** Room for this many ridges per book in the shelf's instanced mesh. */
export const RIDGES_PER_BOOK = 4
const NO_RIDGE = new THREE.Matrix4().makeScale(0, 0, 0)
const ridgeTmp = new THREE.Matrix4()

/** A book's ridges in its own frame (spine at -x): where they sit and their size. */
export function ridgeLayout(dims: BookDims, medal: boolean) {
  const height = Math.max(0.0014, dims.h * 0.006)
  return [0.06, 0.085, ...(medal ? [] : [0.89, 0.915])].map((f) => ({
    position: [-dims.w / 2 - 0.0006, dims.h / 2 - f * dims.h, 0] as const,
    size: [0.0014, height, dims.t * 0.9] as const,
  }))
}

/**
 * The ridges BookMesh gives a book: none at the bottom where a medal hangs, by the same rule as
 * the medal (`hasMedal`: read, or did-not-finish and read before; T-0037).
 */
export const ridgesFor = (book: Book, dims: BookDims) => ridgeLayout(dims, hasMedal(book))

function ridgeMatrix(r: ReturnType<typeof ridgeLayout>[number]) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...r.position), new THREE.Quaternion(), new THREE.Vector3(...r.size))
}

/**
 * Every book's ridges as one InstancedMesh: one draw for the whole shelf (and
 * one for its shadow). It sits beside the books, in the same frame as their
 * groups. Room for RIDGES_PER_BOOK × `books`; unused places stay empty.
 */
export function ShelfRidges({ books, meshRef }: { books: number; meshRef: RefObject<THREE.InstancedMesh | null> }) {
  const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, books * RIDGES_PER_BOOK))))
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ridgeMaterial, capacity)
    for (let i = 0; i < capacity; i++) m.setMatrixAt(i, NO_RIDGE)
    m.castShadow = true
    // the books move it about: no bounds to cull by
    m.frustumCulled = false
    return m
  }, [capacity])
  useLayoutEffect(() => {
    mesh.count = Math.min(capacity, books * RIDGES_PER_BOOK)
  }, [mesh, capacity, books])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      mesh.dispose()
    },
    [mesh],
  )
  return <primitive object={mesh} ref={meshRef} />
}
