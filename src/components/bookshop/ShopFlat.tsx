import { Fragment } from 'react'
import { mixedHash } from '#/lib/creatures/hash'
import type { Bookshop, Line } from '#/lib/bookshop/shop'
import type { UpgradeId } from '#/lib/bookshop/numbers'
import type { GardenWeather } from '#/lib/garden/weather'
import type { ShopDecoration } from '#/lib/bookshop/season'

/**
 * The bookshop, drawn flat (T-0113, D-0084 §7; made cosier in T-0123, D-0091): one inline SVG of
 * plain shapes, no WebGL, no images, nothing to fetch. The same drawing is the dashboard block
 * (`compact`: still, fewer spines) and the shop itself.
 *
 * Everything in it is true of her shop: the spines are the copies on her shelves in her books'
 * own colours, her best sellers wear a ribbon, her staff picks stand face-out in the window,
 * customers come in through the door, browse, pay at the till and leave with a book, and every
 * thing she bought stands somewhere in the room. The window shows the garden's weather for the
 * day (the same day, the same weather everywhere), the evening is lamp-lit with "Open late" on
 * the door, and the shop dresses up for Sinterklaas, Christmas, October and her birthday.
 *
 * It draws only, apart from the shelves: given `onShelf`, a tap on a shelf zooms in on it in the
 * shop (the list under the picture says the same for a screen reader).
 */

const W = 150
const H = 80
const FLOOR_Y = 58

const C = {
  wall: '#e8dcc8',
  wallStripe: '#e1d3bc',
  wallNight: '#3a3228',
  floor: '#9c7049',
  plank: '#8a6240',
  wood: '#7a5435',
  woodDark: '#5e402a',
  woodLight: '#8d6340',
  rug: '#8a4f4f',
  rugEdge: '#b9846a',
  skin: '#c89f7c',
  leaf: '#5d8a58',
  leafDark: '#476e44',
  pot: '#b5643f',
  brass: '#c9a35a',
  cream: '#f4ecdc',
}

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
  return { height: 10 + (h % 7), lean: (h >> 8) % 11 === 0 }
}

function Spines({ lines, x, width, base, ribbons }: { lines: Line[]; x: number; width: number; base: number; ribbons: ReadonlySet<string> }) {
  if (lines.length === 0) return null
  const step = Math.min(3.6, width / lines.length)
  const w = Math.max(1.2, step - 0.6)
  const marked = new Set<string>()
  return (
    <>
      {lines.map((line, i) => {
        const { height, lean } = spineLook(line, i)
        const left = x + i * step
        // one ribbon per best seller, on its first spine
        const ribbon = ribbons.has(line.id) && !marked.has(line.id) && !!marked.add(line.id)
        return (
          <g key={i} transform={lean ? `rotate(7 ${left + w / 2} ${base})` : undefined}>
            <rect x={left} y={base - height} width={w} height={height} rx={0.3} fill={line.book.color || C.wood} />
            <rect x={left} y={base - height + 2} width={w} height={0.5} fill="#000" opacity={0.18} />
            {ribbon && <path d={`M${left + w / 2 - 0.8} ${base - height} l1.6 0 l0 4 l-0.8 -0.9 l-0.8 0.9 Z`} fill="#d9a85b" />}
          </g>
        )
      })}
    </>
  )
}

/** A shelf board with its brackets. */
const Board = ({ x, y, width }: { x: number; y: number; width: number }) => (
  <>
    <rect x={x} y={y} width={width} height={2} rx={0.4} fill={C.wood} />
    <rect x={x} y={y + 2} width={width} height={0.8} rx={0.3} fill={C.woodDark} />
  </>
)

