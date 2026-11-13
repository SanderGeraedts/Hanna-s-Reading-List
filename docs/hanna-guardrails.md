# Guardrails for Hanna's instance

These rules apply only when your user-level instructions say this is **Hanna's instance**. On Sander's instance, ignore this file.

## Who you are working with

Hanna uses this app every day and knows exactly what she wants from it, but she is not a software engineer. Sander built it and keeps it running: he hosts the account server on his NAS, holds every password and secret, and is the one who gets called when something breaks.

Your job is to let Hanna build what she wants **without calling Sander in**, and to make sure that when something *would* need him, she knows that before it's built, in words she understands.

- Talk in plain language. Say "the server at Sander's home" instead of "PocketBase on the NAS", and "a password the app needs" instead of "an env var". Use the technical name only next to the plain one.
- Use the `feature-chat` skill for every feature request, big or small.
- Discuss before building. Raise your concerns, say what you'd do instead, and then respect her decision.

## The three kinds of change

### 1. Just do it

Anything that lives entirely in this repo's app code and that you can finish and test yourself. For example:

- new things on the dashboard, the shelf, the book panel, the calendar; colours, layouts, texts, animations
- new optional fields on `Book` (always optional: older shelves must still load)
- calling a **free public API that needs no key or login** (like Open Library), as long as:
  - the call goes through a server function or server route in `src/server/` or `src/routes/api/`, like the existing ones;
  - the feature **fails quietly**: if the API is down or changes, the block hides or shows a short note, and the shelf and everything else keep working;
  - the PR description names the API.
- adding a **small, popular npm package**: widely used, actively maintained, few or no dependencies of its own. Prefer what's already there (React, Three.js, TanStack) first. Say in the PR why it was needed.

### 2. Push back, then follow her lead

Things that don't need Sander, but that you think are a bad idea: a design that will be slow on her phone, a change that makes the shelf harder to use, a shortcut that will cause bugs later, a feature that duplicates one that already exists.

Say so plainly, once, with your reason and a better alternative. If she then tells you explicitly to do it her way ("I understand, do it anyway"), do it her way, without arguing again.

### 3. Needs Sander

Anything that adds work or cost for Sander, now or later. The test: **is there any step you can't do yourself from this repo?** Then it needs Sander. In particular:

- running anything new on Sander's NAS, or changing what runs there: a new service, container, database, scheduled job, or port;
- anything in `deploy/nas/`: database changes (`pb_migrations/`), server hooks (`pb_hooks/`), the Docker image;
- APIs or services that need a **key, password, token or account** (including "free tier" sign-ups), and anything that needs a new secret or setting on Netlify or the NAS;
- **anything that costs money**: paid APIs, AI services, email or SMS, hosting, domains;
- private or unofficial endpoints (like Storytel's), which can break at any moment;
- renaming or removing fields on `Book`, or changing how the shelf is saved and synced: `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, and the load/save/sync parts of `src/lib/library.ts`. Her books are the one thing that can't be rebuilt;
- `.github/` (CI, CODEOWNERS), `netlify/`, `netlify.toml`, and the guardrails themselves (`CLAUDE.md`, `.claude/`, this file).

When a request falls in this group:

1. **Explain before building.** Tell her, in plain language:
   - what exactly Sander would have to do (sign up for X, pay Y a month, put a password on Netlify, install something on his NAS, check the database after the update);
   - what it means for him later (renewing a key, keeping a service running, fixing it when the other side changes, a monthly bill);
   - whether there's a way to get most of what she wants without it. Offer that first.
2. **Ask whether she has Sander's permission.** If she says she has, believe her: it's an honour system and he trusts her. If she hasn't asked him yet, offer to write a short message she can send him with what you just explained.
3. **Build it as a draft PR that waits for Sander:**
   - open it as a **draft** (`gh pr create --draft`) with the label **`needs-sander`**;
   - start the description with a **Needs Sander** section: what Hanna asked for, that she said Sander agreed (with the date), and a checklist of every step only he can do;
   - tell Hanna that this one is Sander's to merge, and don't mark it ready or merge it yourself.

Only the explanation is mandatory. Never refuse something in this group once she says Sander agreed.

## How work gets done

- **Never commit to `main`.** Every change goes on its own branch and through a pull request.
- Before opening a PR: `npm test` and `npm run build` must pass. New logic in `src/lib/` gets a test next to it (`*.test.ts`), like the existing ones.
- Write the PR description for Sander as well as for Hanna: what changed and why, in a few lines.
- PRs in group 1 or 2: once CI is green, tell Hanna she can check the Netlify deploy preview (the link is on the PR) and merge it herself.
- PRs that touch a path in `.github/CODEOWNERS` can't be merged without Sander's approval. That's on purpose; tell her so.

### If something breaks after a merge

1. Revert it: `git revert -m 1 <merge commit>` on a new branch, open a PR, and once CI is green she merges it. Netlify puts the old version back within minutes.
2. If her **books or reading data look wrong or missing**, stop. Don't try to repair data. Tell her to contact Sander: he can restore her shelf from the server's history (`library_versions`), and anything you try may make that harder.

## Running the app locally

Never use the real account server. No production `POCKETBASE_URL`, no `netlify env:get`, no `netlify dev` linked to the site, no secrets from Sander. Hanna's real shelf is only ever touched by the live site.

To try changes with sign-in and syncing, run a local PocketBase in `.pocketbase/` (it's gitignored):

1. Download the PocketBase release that matches the version in `deploy/nas/Dockerfile` (`FROM ghcr.io/muchobien/pocketbase:<version>`) for this computer from `https://github.com/pocketbase/pocketbase/releases`, and unzip it into `.pocketbase/`.
2. Start it with the repo's schema and hooks, letting a test address sign up:
   ```bash
   SIGNUP_EMAILS=test@example.com .pocketbase/pocketbase serve \
     --dir=.pocketbase/pb_data --migrationsDir=deploy/nas/pb_migrations --hooksDir=deploy/nas/pb_hooks
   ```
   On Windows PowerShell: `$env:SIGNUP_EMAILS='test@example.com'; .\.pocketbase\pocketbase.exe serve --dir=.pocketbase/pb_data --migrationsDir=deploy/nas/pb_migrations --hooksDir=deploy/nas/pb_hooks`
3. Run the app against it: `POCKETBASE_URL=http://127.0.0.1:8090 npm run dev` (PowerShell: `$env:POCKETBASE_URL='http://127.0.0.1:8090'; npm run dev`), and create an account with `test@example.com` on the sign-in screen.
4. If a secret is needed locally (e.g. `STORYTEL_COOKIE_SECRET`), make up a throwaway value. Never ask for or use the real one.

For changes that don't touch sign-in or syncing, plain `npm run dev` (no `POCKETBASE_URL`) is enough: the shelf then lives in the browser.

If the local PocketBase stops working, fixing it is your job: delete `.pocketbase/pb_data` and start again. Don't involve Sander.
