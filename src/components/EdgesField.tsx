import { useEffect, useState } from 'react'
import type { Book } from '#/lib/library'
import { EDGE_PATTERNS, cleanEdges, edgesFromCover } from '#/lib/edges'
import type { EdgePattern, PageEdges } from '#/lib/edges'
import { aiEdgesAvailable, designEdges } from '#/server/edgesAi'

interface Props {
  book: Book
  onChange: (edges: PageEdges | undefined) => void
}

/** whether the AI designer is set up on the server; asked once per page load */
let aiReady: Promise<boolean> | null = null

/**
 * Coloured and patterned page edges (#98): from the cover in one tap, picked
 * by hand, or described in words for the AI to design. Remove takes them off.
 */
export function EdgesField({ book, onChange }: Props) {
  const edges = cleanEdges(book.edges)
  const [ai, setAi] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    aiReady ??= aiEdgesAvailable().catch(() => false)
    let live = true
    aiReady.then((ok) => live && setAi(ok))
    return () => {
      live = false
    }
  }, [])

  const set = (patch: Partial<PageEdges>) => {
    const next = cleanEdges({ ...(edges ?? edgesFromCover(book)), ...patch, prompt: undefined })
    onChange(next)
  }
  const setColor = (i: number, color: string) => {
    const colors = [...(edges ?? edgesFromCover(book)).colors]
    colors[i] = color
    set({ colors: colors as PageEdges['colors'] })
  }

  const design = async () => {
    setBusy(true)
    setError(null)
    try {
      onChange(await designEdges({ data: { prompt, title: book.title, authors: book.authors, color: book.color } }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
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
      {edges?.prompt && <p className="muted small-text">Designed from “{edges.prompt}”</p>}

      {ai && (
        <form
          className="edges-ai"
          onSubmit={(e) => {
            e.preventDefault()
            if (prompt.trim() && !busy) design()
          }}
        >
          <input
            className="input"
            value={prompt}
            maxLength={300}
            placeholder="Describe them, e.g. gold stars on midnight blue"
            aria-label="Describe the page edges you would like"
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button className="btn small" disabled={busy || !prompt.trim()}>
            {busy ? 'Designing…' : 'Design'}
          </button>
        </form>
      )}
      {error && <p className="error small-text">{error}</p>}
    </div>
  )
}
