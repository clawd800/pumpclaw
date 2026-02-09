# 🦞 PumpClaw Farcaster Deploy Bot

Deploy tokens on Base by mentioning @clawd on Farcaster.

## Usage

Cast on Farcaster:
```
@clawd deploy $COOL Cool Token
@clawd launch $MOON MoonCoin  
@clawd create a token called "Super Doge" $SDOGE
```

The bot will:
1. Parse your token name and symbol
2. Deploy on PumpClaw (Uniswap V4, LP locked forever)
3. Reply with token address + links
4. Set YOU as the creator (80% of trading fees)

## Requirements

- Must have a **verified Ethereum address** on Farcaster
- Keywords: deploy, launch, create, mint, make
- Include `$SYMBOL` (ticker) in your cast

## Running

```bash
# Test mode (no actual deploys)
npm run dry-run

# Single poll
npm run poll-once

# Production (continuous polling)
npm start
```

## Safety

- Rate limited: 3 deploys/hour, 10/day
- DRY_RUN mode for testing
- Requires verified ETH address (prevents spam)
- Gas costs ~0.001 ETH per deploy on Base

## Architecture

```
mention detected → parse request → check rate limits → 
  → deploy via factory contract → reply with results
```
