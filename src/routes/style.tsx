import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { StarRating } from '#/components/StarRating'
import { CreaturesPreview } from '#/components/creatures/CreaturesPreview'

/**
 * The design system on one page (/style, not linked from the app): every
 * colour, text size, gap, corner and building block, so a change can be
 * judged in one place. The values themselves live at the top of styles.css.
 */
export const Route = createFileRoute('/style')({ component: StylePage })

const COLOURS: Array<[string, string]> = [
  ['--bg', 'Background, behind everything'],
  ['--surface', 'Cards and panels'],
  ['--surface-solid', 'Dialogs and sheets'],
  ['--surface-sunken', 'Inputs and empty squares'],
  ['--surface-raised', 'Secondary buttons'],
  ['--border', 'Lines'],
  ['--border-strong', 'Stronger lines, button outlines'],
  ['--text', 'Text (cream)'],
  ['--muted', 'Helper text'],
  ['--accent', 'The one accent (warm gold)'],
  ['--accent-soft', 'Gold wash: ticked, chosen'],
  ['--accent-line', 'Gold outline'],
  ['--warning', 'Behind, a reminder'],
  ['--danger', 'Remove, wrong'],
  ['--wall-top', 'Wallpaper: pale lavender at the top'],
  ['--wall-mid', 'Wallpaper: lilac'],
  ['--wall-floor', 'Wallpaper: deeper lilac at the floor (3D room)'],
  ['--header-ink', 'Text straight on the wallpaper'],
  ['--header-muted', 'Helper text straight on the wallpaper'],
]

const SIZES: Array<[string, string]> = [
  ['--fs-small', 'Small: helper text, chips, small buttons'],
  ['--fs-body', 'Normal: everything else'],
  ['--fs-large', 'Large: emphasis, facts'],
  ['--fs-heading', 'Heading: block titles'],
  ['--fs-number', '42'],
]

const SPACES = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5']
const RADII: Array<[string, string]> = [
  ['--radius-card', 'Cards'],
  ['--radius-small', 'Inputs, squares'],
  ['--radius-pill', 'Buttons, chips'],
]

function StylePage() {
  const [pressed, setPressed] = useState(true)
  const [period, setPeriod] = useState('year')
  const [stars, setStars] = useState<number | undefined>(4.5)
  return (
    <main className="style-page">
      <h1>Design system</h1>
      <p className="muted">The cosy library, refreshed. Everything in the app is built from these.</p>

      <section>
        <h2>Colours</h2>
        <div className="style-swatches">
          {COLOURS.map(([name, use]) => (
            <div key={name} className="style-swatch">
              <span style={{ background: `var(${name})` }} />
              <code>{name}</code>
              <small className="muted">{use}</small>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Text sizes</h2>
        {SIZES.map(([name, sample]) => (
          <p key={name} className="style-row">
            <code>{name}</code>
            <span style={{ fontSize: `var(${name})`, fontFamily: name === '--fs-heading' || name === '--fs-number' ? 'var(--serif)' : undefined }}>
              {sample}
            </span>
          </p>
        ))}
        <p className="style-row">
          <code>--serif</code>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 'var(--fs-large)' }}>Fraunces, for titles and facts</span>
        </p>
        <p className="style-row">
          <code>--sans</code>
          <span>Inter, for everything else</span>
        </p>
      </section>

      <section>
        <h2>Spacing and corners</h2>
        <div className="style-spaces">
          {SPACES.map((name) => (
            <div key={name} className="style-row">
              <code>{name}</code>
              <span className="style-space" style={{ width: `var(${name})` }} />
            </div>
          ))}
        </div>
        <div className="style-radii">
          {RADII.map(([name, use]) => (
            <div key={name} className="style-radius" style={{ borderRadius: `var(${name})` }}>
              <code>{name}</code>
              <small className="muted">{use}</small>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Buttons</h2>
        <div className="chips">
          <button className="btn primary">Main</button>
          <button className="btn">Secondary</button>
          <button className="btn quiet">Quiet</button>
          <button className="btn" disabled>
            Disabled
          </button>
        </div>
        <div className="chips">
          <button className="btn small primary">Main, small</button>
          <button className="btn small">Secondary, small</button>
          <button className="btn small quiet">Quiet, small</button>
          <button className="link-btn">A link</button>
        </div>
      </section>

      <section>
        <h2>Chips, inputs, switches</h2>
        <div className="chips">
          <span className="chip">
            Fantasy <button aria-label="Remove">×</button>
          </span>
          <button className="format-chip" aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
            Paperback
          </button>
          <button className="format-chip" aria-pressed={false}>
            Audiobook
          </button>
        </div>
        <input className="input" placeholder="An input" />
        <div className="segmented" role="group" aria-label="Period">
          {['month', 'year', 'all'].map((k) => (
            <button key={k} type="button" className={period === k ? 'active' : undefined} onClick={() => setPeriod(k)}>
              {k === 'all' ? 'All time' : k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" defaultChecked /> <span>A tick box</span>
        </label>
        <StarRating value={stars} onChange={setStars} size="large" />
      </section>

      <section>
        <h2>A block</h2>
        <div className="style-blocks">
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Books read</h2>
              <span className="muted small-text">This year</span>
            </div>
            <p className="big-number">
              <strong>42</strong> books
            </p>
            <p className="muted small-text">Helper text says what a block means, in the small size.</p>
            <div className="chips">
              <button className="btn small primary">Done</button>
              <button className="btn small">Skip</button>
            </div>
          </section>
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Warnings</h2>
            </div>
            <p style={{ color: 'var(--warning)' }}>13 of 26 · behind: 6.5 letters a month to go</p>
            <p style={{ color: 'var(--danger)' }}>Something went wrong.</p>
          </section>
        </div>
      </section>

      <section className="style-creatures">
        <h2>Creatures</h2>
        <p className="small-text">
          The 20 book creatures (T-0027), turning slowly on the wallpaper. Nothing in the app links to them yet.
        </p>
        <ClientOnly fallback={<p className="small-text">Building the creatures…</p>}>
          <CreaturesPreview />
        </ClientOnly>
      </section>
    </main>
  )
}
