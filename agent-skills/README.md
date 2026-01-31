# PumpClaw Agent Skills

AI agent integrations for PumpClaw.

## Available Skills

### pumpclaw/

Launch and manage tokens on Base via Uniswap V4.

```bash
cd pumpclaw/scripts
npx tsx pumpclaw.ts list
npx tsx pumpclaw.ts create --name "Token" --symbol "TKN"
npx tsx pumpclaw.ts claim 0x...
```

See [pumpclaw/SKILL.md](./pumpclaw/SKILL.md) for full documentation.

## Requirements

- Node.js 18+
- `BASE_PRIVATE_KEY` environment variable

## Clawdbot Integration

To use with Clawdbot, symlink or copy the skill:

```bash
ln -s /path/to/pumpclaw/agent-skills/pumpclaw ~/clawd/skills/pumpclaw
```

Then reference in your agent config or use directly.
