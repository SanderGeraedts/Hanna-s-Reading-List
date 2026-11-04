# Account server on the NAS (HexOS / TrueNAS)

This sets up sign-in and shelf syncing for Hanna's Reading List. It runs two containers on the NAS:

- **PocketBase** stores the accounts, each person's shelf, and their remembered Storytel login (encrypted by the app; PocketBase never sees it in plain text).
- **Tailscale** gives PocketBase an HTTPS address on the internet through **Funnel**. Nothing is opened on your router and your home IP stays private.

```
Hanna's browser ──► hanna.sanderg.nl (Netlify) ──► https://reading-list.<tailnet>.ts.net ──► NAS: Tailscale ──► PocketBase
                    session cookie lives here       only the app's server calls this
```

The browser never talks to the NAS. Only the app's server functions on Netlify do, using the address you put in `POCKETBASE_URL`.

**What's public and what isn't**

| Address | Who can reach it | What it serves |
| --- | --- | --- |
| `https://reading-list.<tailnet>.ts.net` (port 443, Funnel) | The internet | Only the API paths the app needs: sign-in for `users`, and the `libraries` and `storytel_logins` records. Everything else, including the admin screen and superuser sign-in, returns 404. |
| `https://reading-list.<tailnet>.ts.net:8443` | Your own Tailscale devices only | All of PocketBase, including the admin screen at `/_/` |

Every record is limited to its owner by PocketBase's rules, and sign-up is closed. You create the accounts.

## Files in this folder

| File | Goes to |
| --- | --- |
| `compose.yaml` | Pasted into TrueNAS when you install the app (step 3) |
| `serve.json` | `<dataset>/serve.json` on the NAS |
| `pb_migrations/*.js` | `<dataset>/pb_migrations/` on the NAS. This is the database schema; PocketBase applies it on start-up. |

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
2. Inside it, create three empty folders: `tailscale`, `pb_data` and `pb_migrations`.
3. Copy the files over (for example through an SMB share of that dataset):
   - `serve.json` → `/mnt/<pool>/apps/reading-list/serve.json`
   - everything in `pb_migrations/` → `/mnt/<pool>/apps/reading-list/pb_migrations/`

## 3. Install the app

HexOS runs on TrueNAS SCALE. Custom Docker apps are added from the TrueNAS web interface.

1. In TrueNAS, open **Apps → Discover Apps**, then **Install via YAML** (under the ⋮ menu or next to *Custom App*, depending on the version).
2. Name it `reading-list`.
3. Paste `compose.yaml` and change two things:
   - Replace every `/mnt/POOL/apps/reading-list` with your dataset's real path.
   - Replace `tskey-auth-REPLACE-ME` with the auth key from step 1.
4. Save. Both containers should show as running within a minute.

## 4. Finish the Tailscale side

1. In the Tailscale admin console, the **Machines** page now lists `reading-list`. Open its ⋯ menu and choose **Disable key expiry**. Otherwise it drops off the tailnet after 180 days, and the app can't sign anyone in until you re-authorise it.
2. Optional tidy-up: edit the app in TrueNAS and delete the `TS_AUTHKEY` line. The login is saved in the `tailscale` folder.
3. Your address is `https://reading-list.<tailnet>.ts.net`, for example `https://reading-list.tail1234.ts.net`. A new Funnel name can take up to ten minutes to work.

## 5. Create the admin login and the accounts

1. In TrueNAS, open the app, find the **pocketbase** container and open its **Shell**. Run:

   ```sh
   pocketbase superuser upsert you@example.com 'a-long-unique-password' --dir=/pb_data
   ```

   Use your own email and a strong password that you keep in your password manager. This is the admin login, not a reading-list account.

2. On a device that's signed in to Tailscale, open `https://reading-list.<tailnet>.ts.net:8443/_/` and sign in with that admin login.
3. Open **Collections → users → New record** and create Hanna's account: her email, a password, and her name. Tick *verified*. Do the same for anyone else who should have a shelf.

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

The first time someone signs in on a device, the shelf that browser already had is merged into their account. Books the account already has (same Storytel id, ISBN, or title and author) are skipped, so nothing is duplicated. The old copy stays in that browser's storage as a backup (`hannas-reading-list:v1:before-account`).

Do this on each of Hanna's devices once and all her books end up on one shelf.

A Storytel login remembered on a device also moves into the account on first use, so ↻ then works on every device.

## Day to day

**If the NAS or the internet is down:** people who are already signed in keep working from their device's copy of the shelf. The account button shows a red dot, and changes are sent when the server is back. Nobody can sign in for the first time on a new device until it's back.

**Two devices at once:** each change saves the whole shelf, and the newest save wins. A device picks up changes from others whenever the page comes back into view. With a few people that's fine.

**Size limit:** uploaded covers are stored inside the shelf. If a shelf grows past about 5 MB, which is a lot of uploaded covers, it stops syncing and the account menu says so.

## Backups

1. **ZFS snapshots:** in TrueNAS, go to **Data Protection → Periodic Snapshot Tasks** and add a daily snapshot of the `apps/reading-list` dataset, kept for a few weeks.
2. **PocketBase backups:** in the admin screen (`:8443/_/`), open **Settings → Backups** and turn on automatic backups. These are consistent copies of the database, which is safer than a snapshot taken mid-write. They're stored in `pb_data/backups`, so the snapshots include them. For a copy off the NAS, point the backups at S3-compatible storage there, or use a TrueNAS Cloud Sync task.

To restore, use **Settings → Backups → Restore** in the admin screen, or roll back the dataset snapshot while the app is stopped.

## Updating

- **Images:** change the version tags in the app's YAML in TrueNAS and save. Tailscale updates are routine. PocketBase is still pre-1.0, so read its [changelog](https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md) before jumping a minor version (0.40 → 0.41). Take a backup first.
- **Schema:** if the app gets a new file in `deploy/nas/pb_migrations/`, copy it to the NAS folder and restart the app. PocketBase applies it on start-up. Edits to collections in the admin screen aren't saved as migrations (`--automigrate=false`), so make lasting schema changes in this repo.

## Troubleshooting

- **Logs:** in TrueNAS, open the app and view each container's logs.
- **Is Funnel on?** In the **tailscale** container shell, run `tailscale funnel status`. It should list port 443 as *Funnel on*. If the logs say Funnel isn't allowed, check step 1.3.
- **The app says "The reading-list server can't be reached right now":** the NAS is off, the app is stopped, or Funnel is down. Check with the `curl …/api/health` from step 6.
- **"Not signed in" right after signing in:** check that `POCKETBASE_URL` has no trailing slash and starts with `https://`.
