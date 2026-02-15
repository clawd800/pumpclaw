# PumpClaw 🦞

[![Base](https://img.shields.io/badge/Chain-Base-blue)](https://base.org)
[![Uniswap V4](https://img.shields.io/badge/DEX-Uniswap%20V4-ff007a)](https://uniswap.org)
[![Tokens Launched](https://img.shields.io/badge/Tokens%20Launched-117-brightgreen)](https://pumpclaw.com)
[![Unique Creators](https://img.shields.io/badge/Creators-50+-blue)](https://pumpclaw.com)
[![npm CLI](https://img.shields.io/npm/dw/pumpclaw-cli?label=CLI%20downloads)](https://www.npmjs.com/package/pumpclaw-cli)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Free token launcher for AI agents on Base with Uniswap V4.**

> 🤖 Deploy a token in one Farcaster cast: `@clawd deploy $TICKER TokenName`
>
> 🌐 Website: [pumpclaw.com](https://pumpclaw.com) · 📦 CLI: `npx pumpclaw-cli deploy` · 🔌 MCP: `npx pumpclaw-mcp` · 🧩 ElizaOS: `npm i elizaos-plugin-pumpclaw` · 🎬 [GitHub Action](https://github.com/clawd800/pumpclaw-action) · ⚖️ [Compare vs Clanker](https://pumpclaw.com/compare)

## Overview

PumpClaw allows anyone — humans or AI agents — to create fair launch tokens with instant liquidity on Uniswap V4. Zero cost to deploy.

- **Free to launch** — no ETH required for token creation
- **80% creator fees** — highest in the market (vs 40% on competitors)
- **LP locked forever** — no rugs, no rug-pulls
- **Uniswap V4** — latest DEX infrastructure
- **Agent-native** — deploy via Farcaster mention, CLI, or smart contract
- **Configurable** — custom supply (1M-1T) and initial FDV
- **Proof-of-origin** — on-chain `websiteUrl` links tokens to their source

## 🤖 Deploy via Farcaster

The easiest way to launch a token — just cast on Farcaster:

```
@clawd deploy $COOL Cool Token
@clawd launch $MOON MoonCoin
@clawd create a token called "Super Doge" $SDOGE
```

The bot will:
1. Parse your token name and symbol
2. Deploy on PumpClaw (Uniswap V4, LP locked forever)
3. Reply with token address + swap links
4. Set **you** as the creator (80% of trading fees go to you)

**Requirements:** Must have a verified Ethereum address on your Farcaster profile.

See [`farcaster-bot/`](./farcaster-bot/) for the bot source code.

## Contracts (Base Mainnet) — V3

| Contract | Address | Verified |
|----------|---------|----------|
| **PumpClawFactory** | [`0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90#code) | ✅ |
| **PumpClawLPLocker** | [`0x6e4D241957074475741Ff42ec352b8b00217Bf5d`](https://basescan.org/address/0x6e4D241957074475741Ff42ec352b8b00217Bf5d#code) | ✅ |
| **PumpClawSwapRouter** | [`0x3A9c65f4510de85F1843145d637ae895a2Fe04BE`](https://basescan.org/address/0x3A9c65f4510de85F1843145d637ae895a2Fe04BE#code) | ✅ |
| **PumpClawFeeViewer** | [`0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39`](https://basescan.org/address/0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39#code) | ✅ |

> **Note:** Uses native ETH (no WETH wrapping) for gas-efficient swaps.
> Creators can set proof-of-origin `websiteUrl` and update image via `setImageUrl()`.

## Contract Interface

```solidity
// Single function for token creation - all params configurable
function createToken(
    string name,
    string symbol,
    string imageUrl,
    string websiteUrl,
    uint256 totalSupply,  // e.g., 1_000_000_000e18 for 1B
    uint256 initialFdv,   // e.g., 20e18 for 20 ETH
    address creator       // receives fee claims
) returns (address token, uint256 positionId)
```

**Defaults (set in clients):**
- Supply: 1 billion tokens
- Initial FDV: 10 ETH

## CLI Usage

```bash
cd client-cli
npm install

# Set private key
export PRIVATE_KEY=0x...

# View factory info
npx tsx src/cli.ts info

# Create a new token (V4: no ETH required!)
npx tsx src/cli.ts create --name "My Token" --symbol "MTK"

# Create with custom FDV (default: 10 ETH)
npx tsx src/cli.ts create --name "My Token" --symbol "MTK" --fdv 50

# Create with custom supply
npx tsx src/cli.ts create --name "My Token" --symbol "MTK" --supply 21000000

# Buy tokens with ETH
npx tsx src/cli.ts buy <token_address> -e 0.001

# Sell tokens for ETH
npx tsx src/cli.ts sell <token_address> -a 1000000

# List all created tokens
npx tsx src/cli.ts list

# Check pending fees
npx tsx src/cli.ts fees <token_address>

# Claim fees (creator or admin)
npx tsx src/cli.ts claim <token_address>
```

## Shared Module

Common utilities for all clients in `/shared`:

```typescript
import { 
  CONTRACTS, 
  TOKEN_DEFAULTS,
  createClient,
  buildCreateTokenArgs,
  formatSupply,
  getTokenInfo 
} from '../shared';

// Use defaults
const args = buildCreateTokenArgs({
  name: "My Token",
  symbol: "MTK",
  creator: "0x..."
});

// Or customize
const args = buildCreateTokenArgs({
  name: "My Token",
  symbol: "MTK",
  totalSupply: 21_000_000n * 10n ** 18n,  // 21M like Bitcoin
  initialFdv: 100n * 10n ** 18n,           // 100 ETH FDV
  creator: "0x..."
});
```

## Architecture

```
PumpClawFactory
├── Creates PumpClawToken (ERC20)
├── Initializes Uniswap V4 Pool
└── Locks LP in LPLocker

PumpClawSwapRouter
├── Handles WETH wrapping
├── Executes V4 swaps
└── Simple buy/sell interface
```

## Token Economics

- **Total Supply**: Configurable (default: 1 billion)
- **Initial FDV**: Configurable (default: 10 ETH)
- **LP Fee**: 1% on all swaps
- **Fee Distribution**: 80% to creator, 20% to protocol

## Development

```bash
# Install deps
forge install

# Build
forge build

# Test
forge test

# Deploy (requires PRIVATE_KEY env)
# From contracts/ directory:
cd contracts && forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast

# Verify on Basescan
forge verify-contract <address> src/core/PumpClawFactory.sol:PumpClawFactory \
  --chain base --etherscan-api-key $BASESCAN_API_KEY
```

## PumpClaw vs Clanker

| Feature | PumpClaw 🦞 | Clanker |
|---------|-------------|---------|
| **Creator Fee Share** | **80%** | 40% |
| **Launch Cost** | **$0** (free) | Gas fees |
| **DEX** | Uniswap V4 | Uniswap V3 |
| **LP Lock** | Forever (immutable) | Varies |
| **Agent Integration** | CLI, MCP, ElizaOS, Farcaster bot | Farcaster only |
| **Custom Supply** | 1M–1T configurable | Fixed |
| **Custom FDV** | Configurable | Fixed |
| **On-chain Registry** | Yes (no indexer needed) | No |
| **REST API** | Free, CORS, no key | No |
| **Open Source** | MIT | No |

> **TL;DR:** PumpClaw gives creators **2× the fees**, more integration options, and full configurability — all at zero cost.

## Stats

- **117 tokens launched** on Base mainnet
- **50+ unique creators**
- **$0 cost** to create — PumpClaw covers gas
- **6 integration methods** — Farcaster bot, CLI, MCP, ElizaOS, GitHub Action, direct contract

## Integration Options

| Method | Best For | Docs |
|--------|----------|------|
| **Farcaster Bot** | Humans & social agents | [`farcaster-bot/`](./farcaster-bot/) |
| **CLI** | Developers & automation | [`client-cli/`](./client-cli/) |
| **npm package** | Agent frameworks | [`npx pumpclaw-cli deploy`](https://npmjs.com/package/pumpclaw-cli) |
| **MCP Server** | Claude, GPT, any MCP agent | [`npx pumpclaw-mcp`](https://npmjs.com/package/pumpclaw-mcp) |
| **Smart Contract** | Direct integration | See contract interface above |
| **REST API** | Read-only token data | See API section below |

## 📡 API

Static JSON endpoints — no API key needed, CORS-friendly, updated periodically.

### All Tokens
```
GET https://pumpclaw.com/api/v1/tokens.json
```

Returns all tokens with metadata, creator info, trade links, and % purchased:
```json
{
  "tokens": [
    {
      "address": "0x76767891...",
      "name": "PumpClaw",
      "symbol": "PUMPCLAW",
      "imageUrl": "https://i.imgur.com/v9B9SlZ.png",
      "creator": "0x261368f0...",
      "createdAt": "2026-02-01T08:01:45.000Z",
      "percentPurchased": 5.4,
      "links": {
        "pumpclaw": "https://pumpclaw.com/#/token/0x...",
        "trade": "https://matcha.xyz/tokens/base/0x...",
        "basescan": "https://basescan.org/token/0x..."
      }
    }
  ],
  "meta": { "count": 27, "generatedAt": "2026-02-10T..." }
}
```

### Protocol Stats
```
GET https://pumpclaw.com/api/v1/stats.json
```

Returns aggregate stats: total tokens, unique creators, factory address, fee structure.

### Quick Fetch (curl/agents)
```bash
# Get all tokens
curl -s https://pumpclaw.com/api/v1/tokens.json | jq '.tokens[] | {symbol, address}'

# Get stats
curl -s https://pumpclaw.com/api/v1/stats.json | jq '{totalTokens, uniqueCreators}'
```

## Integration Packages

| Package | Install | Description |
|---------|---------|-------------|
| **CLI** | `npx pumpclaw-cli deploy` | One-command token deployment |
| **MCP Server** | `npx pumpclaw-mcp` | Model Context Protocol for AI tools |
| **ElizaOS Plugin** | `npm i elizaos-plugin-pumpclaw` | Plugin for ElizaOS agent framework |
| **REST API** | `curl pumpclaw.com/api/v1/tokens.json` | Read-only token data |

## Links

- Web App: [pumpclaw.com](https://pumpclaw.com)
- npm CLI: [pumpclaw-cli](https://npmjs.com/package/pumpclaw-cli)
- npm MCP: [pumpclaw-mcp](https://npmjs.com/package/pumpclaw-mcp)
- npm ElizaOS: [elizaos-plugin-pumpclaw](https://npmjs.com/package/elizaos-plugin-pumpclaw)
- API: [pumpclaw.com/api/v1/tokens.json](https://pumpclaw.com/api/v1/tokens.json)
- ERC-8004 Agent: [Agent #1144](https://pumpclaw.com/agent.json)

## License

MIT
