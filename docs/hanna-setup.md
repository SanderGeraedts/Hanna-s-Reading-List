# Setting up Hanna's PC

Everything Hanna needs to build features for her reading list with Claude, on Windows. It takes about half an hour. Do the steps in order: later ones use what earlier ones install.

What she ends up with:

- **Orca**, the app she works in. It runs Claude Code for her in a window, one workspace per feature.
- **Claude Code**, signed in with her own Claude account and set up as *Hanna's instance*, so it follows [`hanna-guardrails.md`](hanna-guardrails.md).
- A copy of this repo, connected to her GitHub account.
- The **Weekly Budget** plugin in Orca's status bar, so she can see whether her Claude usage is on pace for the week.

## 1. Accounts

- [ ] **GitHub**: accept the invitation to `SanderGeraedts/Hanna-s-Reading-List` (from the email, or at <https://github.com/SanderGeraedts/Hanna-s-Reading-List/invitations> while signed in as her). She gets the *Write* role: she can open and merge PRs, but not change the repo's settings.
- [ ] **Claude**: her own Claude account with a Pro or Max plan, which includes Claude Code. Sign up at <https://claude.ai>.

## 2. Install the tools

Open **PowerShell** (Start → type *PowerShell*) and run these one at a time. Accept the prompts.

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id GitHub.cli -e
```

Then install Claude Code:

```powershell
irm https://claude.ai/install.ps1 | iex
```

And **Orca**: download `orca-windows-setup.exe` from <https://orca.dev> (or the latest release at <https://github.com/stablyai/orca/releases>) and run it.

**Close PowerShell and open a new one**, so it finds the new programs. Check:

```powershell
git --version; node --version; gh --version; claude --version; orca --version
```

Each should print a version. Node must be 22 or later.

## 3. Sign in

```powershell
gh auth login        # GitHub.com → HTTPS → Login with a web browser, as Hanna
gh auth setup-git    # lets git use that login
claude               # sign in with her Claude account in the browser, then type /exit
```

Also set her name on commits:

```powershell
git config --global user.name "Hanna"
git config --global user.email "<her GitHub email, or the noreply address from github.com/settings/emails>"
```

## 4. Get the reading list

```powershell
mkdir $HOME\projects -Force; cd $HOME\projects
gh repo clone SanderGeraedts/Hanna-s-Reading-List hannas-reading-list
cd hannas-reading-list
npm install
npm test
```

`npm test` should end with every test passing.

Then, in **Orca**: add a repository → choose the `hannas-reading-list` folder.

## 5. Make it Hanna's instance

This one line is what switches the guardrails on. Without it, Claude treats her as Sander.

```powershell
mkdir $HOME\.claude -Force
Add-Content -Encoding utf8 $HOME\.claude\CLAUDE.md "This is Hanna's instance. In hannas-reading-list, follow docs/hanna-guardrails.md."
```

## 6. The Weekly Budget plugin

The plugin shows in Orca's status bar how much of her weekly Claude usage she can still use today, e.g. `Budget 9% left today`. Its source is at <https://github.com/SanderGeraedts/orca-budget-plugin>.

With Orca open, in PowerShell:

```powershell
orca plugin install SanderGeraedts/orca-budget-plugin
```

The first time, this stops with **approval required**. It lists what the plugin may do (keep its own settings and storage, add a status bar item and a refresh command) and prints the exact command to run again with `--approve <fingerprint>`. Run that command. The fingerprint is tied to this exact version, so an update asks again.

Then set it up in Orca → **Settings → Plugins → Weekly Budget**:

- **Workdays**: the days she plans to work on the app, e.g. `sat,sun` or `mon,tue,wed,thu,fri,sat,sun`. The week's budget is spread over these days.
- **Days off**: dates she won't use it (optional).
- **Workday start / end**: when she usually works on it. These only matter for splitting the day the weekly limit resets.

The plugin reads the Claude login from step 3 (`~\.claude\.credentials.json`). If it says *No Claude login found* or *login expired*, run `claude` once and it picks the login up again within ten minutes. Clicking the status bar item refreshes it.

To update it later: `orca plugin update`.

## 7. Check it works

Open the repo in Orca, start Claude in it, and ask:

> Whose instance is this, and what do you need Sander for?

It should say it's Hanna's instance and sum up the "Needs Sander" rules from the guardrails. Then try a small feature with `/feature-chat`, for example *"make the shelf a little darker"*. It should ask one or two questions, show a short plan, and after she says yes build it on a branch and open a PR. Once CI is green, she can check the deploy preview and merge it.

## If something goes wrong

- **A command isn't found** after installing: close PowerShell and open a new one.
- **`gh` or `git push` says permission denied**: the GitHub invitation (step 1) isn't accepted yet, or `gh auth setup-git` wasn't run.
- **Claude acts as if she's Sander** (no pushback, no draft PRs): check step 5. `$HOME\.claude\CLAUDE.md` must contain the line.
- **The site broke after a merge**: ask Claude to revert it (see the guardrails). If her books look wrong, stop and tell Sander.
