import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * The armchair (T-0120) mixes rounded boxes with cylinders. Merged as they come, three.js gives
 * null and the room broke on a computer (T-0124). Made non-indexed first, they merge.
 */
describe('merging the reading corner’s pieces', () => {
  it('needs every piece non-indexed when rounded boxes meet cylinders', () => {
    const pieces = () => [new RoundedBoxGeometry(0.6, 0.2, 0.5, 3, 0.04), new THREE.CylinderGeometry(0.06, 0.06, 0.5, 14)]
    const strip = (g: THREE.BufferGeometry) => (g.deleteAttribute('uv'), g)
    const mixed = pieces().map(strip)
    if (mixed.some((g) => g.index) && mixed.some((g) => !g.index)) expect(mergeGeometries(mixed, false)).toBeNull()
    const fixed = pieces().map((g) => strip(g.index ? g.toNonIndexed() : g))
    expect(mergeGeometries(fixed, false)).not.toBeNull()
  })
})
