// @vitest-environment node
// T-0099 / D-0078: the Netlify ignore script, run against throwaway git repositories in a temp
// folder. No network, no Netlify: exit 0 means Netlify skips the build, anything else builds.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'netlify-ignore.mjs')
const GIT_ENV = {
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_TERMINAL_PROMPT: '0',
}

const repos: string[] = []
afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'netlify-ignore-'))
  repos.push(dir)
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, ...GIT_ENV },
    }).trim()
  const write = (path: string, text = `${path} ${Math.random()}\n`) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  const commit = (files: string[]) => {
    for (const f of files) write(f)
    git('add', '-A')
    git('commit', '--quiet', '-m', `change ${files.join(' ')}`)
    return git('rev-parse', 'HEAD')
  }
  git('init', '--quiet', '-b', 'main')
  commit(['src/app.ts', 'docs/tasks/a.md', 'README.md', 'netlify.toml'])
  return { dir, git, commit }
}

type Repo = ReturnType<typeof makeRepo>

/** main as Netlify's clone sees it: a remote-tracking origin/main, then a pull request branch */
function prRepo(changes: string[][]) {
  const repo = makeRepo()
  repo.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  repo.git('checkout', '--quiet', '-b', 'feature')
  let head = ''
  for (const files of changes) head = repo.commit(files)
  return { ...repo, head }
}

function run(repo: Repo, env: Record<string, string | undefined>) {
  const clean: NodeJS.ProcessEnv = { ...process.env, ...GIT_ENV }
  for (const key of ['CONTEXT', 'COMMIT_REF', 'CACHED_COMMIT_REF', 'BRANCH', 'HEAD']) delete clean[key]
  for (const [k, v] of Object.entries(env)) if (v !== undefined) clean[k] = v
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: repo.dir, env: clean, encoding: 'utf8' })
  return { status: r.status, out: r.stdout }
}

const preview = (head: string) => ({ CONTEXT: 'deploy-preview', COMMIT_REF: head, BRANCH: 'feature', HEAD: 'feature' })

describe('netlify-ignore: deploy previews', { timeout: 20_000 }, () => {
  it('skips a pull request that changes only docs/tasks/x.md', () => {
    const repo = prRepo([['docs/tasks/x.md']])
    const r = run(repo, preview(repo.head))
    expect(r.out).toContain('skip')
    expect(r.status).toBe(0)
  })

  it('skips a pull request that changes only the root README.md and AGENTS.md', () => {
    const repo = prRepo([['README.md', 'AGENTS.md']])
    expect(run(repo, preview(repo.head)).status).toBe(0)
  })

  it('builds a pull request that changes only src/', () => {
    const repo = prRepo([['src/lib/thing.ts']])
    expect(run(repo, preview(repo.head)).status).not.toBe(0)
  })

  it('builds a pull request that changes docs/ and src/ together', () => {
    const repo = prRepo([['docs/tasks/x.md', 'src/app.ts']])
    expect(run(repo, preview(repo.head)).status).not.toBe(0)
  })

  it('builds when the last commit is docs-only but an earlier commit on the branch changed src/', () => {
    const repo = prRepo([['src/app.ts'], ['docs/tasks/x.md']])
    expect(run(repo, preview(repo.head)).status).not.toBe(0)
  })

  it.each([['public/notes.md'], ['deploy/nas/README.md'], ['netlify.toml'], ['docs-not/x.md'], ['src/notes.md']])(
    'builds a pull request that changes only %s',
    (file) => {
      const repo = prRepo([[file]])
      expect(run(repo, preview(repo.head)).status).not.toBe(0)
    },
  )

  it('builds a pull request that renames src/a.ts to docs/a.ts', () => {
    const repo = makeRepo()
    repo.commit(['src/a.ts'])
    repo.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    repo.git('checkout', '--quiet', '-b', 'feature')
    repo.git('mv', 'src/a.ts', 'docs/a.ts')
    repo.git('commit', '--quiet', '-m', 'move')
    const head = repo.git('rev-parse', 'HEAD')
    expect(run(repo, preview(head)).status).not.toBe(0)
  })

  it('compares with main, not with CACHED_COMMIT_REF', () => {
    // a new branch whose cached commit is its own docs-only parent must still build its src/ change
    const repo = prRepo([['src/app.ts'], ['docs/tasks/x.md']])
    const parent = repo.git('rev-parse', 'HEAD~1')
    expect(run(repo, { ...preview(repo.head), CACHED_COMMIT_REF: parent }).status).not.toBe(0)
  })

  it('builds when there is no main to find a merge base with', () => {
    const repo = makeRepo()
    repo.git('checkout', '--quiet', '-b', 'feature')
    repo.git('branch', '-D', 'main')
    const head = repo.commit(['docs/tasks/x.md'])
    const r = run(repo, preview(head))
    expect(r.out).toContain('build')
    expect(r.status).not.toBe(0)
  })

  it('builds when COMMIT_REF is not set', () => {
    const repo = prRepo([['docs/tasks/x.md']])
    expect(run(repo, { CONTEXT: 'deploy-preview' }).status).not.toBe(0)
  })
})

