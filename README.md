# PumpClaw 🐱

Fair launch memecoin platform on Base with Uniswap V4.

## Overview

PumpClaw allows anyone to create fair launch memecoins with instant liquidity on Uniswap V4. Features:
- No presale, no team allocation
- Creator only receives fee revenue
- Immutable LP - liquidity is locked forever
- 1% swap fee distributed to creators and protocol

## Contracts (Base Mainnet)

| Contract | Address | Verified |
|----------|---------|----------|
| **PumpClawFactory** | [`0x8B37984800bA8a2f050cB6FfAf082a7c34C1F243`](https://basescan.org/address/0x8B37984800bA8a2f050cB6FfAf082a7c34C1F243#code) | ✅ |
| **PumpClawLPLocker** | [`0x1aC10d4F4f8d37C5A4cC5032188Ec11c98F3998F`](https://basescan.org/address/0x1aC10d4F4f8d37C5A4cC5032188Ec11c98F3998F#code) | ✅ |
| SwapRouter | [`0x0c7eefbf31597254fe72d0fbb19667d5cd5d5752`](https://basescan.org/address/0x0c7eefbf31597254fe72d0fbb19667d5cd5d5752) | - |

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

# Buy tokens with ETH
npx tsx src/cli.ts buy <token_address> -e 0.001

# Sell tokens for ETH
npx tsx src/cli.ts sell <token_address> -a 1000000

# List all created tokens
npx tsx src/cli.ts list
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

- **Total Supply**: 1 billion tokens
- **Initial Price**: ~0.000000001 ETH per token
- **LP Fee**: 1% on all swaps
- **Fee Distribution**: 0.5% to creator, 0.5% to protocol

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
```

## Links

- Web App: Coming soon
- Telegram Bot: Coming soon
- Docs: Coming soon

## License

MIT
