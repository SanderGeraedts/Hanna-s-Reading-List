import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import {
  RULE_LABELS,
  RULES,
  UNITS,
  UNIT_LABELS,
  andRules,
  canCombine,
  challengeBooks,
  challengeDone,
  cleanChallenges,
  doneText,
  maxTarget,
  needsValue,
  newChallengeId,
  ruleOptions,
  ruleText,
  unitOf,
} from '#/lib/ownChallenges'
import type { GoalUnit, OwnChallenge, RuleKind } from '#/lib/ownChallenges'
import { loadChallenges, saveChallenges } from '#/server/shelf'

const localKey = (accountId: string | null) => `hannas-reading-list:own-challenges:${accountId ?? 'local'}`

function readLocal(key: string): OwnChallenge[] {
  try {
    return cleanChallenges(JSON.parse(localStorage.getItem(key) ?? '[]'))
  } catch {
    return []
  }
}

function writeLocal(key: string, list: OwnChallenge[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* storage blocked: it still holds for this visit */
  }
}

const synced = (key: string) => {
  try {
    return localStorage.getItem(`${key}:synced`) === '1'
  } catch {
    return false
  }
}
const markSynced = (key: string) => {
  try {
    localStorage.setItem(`${key}:synced`, '1')
  } catch {
    /* storage blocked */
  }
}

/**
 * Her own challenges: the server's list wins (so every device shows the same);
 * a list only this browser knows is sent up. Offline, the copy here will do.
 */
export function useOwnChallenges(accountId: string | null) {
  const key = localKey(accountId)
  const [list, setList] = useState<OwnChallenge[]>(() => readLocal(key))

  useEffect(() => {
    setList(readLocal(key))
    if (!accountId) return
    let live = true
    loadChallenges()
      .then((remote) => {
        if (!live || remote === null) return
        const local = readLocal(key)
        // once this browser has seen the server's list, the server always wins
        // (so a challenge deleted on another device stays deleted)
        if (remote.length > 0 || local.length === 0 || synced(key)) {
          markSynced(key)
          writeLocal(key, remote)
          setList(remote)
        } else {
          saveChallenges({ data: { challenges: local } })
            .then((ok) => ok && markSynced(key))
            .catch(() => {})
        }
      })
      // offline, or the server doesn't keep challenges yet
      .catch(() => {})
    return () => {
      live = false
    }
  }, [accountId, key])

  const save = (next: OwnChallenge[]) => {
    const clean = cleanChallenges(next)
    setList(clean)
    writeLocal(key, clean)
    if (accountId)
      saveChallenges({ data: { challenges: clean } })
        .then((ok) => ok && markSynced(key))
        .catch(() => {})
  }
  return [list, save] as const
}

