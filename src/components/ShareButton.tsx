import { useState } from 'react'
import { shareChallenge, type ShareSpec } from '#/lib/shareImage'

/** "Share" on a challenge block (#153): a picture of it for friends. */
export function ShareButton({ spec, label }: { spec: () => ShareSpec; label: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'failed'>('idle')
  const share = async () => {
    setState('busy')
    try {
      const how = await shareChallenge(spec())
      setState(how === 'downloaded' ? 'saved' : 'idle')
    } catch {
      setState('failed')
    }
  }
  return (
    <button
      type="button"
      className="btn small share-btn"
      onClick={share}
      disabled={state === 'busy'}
      aria-label={`Share a picture of ${label}`}
      title="Share a picture with friends"
    >
      {state === 'busy' ? 'Drawing…' : state === 'saved' ? 'Saved ✓' : state === 'failed' ? 'Try again' : 'Share'}
    </button>
  )
}
