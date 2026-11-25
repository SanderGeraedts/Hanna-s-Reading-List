#!/usr/bin/env node
// Netlify's `[build] ignore` command (D-0078): exit 0 cancels the build, any other exit builds.
// Runs after the clone and before `pnpm install`, so only Node's built-ins and git.
// Skips only when every changed file is under docs/ or is a .md file at the repository root;
// anything it can't tell for sure builds.
import { execFileSync } from 'node:child_process'

const SKIP = 0
const BUILD = 1

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
}

function tryGit(...args) {
  try {
    return git(...args)
  } catch {
    return null
  }
}

function isDocsOnlyPath(path) {
  return path.startsWith('docs/') || (!path.includes('/') && path.endsWith('.md'))
}

function changedFiles(base, head) {
  // --no-renames: a file moved out of src/ shows as a delete in src/ and an add elsewhere
  const out = tryGit('diff', '--name-status', '--no-renames', '-z', base, head)
  if (out === null) return null
  const parts = out.split('\0').filter((p) => p !== '')
  const files = []
  for (let i = 0; i < parts.length; i += 2) files.push(parts[i + 1])
  return files
}

function mainRef() {
  if (tryGit('rev-parse', '--verify', '--quiet', 'origin/main^{commit}') !== null) return 'origin/main'
  if (tryGit('fetch', '--quiet', 'origin', 'main') === null) return null
  return tryGit('rev-parse', '--verify', '--quiet', 'FETCH_HEAD^{commit}') !== null ? 'FETCH_HEAD' : null
}

function range(env) {
  const head = env.COMMIT_REF
  if (!head) return { reason: 'COMMIT_REF is not set' }

  if (env.CONTEXT === 'deploy-preview') {
    const main = mainRef()
    if (!main) return { reason: 'no main to compare with' }
    const base = tryGit('merge-base', main, head)?.trim()
    if (!base) return { reason: `no merge base of ${main} and ${head}` }
    return { base, head }
  }

  if (env.CONTEXT === 'production') {
    const base = env.CACHED_COMMIT_REF
    if (!base) return { reason: 'CACHED_COMMIT_REF is not set' }
    if (base === head) return { reason: 'CACHED_COMMIT_REF equals COMMIT_REF' }
    if (tryGit('merge-base', '--is-ancestor', base, head) === null) {
      return { reason: 'CACHED_COMMIT_REF is not an ancestor of COMMIT_REF' }
    }
    return { base, head }
  }

  return { reason: `context ${env.CONTEXT || '(unset)'} always builds` }
}

function decide(env) {
  const r = range(env)
  if (!r.base) return { exit: BUILD, reason: r.reason }
  const files = changedFiles(r.base, r.head)
  if (files === null) return { exit: BUILD, reason: `git diff ${r.base}..${r.head} failed` }
  if (files.length === 0) return { exit: BUILD, reason: 'no changed files found' }
  const app = files.filter((f) => !isDocsOnlyPath(f))
  if (app.length > 0) return { exit: BUILD, reason: `app files changed: ${app.slice(0, 5).join(', ')}` }
  return { exit: SKIP, reason: `only docs changed (${files.length} files)` }
}

const { exit, reason } = decide(process.env)
console.log(`netlify-ignore: ${exit === SKIP ? 'skip' : 'build'}: ${reason}`)
process.exit(exit)
