import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { analyzeCover, colorFromString, coverUrlForId, coverUrlForIsbn } from '#/lib/cover'
import { shrinkImage } from '#/lib/coverPhoto'
import { getCoverChoices } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { PickedCover } from '#/lib/buildBook'

export type { PickedCover }

interface Props {
  /** the search result she tapped */
  result: SearchResult
  /** the primary button's words: "Add this one" on the shelf, "Add to wishlist" for a wish */
  addLabel?: string
  /** adds the book with this cover; the step stays mounted until the parent unmounts it */
  onAdd: (cover: PickedCover) => void | Promise<void>
  /** back to the results, nothing added */
  onBack: () => void
}

/** A tile in the grid: a cover id from Open Library, or the photo she took. */
type Choice = { key: string; url: string; label: string; photo?: true }

/**
 * Pick the cover **before** the book is added (T-0060, AD1). Every edition of
 * the work she tapped, best first, plus 📷 Take a photo of her own copy. The
 * 3D shelf takes a book's spine colour and its shape from this picture, so
 * picking it first saves fixing it afterwards.
 *
 * Covers come from Open Library through the server function the "Change cover"
 * dialog already uses (`getCoverChoices`). It fails quietly: no covers is a
 * state, not an error, and the book can still be added without one.
 */
export function CoverStep({ result, addLabel = 'Add this one', onAdd, onBack }: Props) {
  const [ids, setIds] = useState<number[] | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const grid = useRef<HTMLUListElement>(null)
  /** the tile to put focus on once the covers are in */
  const focusWanted = useRef(true)

  // the cover the search result already carries goes first, so the quickest path is unchanged
  const own = result.coverId ?? undefined
  useEffect(() => {
    let cancelled = false
    const query = `${result.title.split(/[:(]/)[0]} ${result.authors[0] ?? ''}`.trim()
    getCoverChoices({ data: { workKey: result.workKey || undefined, query } })
      .then((found) => !cancelled && setIds(found))
      // Open Library unreachable: exactly the "no covers" state, no error colour (fails quietly)
      .catch(() => !cancelled && setIds([]))
    return () => {
      cancelled = true
    }
  }, [result.workKey, result.title, result.authors])

  const choices: Choice[] = []
  if (photo) choices.push({ key: 'photo', url: photo, label: 'Your photo', photo: true })
  const seen = new Set<number>()
  for (const id of [...(own ? [own] : []), ...(ids ?? [])]) {
    if (seen.has(id)) continue
    seen.add(id)
    choices.push({ key: `id:${id}`, url: coverUrlForId(id), label: '' })
  }
  // an edition with an ISBN but no cover id of its own: Open Library serves it by ISBN
  if (!choices.length && ids !== null && result.isbn) {
    choices.push({ key: `isbn:${result.isbn}`, url: coverUrlForIsbn(result.isbn), label: '' })
  }
  for (const [i, c] of choices.entries()) {
    if (!c.label) c.label = `Cover ${i + 1} of ${choices.length}`
  }

  // the first cover is picked as soon as there is one, so the primary button is never dead
  const current = choices.find((c) => c.key === picked) ?? choices[0]
  useEffect(() => {
    if (!picked && current) setPicked(current.key)
  }, [picked, current])

  // focus goes to the picked tile once the covers are in
  useEffect(() => {
    if (!current || !focusWanted.current) return
    focusWanted.current = false
    grid.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }, [current])

  const move = (step: number) => {
    if (!current) return
    const at = choices.indexOf(current)
    const to = choices[Math.min(choices.length - 1, Math.max(0, at + step))]
    if (!to) return
    setPicked(to.key)
    grid.current?.querySelectorAll<HTMLElement>('[role="radio"]')[choices.indexOf(to)]?.focus()
  }

  const takePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setProblem('Choose an image file.')
    setBusy(true)
    setProblem(null)
    try {
      const url = await shrinkImage(file)
      setPhoto(url)
      setPicked('photo')
    } catch {
      setProblem('That picture could not be read. Try a JPEG or PNG.')
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    setBusy(true)
    setProblem(null)
    try {
      if (!current) return await onAdd({ color: colorFromString(result.title) })
      const analysis = await analyzeCover(current.url)
      if (!analysis) {
        setProblem('That picture could not be loaded. Try another one.')
        return
      }
      await onAdd({ coverUrl: current.url, coverAspect: analysis.aspect, color: analysis.color })
    } finally {
      setBusy(false)
    }
  }

  const loading = ids === null && !photo
  return (
    <div className="tab-panel cover-step">
      <h3 className="cover-step-title">{result.title}</h3>
      <p className="muted">{result.authors.join(', ') || 'Unknown author'}</p>

      {loading && <p className="muted">Looking for covers…</p>}
      {!loading && choices.length === 0 && <p className="muted">Open Library has no covers for this book.</p>}
      {problem && <p className="error">{problem}</p>}

      {choices.length > 0 && (
        <ul
          className="cover-grid"
          ref={grid}
          role="radiogroup"
          aria-label="Cover"
          onKeyDown={(e) => {
            const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]
            if (step === undefined) return
            e.preventDefault()
            move(step)
          }}
        >
          {choices.map((c) => {
            const on = c.key === current?.key
            return (
              <li key={c.key}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.label}
                  tabIndex={on ? 0 : -1}
                  className={`cover-choice${on ? ' current' : ''}`}
                  disabled={busy}
                  onClick={() => setPicked(c.key)}
                >
                  <img src={c.photo ? c.url : c.url.replace('size=L', 'size=M')} alt="" loading="lazy" />
                  {c.photo && (
                    <span className="cover-photo-badge" aria-hidden>
                      📷
                    </span>
                  )}
                  {on && (
                    <span className="cover-tick" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <label className="btn upload-btn">
        {busy && !picked ? 'Loading…' : '📷 Take a photo'}
        <input type="file" accept="image/*" capture="environment" onChange={takePhoto} hidden />
      </label>

      <div className="follow-up-actions">
        <button type="button" className="btn" disabled={busy} onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn primary" disabled={busy || loading} onClick={add}>
          {choices.length === 0 ? 'Add without a cover' : addLabel}
        </button>
      </div>
    </div>
  )
}
