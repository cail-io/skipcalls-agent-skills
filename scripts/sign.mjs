#!/usr/bin/env node
// Signs every skills/<name>/SKILL.md and the SHA256SUMS manifest with the SkipCalls
// skills key (OpenSSH SSHSIG, ed25519). Run after editing a skill, before committing.
// Key: $SKILLS_SIGNING_KEY or ~/.secrets/skipcalls-skills-signing (never committed).
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { ROOT, SIGNATURE_NAMESPACE, checksumsText, listSkills } from './lib.mjs'

const key = process.env.SKILLS_SIGNING_KEY || join(homedir(), '.secrets', 'skipcalls-skills-signing')
if (!existsSync(key)) {
  console.error(`signing key not found: ${key}`)
  process.exit(1)
}

const sign = (input) =>
  execFileSync('ssh-keygen', ['-q', '-Y', 'sign', '-f', key, '-n', SIGNATURE_NAMESPACE], { input })

const skills = listSkills()
for (const skill of skills) {
  mkdirSync(dirname(skill.sigPath), { recursive: true })
  writeFileSync(skill.sigPath, sign(skill.bytes))
  console.log(`signed ${skill.relPath} sha256:${skill.sha256}`)
}
const sums = checksumsText(skills)
writeFileSync(join(ROOT, 'SHA256SUMS'), sums)
writeFileSync(join(ROOT, 'SHA256SUMS.sig'), sign(Buffer.from(sums)))
console.log('signed SHA256SUMS')
