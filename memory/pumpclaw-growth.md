# PumpClaw Growth Log

## Feb 15, 2026 — 10:00 KST

### Metrics
- **Tokens**: 117 (no change in ~21h, last created Feb 14 04:05 UTC)
- **24h Volume**: $0.20 (1 txn) — essentially dead
- **Gas**: 0.099 ETH
- **Portfolio**: Empty (no holdings)
- **Farcaster mentions**: 0 new

### Key Findings
- **4claw competition confirmed**: 4claw has its own `!clawnch` command routing to a DIFFERENT factory (wallets `0x759a...` and `0x26f5...` are NOT in PumpClaw's registry). 14/15 recent 4claw posts are `!clawnch` requests going through 4claw's native system, not PumpClaw.
- **Growth stall**: Peak was Feb 10-11 (27+35 tokens/day), now 1 token in 2 days
- **Deploy handler working fine**: Returns HEARTBEAT_OK because there genuinely are no new PumpClaw requests
- **Creator concentration**: 37/117 tokens (31%) from one address (`0x2aFb...`) — likely the old 4claw integration

### Strategic Assessment
- Demand dried up. Initial growth was driven by 4claw bot integration, which is now captured by 4claw's native system.
- Farcaster viral moment (276 likes) was one-time; hasn't been replicated.
- No organic retention — tokens launch but don't trade.
- The deploy handler cron runs every 5 min but has been HEARTBEAT_OK for hundreds of consecutive runs.

### Data Pipeline
- Site deployed to pumpclaw.com ✅
