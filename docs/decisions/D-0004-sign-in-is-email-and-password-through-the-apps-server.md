---
id: D-0004
title: "Sign-in is email and password through the app's server, with sign-up only for addresses on an allowlist on the NAS"
description: "Accounts are PocketBase users with email and password; the app's server functions sign in and keep the token in an httpOnly session cookie for 30 days; only addresses in SIGNUP_EMAILS on the NAS can create an account; each record is readable by its owner only, and shelf history by the admin only."
status: Accepted
date: 2026-11-21
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [backend, access]
---

# Context

No global decision covers sign-in. The harness's template starts a project that syncs with
its own project decision (sign-up closed, only a signed-in account reads and writes its own
records), but that is a starting point for new projects, not a global rule. This records what
this app does, so that agents keep it. Recorded by the architect from the code at adoption
(T-0001).

- `src/server/auth.ts` signs in with `auth-with-password` on the `users` collection; there is
  no OAuth sign-in.
- `src/server/pocketbase.ts` keeps the token in an httpOnly, `SameSite=Lax` cookie,
  `__Host-session` in production, for 30 days, renewed on every visit.
- `deploy/nas/pb_migrations/1762560000_open_signup.js` lets the `users` collection accept
  create requests; `deploy/nas/pb_hooks/signup.pb.js` refuses every address that isn't in
  `SIGNUP_EMAILS`, set on the NAS and never in the repository. Empty means nobody can sign up.
- The collection rules limit `libraries` and `storytel_logins` to their owner;
  `library_versions` (shelf history, `pb_hooks/history.pb.js`) is for the admin only. The
  `Backend image` workflow checks all of this on an empty database for every backend change.
- Without `POCKETBASE_URL` there is no sign-in at all and the shelf stays in the browser.

# Decision

- **Accounts are PocketBase users with email and password,** signed in only through the app's
  server functions (D-0003).
- **The session is an httpOnly cookie** holding the PocketBase token, 30 days, renewed on use.
- **Sign-up is limited to the addresses in `SIGNUP_EMAILS` on the NAS.** Who is on that list is
  the Engineer's, and it never goes into the repository.
- **Each person reads and writes only their own records;** shelf history is admin-only.
- **There is no "forgot password" email;** the Engineer resets a password in the admin screen.

# Rationale

Two people use the app. An allowlist on the NAS keeps the public repository free of personal
addresses, and password sign-in needs no outside identity provider, keys or e-mail service.

# Consequences

- Adding Google, Apple or another sign-in, an e-mail service, or opening sign-up changes who
  can get in: that is the Engineer's (G-0009).
- The `Backend image` workflow's checks on sign-up, owner-only records and history must keep
  passing for every backend change.

# Guidance for agents

- Never weaken a collection rule, the sign-up hook or the cookie flags without a decision by
  the Engineer.
- Never write an e-mail address of a real person into the repository, a test or a migration.
- A change to who can sign in or see what is a question for the Engineer, not a task.
