#!/bin/bash
# PumpClaw Market Cap Tracker
# TODO: Implement actual price fetching from Uniswap V4

echo "=== PumpClaw Token Stats ==="
echo "Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

cd ~/clawd/projects/pumpclaw/client-cli

# 토큰 수
TOKEN_COUNT=$(npx tsx src/cli.ts list 2>/dev/null | grep -c 'Token:')
echo "Total Tokens: $TOKEN_COUNT"

# 각 토큰 리스트 (FDV는 초기값, 실제 mcap 아님)
echo ""
echo "Tokens:"
npx tsx src/cli.ts list 2>/dev/null | grep -E "(^[A-Z]|Token:|FDV:)" | head -30

echo ""
echo "Note: FDV shown is initial launch value (20 ETH each)"
echo "Actual market cap requires Uniswap V4 pool price query (TODO)"