/** Making (or changing) a challenge: a name, how many books, pages or hours, and what counts. */
export function NewChallengeForm({
  books,
  year,
  start,
  preset,
  onSave,
  onCancel,
}: {
  books: Book[]
  year: number
  /** the challenge to change; none for a new one */
  start?: OwnChallenge
  /** a new challenge filled in already (the Pile challenge button), still saved as a new one */
  preset?: Omit<OwnChallenge, 'id' | 'year'>
  onSave: (c: OwnChallenge) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(start?.name ?? preset?.name ?? '')
  const [target, setTarget] = useState(String(start?.target ?? preset?.target ?? 5))
  const [unit, setUnit] = useState<GoalUnit>(unitOf(start ?? preset ?? {}))
  const [rule, setRule] = useState<RuleKind>(start?.rule ?? preset?.rule ?? 'any')
  const [value, setValue] = useState(start?.value ?? preset?.value ?? '')
  // the second rule (D-0062 §3): '' means she has not added one
  const [and, setAnd] = useState<RuleKind | ''>(start?.and ?? '')
  const [andValue, setAndValue] = useState(start?.andValue ?? '')
  const options = useMemo(() => ruleOptions(rule, books), [rule, books])
  const andOptions = useMemo(() => (and ? ruleOptions(and, books) : []), [and, books])
  const formId = useId()
  const second = useRef<HTMLSelectElement>(null)
  const addAnd = useRef<HTMLButtonElement>(null)
  const n = Number(target)
  const ruleOk = (r: RuleKind, v: string, list: Array<{ value: string }>) => !needsValue(r) || list.some((o) => o.value === v)
  const ok =
    name.trim() !== '' &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= maxTarget(unit) &&
    ruleOk(rule, value, options) &&
    (!and || ruleOk(and, andValue, andOptions))

  const pickRule = (next: RuleKind) => {
    setRule(next)
    setValue('')
    // no rule twice, and Any book / Finish a series take no second rule
    if (and && (!canCombine(next) || !andRules(next).includes(and))) {
      setAnd('')
      setAndValue('')
    }
  }

  return (
    <form
      className="dash-card own-challenge-form"
      aria-label={start ? 'Change challenge' : 'New challenge'}
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        onSave({
          id: start?.id ?? newChallengeId(),
          name: name.trim(),
          target: n,
          year,
          rule,
          ...(needsValue(rule) && { value }),
          ...(unit !== 'books' && { unit }),
          ...(and && { and }),
          ...(and && needsValue(and) && { andValue }),
        })
      }}
    >
      <h2>{start ? 'Change challenge' : `New challenge for ${year}`}</h2>
      <div className="field-row">
        <label>
          <span className="muted small-text">Name</span>
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fantasy year" autoFocus />
        </label>
        {/* not one wrapping label: the number and the unit are two controls with two names */}
        <div className="goal-amount">
          <label className="muted small-text" htmlFor={`${formId}-amount`}>
            How many
          </label>
          <span className="goal-amount-row">
            <input
              id={`${formId}-amount`}
              className="input"
              type="number"
              min={1}
              max={maxTarget(unit)}
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <select className="input" value={unit} aria-label="Unit" onChange={(e) => setUnit(e.target.value as GoalUnit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
      <div className="field-row">
        <label>
          <span className="muted small-text">What counts</span>
          <select className="input" value={rule} onChange={(e) => pickRule(e.target.value as RuleKind)}>
            {RULES.map((r) => (
              <option key={r} value={r}>
                {RULE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        {needsValue(rule) && (
          <label>
            <span className="muted small-text">Which</span>
            <select className="input" value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Pick one…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {canCombine(rule) &&
        (and === '' ? (
          <button
            type="button"
            className="btn small"
            ref={addAnd}
            onClick={() => {
              const first = andRules(rule)[0]
              setAnd(first)
              setAndValue('')
              window.setTimeout(() => second.current?.focus(), 0)
            }}
          >
            ＋ and also
          </button>
        ) : (
          <fieldset className="field-row and-row" aria-label="What else counts">
            <label>
              <span className="muted small-text">And also</span>
              <select
                className="input"
                ref={second}
                value={and}
                onChange={(e) => {
                  setAnd(e.target.value as RuleKind)
                  setAndValue('')
                }}
              >
                {andRules(rule).map((r) => (
                  <option key={r} value={r}>
                    {RULE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            {needsValue(and) && (
              <label>
                <span className="muted small-text">Which</span>
                <select className="input" aria-label="Which, second rule" value={andValue} onChange={(e) => setAndValue(e.target.value)}>
                  <option value="">Pick one…</option>
                  {andOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="btn icon small"
              aria-label="Remove the second rule"
              title="Remove the second rule"
              onClick={() => {
                setAnd('')
                setAndValue('')
                window.setTimeout(() => addAnd.current?.focus(), 0)
              }}
            >
              ×
            </button>
          </fieldset>
        ))}
      <p className="muted small-text">Sleep reads don't count.</p>
      <div className="dashboard-bar-actions">
        <button type="button" className="btn small" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn small primary" disabled={!ok}>
          Save
        </button>
      </div>
    </form>
  )
}

/** One of her own challenges: how far she is, and the books that count. */
export function OwnChallengeCard({
  challenge: c,
  books,
  onShowBook,
  editable,
  onChange,
  onDelete,
}: {
  challenge: OwnChallenge
  books: Book[]
  onShowBook: (id: string) => void
  /** this year's: can be changed or deleted */
  editable: boolean
  onChange: (c: OwnChallenge) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const counted = useMemo(() => challengeBooks(c, books), [c, books])
  const done = useMemo(() => challengeDone(c, counted), [c, counted])
  const share = Math.min(1, done / c.target)

  if (editing)
    return (
      <NewChallengeForm
        books={books}
        year={c.year}
        start={c}
        onSave={(next) => {
          onChange(next)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )

  return (
    <section className="dash-card own-challenge" aria-label={c.name}>
      <div className="dash-card-head">
        <h2>{c.name}</h2>
        {editable && (
          <>
            <button className="btn small" onClick={() => setEditing(true)}>
              Change
            </button>
            <button
              className="btn icon small"
              aria-label={`Delete ${c.name}`}
              title="Delete"
              onClick={() => {
                if (window.confirm(`Delete the challenge "${c.name}"?`)) onDelete()
              }}
            >
              ×
            </button>
          </>
        )}
      </div>
      <p className="muted small-text">{ruleText(c, books)}</p>
      <p>
        <span className="own-challenge-count">{doneText(c, done)}</span>
        {done >= c.target && <span> · Done! 🎉</span>}
      </p>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={Math.min(done, c.target)}>
        <span style={{ width: `${share * 100}%` }} />
      </div>
      {counted.length > 0 && (
        <ul className="own-challenge-books">
          {counted.map((b) => (
            <li key={b.id}>
              <button title={b.title} aria-label={b.title} onClick={() => onShowBook(b.id)}>
                {b.coverUrl ? <img src={b.coverUrl} alt="" loading="lazy" /> : <span className="cover-chip" style={{ background: b.color }} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
