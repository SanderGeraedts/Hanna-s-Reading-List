import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book } from '#/lib/library'
import { FRAME, SHELF, computeLayout, rowFloorY, shelfFitFor } from '#/lib/shelfLayout'
import type { ShelfLayout } from '#/lib/shelfLayout'
import { BookMesh } from './BookMesh'
import { Decorations } from './Decorations'
import type { InspectTarget } from './BookMesh'
import { FLOOR_TILE_METRES, floorTexture, wallTexture, woodTexture } from './textures'

export interface BookshelfSceneProps {
  books: Book[]
  selectedId: string | null
  inspect: RefObject<InspectTarget>
  onSelect: (id: string | null) => void
  onReorder: (ids: string[]) => void
}

const FOV = 35
const DEFAULT_INSPECT = { fill: 0.6, yShift: 0 }
const PORTRAIT_INSPECT = { fill: 0.4, yShift: 0.17 }

export function BookshelfScene(props: BookshelfSceneProps) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 0.7, 4] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#2a1f18']} />
      <fog attach="fog" args={['#2a1f18', 6, 14]} />
      <Scene {...props} />
    </Canvas>
  )
}

interface DragState {
  id: string
  order: string[]
}

function Scene({ books, selectedId, inspect, onSelect, onReorder }: BookshelfSceneProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  // handlers read the ref so back-to-back pointer events never see stale state
  const dragRef = useRef<DragState | null>(null)
  const updateDrag = useCallback((d: DragState | null) => {
    dragRef.current = d
    setDrag(d)
  }, [])
  const pending = useRef<{ id: string; x: number; y: number } | null>(null)
  const dragPoint = useRef(new THREE.Vector3())
  const gl = useThree((s) => s.gl)

  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const ordered = useMemo(
    () =>
      drag ? drag.order.map((id) => byId.get(id)).filter((b): b is Book => !!b) : books,
    [drag, books, byId],
  )
  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(1, size.height)
  const fit = useMemo(() => shelfFitFor(aspect), [aspect])
  const portrait = aspect < 0.8
  const layout = useMemo(() => computeLayout(ordered, fit), [ordered, fit])

  // keep the case size stable while dragging so the camera doesn't jump around
  const stableLayout = useRef<ShelfLayout>(layout)
  if (!drag) stableLayout.current = layout
  const caseLayout = drag ? stableLayout.current : layout

  const cameraBase = useCameraRig(caseLayout.caseWidth, caseLayout.caseHeight, !selectedId)

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
      pending.current = { id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
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
      <Lights caseHeight={caseLayout.caseHeight} cameraBase={cameraBase} />
      <Room />
      <Bookcase layout={caseLayout} />
      <Decorations items={layout.decor} />

      {ordered.map((book) => {
        const slot = layout.slots.get(book.id)
        const dims = layout.dims.get(book.id)
        if (!slot || !dims) return null
        return (
          <BookMesh
            key={book.id}
            book={book}
            dims={dims}
            slot={slot}
            selected={book.id === selectedId}
            dragging={drag?.id === book.id}
            hovered={hovered === book.id}
            dragPoint={dragPoint}
            inspect={inspect}
            cameraBase={cameraBase}
            fov={FOV}
            // on phones the details panel covers the bottom half: show the book smaller, higher up
            inspectFrame={portrait ? PORTRAIT_INSPECT : DEFAULT_INSPECT}
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

/** Positions the camera so the whole bookcase fits, whatever the window shape. */
function useCameraRig(caseWidth: number, caseHeight: number, parallax: boolean) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const base = useMemo(() => new THREE.Vector3(), [])

  const aspect = size.width / Math.max(1, size.height)
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  // leave room for the header at the top
  const distH = (caseHeight * FRAME.vertical) / 2 / tan
  const distW = (caseWidth * FRAME.horizontal) / 2 / (tan * aspect)
  const dist = Math.max(distH, distW, 0.9) + SHELF.depth / 2
  base.set(0, caseHeight / 2 + caseHeight * 0.04, dist)

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const c = state.camera
    // a touch of parallax following the mouse
    const px = parallax ? state.pointer.x * 0.06 : 0
    const py = parallax ? state.pointer.y * 0.04 : 0
    c.position.set(
      THREE.MathUtils.damp(c.position.x, base.x + px, 3, d),
      THREE.MathUtils.damp(c.position.y, base.y + py, 3, d),
      THREE.MathUtils.damp(c.position.z, base.z, 3, d),
    )
    c.lookAt(0, base.y, 0)
  })

  useEffect(() => {
    camera.position.copy(base)
    camera.lookAt(0, base.y, 0)
    // jump there on first mount; afterwards the frame loop eases toward the target
  }, [camera])

  return base
}

function Lights({ caseHeight, cameraBase }: { caseHeight: number; cameraBase: THREE.Vector3 }) {
  const keyLight = useRef<THREE.DirectionalLight>(null)
  // the shadow frustum follows the bookcase height; three.js needs telling when it changes
  useEffect(() => {
    keyLight.current?.shadow.camera.updateProjectionMatrix()
  }, [caseHeight])
  return (
    <>
      <hemisphereLight args={['#fff1dc', '#5a3c26', 1.5]} />
      <ambientLight intensity={0.35} color="#ffe9cf" />
      <directionalLight
        ref={keyLight}
        position={[0.9, caseHeight + 0.9, 4.2]}
        intensity={2.6}
        color="#ffe7c4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        // Bias is a fraction of the shadow camera's depth range, so keep that range
        // tight around the bookcase: with the default 0.5–500 m, even a tiny bias
        // shifts shadows by decimetres and they float away from what casts them.
        shadow-camera-near={1}
        shadow-camera-far={10}
        shadow-bias={-0.0001}
        shadow-normalBias={0.01}
        shadow-radius={3}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={caseHeight + 0.6}
        shadow-camera-bottom={-1.2}
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
const FLOOR_SIZE = 30

function Room() {
  const wall = useMemo(() => wallTexture(), [])
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
        <planeGeometry args={[30, WALL_HEIGHT]} />
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

  // satin oil finish: fairly matte with a soft sheen
  const mat = <meshStandardMaterial map={wood} color="#f6f4f0" roughness={0.62} />
  return (
    <group>
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
        <meshStandardMaterial map={backWood} color="#dedad2" roughness={0.75} />
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
