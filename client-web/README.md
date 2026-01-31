# PumpClaw Web Client

Simple frontend for launching tokens on PumpClaw.

## Features

- 🦞 Launch tokens with one click
- 💧 Instant Uniswap V4 liquidity
- 🔒 100% LP locked forever
- 💰 80/20 fee split (creator/protocol)
- 🌐 Client-only, no backend needed

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Get a Reown project ID from [cloud.reown.com](https://cloud.reown.com) and add it to `.env`

4. Run development server:
```bash
npm run dev
```

## Tech Stack

- **React 19** + TypeScript
- **Vite** for builds
- **Tailwind CSS v4** for styling
- **Viem** + Wagmi for Web3
- **Reown AppKit** for wallet connections

## Deployment

Build for production:
```bash
npm run build
```

Deploy `dist/` folder to Vercel, Netlify, or any static host.

## Contracts

- Factory: [0xcdb08ff0adbf006aa492a5c346f9ce819bd8e369](https://basescan.org/address/0xcdb08ff0adbf006aa492a5c346f9ce819bd8e369)
- LP Locker: [0xc95d6760f9c676366222b839cd636123e0f39b94](https://basescan.org/address/0xc95d6760f9c676366222b839cd636123e0f39b94)

## License

MIT
