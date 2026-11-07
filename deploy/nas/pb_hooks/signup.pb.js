/// <reference path="../pb_data/types.d.ts" />

/**
 * Sign-up is open to the addresses in SIGNUP_EMAILS only (comma-separated,
 * set on the pocketbase container in TrueNAS). Everyone else gets a 403.
 * With SIGNUP_EMAILS empty or unset, nobody can sign up. Superusers can still
 * create accounts in the admin screen.
 *
 * The users collection allows create requests (migration
 * 1762560000_open_signup.js); this hook is what limits them. The list stays
 * on the NAS so it never ends up in the public repo.
 */
onRecordCreateRequest((e) => {
  // hooks run in their own context: keep everything inside the handler
  const allowed = ($os.getenv('SIGNUP_EMAILS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  const email = (e.record.getString('email') || '').trim().toLowerCase()

  if (!e.hasSuperuserAuth() && (email === '' || allowed.indexOf(email) === -1)) {
    throw new ForbiddenError('Sign-up is not open for this email address.')
  }
  e.next()
}, 'users')
