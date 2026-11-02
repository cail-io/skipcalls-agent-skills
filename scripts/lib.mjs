// Shared helpers for sign.mjs, verify.mjs and export-landing.mjs. Node 20+, no dependencies.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SITE = 'https://skipcalls.com'
export const SKILLS_BASE_URL = `${SITE}/.well-known/agent-skills`
export const REPOSITORY = 'https://github.com/cail-io/skipcalls-agent-skills'
export const SIGNER_IDENTITY = 'skills@skipcalls.com'
export const SIGNATURE_NAMESPACE = 'skipcalls-agent-skills'

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

export function listSkills() {
  const dir = join(ROOT, 'skills')
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort()
    .map((name) => {
      const path = join(dir, name, 'SKILL.md')
      const bytes = readFileSync(path)
      return {
        name,
        relPath: `skills/${name}/SKILL.md`,
        path,
        bytes,
        sha256: sha256(bytes),
        sigPath: join(ROOT, 'signatures', name, 'SKILL.md.sig'),
        url: `${SKILLS_BASE_URL}/${name}/SKILL.md`,
        frontmatter: parseFrontmatter(bytes.toString('utf8')),
      }
    })
}

// Minimal parser for the single-line `key: value` frontmatter these skills use.
export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split('\n')) {
    const m = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line)
    if (!m) return { __invalidLine: line }
    fields[m[1]] = m[2].trim()
  }
  return fields
}

// sha256sum-compatible manifest of every SKILL.md, signed as one file.
export function checksumsText(skills) {
  return skills.map((s) => `${s.sha256}  ${s.relPath}\n`).join('')
}
