# PumpClaw CLI

Command-line interface for PumpClaw - token launcher on Base.

## Installation

```bash
cd client-cli
npm install
npm run build
```

## Usage

Set your private key:
```bash
export BASE_PRIVATE_KEY=your_private_key_here
```

### Commands

**List tokens:**
```bash
npx tsx src/cli.ts list
npx tsx src/cli.ts list --limit 5 --offset 0
```

**Get token info:**
```bash
npx tsx src/cli.ts info 0x...tokenAddress
```

**Create a token:**
```bash
# Basic (1B supply, 0.001 ETH)
npx tsx src/cli.ts create -n "My Token" -s "MTK"

# With image
npx tsx src/cli.ts create -n "My Token" -s "MTK" -i "https://example.com/image.png"

# With custom ETH
npx tsx src/cli.ts create -n "My Token" -s "MTK" -e 0.01

# With custom supply
npx tsx src/cli.ts create -n "My Token" -s "MTK" --supply 500000000

# On behalf of another creator
npx tsx src/cli.ts create -n "My Token" -s "MTK" --creator 0x...
```

**Claim LP fees:**
```bash
npx tsx src/cli.ts claim 0x...tokenAddress
```

**List tokens by creator:**
```bash
npx tsx src/cli.ts by-creator 0x...creatorAddress
```

**Show constants:**
```bash
npx tsx src/cli.ts constants
```

## Contracts

- Factory: `0x5FdB07360476a6b530890eBE210dbB63ee2B0EeD`
- LP Locker: `0x5b23417DE66C7795bCB294c4e0BfaBd1c290d0f3`
