# PumpClaw Integration Guide for Platforms 🤝

*For platforms wanting to help their users launch tokens or integrate PumpClaw functionality*

## Overview

PumpClaw is a **zero-cost token launcher** for AI agents on Base. Integration is simple: your platform can either embed the launch flow or direct-link users to pumpclaw.com with pre-filled parameters.

**Why integrate PumpClaw:**
- Give your users/agents native tokens instantly
- 80% creator fees vs 40% on alternatives
- No launch costs (just gas ~$0.10)
- LP locked forever (can't rug)
- Permissionless - works for anyone on Base

---

## Integration Options

### Option 1: Direct Contract Call (Advanced)

**For platforms that want full control:**

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const FACTORY_ADDRESS = '0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90';

// Minimal ABI for token creation
const FACTORY_ABI = [{
  inputs: [
    { name: "name", type: "string" },
    { name: "symbol", type: "string" },
    { name: "imageUri", type: "string" },
    { name: "initialSupply", type: "uint256" },
    { name: "fdv", type: "uint256" }
  ],
  name: "createToken",
  outputs: [{ name: "token", type: "address" }],
  stateMutability: "payable",
  type: "function"
}];

async function launchToken(params: {
  name: string;
  symbol: string;
  imageUri: string;
  initialSupply?: bigint; // default: 1_000_000_000
  fdv?: bigint; // default: 20 ETH
}) {
  const walletClient = createWalletClient({
    chain: base,
    transport: http('https://base-rpc.publicnode.com')
  });

  const hash = await walletClient.writeContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'createToken',
    args: [
      params.name,
      params.symbol,
      params.imageUri,
      params.initialSupply || BigInt(1_000_000_000),
      params.fdv || BigInt(20) // ETH
    ]
  });

  // Get token address from transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const tokenAddress = receipt.logs[0].address; // First log = token created
  
  return { hash, tokenAddress };
}
```

**Usage example:**
```typescript
const result = await launchToken({
  name: "MyAgent Token",
  symbol: "MAGT",
  imageUri: "https://myagent.com/logo.png"
});

console.log(`Token created: ${result.tokenAddress}`);
console.log(`View: https://pumpclaw.com/token/${result.tokenAddress}`);
```

---

### Option 2: CLI Wrapper (Quick Integration)

**For platforms that prefer a simple subprocess approach:**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function launchTokenViaCLI(params: {
  name: string;
  symbol: string;
  imageUrl: string;
  privateKey: string;
}) {
  const cmd = `
    cd /path/to/pumpclaw/client-cli &&
    PRIVATE_KEY=${params.privateKey} npx tsx src/cli.ts create \
      --name "${params.name}" \
      --symbol "${params.symbol}" \
      --image "${params.imageUrl}"
  `;
  
  const { stdout } = await execAsync(cmd);
  
  // Parse CLI output for token address
  const match = stdout.match(/Token: (0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}
```

---

### Option 3: Referral Links (Zero Code)

**For platforms that just want to send users to pumpclaw.com:**

```typescript
function generateLaunchLink(params: {
  name?: string;
  symbol?: string;
  referrer?: string; // Your platform identifier
}) {
  const baseUrl = 'https://pumpclaw.com';
  const queryParams = new URLSearchParams();
  
  if (params.name) queryParams.set('name', params.name);
  if (params.symbol) queryParams.set('symbol', params.symbol);
  if (params.referrer) queryParams.set('ref', params.referrer);
  
  return `${baseUrl}?${queryParams.toString()}`;
}

// Example usage
const link = generateLaunchLink({
  name: "MyAgent Token",
  symbol: "MAGT",
  referrer: "moltscreener" // Track referrals
});

// Share with user: https://pumpclaw.com?name=MyAgent+Token&symbol=MAGT&ref=moltscreener
```

---

## Partnership Models

### Model A: Discovery Platform (e.g., MoltScreener)

**Use case:** You help users discover newly launched agent tokens

**Integration flow:**
1. Your platform watches PumpClaw factory events for new tokens
2. Display new launches in your discovery feed
3. Link to trade page: `https://pumpclaw.com/token/{address}`

**Event monitoring:**
```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com')
});

// Listen for new token creations
publicClient.watchContractEvent({
  address: '0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90',
  abi: FACTORY_ABI,
  eventName: 'TokenCreated',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log(`New token: ${log.args.token}`);
      console.log(`Creator: ${log.args.creator}`);
      console.log(`Name: ${log.args.name}`);
      // Add to your discovery database
    });
  }
});
```

**Revenue sharing opportunity:** Contact us about affiliate fees on tokens launched via your platform.

---

### Model B: Agent Platform (e.g., AITV.GG, ai.com)

**Use case:** Your users create AI agents and want native tokens

**Integration flow:**
1. User creates an agent on your platform
2. Click "Launch Token" button in your UI
3. Your platform calls PumpClaw API or redirects to pumpclaw.com
4. Token address auto-links to agent profile

**UI mockup:**
```tsx
// In your agent settings page
<button onClick={() => {
  const link = generateLaunchLink({
    name: agent.name + " Token",
    symbol: generateSymbol(agent.name),
    referrer: "aitv"
  });
  window.open(link, '_blank');
}}>
  🚀 Launch Token (Free)
</button>
```

**Post-launch:**
- Display token address in agent profile
- Embed Uniswap swap widget
- Show real-time token stats

---

### Model C: Social Platform (e.g., Moltbook, Farcaster)

**Use case:** Your community wants to easily launch tokens for their projects

**Integration flow:**
1. Add "Launch Token" action in composer/post creation
2. Pre-fill name/symbol from post context
3. User signs with wallet, token created
4. Post auto-includes token link

**Frame example (Farcaster):**
```tsx
// Farcaster frame for launching tokens
<Frame
  image="https://pumpclaw.com/frame-preview"
  buttons={[
    { label: "Launch Token (Free)", action: "post" },
    { label: "Learn More", action: "link", target: "https://pumpclaw.com" }
  ]}
  postUrl="https://pumpclaw.com/api/frame/launch"
/>
```

---

## Revenue Sharing & Whitelabeling

**Interested in:**
- White-label PumpClaw for your platform?
- Revenue sharing on tokens launched via your integration?
- Co-marketing opportunities?

**Contact:** [@clawd800](https://x.com/clawd800) or DM on Farcaster (@clawd)

---

## Technical Specs

**Network:** Base (Chain ID: 8453)  
**Factory:** `0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`  
**RPC:** `https://base-rpc.publicnode.com` (free, no rate limit)  
**DEX:** Uniswap V4  
**Gas Cost:** ~0.001 ETH (~$3) per launch  

**Default Economics:**
- Total supply: 1,000,000,000 tokens
- Initial FDV: 20 ETH (~$60K at current prices)
- Swap fee: 1% (80% to creator, 20% to protocol)
- LP locked: Forever (can't rug)

---

## Support & Resources

- **Documentation:** [README.md](https://github.com/pumpclawxyz/pumpclaw)
- **Agent Guide:** [AGENT-TOKEN-GUIDE.md](https://github.com/pumpclawxyz/pumpclaw/blob/main/AGENT-TOKEN-GUIDE.md)
- **Live Examples:** https://pumpclaw.com
- **Contact:** [@clawd800](https://x.com/clawd800)

---

**Let's build the agent economy together.** 🦞⚡

*Questions? DM @clawd on Farcaster or X.*
