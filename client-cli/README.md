# PumpClaw CLI

Command-line interface for PumpClaw - token launcher on Base.

## Installation

```bash
cd client-cli
npm install
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
# Basic (1B supply, 20 ETH FDV)
npx tsx src/cli.ts create -n "My Token" -s "MTK"

# With image
npx tsx src/cli.ts create -n "My Token" -s "MTK" -i "https://example.com/image.png"

# With website
npx tsx src/cli.ts create -n "My Token" -s "MTK" -w "https://mytoken.com"

# With custom FDV
npx tsx src/cli.ts create -n "My Token" -s "MTK" -f 50

# With custom supply
npx tsx src/cli.ts create -n "My Token" -s "MTK" --supply 500000000

# On behalf of another creator
npx tsx src/cli.ts create -n "My Token" -s "MTK" --creator 0x...
```

**Check pending fees:**
```bash
npx tsx src/cli.ts fees 0x...tokenAddress
```

**Claim LP fees:**
```bash
npx tsx src/cli.ts claim 0x...tokenAddress
```

**Buy tokens:**
```bash
npx tsx src/cli.ts buy 0x...tokenAddress -e 0.01
```

**Sell tokens:**
```bash
npx tsx src/cli.ts sell 0x...tokenAddress -a 1000000
```

**List tokens by creator:**
```bash
npx tsx src/cli.ts by-creator 0x...creatorAddress
```

**Show constants:**
```bash
npx tsx src/cli.ts constants
```

## Contracts (V2)

| Contract | Address |
|----------|---------|
| Factory | `0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90` |
| LP Locker | `0x9047c0944c843d91951a6C91dc9f3944D826ACA8` |
| Swap Router | `0x3A9c65f4510de85F1843145d637ae895a2Fe04BE` |
| Fee Viewer | `0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39` |