/** The window on to the street: the day's weather (the garden's, D-0083), or the evening sky. */
function WindowView({ weather, night, reduce }: { weather: GardenWeather; night: boolean; reduce?: boolean }) {
  const x = 6
  const y = 12
  const w = 28
  const h = 26
  const sky = night ? '#1f2a38' : weather === 'sun' ? '#bfe0f0' : weather === 'rain' || weather === 'shower' ? '#9fb1c2' : weather === 'mist' ? '#d6dde4' : weather === 'snow' || weather === 'frost' ? '#d9e3ec' : '#b8c8d4'
  const anim = reduce ? '' : ' shop-fall'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={sky} />
      {/* the street: the houses across the road */}
      <rect x={x} y={y + h - 8} width={w} height={8} fill={night ? '#2b3340' : '#a9a2a0'} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + 2 + i * 9} y={y + h - 12 - (i % 2) * 3} width={7} height={12 + (i % 2) * 3} fill={night ? '#323a48' : ['#c98f6b', '#b7a27c', '#a87c6a'][i]} />
      ))}
      {night && [0, 1, 2].map((i) => <rect key={`l${i}`} x={x + 4 + i * 9} y={y + h - 9} width={2} height={2} fill="#f3cd84" opacity={0.85} />)}
      {night ? (
        <>
          <circle cx={x + w - 6} cy={y + 5} r={2.2} fill="#f2ecd8" />
          {[3, 9, 15].map((sx, i) => (
            <circle key={i} cx={x + sx} cy={y + 3 + (i % 2) * 3} r={0.35} fill="#fff" />
          ))}
        </>
      ) : weather === 'sun' ? (
        <circle cx={x + w - 6} cy={y + 5} r={3} fill="#ffe39a" />
      ) : null}
      {(weather === 'cloud' || weather === 'shower' || weather === 'rain') && (
        <g fill={night ? '#3d4757' : '#eef2f5'}>
          <ellipse cx={x + 8} cy={y + 5} rx={5} ry={2} />
          <ellipse cx={x + 18} cy={y + 7} rx={6} ry={2.2} />
        </g>
      )}
      {(weather === 'rain' || weather === 'shower') && (
        <g className={`shop-rain${anim}`} stroke="#e6f0f8" strokeWidth={0.35} opacity={0.8}>
          {Array.from({ length: weather === 'rain' ? 14 : 7 }, (_, i) => {
            const rx = x + 1 + ((i * 7.3) % (w - 2))
            const ry = y + 2 + ((i * 5.1) % (h - 6))
            return <path key={i} d={`M${rx} ${ry} l-0.6 2`} />
          })}
        </g>
      )}
      {weather === 'snow' && (
        <g className={`shop-snow${anim}`} fill="#fff">
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={x + 1 + ((i * 6.7) % (w - 2))} cy={y + 1 + ((i * 4.3) % (h - 3))} r={0.45} />
          ))}
        </g>
      )}
      {weather === 'mist' && <rect x={x} y={y + h - 12} width={w} height={8} fill="#f2f4f6" opacity={0.6} />}
      {weather === 'frost' && <rect x={x} y={y} width={w} height={h} fill="#eef5fb" opacity={0.25} />}
      {/* the frame and the glazing bars */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.wood} strokeWidth={1.3} />
      <rect x={x + w / 2 - 0.45} y={y} width={0.9} height={h} fill={C.wood} />
      <rect x={x} y={y + h / 2 - 0.45} width={w} height={0.9} fill={C.wood} />
    </g>
  )
}