describe('netlify-ignore: production', { timeout: 20_000 }, () => {
  function prodRepo(files: string[]) {
    const repo = makeRepo()
    const cached = repo.git('rev-parse', 'HEAD')
    const head = repo.commit(files)
    return { repo, cached, head }
  }
  const prod = (cached: string | undefined, head: string) => ({
    CONTEXT: 'production',
    CACHED_COMMIT_REF: cached,
    COMMIT_REF: head,
    BRANCH: 'main',
    HEAD: 'main',
  })

  it('skips when CACHED_COMMIT_REF..COMMIT_REF changes only docs', () => {
    const { repo, cached, head } = prodRepo(['docs/decisions/D-1.md', 'CHANGELOG.md'])
    expect(run(repo, prod(cached, head)).status).toBe(0)
  })

  it('builds when the range has an app file', () => {
    const { repo, cached, head } = prodRepo(['docs/decisions/D-1.md', 'src/app.ts'])
    expect(run(repo, prod(cached, head)).status).not.toBe(0)
  })

  it('builds when CACHED_COMMIT_REF is empty', () => {
    const { repo, head } = prodRepo(['docs/x.md'])
    expect(run(repo, prod('', head)).status).not.toBe(0)
    expect(run(repo, prod(undefined, head)).status).not.toBe(0)
  })

  it('builds when CACHED_COMMIT_REF equals COMMIT_REF', () => {
    const { repo, head } = prodRepo(['docs/x.md'])
    expect(run(repo, prod(head, head)).status).not.toBe(0)
  })

  it('builds when CACHED_COMMIT_REF is not an ancestor of COMMIT_REF', () => {
    const repo = makeRepo()
    const base = repo.git('rev-parse', 'HEAD')
    repo.git('checkout', '--quiet', '-b', 'other')
    const other = repo.commit(['docs/other.md'])
    repo.git('checkout', '--quiet', 'main')
    repo.git('reset', '--quiet', '--hard', base)
    const head = repo.commit(['docs/x.md'])
    expect(run(repo, prod(other, head)).status).not.toBe(0)
  })

  it('builds when CACHED_COMMIT_REF is not a commit in the clone', () => {
    const { repo, head } = prodRepo(['docs/x.md'])
    expect(run(repo, prod('0123456789abcdef0123456789abcdef01234567', head)).status).not.toBe(0)
  })
})

describe('netlify-ignore: other contexts', { timeout: 20_000 }, () => {
  it.each([['branch-deploy'], [undefined]])('builds for CONTEXT=%s', (context) => {
    const repo = prRepo([['docs/tasks/x.md']])
    const r = run(repo, { CONTEXT: context, COMMIT_REF: repo.head, CACHED_COMMIT_REF: repo.git('rev-parse', 'main') })
    expect(r.out).toContain('build')
    expect(r.status).not.toBe(0)
  })
})
