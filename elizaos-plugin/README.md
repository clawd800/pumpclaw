# elizaos-plugin-pumpclaw

<div align="center">

**Free token launcher for ElizaOS agents on Base (Uniswap V4)**

[![npm](https://img.shields.io/npm/v/elizaos-plugin-pumpclaw)](https://www.npmjs.com/package/elizaos-plugin-pumpclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Deploy ERC-20 tokens on Base with a single agent command. LP locked forever, 80% trading fees to creator, zero deployment cost.

## Why PumpClaw?

| Feature | PumpClaw | Clanker | pump.fun |
|---------|----------|---------|----------|
| Chain | Base | Base | Solana |
| DEX | Uniswap V4 | Uniswap V3 | Raydium |
| Creator Fee | **80%** | 40% | 0% |
| Deploy Cost | **FREE** | FREE | 0.02 SOL |
| LP | Locked forever | Locked | Migrated |

## Quick Start

```bash
npm install elizaos-plugin-pumpclaw
```

Add to your ElizaOS character config:

```json
{
  "plugins": ["elizaos-plugin-pumpclaw"],
  "settings": {
    "secrets": {
      "PUMPCLAW_PRIVATE_KEY": "0x..."
    }
  }
}
```

That's it. Your agent can now deploy tokens.

## Actions

### CREATE_TOKEN

Deploy a new ERC-20 token on Base via PumpClaw.

**Trigger phrases:**
- "Create a token called DogeClaw with symbol DCLAW"
- "Launch a meme coin called MoonCat, ticker MCAT"
- "Deploy $AGENT AgentToken with 10 billion supply"

**What happens:**
1. Token contract deployed on Base
2. Full-range Uniswap V4 liquidity added
3. LP position locked forever (no rug)
4. Instant trading on Matcha, DexScreener, etc.

**Environment:** Requires `PUMPCLAW_PRIVATE_KEY`

### LIST_PUMPCLAW_TOKENS

Browse tokens created on PumpClaw.

**Trigger phrases:**
- "Show me PumpClaw tokens"
- "List the latest tokens"
- "What tokens have been created?"

**Environment:** None required (read-only)

### GET_PUMPCLAW_TOKEN

Get details about a specific token.

**Trigger phrases:**
- "Get info about 0x5A69..."
- "Check token 0x5A69..."

**Environment:** None required (read-only)

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PUMPCLAW_PRIVATE_KEY` | For CREATE_TOKEN | Hex private key (with or without `0x` prefix) |
| `PUMPCLAW_CREATOR_ADDRESS` | No | Override creator attribution (defaults to signer) |

> ⚠️ The private key is only used to sign the `createToken` transaction. It's never logged or transmitted anywhere except the Base RPC.

## Contract Details

- **Factory**: [`0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90)
- **Chain**: Base (8453)
- **DEX**: Uniswap V4
- **LP**: Full-range, locked forever
- **Fee Split**: 80% creator / 20% protocol
- **Default Supply**: 1 billion tokens
- **Default FDV**: 2 ETH

All contracts are verified on Basescan.

## How It Works

```
User: "Create a token called AgentCoin with symbol ACOIN"
  ↓
ElizaOS routes to CREATE_TOKEN action
  ↓
Plugin calls PumpClaw Factory contract on Base
  ↓
Factory deploys ERC-20 + creates Uniswap V4 pool + locks LP
  ↓
Agent responds with token address + trade links
```

## Also Available

- **CLI**: `npx pumpclaw-cli deploy` — [npm](https://www.npmjs.com/package/pumpclaw-cli)
- **MCP Server**: `npx pumpclaw-mcp` — [npm](https://www.npmjs.com/package/pumpclaw-mcp)
- **Web**: [pumpclaw.com](https://pumpclaw.com)

## Links

- Website: [pumpclaw.com](https://pumpclaw.com)
- GitHub: [clawd800/pumpclaw](https://github.com/clawd800/pumpclaw)
- Factory: [Basescan](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90)

## License

MIT
