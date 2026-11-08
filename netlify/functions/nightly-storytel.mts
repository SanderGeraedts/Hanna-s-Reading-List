/**
 * The nightly Storytel sync (#77): every day at 23:00 Amsterdam time the
 * shelf is brought up to date with Storytel, so a day of listening is noted
 * even when Hanna doesn't open the app. The work happens in the app itself
 * (src/routes/api/nightly-storytel.ts); this only rings the bell.
 *
 * Netlify's schedules are in UTC, and 23:00 in Amsterdam is 22:00 UTC in
 * winter and 21:00 UTC in summer: it runs at both and goes on only when it is
 * 23 o'clock in Amsterdam. Scheduled functions only run on the published
 * production deploy.
 */

const amsterdamHour = (d: Date) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: 'numeric', hourCycle: 'h23' }).format(d))

export default async () => {
  if (amsterdamHour(new Date()) !== 23) return new Response('Not 23:00 in Amsterdam', { status: 200 })
  const secret = process.env.NIGHTLY_SECRET?.trim()
  const site = process.env.URL
  if (!secret || !site) {
    console.error('Nightly Storytel sync: NIGHTLY_SECRET or URL is not set.')
    return new Response('Not set up', { status: 500 })
  }
  const res = await fetch(`${site}/api/nightly-storytel`, {
    method: 'POST',
    headers: { 'x-nightly-secret': secret },
  })
  const body = await res.text()
  console.log(`Nightly Storytel sync: ${res.status} ${body}`)
  return new Response(body, { status: res.status })
}

export const config = { schedule: '0 21,22 * * *' }
