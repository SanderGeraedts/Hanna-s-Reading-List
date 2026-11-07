import { useCallback, useEffect, useState } from 'react'
import { refreshStorytelLibrary, storytelLoginStatus } from '#/server/storytel'
import { importStorytelBooks } from './storytelImport'
import type { ImportCallbacks } from './storytelImport'
import type { Book } from './library'

export interface StorytelLogin {
  saved: boolean
  /** masked email of the remembered account */
  account?: string
}

export type SyncState =
  | { kind: 'idle' }
  | { kind: 'busy'; done?: number; total?: number }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

/**
 * Re-imports the Storytel shelf with the login remembered on this device:
 * adds new books and brings statuses and progress up to date.
 */
export function useStorytelSync(books: Book[], cb: Omit<ImportCallbacks, 'onProgress'>) {
  const [login, setLogin] = useState<StorytelLogin>({ saved: false })
  const [state, setState] = useState<SyncState>({ kind: 'idle' })

  useEffect(() => {
    storytelLoginStatus()
      .then(setLogin)
      .catch(() => setLogin({ saved: false }))
  }, [])

  /** `shelf`: the books to compare with, when they are newer than the last render (#68) */
  const refresh = useCallback(async (shelf?: Book[]) => {
    setState({ kind: 'busy' })
    try {
      const items = await refreshStorytelLibrary()
      const s = await importStorytelBooks(items, shelf ?? books, {
        ...cb,
        onProgress: (done, total) => setState({ kind: 'busy', done, total }),
      })
      const parts = [
        s.added && `${s.added} new book${s.added === 1 ? '' : 's'}`,
        s.updated && `${s.updated} updated`,
      ].filter(Boolean)
      setState({ kind: 'done', message: parts.length ? `Storytel: ${parts.join(', ')}.` : 'Storytel: all up to date.' })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Refresh failed' })
      // the server drops a login Storytel no longer accepts
      storytelLoginStatus().then(setLogin).catch(() => {})
    }
  }, [books, cb])

  const dismiss = useCallback(() => setState({ kind: 'idle' }), [])

  return { login, setLogin, state, refresh, dismiss }
}
