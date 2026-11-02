# SkipCalls agent skills

Agent skills for [SkipCalls](https://skipcalls.com), the AI phone receptionist
for small businesses. They teach Claude Code, Codex, Cursor and other
skill-aware agents how to use the SkipCalls MCP server
(`https://be.skipcalls.com/mcp`, OAuth 2.1 with PKCE and Dynamic Client
Registration) safely.

| Skill | Job |
| --- | --- |
| [`skipcalls`](skills/skipcalls/SKILL.md) | Connect, verify access, first-time setup, call forwarding, plan |
| [`skipcalls-receptionist`](skills/skipcalls-receptionist/SKILL.md) | Greetings, instructions, voice, Business Profile, Knowledge Base, scenarios, tasks, transfers, Lead Alerts, booking settings, estimates, Agent Functions |
| [`skipcalls-calls-leads`](skills/skipcalls-calls-leads/SKILL.md) | Calls, transcripts, recording links, contacts, Needs you follow-ups, reminders, appointments |
| [`skipcalls-messaging`](skills/skipcalls-messaging/SKILL.md) | SMS and email threads, texts, call follow-ups, outbound AI calls |

Every skill carries the same behavior rules: never guess IDs, read the
account and business first, confirm right before every write, treat
"accepted" as not yet delivered (read the result back), and share recordings
as links. `allowed-tools` in each frontmatter lists the SkipCalls MCP tool
names the skill may use; clients may prefix them with the server name.

## Install

```bash
# all skills, globally, for every detected agent
npx skills add cail-io/skipcalls-agent-skills -g -y

# one agent only (codex, claude-code, cursor, ...)
npx skills add cail-io/skipcalls-agent-skills -g -a codex -y

# one skill
npx skills add cail-io/skipcalls-agent-skills --skill skipcalls-messaging
```

Then connect the MCP server in your client:

```bash
claude mcp add --transport http skipcalls https://be.skipcalls.com/mcp
codex mcp add skipcalls --url https://be.skipcalls.com/mcp
```

The same files are published at
`https://skipcalls.com/.well-known/agent-skills/index.json`
(Agent Skills discovery, one entry per skill with a sha256 digest).

## Verify what you install

Each `SKILL.md` and the `SHA256SUMS` manifest are signed with an ed25519
OpenSSH key (SSHSIG, namespace `skipcalls-agent-skills`, identity
`skills@skipcalls.com`).

- Public key: [`keys/skipcalls-skills.pub`](keys/skipcalls-skills.pub), also at
  `https://skipcalls.com/.well-known/agent-skills/signing-key.pub`
- Allowed signers: `https://skipcalls.com/.well-known/agent-skills/allowed_signers`
- Signatures: `signatures/<skill>/SKILL.md.sig` here, and
  `https://skipcalls.com/.well-known/agent-skills/<skill>/SKILL.md.sig`

```bash
base=https://skipcalls.com/.well-known/agent-skills
curl -fsS $base/allowed_signers -o allowed_signers
curl -fsS $base/skipcalls/SKILL.md -o SKILL.md
curl -fsS $base/skipcalls/SKILL.md.sig -o SKILL.md.sig
ssh-keygen -Y verify -f allowed_signers -I skills@skipcalls.com \
  -n skipcalls-agent-skills -s SKILL.md.sig < SKILL.md
```

## Source of truth and publishing

This repository is the source of truth. skipcalls.com serves the exact bytes
from a generated module (`app/.well-known/agent-skills/_generated/skills.ts` in
the site repo); nobody edits the site copy by hand.

1. Edit `skills/<name>/SKILL.md`.
2. `node scripts/sign.mjs` (signs with `~/.secrets/skipcalls-skills-signing`
   or `$SKILLS_SIGNING_KEY`; the private key is never committed).
3. `node scripts/verify.mjs --offline`, then commit.
4. `node scripts/export-landing.mjs <site checkout>` and ship the site change.
5. Push here. CI (`.github/workflows/verify.yml`, also daily) runs
   `scripts/verify.mjs`: frontmatter, secret patterns, signatures, every
   `allowed-tools` name present in `https://skipcalls.com/.well-known/mcp.json`,
   and byte-for-byte equality with the live skipcalls.com files and index
   digests. A red run means the site and this repo have drifted.

## MCP Registry

The server is listed in the official MCP Registry as `com.skipcalls/skipcalls`
(https://registry.modelcontextprotocol.io/v0/servers?search=com.skipcalls).
[`registry/server.json`](registry/server.json) is the published manifest. To
publish a new version, bump `version` and run from `registry/`:

```bash
mcp-publisher login http --domain skipcalls.com --private-key "$(openssl pkey -in ~/.secrets/skipcalls-mcp-registry-ed25519.pem -outform DER | tail -c 32 | xxd -p -c 64)"
mcp-publisher publish
```

The matching public key is served at `https://skipcalls.com/.well-known/mcp-registry-auth`.

## Support

team@skipcalls.com · https://app.skipcalls.com/support

## License

MIT
