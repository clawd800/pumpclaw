# PumpClaw Skill

Launch tokens with instant liquidity on Base via Uniswap V4.

## Overview

PumpClaw is a token launcher that:
- Creates ERC20 tokens with 100% liquidity on Uniswap V4
- Locks LP forever (no rugs)
- Splits trading fees 80% creator / 20% protocol

## Setup

1. Set `BASE_PRIVATE_KEY` in your environment
2. The scripts are in `scripts/`

## Commands

### List tokens
```bash
cd scripts && npx tsx pumpclaw.ts list
npx tsx pumpclaw.ts list --limit 5
```

### Get token info
```bash
npx tsx pumpclaw.ts info <token_address>
```

### Create token
```bash
# Basic (1B supply, 0.001 ETH liquidity)
npx tsx pumpclaw.ts create --name "Token Name" --symbol "TKN"

# With image
npx tsx pumpclaw.ts create --name "Token" --symbol "TKN" --image "https://..."

# Custom ETH
npx tsx pumpclaw.ts create --name "Token" --symbol "TKN" --eth 0.01

# Custom supply (in tokens, not wei)
npx tsx pumpclaw.ts create --name "Token" --symbol "TKN" --supply 500000000

# On behalf of another creator
npx tsx pumpclaw.ts create --name "Token" --symbol "TKN" --creator 0x...
```

### Claim fees
```bash
npx tsx pumpclaw.ts claim <token_address>
```

### Tokens by creator
```bash
npx tsx pumpclaw.ts by-creator <address>
```

## Contract Addresses (Base Mainnet)

| Contract | Address |
|----------|---------|
| Factory | `0x5FdB07360476a6b530890eBE210dbB63ee2B0EeD` |
| LP Locker | `0x5b23417DE66C7795bCB294c4e0BfaBd1c290d0f3` |

## Token Features

- Standard ERC20 with ERC20Permit (gasless approvals)
- Burnable
- Immutable creator address stored on token
- Image URL stored on-chain

## Fee Structure

- LP Fee: 1% on all trades
- Creator: 80% of LP fees
- Protocol: 20% of LP fees
- Anyone can call `claimFees()` - it always distributes correctly

## Example Workflow

1. **Create token:**
   ```bash
   npx tsx pumpclaw.ts create --name "DOGE 2.0" --symbol "DOGE2" --eth 0.01
   ```

2. **Share the token address** - users can trade immediately on Uniswap

3. **Claim fees periodically:**
   ```bash
   npx tsx pumpclaw.ts claim 0x...tokenAddress
   ```
