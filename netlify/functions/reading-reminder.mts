/**
 * The reading reminder (#163): every day at 20:00 Amsterdam time, devices
 * that asked for it get a notification if nothing was read that day. The work
 * happens in the app itself (src/routes/api/reading-reminder.ts); this only
 * rings the bell.
 *
 * Netlify's schedules are in UTC, and 20:00 in Amsterdam is 19:00 UTC in
 * winter and 18:00 UTC in summer: it runs at both and goes on only when it is
 * 20 o'clock in Amsterdam. Scheduled functions only run on the published
 * production deploy.
 */

const amsterdamHour = (d: Date) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: 'numeric', hourCycle: 'h23' }).format(d))

export default async () => {
  if (amsterdamHour(new Date()) !== 20) return new Response('Not 20:00 in Amsterdam', { status: 200 })
  const secret = process.env.NIGHTLY_SECRET?.trim()
  const site = process.env.URL
  if (!secret || !site) {
    console.error('Reading reminder: NIGHTLY_SECRET or URL is not set.')
    return new Response('Not set up', { status: 500 })
  }
  const res = await fetch(`${site}/api/reading-reminder`, {
    method: 'POST',
    headers: { 'x-nightly-secret': secret },
  })
  const body = await res.text()
  console.log(`Reading reminder: ${res.status} ${body}`)
  return new Response(body, { status: res.status })
}

export const config = { schedule: '0 18,19 * * *' }