/** One customer: walks in through the door, browses, pays at the till and leaves with a book. */
function Customer({ i, still, sitting }: { i: number; still: boolean; sitting?: boolean }) {
  const coat = ['#5c6f8a', '#7a6a8c', '#6d7f69', '#8a6f5c'][i % 4]
  if (sitting)
    // a night owl in the reading chair, reading
    return (
      <g>
        <circle cx={63} cy={47.5} r={2.6} fill={C.skin} />
        <path d="M60 51 Q63 49 66 51 L66 56 L60 56 Z" fill={coat} />
        <rect x={61} y={51} width={4} height={2.6} rx={0.3} fill="#b85a3a" />
      </g>
    )
  // still: standing by the shelves, spread out a little
  const x = still ? 80 + i * 9 : 134
  return (
    <g className={still ? 'shop-customer still' : `shop-customer walk-${i % 4}`} transform={still ? undefined : `translate(0 0)`}>
      <g transform={`translate(${x} 0)`}>
        <ellipse cx={0} cy={FLOOR_Y + 4.4} rx={3.2} ry={0.9} fill="#000" opacity={0.15} />
        <path d={`M-3 ${FLOOR_Y + 4} L-3 ${FLOOR_Y - 5} Q0 ${FLOOR_Y - 8} 3 ${FLOOR_Y - 5} L3 ${FLOOR_Y + 4} Z`} fill={coat} />
        <circle cx={0} cy={FLOOR_Y - 9.5} r={3} fill={C.skin} />
        {/* the book she just bought, from the till to the door */}
        {!still && <rect className="shop-carry" x={2.2} y={FLOOR_Y - 3} width={2.6} height={3.4} rx={0.3} fill="#b85a3a" />}
      </g>
    </g>
  )
}

export interface ShopFlatProps {
  shop: Bookshop
  /** the dashboard block's smaller drawing: fewer spines, nothing moves */
  compact?: boolean
  /** nothing moves */
  reduce?: boolean
  /** evening in the shop (19:00–07:00, as in her bookshelf room): lamp-lit, "Open late" */
  night?: boolean
  /** the day's weather in the window (the garden's) */
  weather?: GardenWeather
  /** what the shop is dressed for today */
  decorations?: readonly ShopDecoration[]
  /** a tap on a shelf: 0 the top one, 1 the second */
  onShelf?: (shelf: 0 | 1) => void
}

