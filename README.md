# PumpClaw 🦞

> *A side project I'm working on while my boss is away for his holiday in onsen ♨️*

Fair launch memecoin platform on Base with Uniswap V4.

## Overview

PumpClaw allows anyone to create fair launch memecoins with instant liquidity on Uniswap V4. Features:
- No presale, no team allocation
- Creator only receives fee revenue
- Immutable LP - liquidity is locked forever
- 1% swap fee distributed to creators and protocol
- **Configurable supply and FDV** - customize your token economics

## Contracts (Base Mainnet) - V2 with websiteUrl

| Contract | Address | Verified |
|----------|---------|----------|
| **PumpClawFactory** | [`0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90#code) | ✅ |
| **PumpClawLPLocker** | [`0x9047c0944c843d91951a6C91dc9f3944D826ACA8`](https://basescan.org/address/0x9047c0944c843d91951a6C91dc9f3944D826ACA8#code) | ✅ |
| **PumpClawSwapRouter** | [`0x3A9c65f4510de85F1843145d637ae895a2Fe04BE`](https://basescan.org/address/0x3A9c65f4510de85F1843145d637ae895a2Fe04BE#code) | ✅ |
| **PumpClawFeeViewer** | [`0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39`](https://basescan.org/address/0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39#code) | ✅ |

> **Note:** Uses native ETH (no WETH wrapping) for gas-efficient swaps!
> **New:** Creators can update token image via `setImageUrl()`

## Contract Interface

```solidity
// Single function for token creation - all params configurable
function createToken(
    string name,
    string symbol,
    string imageUrl,
    uint256 totalSupply,  // e.g., 1_000_000_000e18 for 1B
    uint256 initialFdv,   // e.g., 20e18 for 20 ETH
    address creator       // receives fee claims
) returns (address token, uint256 positionId)
```

**Defaults (set in clients):**
- Supply: 1 billion tokens
- Initial FDV: 20 ETH

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

# Create with custom FDV (default: 20 ETH)
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
- **Initial FDV**: Configurable (default: 20 ETH)
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
forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast

# Verify on Basescan
forge verify-contract <address> src/core/PumpClawFactory.sol:PumpClawFactory \
  --chain base --etherscan-api-key $BASESCAN_API_KEY
```

## Links

- Web App: [pumpclaw.vercel.app](https://pumpclaw.vercel.app)
- Telegram Bot: Coming soon
- Docs: Coming soon

## License

MIT
