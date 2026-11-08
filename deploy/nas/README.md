# Account server on the NAS (HexOS / TrueNAS)

This sets up sign-in and shelf syncing for Hanna's Reading List. It runs three containers on the NAS:

- **PocketBase** stores the accounts, each person's shelf, and their remembered Storytel login (encrypted by the app; PocketBase never sees it in plain text).
- **Tailscale** gives PocketBase an HTTPS address on the internet through **Funnel**. Nothing is opened on your router and your home IP stays private.
- **Watchtower** keeps PocketBase up to date with `main`. It checks GitHub's container registry every 5 minutes and restarts PocketBase when there's a new image. It's not allowed to touch any other container.

```
Hanna's browser ──► hanna.sanderg.nl (Netlify) ──► https://reading-list.<tailnet>.ts.net ──► NAS: Tailscale ──► PocketBase
                    session cookie lives here       only the app's server calls this
```

The browser never talks to the NAS. Only the app's server functions on Netlify do, using the address you put in `POCKETBASE_URL`.

**What's public and what isn't**

| Address | Who can reach it | What it serves |
| --- | --- | --- |
| `https://reading-list.<tailnet>.ts.net` (port 443, Funnel) | The internet | Only the API paths the app needs: sign-in for `users`, the `libraries` and `storytel_logins` records, and `/api/nightly/` for the nightly Storytel sync (404 without its secret). Everything else, including the admin screen and superuser sign-in, returns 404. |
| `https://reading-list.<tailnet>.ts.net:8443` | Your own Tailscale devices only | All of PocketBase, including the admin screen at `/_/` |

Every record is limited to its owner by PocketBase's rules. Only the email addresses you list in `SIGNUP_EMAILS` (on the NAS) can create an account; anyone else gets a 403.

## Files in this folder

| File | Goes to |
| --- | --- |
| `compose.yaml` | Pasted into TrueNAS when you install the app (step 3) |
| `serve.json` | `<dataset>/serve.json` on the NAS |
| `pb_hooks/*.pb.js` | Nowhere by hand. Built into the image; `signup.pb.js` checks new accounts against `SIGNUP_EMAILS`, `nightly.pb.js` serves the nightly Storytel sync. |
| `pb_migrations/*.js` | Nowhere by hand. This is the database schema. It's built into the PocketBase image, and PocketBase applies it on start-up. |
| `Dockerfile` | Built by GitHub Actions (`.github/workflows/backend.yml`) into `ghcr.io/sandergeraedts/reading-list-pocketbase` |

## How a deploy works

```
push to main ──► Netlify builds the app                          (any change)
            └──► GitHub Actions: build PocketBase image           (changes in deploy/nas/Dockerfile or pb_migrations/)
                   ├─ start it on an empty database, check every migration applies and the rules hold
                   └─ publish :stable and :sha-1234567 to ghcr.io
                          ▼  within 5 minutes
                 NAS: Watchtower pulls :stable, restarts pocketbase ──► PocketBase applies new migrations on start-up
```

GitHub never connects to the NAS. The NAS fetches the image itself, so there are no SSH keys or Tailscale keys in GitHub, and nothing is opened on the router.

## 0. Publish the first image (on GitHub)

The NAS needs the image to exist before it can install the app.

1. Merge the accounts branch into `main` (or run the workflow by hand: **Actions → Backend image → Run workflow**). Wait for the **Backend image** run to go green.
2. On GitHub, open your profile → **Packages → reading-list-pocketbase → Package settings**. Under **Danger Zone**, choose **Change visibility → Public**. Then the NAS can pull it without a login. It only holds PocketBase and the schema, no data or secrets.
   - Prefer to keep it private? Create a personal access token with only `read:packages`, then add it in TrueNAS under **Apps → Configuration → Manage Container Images → Docker Registries** (`ghcr.io`, your GitHub username, the token). Watchtower also needs it: add `REPO_USER` and `REPO_PASS` to its environment.
