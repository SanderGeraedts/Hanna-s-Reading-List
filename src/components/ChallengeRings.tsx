import type { ChallengeRing } from '#/lib/challengeRings'
import { ringLabel } from '#/lib/challengeRings'

/**
 * The ring row at the top of the Challenges page (D-0060): one small progress
 * ring per challenge of the chosen year, each a button that scrolls to that
 * challenge and puts the focus on its heading. It changes nothing and opens
 * nothing.
 */

const R = 15.5
const C = 2 * Math.PI * R

function Ring({ ring, onGo }: { ring: ChallengeRing; onGo: (id: string) => void }) {
  const share = ring.goal > 0 ? Math.min(1, ring.done / ring.goal) : 0
  const label = ringLabel(ring)
  return (
    <button
      type="button"
      className={`challenge-ring${ring.complete ? ' done' : ''}`}
      data-ring={ring.id}
      aria-label={label}
      title={label}
      onClick={() => onGo(ring.id)}
    >
      <svg viewBox="0 0 40 40" aria-hidden>
        <circle className="ring-track" cx="20" cy="20" r={R} />
        {ring.complete ? (
          <circle className="ring-disc" cx="20" cy="20" r={R} />
        ) : (
          <circle
            className="ring-fill"
            cx="20"
            cy="20"
            r={R}
            strokeDasharray={`${(share * C).toFixed(2)} ${C.toFixed(2)}`}
            transform="rotate(-90 20 20)"
          />
        )}
        <text className="ring-number" x="20" y="20" textAnchor="middle" dominantBaseline="central">
          {ring.complete ? '✓' : ring.done.toLocaleString('en')}
        </text>
      </svg>
      <span className="challenge-ring-name" aria-hidden>
        {ring.short}
      </span>
    </button>
  )
}

/** Scrolls to a challenge and moves the focus into it (D-0060 §8). */
export function goToChallenge(id: string) {
  const block = document.getElementById(`challenge-${id}`)
  if (!block) return
  block.scrollIntoView({ block: 'start' })
  const heading = block.querySelector<HTMLElement>('h2')
  if (!heading) return
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
}

export function ChallengeRings({ rings, year, onGo = goToChallenge }: { rings: ChallengeRing[]; year: number; onGo?: (id: string) => void }) {
  if (rings.length === 0) return null
  return (
    <div className="challenge-rings" role="group" aria-label={`Your challenges in ${year}`}>
      {rings.map((r) => (
        <Ring key={r.id} ring={r} onGo={onGo} />
      ))}
    </div>
  )
}