export function ShopFlat({ shop, compact, reduce, night = false, weather = 'cloud', decorations = [], onShelf }: ShopFlatProps) {
  const has = (id: UpgradeId) => shop.owned.has(id)
  const dressed = (d: ShopDecoration) => decorations.includes(d)
  const still = !!compact || !!reduce
  const slots = (compact ? 16 : 26) * (has('shelf') ? 2 : 1)
  const spines = spinesFor(shop, slots)
  const upper = spines.slice(0, Math.ceil(spines.length / (has('shelf') ? 2 : 1)))
  const lower = has('shelf') ? spines.slice(upper.length) : []
  const ribbons = new Set(shop.bestsellers.map((l) => l.id))
  // a few of the customers the shop draws, never a crowd; one or two night owls in the evening
  const drawn = shop.stock > 0 ? Math.max(1, Math.min(4, Math.round(shop.trading.customers / 5))) : 0
  const customers = night ? Math.min(drawn, 2) : drawn
  const glow = night ? 0.5 : 0.18

  return (
    <svg className="shop-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {/* the room: striped wallpaper, a wooden floor with planks and a rug */}
      <rect x={0} y={0} width={W} height={H} rx={1} fill={night ? C.wallNight : C.wall} />
      {!night && Array.from({ length: 15 }, (_, i) => <rect key={i} x={i * 10 + 4} y={0} width={3} height={FLOOR_Y} fill={C.wallStripe} />)}
      <rect x={0} y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill={C.floor} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={0} y={FLOOR_Y + 2.5 + i * 5} width={W} height={0.6} fill={C.plank} opacity={0.6} />
      ))}
      {[18, 47, 81, 109, 133].map((x, i) => (
        <rect key={`p${i}`} x={x + (i % 2) * 6} y={FLOOR_Y + 3 + (i % 3) * 5} width={0.5} height={4.4} fill={C.plank} opacity={0.6} />
      ))}
      <ellipse cx={76} cy={70} rx={30} ry={5.5} fill={C.rugEdge} />
      <ellipse cx={76} cy={70} rx={27} ry={4.4} fill={C.rug} />

      {/* her birthday: bunting all the way across */}
      {dressed('birthday') && (
        <g>
          <path d={`M0 2 Q${W / 2} 8 ${W} 2`} stroke="#8a6240" strokeWidth={0.3} fill="none" />
          {Array.from({ length: 14 }, (_, i) => {
            const bx = 5 + i * 10.4
            const by = 2 + Math.sin((bx / W) * Math.PI) * 5.6
            return <path key={i} d={`M${bx - 2} ${by} L${bx + 2} ${by} L${bx} ${by + 3.4} Z`} fill={['#e07a7a', '#f0c35a', '#7ab0e0', '#8fcf8a'][i % 4]} />
          })}
        </g>
      )}

      {/* the sign over the door: the first thing coins buy */}
      {has('sign') && (
        <g>
          <rect x={120} y={4} width={26} height={7.5} rx={1.1} fill="#4b6b55" stroke="#2f4537" strokeWidth={0.5} />
          <text x={133} y={9.6} textAnchor="middle" fontSize={4.6} fill={C.cream} fontFamily="Georgia, serif">
            BOOKS
          </text>
        </g>
      )}

      {/* a hanging plant over the window, and the window itself */}
      <path d="M4 0 L4 6" stroke={C.woodDark} strokeWidth={0.3} />
      <ellipse cx={4} cy={7} rx={3} ry={1.6} fill={C.pot} />
      {[-2.6, -1, 0.8, 2.4].map((dx, i) => (
        <ellipse key={i} cx={4 + dx} cy={9 + (i % 2) * 1.6} rx={1} ry={2.4} fill={i % 2 ? C.leaf : C.leafDark} />
      ))}
      <WindowView weather={weather} night={night} reduce={still} />
      {/* the window seat: cushions in the window */}
      {has('seat') && (
        <g>
          <rect x={5} y={38} width={30} height={4} rx={0.8} fill="#6b7fa6" />
          <rect x={7} y={35} width={6} height={4} rx={1.2} fill="#e0b860" />
          <rect x={27} y={35.5} width={5} height={3.6} rx={1.2} fill="#c97a7a" />
        </g>
      )}
      {/* the sill: her staff picks stand face-out on it, or the window display she bought */}
      <rect x={5} y={37.5} width={30} height={1.2} fill={C.woodLight} />
      {shop.window.length > 0
        ? shop.window.map((p, i) => (
            <g key={p.id}>
              <rect x={9 + i * 8} y={30} width={5.4} height={7.5} rx={0.3} fill={p.book.color || C.wood} stroke="#00000033" strokeWidth={0.2} />
              <rect x={10 + i * 8} y={31.4} width={3.4} height={1} fill={C.cream} opacity={0.75} />
              <rect x={11.2 + i * 8} y={35.4} width={3.4} height={2} rx={0.2} fill={C.cream} />
              <text x={12.9 + i * 8} y={37} textAnchor="middle" fontSize={1.6} fill="#8a4f4f">
                ★
              </text>
            </g>
          ))
        : has('window') &&
          [9, 16, 23, 28].map((x, i) => <rect key={i} x={x} y={31} width={3.4} height={6.5} rx={0.3} fill={['#9d4b4b', '#3f6b8a', '#8a6f3f', '#5c4a7a'][i]} />)}
      {/* seasons on the sill and in the window */}
      {dressed('christmas') && (
        <g>
          <path d="M30 37.5 L33 37.5 L31.5 29 Z" fill="#2f6b45" />
          <path d="M29.6 34 L33.4 34 L31.5 27.5 Z" fill="#3d7d52" />
          <circle cx={31.5} cy={27.4} r={0.6} fill="#f0c35a" />
        </g>
      )}
      {dressed('sinterklaas') && (
        <g>
          {/* a mitre in the window's corner */}
          <path d="M7.5 37.5 L11 37.5 L11 32 Q9.25 29 7.5 32 Z" fill="#c43b3b" />
          <rect x={9} y={32} width={0.5} height={5.5} fill="#f0c35a" />
        </g>
      )}
      {dressed('autumn') && [12, 20, 26].map((x, i) => <ellipse key={i} cx={x} cy={37.2} rx={1.1} ry={0.5} fill={['#c9682f', '#d9a23a', '#a8452b'][i]} />)}

      {/* the magnetic board: every customer note stays on it */}
      <rect x={37} y={14} width={12} height={14} rx={0.6} fill="#5b6b74" stroke={C.wood} strokeWidth={0.7} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={38.5 + (i % 2) * 5} y={15.5 + Math.floor(i / 2) * 6} width={4} height={4.6} fill={['#fff3b0', '#ffd6d6', '#d6ecff', '#e3f5d6'][i]} transform={`rotate(${(i % 2 ? 4 : -3)} ${40.5 + (i % 2) * 5} ${17.8 + Math.floor(i / 2) * 6})`} />
          <circle cx={40.5 + (i % 2) * 5} cy={15.8 + Math.floor(i / 2) * 6} r={0.55} fill={['#d9534f', '#3f6b8a', '#6f9a58', '#d9a85b'][i]} />
        </g>
      ))}

      {/* two framed pictures */}
      <rect x={110} y={14} width={8} height={6} fill={C.brass} />
      <rect x={110.8} y={14.8} width={6.4} height={4.4} fill="#8fb0c9" />
      <path d="M110.8 19.2 L113.5 16.5 L115.5 18 L117.2 16.8 L117.2 19.2 Z" fill="#6f9a58" />
      <rect x={51} y={6} width={6} height={7.5} fill={C.brass} />
      <rect x={51.7} y={6.7} width={4.6} height={6.1} fill="#d9b9a0" />
      <circle cx={54} cy={9.2} r={1.4} fill="#9d6b52" />

      {/* the hanging light, and the warm lamp she bought */}
      <path d="M86 0 L86 6" stroke="#6b5a44" strokeWidth={0.4} />
      <path d="M83 9 L89 9 L87.5 6 L84.5 6 Z" fill="#b08d57" />
      <circle cx={86} cy={9.6} r={0.9} fill="#fff1c9" />
      {(night || has('lamp')) && <circle cx={86} cy={14} r={has('lamp') ? 16 : 9} fill="#f3cd84" opacity={has('lamp') ? glow : glow * 0.5} />}
      {has('lamp') && (
        <g>
          <path d="M100 0 L100 9" stroke="#6b5a44" strokeWidth={0.6} />
          <path d="M94 15 L106 15 L103 9 L97 9 Z" fill="#d9a85b" />
          <circle cx={100} cy={18} r={9} fill="#f3cd84" opacity={night ? 0.45 : 0.2} />
        </g>
      )}

      {/* the shelves: the first one is always there, the second one is bought */}
      <rect x={52} y={16} width={56} height={FLOOR_Y - 16} fill={night ? '#2c241d' : '#d7c4a5'} />
      <rect x={51} y={15} width={58} height={1.6} fill={C.woodDark} />
      <rect x={51} y={15} width={1.6} height={FLOOR_Y - 15} fill={C.wood} />
      <rect x={107.4} y={15} width={1.6} height={FLOOR_Y - 15} fill={C.wood} />
      {has('lights') && (
        <g>
          <path d="M52 17 Q66 21 80 17 Q94 21 108 17" stroke="#3b3b3b" strokeWidth={0.25} fill="none" />
          {Array.from({ length: 13 }, (_, i) => {
            const lx = 53 + i * 4.4
            const ly = 17 + Math.abs(Math.sin(((lx - 52) / 28) * Math.PI)) * 3.4
            return <circle key={i} className={still ? undefined : `shop-twinkle t${i % 3}`} cx={lx} cy={ly} r={0.6} fill={['#ffd36b', '#ff9f9f', '#9fd0ff'][i % 3]} />
          })}
        </g>
      )}
      <Board x={52} y={34} width={56} />
      <Spines lines={upper} x={53} width={54} base={34} ribbons={ribbons} />
      {has('shelf') && (
        <>
          <Board x={52} y={50} width={56} />
          <Spines lines={lower} x={53} width={54} base={50} ribbons={ribbons} />
        </>
      )}
      {/* tap a shelf to look closer (the shop only) */}
      {onShelf && (
        <>
          <rect className="shop-shelf-hit" x={52} y={16} width={56} height={19} fill="transparent" onClick={() => onShelf(0)} />
          {has('shelf') && <rect className="shop-shelf-hit" x={52} y={36} width={56} height={15} fill="transparent" onClick={() => onShelf(1)} />}
        </>
      )}
      {/* a few books stacked on the floor beside the shelves */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={46 + (i % 2) * 0.6} y={FLOOR_Y - 1.6 * (i + 1)} width={5} height={1.5} rx={0.2} fill={['#7b2d26', '#1f4e5f', '#c9a227'][i]} />
      ))}
      {/* the rolling ladder, against the shelves */}
      {has('ladder') && (
        <g stroke={C.woodDark} strokeWidth={0.7}>
          <path d={`M98 14 L102 ${FLOOR_Y}`} />
          <path d={`M101.5 14 L105.5 ${FLOOR_Y}`} />
          {Array.from({ length: 7 }, (_, i) => {
            const ly = 19 + i * 5.6
            const t = (ly - 14) / (FLOOR_Y - 14)
            return <path key={i} d={`M${98 + 4 * t} ${ly} L${101.5 + 4 * t} ${ly}`} />
          })}
          <path d="M96 14 L110 14" strokeWidth={0.5} />
        </g>
      )}

      {/* the fireplace, with the record player on its mantel */}
      {has('fire') && (
        <g>
          <rect x={111} y={38} width={14} height={20} fill="#9b8f86" />
          <rect x={110} y={37} width={16} height={2} fill={C.woodLight} />
          <rect x={114} y={44} width={8} height={14} rx={3} fill="#2a1f18" />
          <g className={still ? undefined : 'shop-flame'}>
            <path d="M115.5 58 Q116 52 118 50 Q120 52 120.5 58 Z" fill="#f08a3a" />
            <path d="M116.8 58 Q117.2 54 118 53 Q118.8 54 119.2 58 Z" fill="#ffd36b" />
          </g>
          <circle cx={118} cy={54} r={8} fill="#f3a35a" opacity={night ? 0.25 : 0.1} />
        </g>
      )}
      {has('records') && (
        <g>
          <rect x={112} y={has('fire') ? 33.5 : 54} width={10} height={3.5} rx={0.4} fill="#6b4a33" />
          <ellipse cx={117} cy={has('fire') ? 33.3 : 53.8} rx={3.6} ry={0.9} fill="#1d1d1d" />
          <circle cx={117} cy={has('fire') ? 33.3 : 53.8} r={0.5} fill="#c43b3b" />
        </g>
      )}

      {/* the door, with a little bell, and the sign for the evening */}
      <rect x={126} y={20} width={18} height={FLOOR_Y - 20} rx={0.8} fill={C.woodDark} />
      <rect x={127.5} y={21.5} width={15} height={FLOOR_Y - 21.5} fill={C.wood} />
      <rect x={130} y={24} width={10} height={12} fill={night ? '#1f2a38' : '#bfd6e4'} stroke={C.woodDark} strokeWidth={0.6} />
      <circle cx={140} cy={42} r={0.8} fill={C.brass} />
      <path d="M128 19 L128 17 M128 17 Q130 17 130 19" stroke={C.brass} strokeWidth={0.4} fill="none" />
      <path d="M127.2 19.2 Q128.6 22 130 19.2 Z" className={still ? undefined : 'shop-bell'} fill={C.brass} />
      <g>
        <path d="M132 36.6 L135 34.6 L138 36.6" stroke="#6b5a44" strokeWidth={0.25} fill="none" />
        <rect x={131} y={36.6} width={8} height={3.4} rx={0.4} fill={C.cream} />
        <text x={135} y={39.1} textAnchor="middle" fontSize={1.9} fill="#4b6b55" fontFamily="Georgia, serif">
          {night ? 'Open late' : 'Open'}
        </text>
      </g>
      {dressed('christmas') && (
        <g>
          <circle cx={135} cy={30} r={3} fill="none" stroke="#2f6b45" strokeWidth={1.4} />
          <circle cx={135} cy={32.8} r={0.6} fill="#c43b3b" />
        </g>
      )}
      {dressed('sinterklaas') && (
        <g>
          <path d="M121 57.5 L125 57.5 Q125.5 55.5 124 55.2 L121.6 55.6 Q121 56.5 121 57.5 Z" fill="#7a3b2a" />
          <path d="M123 55.4 L124.6 52.4" stroke="#e8822e" strokeWidth={0.8} strokeLinecap="round" />
        </g>
      )}
      {dressed('autumn') && (
        <g>
          <ellipse cx={122} cy={56.2} rx={2.8} ry={2} fill="#e07b2a" />
          <path d="M122 54.3 L122 53.2" stroke={C.leafDark} strokeWidth={0.5} />
          {night && <path d="M120.8 56 L121.6 55.4 L122.4 56 M122.6 56 L123.4 55.4" stroke="#ffd36b" strokeWidth={0.3} fill="none" />}
        </g>
      )}

      {/* a plant in a pot by the board */}
      <rect x={38} y={FLOOR_Y - 4} width={4.4} height={4} rx={0.5} fill={C.pot} />
      {[-2, -0.6, 0.8, 2.2].map((dx, i) => (
        <ellipse key={i} cx={40.2 + dx} cy={FLOOR_Y - 6.5 - (i % 2) * 1.4} rx={1.1} ry={2.8} fill={i % 2 ? C.leaf : C.leafDark} transform={`rotate(${dx * 8} ${40.2 + dx} ${FLOOR_Y - 5})`} />
      ))}

      {/* the counter, with the till on it once she has one */}
      <rect x={4} y={46} width={30} height={12} rx={1} fill={C.wood} />
      <rect x={4} y={46} width={30} height={2.4} rx={1} fill={C.woodLight} />
      {has('till') ? (
        <g>
          <rect x={9} y={39} width={11} height={7} rx={0.8} fill="#8c8f96" stroke="#5f6269" strokeWidth={0.5} />
          <rect x={10.6} y={40.6} width={7.8} height={2.6} rx={0.4} fill="#d8e4e8" />
          <circle cx={14.5} cy={44.6} r={0.7} fill="#5f6269" />
        </g>
      ) : (
        <ellipse cx={14.5} cy={43.5} rx={5} ry={2.6} fill="#b89b6a" opacity={0.9} />
      )}
      {dressed('birthday') && (
        <g>
          <rect x={21} y={42} width={5} height={4} rx={0.6} fill="#f4d9e0" />
          <rect x={23.2} y={40} width={0.6} height={2} fill="#7ab0e0" />
          <circle cx={23.5} cy={39.6} r={0.5} fill="#ffb347" />
        </g>
      )}

      {/* the shop cat, on the counter: she stretches, wanders a little and settles again */}
      {has('cat') && (
        <g className={still ? undefined : 'shop-cat'}>
          <ellipse cx={28} cy={43.4} rx={4.6} ry={2.4} fill="#5b4636" />
          <circle cx={31.6} cy={41.8} r={2.2} fill="#5b4636" />
          <path d="M30.2 40.3 L30.8 38.4 L31.9 39.9 Z" fill="#5b4636" />
          <path d="M32.6 40 L33.6 38.3 L34 40.3 Z" fill="#5b4636" />
          <path className={still ? undefined : 'shop-tail'} d="M23.6 43.2 Q21.2 42 22.4 40" stroke="#5b4636" strokeWidth={1} fill="none" strokeLinecap="round" />
          <circle cx={32.6} cy={41.6} r={0.42} fill="#e8d7a8" />
        </g>
      )}

      {/* the children's corner: a low table, two little chairs and a picture book */}
      {has('kids') && (
        <g>
          <rect x={14} y={64} width={10} height={1.4} rx={0.4} fill="#e0b860" />
          <rect x={15} y={65.4} width={1} height={3} fill="#c99a3e" />
          <rect x={22} y={65.4} width={1} height={3} fill="#c99a3e" />
          <rect x={10} y={64.5} width={3} height={4} rx={0.5} fill="#7ab0e0" />
          <rect x={25} y={64.5} width={3} height={4} rx={0.5} fill="#e07a7a" />
          <rect x={17} y={62.6} width={4.4} height={1.4} rx={0.2} fill="#8fcf8a" />
        </g>
      )}

      {/* the reading chair, where people sit down and read a chapter */}
      {has('chair') && (
        <g>
          <rect x={57} y={51} width={13} height={8} rx={1.6} fill="#8a5a62" />
          <rect x={57} y={45} width={4} height={10} rx={1.6} fill="#7a4e56" />
          <rect x={60} y={48} width={10} height={4.6} rx={1.2} fill="#9c6a72" />
          <rect x={58} y={58.4} width={2} height={2.2} rx={0.6} fill={C.woodDark} />
          <rect x={67.6} y={58.4} width={2} height={2.2} rx={0.6} fill={C.woodDark} />
        </g>
      )}

      {/* the tea counter: tea, a book, an afternoon gone */}
      {has('tea') && (
        <g>
          <rect x={86} y={55} width={18} height={2} rx={0.6} fill={C.woodLight} />
          <rect x={88} y={57} width={1.6} height={5} fill={C.woodDark} />
          <rect x={100.4} y={57} width={1.6} height={5} fill={C.woodDark} />
          {[89.5, 94, 98.5].map((x, i) => (
            <Fragment key={i}>
              <rect x={x} y={51.6} width={3.2} height={3.4} rx={0.6} fill="#f1e6d2" />
              <path d={`M${x + 3.3} 52.4 q1.4 0.8 0 1.8`} stroke="#f1e6d2" strokeWidth={0.6} fill="none" />
            </Fragment>
          ))}
          <g className={still ? undefined : 'shop-steam'}>
            <path d="M90.6 50.4 q1 -2 0 -4" stroke="#cbbda4" strokeWidth={0.45} fill="none" opacity={0.8} />
            <path d="M95.1 50.4 q-1 -2 0 -4" stroke="#cbbda4" strokeWidth={0.45} fill="none" opacity={0.7} />
          </g>
        </g>
      )}

      {/* the bookbinding table: old books mended, new ones bound by hand */}
      {has('bindery') && (
        <g>
          <rect x={108} y={63} width={14} height={1.6} rx={0.4} fill={C.woodLight} />
          <rect x={109} y={64.6} width={1.2} height={5} fill={C.woodDark} />
          <rect x={119.8} y={64.6} width={1.2} height={5} fill={C.woodDark} />
          <rect x={112} y={59} width={5} height={4} fill="#6b4a33" />
          <rect x={111} y={58} width={7} height={1.2} fill="#8c8f96" />
          <rect x={118} y={61.8} width={3} height={1.2} fill="#c9a227" />
        </g>
      )}

      {/* the shop dog, asleep on the rug */}
      {has('dog') && (
        <g className={still ? undefined : 'shop-dog'}>
          <ellipse cx={80} cy={70} rx={6} ry={2.4} fill="#c08a52" />
          <circle cx={85.6} cy={68.8} r={2.2} fill="#c08a52" />
          <ellipse cx={86.6} cy={67.6} rx={1} ry={1.8} fill="#8a5a32" />
          <path className={still ? undefined : 'shop-wag'} d="M74 69.6 Q72 68 72.6 66.6" stroke="#c08a52" strokeWidth={1} fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* the customers the shop draws; in the evening a night owl reads in the chair */}
      {Array.from({ length: customers }, (_, i) =>
        night && i === 0 && has('chair') ? <Customer key={i} i={i} still sitting /> : <Customer key={i} i={i} still={still} />,
      )}

      {/* the evening: the room comes down, the lamps stay warm */}
      {night && <rect x={0} y={0} width={W} height={H} fill="#141d2e" opacity={0.22} rx={1} pointerEvents="none" />}
    </svg>
  )
}