3. Under **Package settings → Manage Actions access**, check that the repository is listed with **Write**. It's added automatically by the first run.

Merging is safe before the NAS is ready: until `POCKETBASE_URL` is set on Netlify (step 7), the site works as before.

## 1. Prepare Tailscale (in the browser, from anywhere)

Tailscale's free Personal plan includes Funnel.

1. Sign in at [login.tailscale.com/admin](https://login.tailscale.com/admin).
2. **DNS** page: make sure **MagicDNS** is on, and turn on **HTTPS Certificates**. Note your tailnet name shown there (something like `tail1234.ts.net`).
3. **Access controls** page: Funnel must be allowed for your devices. New tailnets allow it by default. If your policy file has no `nodeAttrs` entry with `"funnel"`, add this to it:

   ```json
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```

4. **Settings → Keys → Generate auth key**: leave *Reusable* and *Ephemeral* off. Copy the key (`tskey-auth-…`). It's only needed for the first start.

## 2. Make a folder on the NAS (on your home network)

1. Create a dataset (folder) for the app, for example `apps/reading-list` on your pool. In HexOS you can create a folder; in TrueNAS it's **Datasets → Add Dataset**. Find its full path in TrueNAS under **Datasets**. It looks like `/mnt/<pool>/apps/reading-list`.
2. Inside it, create two empty folders: `tailscale` and `pb_data`.
3. Copy `serve.json` to `/mnt/<pool>/apps/reading-list/serve.json`, for example through an SMB share of that dataset. That's the only file you copy. The schema comes with the image.

## 3. Install the app

HexOS runs on TrueNAS SCALE. Custom Docker apps are added from the TrueNAS web interface.

1. In TrueNAS, open **Apps → Discover Apps**, then **Install via YAML** (under the ⋮ menu or next to *Custom App*, depending on the version).
2. Name it `reading-list`.
3. Paste `compose.yaml` and change two things:
   - Replace every `/mnt/POOL/apps/reading-list` with your dataset's real path.
   - Replace `tskey-auth-REPLACE-ME` with the auth key from step 1.
   - Set `SIGNUP_EMAILS` to the address(es) that may create an account, comma-separated, e.g. Hanna's email. Leave it empty to close sign-up.
4. Save. All three containers should show as running within a minute.
5. Open the **watchtower** container's logs. Near the top it should say it's watching 1 container (only those with the enable label). If it says it can't reach the Docker API, check that the `/var/run/docker.sock` line is in the YAML exactly as written.

## 4. Finish the Tailscale side

1. In the Tailscale admin console, the **Machines** page now lists `reading-list`. Open its ⋯ menu and choose **Disable key expiry**. Otherwise it drops off the tailnet after 180 days, and the app can't sign anyone in until you re-authorise it.
2. Optional tidy-up: edit the app in TrueNAS and delete the `TS_AUTHKEY` line. The login is saved in the `tailscale` folder.
3. Your address is `https://reading-list.<tailnet>.ts.net`, for example `https://reading-list.tail1234.ts.net`. A new Funnel name can take up to ten minutes to work.

## 5. Accounts

### Hanna signs up herself

1. Make sure her email is in `SIGNUP_EMAILS` on the **pocketbase** container (step 3; to change it later: **Apps → reading-list → Edit**, then save).
2. Once the app is connected (step 7), she opens the site, chooses **New here? Create an account**, and enters her name, email and a password of at least 8 characters. She's signed in straight away.
3. Afterwards you can remove her address from `SIGNUP_EMAILS` to close sign-up again. Her account keeps working.

### Admin login (optional, for you)

Only needed to look at the data, change a password or restore a backup.

1. In TrueNAS, open the app, find the **pocketbase** container and open its **Shell** (not the TrueNAS system shell, and not your own PC: `pocketbase` only exists inside that container). Run:

   ```sh
   pocketbase superuser upsert you@example.com 'a-long-unique-password' --dir=/pb_data
   ```

   Use a strong password that you keep in your password manager.

2. On a device that's signed in to Tailscale, open `https://reading-list.<tailnet>.ts.net:8443/_/` and sign in with that admin login.

There's no "forgot password" email. To reset a password, change it on the user's record in the admin screen.

## 6. Check that it works (from outside your home network)

From any computer, including one that's not on Tailscale:

```sh
curl https://reading-list.<tailnet>.ts.net/api/health
# {"message":"API is healthy.","code":200,"data":{}}

curl -i -X POST https://reading-list.<tailnet>.ts.net/api/collections/_superusers/auth-with-password
# HTTP/2 404   <- the admin sign-in is not reachable from the internet

curl https://reading-list.<tailnet>.ts.net/_/
# 404 page not found
```

From a device that's **not** on your tailnet, `https://reading-list.<tailnet>.ts.net:8443` should not load at all.

## 7. Connect the app on Netlify

Set `POCKETBASE_URL` to your address, with no slash at the end, then start a new deploy. From the project folder:

```powershell
npx --yes --dangerously-allow-all-scripts netlify-cli@latest env:set POCKETBASE_URL "https://reading-list.<tailnet>.ts.net" --context production
```

Then redeploy, either with **Deploys → Trigger deploy** on Netlify or by pushing to `main`.

Leave `STORYTEL_COOKIE_SECRET` as it is. It's the key that encrypts the remembered Storytel logins; if it changes, people just have to sign in to Storytel once more.

Until `POCKETBASE_URL` is set, the site works as before: no sign-in, and each browser has its own shelf.

## 8. First sign-in

The first time someone signs in on a device, the shelf that browser already had is merged into their account. Books the account already has (same Storytel id, ISBN, or title and author) are skipped, so nothing is duplicated. The old copy stays in that browser's storage as a backup (`hannas-reading-list:v1`).

Do this on each of Hanna's devices once and all her books end up on one shelf.

A Storytel login remembered on a device also moves into the account on first use, so ↻ then works on every device.

## 9. Nightly Storytel sync (optional)

Every day at 23:00 Amsterdam time the app fetches each remembered Storytel shelf and brings the books already on the shelf up to date: status, progress and the reading log. A day of listening is then noted even when Hanna doesn't open the app. New Storytel books are still added by ↻ in the app.

Nobody is signed in at night, so the app reads and saves the shelves through two routes on PocketBase (`pb_hooks/nightly.pb.js`) that only answer with a shared secret. The Storytel login stays sealed on the NAS; only the app can open it.

1. Make a long random secret, for example in PowerShell:

   ```powershell
   $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
   ```

2. On the NAS: **Apps → reading-list → Edit**, and set `NIGHTLY_SECRET` on the **pocketbase** container to it. Copy the new `serve.json` to the dataset (it adds `/api/nightly/`), then save, which restarts the app.
3. On Netlify, set the same secret and redeploy:

   ```powershell
   npx --yes --dangerously-allow-all-scripts netlify-cli@latest env:set NIGHTLY_SECRET "<the secret>" --context production
   ```

4. Check it the next morning: on Netlify, **Logs → Functions → nightly-storytel** shows the run at 23:00 (a run an hour earlier or later just says it isn't 23:00 in Amsterdam). It lists how many shelves were synced. To try it straight away, call it by hand:

   ```powershell
   curl.exe -X POST -H "x-nightly-secret: <the secret>" https://hanna.sanderg.nl/api/nightly-storytel
   ```

If a device has changes it hasn't sent yet at 23:00, the sync leaves that shelf alone for the night (the device's copy wins). If Storytel stops accepting the saved login, the log says so; signing in to Storytel again in the app fixes it.

## Day to day

**If the NAS or the internet is down:** people who are already signed in keep working from their device's copy of the shelf. The account button shows a red dot, and changes are sent when the server is back. Nobody can sign in for the first time on a new device until it's back.

**Two devices at once:** each change saves the whole shelf, and the newest save wins. A device picks up changes from others whenever the page comes back into view. With a few people that's fine.

**Size limit:** uploaded covers are stored inside the shelf. If a shelf grows past about 5 MB, which is a lot of uploaded covers, it stops syncing and the account menu says so.

## Backups

1. **ZFS snapshots:** in TrueNAS, go to **Data Protection → Periodic Snapshot Tasks** and add a daily snapshot of the `apps/reading-list` dataset, kept for a few weeks.
2. **PocketBase backups:** in the admin screen (`:8443/_/`), open **Settings → Backups** and turn on automatic backups. These are consistent copies of the database, which is safer than a snapshot taken mid-write. They're stored in `pb_data/backups`, so the snapshots include them. For a copy off the NAS, point the backups at S3-compatible storage there, or use a TrueNAS Cloud Sync task.

To restore, use **Settings → Backups → Restore** in the admin screen, or roll back the dataset snapshot while the app is stopped.

## Updating

### Schema changes: automatic

1. Add a new file to `deploy/nas/pb_migrations/`. Never edit one that has already run: PocketBase only applies each file once. Name it `<unix time>_<what>.js`, like the existing one.
2. Open a pull request. The **Backend image** workflow builds the image and applies every migration to an empty database. It must be green before you merge.
3. Merge. Within about 10 minutes (the build, plus Watchtower's 5-minute check), PocketBase restarts with the new schema. Watch it happen in the watchtower container's logs.

**Before merging a schema change, take a backup:** in the admin screen (`:8443/_/`), use **Settings → Backups → Backup now**. The CI check proves a migration works on an *empty* database, not on Hanna's data. If a migration fails on start-up, PocketBase won't start and nobody can sign in, but devices that are already signed in keep working offline.

**Order matters when app code needs the new schema.** Netlify deploys the app straight away, while the server follows a few minutes later. So make schema changes that the current app tolerates: add fields and collections first, and start using them in a later merge.

### Rolling back

Every published image is also tagged with its commit, like `sha-1234567` (see **Packages → reading-list-pocketbase**).

1. In TrueNAS, edit the app and change the pocketbase image from `:stable` to the last good `:sha-…` tag. Watchtower leaves it alone while it's pinned.
2. If the bad migration already changed data, restore the backup you took (**Settings → Backups → Restore**), or roll back the dataset snapshot while the app is stopped.
3. Fix it on `main` with a *new* migration, then set the image back to `:stable`.

### PocketBase itself

Change the version in `deploy/nas/Dockerfile` and merge. It deploys like a schema change. PocketBase is still pre-1.0, so read its [changelog](https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md) before jumping a minor version (0.40 → 0.41), and take a backup first.

### Tailscale, Watchtower and `serve.json`: by hand

These change rarely, and they're the parts that keep the NAS reachable, so they're not automatic. Change the tags in the app's YAML in TrueNAS and save. For `serve.json`, copy the new file to the dataset and restart the app. Edits to collections in the admin screen aren't saved as migrations (`--automigrate=false`), so make lasting schema changes in this repo.

## Troubleshooting

- **Logs:** in TrueNAS, open the app and view each container's logs.
- **A merge didn't reach the NAS:** check that the **Backend image** run on GitHub is green and published `:stable`. Then check the watchtower logs: "Found new … image" means it updated. If it says "unauthorized", the package is private (step 0.2).
- **Is Funnel on?** In the **tailscale** container shell, run `tailscale funnel status`. It should list port 443 as *Funnel on*. If the logs say Funnel isn't allowed, check step 1.3.
- **The app says "The reading-list server can't be reached right now":** the NAS is off, the app is stopped, or Funnel is down. Check with the `curl …/api/health` from step 6.
- **"Not signed in" right after signing in:** check that `POCKETBASE_URL` has no trailing slash and starts with `https://`.
