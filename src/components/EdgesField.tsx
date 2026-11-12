import type { Book } from '#/lib/library'
import { EDGE_PATTERNS, cleanEdges, edgesFromCover } from '#/lib/edges'
import type { EdgePattern, PageEdges } from '#/lib/edges'

interface Props {
  book: Book
  onChange: (edges: PageEdges | undefined) => void
}

/**
 * Coloured and patterned page edges (#98): from the cover in one tap, or a
 * pattern and colours picked by hand. Remove takes them off.
 */
export function EdgesField({ book, onChange }: Props) {
  const edges = cleanEdges(book.edges)

  const set = (patch: Partial<PageEdges>) => onChange(cleanEdges({ ...(edges ?? edgesFromCover(book)), ...patch }))
  const setColor = (i: number, color: string) => {
    const colors = [...(edges ?? edgesFromCover(book)).colors]
    colors[i] = color
    set({ colors: colors as PageEdges['colors'] })
  }

  return (
    <div className="field edges-field" role="group" aria-labelledby="edges-label">
      <span id="edges-label">Page edges</span>
      <div className="edges-actions">
        <button className="btn small" onClick={() => onChange(edgesFromCover(book))}>
          From the cover
        </button>
        {edges && (
          <button className="btn small" onClick={() => onChange(undefined)}>
            Remove
          </button>
        )}
      </div>

      {edges && (
        <div className="edges-pick">
          <select
            className="input"
            value={edges.pattern}
            aria-label="Pattern"
            onChange={(e) => set({ pattern: e.target.value as EdgePattern })}
          >
            {Object.entries(EDGE_PATTERNS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          {['Base colour', 'Pattern colour', 'Accent colour'].map((label, i) => (
            <input
              key={label}
              className="swatch"
              type="color"
              aria-label={label}
              title={label}
              value={edges.colors[i] ?? edges.colors[1]}
              onChange={(e) => setColor(i, e.target.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
