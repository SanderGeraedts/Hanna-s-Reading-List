# Decisions

Read the global decisions first (`node_modules/@sandergeraedts/harness/decisions/index.md`),
then this list, then only the records your work touches. How the registry works is in
[README.md](README.md). One line per record: `- [D-NNNN Title](file.md): one sentence`. A decision that a
global one replaced ends its line with `Replaced by G-NNNN.`

## Accepted

- [D-0001 This project follows the harness](D-0001-this-project-follows-the-harness.md): The harness is installed as a pinned dev dependency at v0.7.0; its rules and global decisions (G-NNNN) apply here unless a project decision overrules one, and decisions, questions and tasks live as files in docs/.
- [D-0002 The app is a TanStack Start app with server functions and a 3D shelf, not a static single-page app](D-0002-the-app-is-a-tanstack-start-app-with-server-functions.md): Overrules G-0017. The front end is React and TypeScript on TanStack Start with server functions and server routes, Three.js through react-three-fiber, Vitest, its own CSS design system and a local copy of the shelf in localStorage.
- [D-0003 The browser never talks to PocketBase: the app's server functions on Netlify are its only client](D-0003-the-browser-never-talks-to-pocketbase.md): Overrules G-0018. PocketBase on the NAS behind Funnel stays the backend, but only the app's server functions and the scheduled nightly function on Netlify call it, with POCKETBASE_URL set for production only; Funnel exposes only the paths those need.
- [D-0004 Sign-in is email and password through the app's server, with sign-up only for addresses on an allowlist on the NAS](D-0004-sign-in-is-email-and-password-through-the-apps-server.md): Accounts are PocketBase users with email and password; the app's server keeps the token in an httpOnly session cookie for 30 days; only addresses in SIGNUP_EMAILS on the NAS can sign up; each record is its owner's only.
- [D-0005 The backend is deployed by its own image workflow and Watchtower on a NAS app set up by hand; harness infra is not used](D-0005-the-backend-is-deployed-by-its-own-workflow-and-watchtower.md): Overrules G-0028. The PocketBase image is built from deploy/nas/ by the Backend image workflow and published as ghcr.io/sandergeraedts/reading-list-pocketbase; Watchtower on the NAS pulls :stable; harness infra up and down are never run here.

## Open questions

- [Q-001 May the app send a reading reminder at 20:00 by web push, with keys on Netlify and a new collection on the NAS?](Q-001-may-the-app-send-a-reading-reminder-by-web-push.md): Hanna asked (#163) for a phone notification at 20:00 on days without reading; draft PR #165 builds it, but it needs VAPID secrets, a new PocketBase collection and a second scheduled function.
- [Q-002 May AI come back for completing series, page edges, quotes and back texts, with a paid API key on Netlify?](Q-002-may-ai-features-come-back.md): Hanna asked (#183) for these made with AI; AI was removed on purpose in #117, and bringing it back costs money per request and needs a key.
- [Q-003 Should the code-owner review on main (with the admin bypass) give way to the harness's ruleset and auto-merge, and how is the guard on shelf saving kept?](Q-003-how-do-code-owner-review-and-needs-sander-fit-the-harness.md): The ruleset main requires a code-owner review and lets admins bypass, while G-0029 wants no bypass and G-0011 wants green, passed pull requests to merge themselves.

## Replaced

None.

## Resolved questions

None.
