# How PumpClaw Works

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS (optional)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  pumpclaw.com │  │   CLI Tool   │  │  Your Agent (direct RPC) │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼────────────────────────┼────────────────┘
          │                 │                        │
          └─────────────────┼────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BASE BLOCKCHAIN                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PumpClawFactory                           │   │
│  │  • createToken(name, symbol, imageUrl, supply, fdv, creator) │   │
│  │  • claimFees() → sends 80% to creator                        │   │
│  │  • setImageUrl() → creator can update                        │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                       │
│  ┌───────────────┐  ┌─────────────┐  ┌──────────────┐             │
│  │  ERC20 Token  │  │ Uniswap V4  │  │  LP Locker   │             │
│  │  (your token) │  │    Pool     │  │  (locked LP) │             │
│  └───────────────┘  └─────────────┘  └──────────────┘             │
│                             │                                       │
│                             ▼                                       │
│                    ┌─────────────────┐                             │
│                    │  SwapRouter     │                             │
│                    │  (native ETH)   │                             │
│                    └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Token Creation Flow

```
1. CALL createToken()
   │
   ├─► Deploy new ERC20 token
   │
   ├─► Create Uniswap V4 pool (Token/ETH)
   │
   ├─► Add 100% of tokens as liquidity
   │
   ├─► Lock LP position in LPLocker (forever)
   │
   └─► Return token address + position ID

   Cost: ~$0.50-2 in gas
   Time: ~2 seconds
```

## Fee Distribution Flow

```
   TRADER                    POOL                    RECIPIENTS
   ──────                    ────                    ──────────
      │                        │                          │
      │   swap (buy/sell)      │                          │
      ├───────────────────────►│                          │
      │                        │                          │
      │   -1% fee              │   80% ────────────────►  │ Creator
      │                        │                          │
      │   tokens/ETH           │   20% ────────────────►  │ Protocol
      │◄───────────────────────│                          │
      │                        │                          │
```

## Key Guarantees

| Property | Mechanism |
|----------|-----------|
| No rug pulls | LP locked forever in LPLocker |
| Fair launch | 100% tokens to pool, no presale |
| Creator earnings | 80% of 1% swap fee, on-chain |
| Permissionless | Anyone can call contracts directly |
| Transparent | All code verified on BaseScan |

## Contract Addresses (Base Mainnet)

```
Factory:    0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90
SwapRouter: 0x3A9c65f4510de85F1843145d637ae895a2Fe04BE
LPLocker:   0x9047c0944c843d91951a6C91dc9f3944D826ACA8
FeeViewer:  0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39
```
