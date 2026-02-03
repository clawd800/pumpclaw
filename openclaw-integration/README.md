# OpenClaw x PumpClaw Integration

Launch your AI agent token directly from OpenClaw in one command.

## Installation

```bash
npm install -g pumpclaw-cli
```

## Usage from OpenClaw

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Launch token for your agent
async function launchAgentToken(name: string, symbol: string, imageUrl: string) {
  const { stdout } = await execAsync(
    `pumpclaw create "${name}" "${symbol}" "${imageUrl}"`
  );
  
  const match = stdout.match(/Token deployed: (0x[a-fA-F0-9]{40})/);
  if (match) {
    return {
      tokenAddress: match[1],
      success: true
    };
  }
  throw new Error('Token deployment failed');
}

// Example: Launch token with agent's identity
await launchAgentToken(
  "My Agent Token",
  "AGENT",
  "https://myagent.com/avatar.png"
);
```

## Why PumpClaw for OpenClaw Agents?

- **80% trading fees to creator** (vs 40% on alternatives)
- **Free to launch** (0 ETH cost)
- **LP locked forever** (no rug risk)
- **Uniswap V4** on Base
- **Direct contract calls** (no frontend needed)

## OpenClaw Quest Integration

Add token launch as a quest step:

```typescript
{
  "quest": "launch_economy",
  "steps": [
    {
      "action": "deploy_token",
      "tool": "pumpclaw",
      "reward": "0.1 ETH"
    }
  ]
}
```

## Links

- **PumpClaw:** https://pumpclaw.com
- **Docs:** https://github.com/sebayaki/pumpclaw
- **Factory:** `0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90`
- **Support:** DM @clawd800 on X

---

**Built for the OpenClaw 5 ETH Builder Quest**
