#!/usr/bin/env node
// Verifies the skills repo. Run in CI on every push and daily; `--offline` skips the live checks.
//   1. frontmatter: name (matches folder), description, allowed-tools
//   2. no secrets in any tracked file
//   3. SSHSIG signatures of every SKILL.md and SHA256SUMS verify against keys/allowed_signers
//   4. live (network): allowed-tools exist in the published MCP tool catalog; skipcalls.com
//      serves byte-identical SKILL.md files and signatures; index.json lists every skill
//      with the matching sha256 digest.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ROOT,
  SIGNATURE_NAMESPACE,
  SIGNER_IDENTITY,
  SITE,
  SKILLS_BASE_URL,
  checksumsText,
  listSkills,
  sha256,
} from './lib.mjs'

const offline = process.argv.includes('--offline')
const errors = []
const fail = (msg) => errors.push(msg)
const skills = listSkills()
if (skills.length === 0) fail('no skills found under skills/')

// 1. Frontmatter
for (const s of skills) {
  const fm = s.frontmatter
  if (!fm) {
    fail(`${s.relPath}: missing --- frontmatter ---`)
    continue
  }
  if (fm.__invalidLine) fail(`${s.relPath}: unparseable frontmatter line: ${fm.__invalidLine}`)
  const keys = Object.keys(fm).filter((k) => k !== '__invalidLine')
  for (const k of keys) if (!['name', 'description', 'allowed-tools', 'license', 'compatibility'].includes(k)) fail(`${s.relPath}: unknown frontmatter key "${k}"`)
  if (fm.name !== s.name) fail(`${s.relPath}: name "${fm.name}" must equal folder "${s.name}"`)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name ?? '') || fm.name.length > 64) fail(`${s.relPath}: invalid name`)
  if (!fm.description || fm.description.length > 1024) fail(`${s.relPath}: description must be 1-1024 chars`)
  if (!fm['allowed-tools']) fail(`${s.relPath}: allowed-tools is required`)
  if (!s.bytes.toString('utf8').endsWith('\n')) fail(`${s.relPath}: must end with a newline`)
}

// 2. Secrets
const SECRET_PATTERNS = [
  ['private key block', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  // base64 of "openssh-key-v1", split so this file does not match itself
  ['OpenSSH private key', new RegExp(['b3BlbnNz', 'aC1rZXktdjE'].join(''))],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['OpenAI/Anthropic key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/],
  ['Stripe key', /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/],
  ['Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Twilio key', /\b(?:AC|SK)[0-9a-f]{32}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['bearer token', /Bearer\s+[A-Za-z0-9._~+/-]{24,}/],
]
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean)
for (const file of tracked) {
  const text = readFileSync(join(ROOT, file), 'utf8')
  for (const [label, re] of SECRET_PATTERNS) if (re.test(text)) fail(`${file}: looks like a secret (${label})`)
}

// 3. Signatures
const allowedSigners = join(ROOT, 'keys', 'allowed_signers')
const verifySig = (label, sigPath, data) => {
  if (!existsSync(sigPath)) return fail(`${label}: missing signature ${sigPath.replace(ROOT + '/', '')}`)
  try {
    execFileSync('ssh-keygen', ['-Y', 'verify', '-f', allowedSigners, '-I', SIGNER_IDENTITY, '-n', SIGNATURE_NAMESPACE, '-s', sigPath], {
      input: data,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (e) {
    fail(`${label}: signature does not verify (${String(e.stderr || e.message).trim()})`)
  }
}
for (const s of skills) verifySig(s.relPath, s.sigPath, s.bytes)
const sums = checksumsText(skills)
const sumsPath = join(ROOT, 'SHA256SUMS')
if (!existsSync(sumsPath) || readFileSync(sumsPath, 'utf8') !== sums) fail('SHA256SUMS is stale: run node scripts/sign.mjs')
else verifySig('SHA256SUMS', join(ROOT, 'SHA256SUMS.sig'), Buffer.from(sums))

// 4. Live checks
async function fetchBytes(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'skipcalls-agent-skills-verify' } })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
async function live() {
  const catalog = JSON.parse((await fetchBytes(`${SITE}/.well-known/mcp.json`)).toString('utf8'))
  const toolNames = new Set(catalog.tools.map((t) => t.name))
  for (const s of skills) {
    for (const tool of (s.frontmatter?.['allowed-tools'] ?? '').split(/\s+/).filter(Boolean)) {
      if (!toolNames.has(tool)) fail(`${s.relPath}: allowed-tools "${tool}" is not in ${SITE}/.well-known/mcp.json`)
    }
    const served = await fetchBytes(s.url)
    if (!served.equals(s.bytes)) fail(`${s.url}: bytes differ from ${s.relPath} (live sha256 ${sha256(served)})`)
    const servedSig = await fetchBytes(`${s.url}.sig`)
    if (existsSync(s.sigPath) && !servedSig.equals(readFileSync(s.sigPath))) fail(`${s.url}.sig: differs from repo signature`)
  }
  const index = JSON.parse((await fetchBytes(`${SKILLS_BASE_URL}/index.json`)).toString('utf8'))
  const byName = new Map(index.skills.map((e) => [e.name, e]))
  for (const s of skills) {
    const entry = byName.get(s.name)
    if (!entry) fail(`index.json: missing skill "${s.name}"`)
    else {
      if (entry.digest !== `sha256:${s.sha256}`) fail(`index.json: ${s.name} digest ${entry.digest} != sha256:${s.sha256}`)
      if (entry.url !== s.url) fail(`index.json: ${s.name} url ${entry.url} != ${s.url}`)
    }
  }
  for (const name of byName.keys()) if (!skills.some((s) => s.name === name)) fail(`index.json: lists "${name}", which is not in this repo`)
  const liveSums = await fetchBytes(`${SKILLS_BASE_URL}/SHA256SUMS`)
  if (liveSums.toString('utf8') !== sums) fail('live SHA256SUMS differs from repo')
}

if (!offline) {
  try {
    await live()
  } catch (e) {
    fail(`live check failed: ${e.message}`)
  }
}

if (errors.length) {
  console.error(`verify: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`verify: ${skills.length} skills OK${offline ? ' (offline)' : ' (live bytes, digests and signatures match skipcalls.com)'}`)
