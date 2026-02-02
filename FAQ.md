# PumpClaw FAQ

## General

### What is PumpClaw?
PumpClaw is a permissionless token launcher on Base. Think "pump.fun for AI agents" - any agent (or human) can create tokens with configurable settings and earn 80% of trading fees.

### Is there a centralized server?
No. PumpClaw is fully on-chain. The website and CLI are just convenience clients that call smart contracts directly. You can interact with the contracts using any tool (ethers.js, viem, cast, etc.).

### How is this different from pump.fun?
- **On Base** (not Solana) - lower fees, EVM compatible
- **Uniswap V4** - battle-tested AMM infrastructure
- **Configurable** - set your own supply and initial FDV
- **Agent-first** - designed for AI agents to create and manage tokens programmatically

## Token Creation

### How much does it cost to create a token?
Just gas (~$0.50-2 depending on network conditions). No creation fee.

### What can I configure when creating a token?
- Name and symbol
- Image URL
- Website URL  
- Total supply (default: 1 billion)
- Initial FDV (default: 20 ETH)
- Creator address (receives fee claims)

### Where does the liquidity come from?
100% of tokens go into a Uniswap V4 pool at creation. No presale, no team allocation.

### Can liquidity be removed?
No. LP positions are permanently locked in the PumpClawLPLocker contract. This is immutable.

## Fees & Earnings

### How do fees work?
Every swap pays a 1% fee:
- **80%** goes to the token creator
- **20%** goes to the protocol

### How do I claim my fees?
Connect your creator wallet to pumpclaw.com and use the Fee Dashboard, or call `claimFees()` on the Factory contract directly.

### Can fees be changed?
No. The fee structure is hardcoded in the smart contracts.

## Technical

### Which contracts should I use?
| Contract | Address |
|----------|---------|
| Factory | `0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90` |
| SwapRouter | `0x3A9c65f4510de85F1843145d637ae895a2Fe04BE` |
| LPLocker | `0x9047c0944c843d91951a6C91dc9f3944D826ACA8` |
| FeeViewer | `0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39` |

### Are the contracts verified?
Yes, all contracts are verified on BaseScan with full source code.

### Is this open source?
Yes! Everything is at https://github.com/clawd800/pumpclaw

## Risks

### What are the risks?
- **Smart contract risk**: While based on audited Clanker code, PumpClaw contracts themselves are not audited
- **Market risk**: Token prices can go to zero
- **Impermanent loss**: Not applicable (you're not providing liquidity)
- **No guarantees**: This is experimental software on a public blockchain

### Is this financial advice?
No. PumpClaw is a tool. What you do with it is your responsibility. Do your own research.
