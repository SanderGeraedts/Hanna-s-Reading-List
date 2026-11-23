import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { BOWL_SPOT } from './shopModels'

/**
 * Drag-to-feed (T-0032 Design §6b): a cookie on the bowl lifts and follows the
 * pointer. Dropping it on a pet (any `userData.isPet` group) triggers `onFeed`.
 * Dropping anywhere else returns it to the bowl. The Feed button keeps working
 * for keyboard/SR; both call the same `onFeed`.
 */

interface Props {
  /** how many cookies are in the bowl now (so there is anything to pick up) */
  cookies: number
  /** called when a cookie is dropped on a pet */
  onFeed: (petId: string) => void
  /** phone branch: nothing to drag onto when there is only one creature in view */
  disabled?: boolean
}

export function DragFeed({ cookies, onFeed, disabled }: Props) {
  const cookie = useRef<THREE.Mesh>(null)
  const target = useRef<THREE.Vector3>(new THREE.Vector3(BOWL_SPOT[0], BOWL_SPOT[1] + 0.1, BOWL_SPOT[2]))
  const dragging = useRef(false)
  const { camera, gl, scene } = useThree()
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1))
  const ray = useRef(new THREE.Raycaster())
  const hit = useRef(new THREE.Vector3())
  const ndc = useRef(new THREE.Vector2())

  useFrame((_, dt) => {
    const m = cookie.current
    if (!m) return
    const d = Math.min(dt, 0.05)
    // ease toward target
    m.position.x += (target.current.x - m.position.x) * Math.min(1, 10 * d)
    m.position.y += (target.current.y - m.position.y) * Math.min(1, 10 * d)
    m.position.z += (target.current.z - m.position.z) * Math.min(1, 10 * d)
  })

  // raycast from a pointer event to find the pet under it
  const petUnder = (e: PointerEvent): string | null => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.current.setFromCamera(ndc.current, camera)
    const hits = ray.current.intersectObjects(scene.children, true)
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o) {
        if (o.userData?.isPet && typeof o.userData.petId === 'string') return o.userData.petId
        o = o.parent
      }
    }
    return null
  }

  useEffect(() => {
    if (!dragging.current) return
    const move = (e: PointerEvent) => {
      // project pointer onto horizontal plane at cookie height
      const rect = gl.domElement.getBoundingClientRect()
      ndc.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.current.setFromCamera(ndc.current, camera)
      if (ray.current.ray.intersectPlane(plane.current, hit.current)) {
        target.current.set(hit.current.x, 0.15, hit.current.z)
      }
    }
    const up = (e: PointerEvent) => {
      dragging.current = false
      const id = petUnder(e)
      if (id) onFeed(id)
      target.current.set(BOWL_SPOT[0], BOWL_SPOT[1] + 0.1, BOWL_SPOT[2])
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging.current])

  if (disabled || cookies <= 0) return null

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    dragging.current = true
    // force a re-render to attach move/up listeners
    target.current.y = 0.18
    // manually attach so the first hook run doesn't miss it
    const move = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.current.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
      ray.current.setFromCamera(ndc.current, camera)
      if (ray.current.ray.intersectPlane(plane.current, hit.current)) {
        target.current.set(hit.current.x, 0.18, hit.current.z)
      }
    }
    const up = (ev: PointerEvent) => {
      dragging.current = false
      const id = petUnder(ev)
      if (id) onFeed(id)
      target.current.set(BOWL_SPOT[0], BOWL_SPOT[1] + 0.1, BOWL_SPOT[2])
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <mesh ref={cookie} position={[BOWL_SPOT[0], BOWL_SPOT[1] + 0.1, BOWL_SPOT[2]]} onPointerDown={onDown}>
      <sphereGeometry args={[0.03, 16, 12]} />
      <meshStandardMaterial color="#c8893a" roughness={0.85} />
    </mesh>
  )
}
