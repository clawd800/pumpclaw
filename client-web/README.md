# PumpClaw Web Client

Simple frontend for launching tokens on PumpClaw.

## Features

- 🦞 Launch tokens with one click
- 💧 Instant Uniswap V4 liquidity (native ETH)
- 🔒 100% LP locked forever
- 💰 80/20 fee split (creator/protocol)
- 📊 Fee dashboard for creators
- 🌐 Client-only, no backend needed

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

No API keys needed - just browser wallet (MetaMask, Coinbase, etc.)

## Tech Stack

- **React 19** + TypeScript
- **Vite** for builds
- **Tailwind CSS v4** for styling
- **Viem** + Wagmi for Web3
- **Browser wallet** injection (no WalletConnect)

## Deployment

Build for production:
```bash
npm run build
```

Or use the deploy script (bumps version automatically):
```bash
npm run deploy
```

Deploy `dist/` folder to GitHub Pages, Vercel, Netlify, or any static host.

## Contracts (V2)

| Contract | Address |
|----------|---------|
| Factory | [`0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`](https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90) |
| LP Locker | [`0x9047c0944c843d91951a6C91dc9f3944D826ACA8`](https://basescan.org/address/0x9047c0944c843d91951a6C91dc9f3944D826ACA8) |
| Swap Router | [`0x3A9c65f4510de85F1843145d637ae895a2Fe04BE`](https://basescan.org/address/0x3A9c65f4510de85F1843145d637ae895a2Fe04BE) |
| Fee Viewer | [`0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39`](https://basescan.org/address/0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39) |

## License

MIT
