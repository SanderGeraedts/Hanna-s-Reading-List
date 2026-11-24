import { useEffect, useState } from 'react'
import { reminderOn, reminderSupport, turnReminderOff, turnReminderOn } from '#/lib/pushClient'
import type { ReminderSupport } from '#/lib/pushClient'

/**
 * "🔔 Reminder at 20:00" in the menu (#163): a notification on this device on
 * days without reading. Each device is turned on by itself.
 */
export function ReminderToggle() {
  const [support, setSupport] = useState<ReminderSupport>('unsupported')
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const s = reminderSupport()
    setSupport(s)
    if (s === 'ok') reminderOn().then(setOn).catch(() => {})
  }, [])

  if (support === 'unsupported') return null
  if (support === 'needs-home-screen') {
    return (
      <p className="menu-note muted small-text">
        🔔 For a reading reminder at 20:00, first add this app to your home screen (Share → Add to Home Screen) and open
        it from there.
      </p>
    )
  }

  const toggle = async () => {
    setBusy(true)
    setNote(null)
    try {
      if (on) {
        await turnReminderOff()
        setOn(false)
      } else {
        const problem = await turnReminderOn()
        if (problem) setNote(problem)
        else setOn(true)
      }
    } catch {
      setNote('That didn’t work. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="menu-reminder">
      <label className="check">
        <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
        <span>🔔 Reminder at 20:00</span>
      </label>
      <small className="muted">{note ?? 'On days you haven’t read yet, on this device.'}</small>
    </div>
  )
}
