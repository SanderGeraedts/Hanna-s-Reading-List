import { useState } from 'react'
import type { Creatures } from '#/lib/creatures/creature'
import { SPECIES, TIERS } from '#/lib/creatures/species'
import type { Species } from '#/lib/creatures/species'
import { SPECIES_WORD } from '#/lib/creatures/numbers'
import { albumLabel, albumSource, shiniesLine, tierGems, tierWord } from '#/lib/creatures/words'
import { Still, TierLine } from './bits'
import { creatureStill } from './stillPaths'
import { albumShare } from '#/lib/creatures/shareSpec'
import { shareChallenge } from '#/lib/shareImage'

/**
 * The album (T-0030 Design §6): a card per species in six tier groups, the
 * found ones with their picture, name, tier and Red List label, the others as
 * dark silhouettes with only their tier. Plain images, never a canvas.
 */
export function Album({ c }: { c: Creatures }) {
  const found = c.found.size
  const shinies = c.shinyFound.size
  return (
    <section className="dash-card album-card" aria-labelledby="album-title">
      <h2 id="album-title">Album</h2>
      <div className="album-head">
        <p className="album-count">
          {found} of {SPECIES.length} found
          {shinies > 0 && <span className="album-shinies">{shiniesLine(shinies)}</span>}
        </p>
        <button
          type="button"
          className="btn small album-share-btn"
          aria-label="Share the whole album"
          onClick={() => shareChallenge(albumShare(SPECIES, c.found, c.shinyFound))}
        >
          Share the album
        </button>
        <div className="album-bar" aria-hidden>
          <span style={{ width: `${(found / SPECIES.length) * 100}%` }} />
        </div>
      </div>
      {TIERS.map((tier) => {
        const group = SPECIES.filter((s) => s.tier === tier)
        const have = group.filter((s) => c.found.has(s.id)).length
        return (
          <div key={tier} className="album-group">
            <h3>
              <span className="tier-gems" aria-hidden>
                {tierGems(tier)}
              </span>{' '}
              {tierWord(tier)} · {have} of {group.length}
            </h3>
            <ul className="album-grid">
              {group.map((s) => (
                <AlbumCard key={s.id} s={s} c={c} />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function AlbumCard({ s, c }: { s: Species; c: Creatures }) {
  const [shinyOn, setShinyOn] = useState(false)
  if (!c.found.has(s.id))
    return (
      <li className="album-item unknown">
        <div className="album-pic">
          <Still src={creatureStill(s.id, 'grown')} size={192} className="silhouette" />
        </div>
        <span className="visually-hidden">Not found yet</span>
        <TierLine tier={s.tier} className="album-tier" />
      </li>
    )
  const count = c.pets.filter((p) => p.species === s.id).length
  const source = albumSource(s)
  const hasShiny = c.shinyFound.has(s.id)
  return (
    <li className={`album-item found${s.tier === 'legendary' ? ' legendary' : ''}`}>
      <div className="album-pic">
        <Still src={creatureStill(s.id, 'grown', shinyOn)} size={192} />
        {count >= 2 && (
          <span className="album-count-pill">
            <span aria-hidden>×{count}</span>
            <span className="visually-hidden">{count} pets</span>
          </span>
        )}
        {hasShiny && (
          <button
            type="button"
            className="album-shiny-toggle"
            aria-pressed={shinyOn}
            aria-label={`Show the shiny ${SPECIES_WORD[s.id]}`}
            onClick={() => setShinyOn((v) => !v)}
          >
            <span aria-hidden>✨</span>
          </button>
        )}
      </div>
      <span className="album-name">{s.name}</span>
      <TierLine tier={s.tier} className="album-tier" />
      <span className="album-label">{albumLabel(s)}</span>
      {source && <span className="album-source">{source}</span>}
    </li>
  )
}
