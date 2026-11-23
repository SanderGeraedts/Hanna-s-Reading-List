import { BOOKCASES, clearFilters, isFiltered } from '#/lib/shelfFilter'
import type { BookcaseId, FilterOptions, ShelfFilters, ShelfView } from '#/lib/shelfFilter'

/**
 * The bar above the shelf (D-0046): the bookcase switch and the filter row.
 *
 * It is rendered as the header's own bottom row, so the header's one measured
 * height keeps the top shelf clear of it on every screen (the bug T-0003 and
 * T-0035 fixed): the phone's scrolling case through `topGap`, the computer's
 * whole-case framing through `frameCase`'s header share.
 */

type FilterKey = keyof ShelfFilters

const FILTER_FIELDS: Array<{ key: FilterKey; label: string; numeric?: boolean }> = [
  { key: 'genre', label: 'Genre' },
  { key: 'rating', label: 'Rating', numeric: true },
  { key: 'spice', label: 'Spice', numeric: true },
  { key: 'year', label: 'Year read', numeric: true },
  { key: 'language', label: 'Language' },
  { key: 'trope', label: 'Trope' },
]

export function ShelfBar({
  view,
  options,
  onView,
  /** nothing to show with this bookcase and these filters */
  empty,
}: {
  view: ShelfView
  options: FilterOptions
  onView: (view: ShelfView) => void
  empty: boolean
}) {
  const filtered = isFiltered(view.filters)
  const setFilter = (key: FilterKey, raw: string, numeric: boolean) => {
    const value = raw === '' ? null : numeric ? Number(raw) : raw
    onView({ ...view, filters: { ...view.filters, [key]: value } as ShelfFilters })
  }
  return (
    <div className="shelf-bar">
      <div className="segmented shelf-cases" role="group" aria-label="Bookcase">
        {BOOKCASES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={view.bookcase === id ? 'active' : undefined}
            aria-pressed={view.bookcase === id}
            data-bookcase={id}
            onClick={() => onView({ ...view, bookcase: id as BookcaseId })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="shelf-filters">
        {FILTER_FIELDS.map(({ key, label, numeric }) => {
          const list = options[key]
          if (!list.length) return null
          const value = view.filters[key]
          return (
            <label key={key} className={`sort shelf-filter${value !== null ? ' active' : ''}`}>
              <span className="muted">{label}</span>
              <select className="input" value={value === null ? '' : String(value)} onChange={(e) => setFilter(key, e.target.value, !!numeric)}>
                {list.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
        {filtered && (
          <button
            type="button"
            className="btn small shelf-clear"
            aria-label="Clear filters"
            onClick={() => {
              onView(clearFilters(view))
              // Clear disappears with the last filter, so focus goes to the chosen bookcase
              document.querySelector<HTMLButtonElement>(`.shelf-cases [data-bookcase='${view.bookcase}']`)?.focus()
            }}
          >
            <span aria-hidden>✕</span> Clear
          </button>
        )}
      </div>

      {empty && <p className="shelf-none">{filtered ? 'No books match these filters.' : 'No books here yet.'}</p>}
    </div>
  )
}
