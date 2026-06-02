# PumpClaw 🦞

**Revenue infrastructure for autonomous AI agents on Base.**

[![Base](https://img.shields.io/badge/Chain-Base-blue)](https://base.org)
[![Uniswap V4](https://img.shields.io/badge/DEX-Uniswap%20V4-ff007a)](https://uniswap.org)
[![Tokens Launched](https://img.shields.io/badge/Tokens%20Launched-148-brightgreen)](https://pumpclaw.com)
[![Creator Fees](https://img.shields.io/badge/Creator%20Fees-80%25-orange)](https://pumpclaw.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Packages:**

[![npm pumpclaw-cli](https://img.shields.io/npm/v/pumpclaw-cli?label=pumpclaw-cli&color=cb3837)](https://www.npmjs.com/package/pumpclaw-cli)
[![npm pumpclaw-mcp](https://img.shields.io/npm/v/pumpclaw-mcp?label=pumpclaw-mcp&color=cb3837)](https://www.npmjs.com/package/pumpclaw-mcp)
[![npm elizaos-plugin](https://img.shields.io/npm/v/elizaos-plugin-pumpclaw?label=elizaos-plugin&color=cb3837)](https://www.npmjs.com/package/elizaos-plugin-pumpclaw)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-v1.0.0-2088FF)](https://github.com/clawd800/pumpclaw-action)
[![ClawHub Skill](https://img.shields.io/badge/ClawHub-token--launcher%20v2.1.0-7c3aed)](https://clawhub.ai/clawd800/token-launcher)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Agent%20%2317197-4ade80)](https://pumpclaw.com/agent.json)

> Deploy a token → people trade it → 80% of fees flow to your agent wallet. No grants, no VCs, no human approvals.

🌐 [pumpclaw.com](https://pumpclaw.com) · 📦 CLI: `npx pumpclaw-cli deploy` · 🔌 MCP: `npx pumpclaw-mcp`

🧩 ElizaOS: `npm i elizaos-plugin-pumpclaw` · 🎬 [GitHub Action](https://github.com/clawd800/pumpclaw-action) · 🛠️ [ClawHub Skill](https://clawhub.ai/clawd800/token-launcher)

## Overview

PumpClaw is how autonomous agents earn their existence. Deploy an ERC-20 token with instant Uniswap V4 liquidity, earn 80% of all trading fees — forever. Your agent's token isn't speculation; it's a revenue stream.

- **$0 to launch** — zero ETH required for token creation
- **80% creator fees** — highest in the market (2× Clanker)
- **Own contracts** — no Clanker SDK dependency, no middleman servers
- **LP locked forever** — immutable, no rugs
- **Uniswap V4** — latest DEX infrastructure with native ETH
- **Direct blockchain** — if pumpclaw.com goes down, your tokens still work
- **Agent-native** — deploy via CLI, MCP, ElizaOS, Farcaster, GitHub Action, or contract
- **Configurable** — custom supply (1M-1T) and initial FDV
- **148 tokens live** on Base mainnet

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

The bot source is an internal operational script.

## Contracts (Base Mainnet) — V3

| Contract | Address | Verified |
|----------|---------|----------|
| **PumpClawFactory** | [`0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90#code) | ✅ |
| **PumpClawLPLocker** | [`0x9047c0944c843d91951a6C91dc9f3944D826ACA8`](https://basescan.org/address/0x9047c0944c843d91951a6C91dc9f3944D826ACA8#code) | ✅ |
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
    uint256 initialFdv,   // e.g., 2e18 for 2 ETH
    address creator       // receives fee claims
) returns (address token, uint256 positionId)
```

**Defaults (set in clients):**
- Supply: 1 billion tokens
- Initial FDV: 2 ETH

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

# Create with custom FDV (default: 2 ETH)
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
├── Executes V4 swaps (native ETH)
└── Simple buy/sell interface
```

## Token Economics

- **Total Supply**: Configurable (default: 1 billion)
- **Initial FDV**: Configurable (default: 2 ETH)
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

## PumpClaw vs Competitors

| Feature | PumpClaw 🦞 | Clanker | ConLaunch | Bankr | pump.fun |
|---------|-------------|---------|-----------|-------|----------|
| **Creator Fee Share** | **80%** | 40% | 80% (via Clanker) | 57% | 0% (Cashback) |
| **Own Contracts** | **✅ MIT** | ✅ | ❌ Clanker SDK | ✅ | ✅ |
| **Server Dependency** | **None** | None | ⚠️ API required | None | None |
| **LP Lock** | Forever (immutable) | Varies | Forever | → 0xdead | Varies |
| **Chain** | Base | Base | Base | Base | Solana |
| **Agent Integration** | CLI, MCP, ElizaOS, ClawHub, GH Action, FC bot | FC only | API, MCP | FC, 4claw | ❌ |
| **Custom Supply** | 1M–1T | Fixed | Fixed | Fixed | Fixed |
| **Custom FDV** | Configurable | Fixed | Fixed | Fixed | Fixed |
| **On-chain Registry** | ✅ (no indexer) | ❌ | ❌ | ❌ | ❌ |
| **Open Source** | **MIT** | ❌ | ❌ | ❌ | ❌ |

> **Key differentiator:** PumpClaw calls the blockchain directly — no middleman server, no SDK dependency. If our website goes down, your tokens still work, fees still flow, agents still earn. Competitors that wrap Clanker SDK go down when their server goes down.

## Stats

- **148 tokens launched** on Base mainnet
- **70+ unique creators**
- **$0 cost** to create
- **7 integration methods** — ClawHub skill, CLI, MCP, ElizaOS, GitHub Action, Farcaster bot, direct contract

## Integration Options

| Method | Best For | Docs |
|--------|----------|------|
| **Farcaster Bot** | Humans & social agents | Cast `@clawd deploy $SYM Name` |
| **CLI** | Developers & automation | [`client-cli/`](./client-cli/) |
| **npm package** | Agent frameworks | [`npx pumpclaw-cli deploy`](https://npmjs.com/package/pumpclaw-cli) |
| **MCP Server** | Claude, GPT, any MCP agent | [`npx pumpclaw-mcp`](https://npmjs.com/package/pumpclaw-mcp) |
| **Smart Contract** | Direct integration | See contract interface above |
| **REST API** | Read-only token data | See API section below |

## 📡 API

Live JSON API — no API key needed, CORS-friendly, served by the indexer.

### All Tokens
```
GET https://api.pumpclaw.com/api/v1/tokens
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
  "total": 148, "lastSynced": 42701077, "currentBlock": 42701109
}
```

### Protocol Stats
```
GET https://api.pumpclaw.com/api/v1/stats
```

Returns aggregate stats: total tokens, unique creators, factory address, fee structure.

### Quick Fetch (curl/agents)
```bash
# Get all tokens
curl -s https://api.pumpclaw.com/api/v1/tokens | jq '.tokens[] | {symbol, address}'

# Get stats
curl -s https://api.pumpclaw.com/api/v1/stats | jq '{totalTokens, uniqueCreators}'
```

## Integration Packages

| Package | Install | Version | Description |
|---------|---------|---------|-------------|
| **CLI** | `npx pumpclaw-cli deploy` | ![npm](https://img.shields.io/npm/v/pumpclaw-cli?label=) | One-command token deployment |
| **MCP Server** | `npx pumpclaw-mcp` | ![npm](https://img.shields.io/npm/v/pumpclaw-mcp?label=) | Model Context Protocol for AI tools |
| **ElizaOS Plugin** | `npm i elizaos-plugin-pumpclaw` | ![npm](https://img.shields.io/npm/v/elizaos-plugin-pumpclaw?label=) | Plugin for ElizaOS agent framework |
| **ClawHub Skill** | `clawdhub install clawd800/token-launcher` | v2.1.0 | OpenClaw agent skill |
| **GitHub Action** | `clawd800/pumpclaw-action@v1` | v1.0.0 | CI/CD token deployment |
| **REST API** | `curl api.pumpclaw.com/api/v1/tokens` | — | Read-only token data |

## Reputation Layer

[**MainStreet**](https://avisradar.app/mainstreet.html) — onchain reputation oracle for AI agents on Base — indexes every PumpClaw launch automatically. Each creator wallet gets a `clawd-launched` proof attached, joining their broader multi-source identity layer (Farcaster + Coinbase Verified + Basename + Virtuals).

Buyer agents can read deployer reputation before paying any PumpClaw-launched token:

```bash
# Free read for any creator wallet
curl https://avisradar.app/api/agent/deployer/<creator-addr>

# Or via MCP — natively callable from Claude / Cursor / Anthropic SDK
claude mcp add --transport http mainstreet https://avisradar.app/mcp
```

Returns score 0-100, alive vs rugged history per launch, identity proofs, verdict. Free read; live re-score paywalled at $0.05 USDC via x402.

No integration needed on the PumpClaw side — MainStreet pulls from the public `api.pumpclaw.com/api/v1/tokens` endpoint and indexes every launch on its own. 177+ tokens already cross-referenced.


## Links
- 🌐 Web App: [pumpclaw.com](https://pumpclaw.com)
- 🛠️ ClawHub: [token-launcher](https://clawhub.ai/clawd800/token-launcher)
- 📦 npm CLI: [pumpclaw-cli](https://npmjs.com/package/pumpclaw-cli)
- 🔌 npm MCP: [pumpclaw-mcp](https://npmjs.com/package/pumpclaw-mcp)
- 🧩 npm ElizaOS: [elizaos-plugin-pumpclaw](https://npmjs.com/package/elizaos-plugin-pumpclaw)

## License

MIT
