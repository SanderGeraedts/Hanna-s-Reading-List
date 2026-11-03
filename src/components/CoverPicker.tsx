import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Book } from '#/lib/library'
import { analyzeCover, coverUrlForId } from '#/lib/cover'
import { getCoverChoices } from '#/server/openLibrary'

interface Props {
  book: Book
  onChange: (patch: Pick<Book, 'coverUrl' | 'coverAspect' | 'color'>) => void
  onClose: () => void
}

/** Covers are stored with the library in localStorage, so uploads are kept small. */
const UPLOAD_MAX_HEIGHT = 560
const UPLOAD_QUALITY = 0.82

/**
 * Pick a different front cover: another edition's cover from Open Library,
 * or a photo / image file of your own.
 */
export function CoverPicker({ book, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [choices, setChoices] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false
    const query = `${book.title.split(/[:(]/)[0]} ${book.authors[0] ?? ''}`.trim()
    getCoverChoices({ data: { workKey: book.workKey, query } })
      .then((ids) => !cancelled && setChoices(ids))
      .catch(() => !cancelled && (setChoices([]), setError('Could not reach Open Library.')))
    return () => {
      cancelled = true
    }
  }, [book.workKey, book.title, book.authors])

  const apply = async (url: string, key: string) => {
    setBusy(key)
    setError(null)
    const analysis = await analyzeCover(url)
    setBusy(null)
    if (!analysis) {
      setError('That image could not be loaded. Try another one.')
      return
    }
    onChange({ coverUrl: url, coverAspect: analysis.aspect, color: analysis.color })
    dialog.current?.close()
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    setBusy('upload')
    try {
      const url = await shrinkImage(file)
      await apply(url, 'upload')
    } catch {
      setBusy(null)
      setError('That image could not be read. Try a JPEG or PNG.')
    }
  }

  return (
    <dialog
      ref={dialog}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>Change cover</h2>
          <button className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>
        <p className="muted">
          Pick another edition's cover for <em>{book.title}</em>, or use your own picture.
        </p>

        <label className="btn upload-btn">
          {busy === 'upload' ? 'Loading…' : 'Upload a picture…'}
          <input type="file" accept="image/*" onChange={upload} hidden />
        </label>

        {error && <p className="error">{error}</p>}

        {choices === null ? (
          <p className="muted">Looking for covers…</p>
        ) : choices.length === 0 ? (
          <p className="muted">Open Library has no other covers for this book.</p>
        ) : (
          <ul className="cover-grid">
            {choices.map((id) => {
              const url = coverUrlForId(id)
              const current = book.coverUrl === url
              return (
                <li key={id}>
                  <button
                    className={`cover-choice${current ? ' current' : ''}`}
                    disabled={!!busy}
                    aria-label={current ? 'Current cover' : 'Use this cover'}
                    aria-pressed={current}
                    onClick={() => apply(url, String(id))}
                  >
                    <img src={coverUrlForId(id, 'M')} alt="" loading="lazy" />
                    {busy === String(id) && <span className="cover-busy">…</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </dialog>
  )
}

/** Scales a picture down and re-encodes it as JPEG, returning a data URL. */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, UPLOAD_MAX_HEIGHT / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', UPLOAD_QUALITY)
}
