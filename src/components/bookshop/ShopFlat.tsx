import { Fragment } from 'react'
import { mixedHash } from '#/lib/creatures/hash'
import type { Bookshop, Line } from '#/lib/bookshop/shop'
import type { UpgradeId } from '#/lib/bookshop/numbers'

/**
 * The bookshop, drawn flat (T-0113, D-0084 §7): one inline SVG of plain
 * shapes, no WebGL, no images, nothing to fetch. The same drawing is the
 * dashboard block and the shop itself, smaller and larger — exactly the way
 * the garden does it (`garden/GardenFlat.tsx`, D-0051 §2). A third 3D world
 * would undo the loading-speed work going on beside this.
 *
 * Everything in the picture is something that is really true of her shop: the
 * spines are the copies on her shelves in her books' own colours, the
 * customers come and go with how many the shop draws, and every single thing
 * she has bought stands somewhere in it (D-0084 §4). A shop with nothing on
 * the shelves is drawn bare, because it is.
 *
 * It draws only. There is nothing to press here; the buttons live over and
 * under it, so this is `aria-hidden` and has no handlers.
 */

const WALL = '#e8dcc8'
const WALL_NIGHT = '#3a3228'
const FLOOR = '#9c7049'
const FLOOR_DARK = '#8a6240'
const WOOD = '#7a5435'
const WOOD_DARK = '#5e402a'

/** The spines on a shelf: the copies she really has, in her books' own colours. */
function spinesFor(shop: Bookshop, slots: number): Line[] {
  if (shop.stock <= 0) return []
  const show = Math.min(slots, shop.stock)
  const out: Line[] = []
  for (const line of shop.shelf) {
    const n = Math.max(1, Math.floor((line.copies * show) / shop.stock))
    for (let i = 0; i < n && out.length < show; i++) out.push(line)
  }
  return out
}

/** A spine's own height and tilt, the same on every device (the book's id decides). */
function spineLook(line: Line, i: number) {
  const h = mixedHash(`${line.id}:${i}`)
  return { height: 9 + (h % 7), lean: (h >> 8) % 11 === 0 }
}

function Spines({ lines, x, width, base }: { lines: Line[]; x: number; width: number; base: number }) {
  if (lines.length === 0) return null
  const step = Math.min(3.4, width / lines.length)
  const w = Math.max(1.1, step - 0.6)
  return (
    <>
      {lines.map((line, i) => {
        const { height, lean } = spineLook(line, i)
        const left = x + i * step
        return (
          <rect
            key={i}
            x={left}
            y={base - height}
            width={w}
            height={height}
            rx={0.3}
            fill={line.book.color || '#7a5435'}
            transform={lean ? `rotate(7 ${left + w / 2} ${base})` : undefined}
          />
        )
      })}
    </>
  )
}

/** A shelf board with its brackets. */
const Board = ({ x, y, width }: { x: number; y: number; width: number }) => (
  <>
    <rect x={x} y={y} width={width} height={2} rx={0.4} fill={WOOD} />
    <rect x={x} y={y + 2} width={width} height={0.8} rx={0.3} fill={WOOD_DARK} />
  </>
)

export interface ShopFlatProps {
  shop: Bookshop
  /** the dashboard block's smaller drawing: fewer spines, no customers walking */
  compact?: boolean
  /** nothing moves */
  reduce?: boolean
  /** a dark shop: the lamp, once she has it, is the only warm thing in it */
  night?: boolean
}

