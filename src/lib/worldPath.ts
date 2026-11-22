/**
 * Country shapes as SVG path data for the world map in "Where your books are set" (T-0022).
 *
 * The map is equirectangular in map units: x = lon + 180 (0 to 360), y = LAT_TOP − lat.
 * A ring that crosses the date line (Russia, Fiji) is unwrapped into one continuous closed ring
 * that runs past the map's edge, and its polygon is drawn a second time shifted 360 across, so
 * the part beyond the edge shows at the other side. The map's frame cuts both off. Lifting the
 * pen at the jump instead (as before) broke the ring into open pieces that the browser closed
 * each on its own, which left Russia's pale wedge.
 */

/** The latitude at the map's top edge (y = 0). */
export const LAT_TOP = 84

type Ring = number[][]
type Polygon = Ring[]

/** A ring made continuous: a jump of more than 180° of longitude is undone by ±360°, cumulatively. */
function unwrap(pts: Ring): Ring {
  let offset = 0
  return pts.map(([lon, lat], k) => {
    if (k > 0) {
      const prev = pts[k - 1][0] + offset
      const here = lon + offset
      if (here - prev > 180) offset -= 360
      else if (prev - here > 180) offset += 360
    }
    return offset === 0 ? [lon, lat] : [lon + offset, lat]
  })
}

/** One closed ring as `M…L…Z`, one decimal, shifted `dx` degrees of longitude. */
function ringPath(pts: Ring, dx: number): string {
  return (
    pts
      .map(([lon, lat], k) => `${k === 0 ? 'M' : 'L'}${(dx === 0 ? lon + 180 : lon + dx + 180).toFixed(1)},${(LAT_TOP - lat).toFixed(1)}`)
      .join('') + 'Z'
  )
}

/**
 * The `d` string for a country's polygons (each an outer ring and its holes, as `[lon, lat]`
 * points). A ring that doesn't cross the date line gives exactly the string it always did.
 */
export function polygonsToPath(polys: Polygon[]): string {
  return polys
    .map((poly) => {
      const rings = poly.map(unwrap)
      let east = false
      let west = false
      for (const r of rings)
        for (const [lon] of r) {
          if (lon > 180) east = true
          if (lon < -180) west = true
        }
      const draw = (dx: number) => rings.map((r) => ringPath(r, dx)).join('')
      return draw(0) + (east ? draw(-360) : '') + (west ? draw(360) : '')
    })
    .join('')
}
