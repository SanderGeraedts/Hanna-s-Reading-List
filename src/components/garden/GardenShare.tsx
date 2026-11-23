import { useState } from 'react'
import { shareGarden } from '#/lib/gardenShare'

/**
 * "Share" on the Garden tab (D-0071 §4): a picture of the garden as it is
 * drawn right now — the season she is looking at, the bed she has open — for
 * friends. The challenges have had one since #153; the garden had none.
 *
 * The flat garden is drawn as shapes with no pictures in it, so it can be
 * turned into an image without anything to load; the 3D one is a canvas and is
 * read straight off. What she cannot see is never in the picture.
 */

export function GardenShareButton({ stage, label, line }: { stage: React.RefObject<HTMLDivElement | null>; label: string; line: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'failed'>('idle')
  const share = async () => {
    const el = stage.current
    if (!el) return
    setState('busy')
    try {
      const how = await shareGarden(el, { title: label, subtitle: line })
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
      aria-label={`Share a picture of your ${label}`}
      title="Share a picture with friends"
    >
      {state === 'busy' ? 'Drawing…' : state === 'saved' ? 'Saved ✓' : state === 'failed' ? 'Try again' : 'Share'}
    </button>
  )
}