export function ShopFlat({ shop, compact, reduce, night }: ShopFlatProps) {
  const has = (id: UpgradeId) => shop.owned.has(id)
  const slots = (compact ? 16 : 24) * (has('shelf') ? 2 : 1)
  const spines = spinesFor(shop, slots)
  const upper = spines.slice(0, Math.ceil(spines.length / (has('shelf') ? 2 : 1)))
  const lower = has('shelf') ? spines.slice(upper.length) : []
  // a few of the customers the shop draws, never a crowd
  const customers = shop.stock > 0 ? Math.max(1, Math.min(4, Math.round(shop.trading.customers / 5))) : 0

  return (
    <svg className="shop-svg" viewBox="0 0 120 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <rect x={0} y={0} width={120} height={72} rx={1} fill={night ? WALL_NIGHT : WALL} />
      <rect x={0} y={54} width={120} height={18} fill={FLOOR} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={0} y={57 + i * 5} width={120} height={0.7} fill={FLOOR_DARK} opacity={0.5} />
      ))}

      {/* the sign over the door: the first thing coins buy, and the first thing anyone sees */}
      {has('sign') && (
        <g>
          <rect x={38} y={1} width={44} height={9} rx={1.2} fill="#4b6b55" stroke="#2f4537" strokeWidth={0.5} />
          <text x={60} y={7.6} textAnchor="middle" fontSize={5.4} fill="#f4ecdc" fontFamily="Georgia, serif">
            BOOKS
          </text>
          <rect x={59.4} y={0} width={1.2} height={1.5} fill="#2f4537" />
        </g>
      )}

      {/* the window on to the street */}
      <g>
        <rect x={6} y={13} width={26} height={21} rx={0.8} fill={night ? '#1f2a38' : '#bfd6e4'} stroke={WOOD} strokeWidth={1.2} />
        <rect x={18.6} y={13} width={0.9} height={21} fill={WOOD} />
        <rect x={6} y={23} width={26} height={0.9} fill={WOOD} />
        {has('window') &&
          [8.6, 15.6, 22.6, 27.4].map((x, i) => (
            <rect key={i} x={x} y={27.5} width={3.4} height={6.5} rx={0.3} fill={['#9d4b4b', '#3f6b8a', '#8a6f3f', '#5c4a7a'][i]} />
          ))}
      </g>

      {/* the shelves: the first one is always there, the second one is bought */}
      <Board x={42} y={30} width={72} />
      <Spines lines={upper} x={43} width={70} base={30} />
      {has('shelf') ? (
        <>
          <Board x={42} y={48} width={72} />
          <Spines lines={lower} x={43} width={70} base={48} />
        </>
      ) : null}

      {/* the counter, with the till on it once she has one */}
      <rect x={4} y={44} width={30} height={12} rx={1} fill={WOOD} />
      <rect x={4} y={44} width={30} height={2.4} rx={1} fill="#8d6340" />
      {has('till') && (
        <g>
          <rect x={10} y={37} width={11} height={7} rx={0.8} fill="#8c8f96" stroke="#5f6269" strokeWidth={0.5} />
          <rect x={11.6} y={38.6} width={7.8} height={2.6} rx={0.4} fill="#d8e4e8" />
          <circle cx={15.5} cy={42.6} r={0.7} fill="#5f6269" />
        </g>
      )}
      {!has('till') && <ellipse cx={15.5} cy={41.5} rx={5} ry={2.6} fill="#b89b6a" opacity={0.9} />}

      {/* the shop cat, asleep on the counter where she can be seen */}
      {has('cat') && (
        <g className={reduce ? undefined : 'shop-cat'}>
          <ellipse cx={27} cy={41.4} rx={5.4} ry={2.6} fill="#5b4636" />
          <circle cx={31.4} cy={39.8} r={2.4} fill="#5b4636" />
          <path d="M29.8 38.2 L30.4 36.2 L31.6 37.8 Z" fill="#5b4636" />
          <path d="M32.4 37.9 L33.4 36.1 L33.8 38.2 Z" fill="#5b4636" />
          <path d="M21.8 41.2 Q19.2 40 20.4 38" stroke="#5b4636" strokeWidth={1} fill="none" strokeLinecap="round" />
          <circle cx={32.4} cy={39.6} r={0.45} fill="#e8d7a8" />
        </g>
      )}

      {/* the reading chair, where people sit down and read a chapter */}
      {has('chair') && (
        <g>
          <rect x={38} y={44} width={13} height={10} rx={1.6} fill="#8a5a62" />
          <rect x={38} y={38} width={4} height={11} rx={1.6} fill="#7a4e56" />
          <rect x={41} y={41} width={10} height={5} rx={1.2} fill="#9c6a72" />
          <rect x={39} y={53.4} width={2} height={2.6} rx={0.6} fill={WOOD_DARK} />
          <rect x={48.6} y={53.4} width={2} height={2.6} rx={0.6} fill={WOOD_DARK} />
        </g>
      )}

      {/* the tea counter: tea, a book, an afternoon gone */}
      {has('tea') && (
        <g>
          <rect x={96} y={50} width={18} height={2} rx={0.6} fill="#8d6340" />
          <rect x={98} y={52} width={1.6} height={4} fill={WOOD_DARK} />
          <rect x={110.4} y={52} width={1.6} height={4} fill={WOOD_DARK} />
          {[99.5, 104, 108.5].map((x, i) => (
            <Fragment key={i}>
              <rect x={x} y={46.6} width={3.2} height={3.4} rx={0.6} fill="#f1e6d2" />
              <path d={`M${x + 3.3} 47.4 q1.4 0.8 0 1.8`} stroke="#f1e6d2" strokeWidth={0.6} fill="none" />
            </Fragment>
          ))}
          <path d="M100 45.4 q1 -2 2 0" stroke="#cbbda4" strokeWidth={0.5} fill="none" opacity={0.8} />
        </g>
      )}

      {/* the warm lamp: the shop glows and people linger */}
      {has('lamp') && (
        <g>
          <rect x={77.4} y={0} width={1.2} height={9} fill="#6b5a44" />
          <path d="M70 15 L88 15 L84 9 L74 9 Z" fill="#d9a85b" />
          <circle cx={78} cy={17} r={9} fill="#f3cd84" opacity={night ? 0.5 : 0.22} />
          <circle cx={78} cy={22} r={17} fill="#f3cd84" opacity={night ? 0.22 : 0.1} />
        </g>
      )}

      {/* the customers the shop draws, browsing the shelves */}
      {!compact &&
        Array.from({ length: customers }, (_, i) => {
          const x = 56 + i * 14
          return (
            <g key={i} className={reduce ? 'shop-customer still' : `shop-customer browse-${i % 3}`} transform={`translate(${x} 0)`}>
              <ellipse cx={0} cy={56.4} rx={3.2} ry={0.9} fill="#000" opacity={0.15} />
              <path d="M-3 56 L-3 47 Q0 44 3 47 L3 56 Z" fill={['#5c6f8a', '#7a6a8c', '#6d7f69', '#8a6f5c'][i % 4]} />
              <circle cx={0} cy={43} r={3} fill="#c89f7c" />
            </g>
          )
        })}

      {/* a bare shop says so by itself: no spines on the boards, and nobody in it */}
      {night &&<rect x={0} y={0} width={120} height={72} fill="#141d2e" opacity={0.28} rx={1} />}
    </svg>
  )
}
