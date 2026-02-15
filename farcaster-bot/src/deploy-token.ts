#!/usr/bin/env tsx
/**
 * Deploy a single token with explicit parameters.
 * Called by the cron AI after it parses the deploy request.
 * 
 * Usage: npx tsx src/deploy-token.ts --name "base babes" --symbol "BaseBabes" --creator 0x... [--image URL] [--reply-to HASH]
 * Output: JSON with deploy result
 */
import { CONFIG } from './config.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { replyCast, postCast } from './farcaster.js';
import { loadState, saveState, recordDeploy } from './state.js';
import { formatEther } from 'viem';

function parseArgs(): {
  name: string;
  symbol: string;
  creator: string;
  image?: string;
  website?: string;
  replyTo?: string;
  announce?: boolean;
  authorUsername?: string;
  platform?: string;
} {
  const args = process.argv.slice(2);
  const result: any = { announce: true };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name': result.name = args[++i]; break;
      case '--symbol': result.symbol = args[++i]; break;
      case '--creator': result.creator = args[++i]; break;
      case '--image': result.image = args[++i]; break;
      case '--website': result.website = args[++i]; break;
      case '--reply-to': result.replyTo = args[++i]; break;
      case '--author': result.authorUsername = args[++i]; break;
      case '--platform': result.platform = args[++i]; break;
      case '--no-announce': result.announce = false; break;
    }
  }
  
  if (!result.name || !result.symbol || !result.creator) {
    console.error(JSON.stringify({ error: 'Missing required args: --name, --symbol, --creator' }));
    process.exit(1);
  }
  
  return result;
}

/**
 * Build proof-of-origin URL from platform + request context.
 * Stored on-chain as websiteUrl so anyone can verify who requested the token.
 */
function buildProofUrl(params: ReturnType<typeof parseArgs>): string {
  // Explicit --website takes priority
  if (params.website) return params.website;
  
  // Auto-build from platform + replyTo
  if (params.replyTo) {
    const platform = params.platform?.toLowerCase();
    if (platform === 'farcaster' || (!platform && params.authorUsername)) {
      return params.authorUsername
        ? `https://farcaster.xyz/${params.authorUsername}/${params.replyTo}`
        : `https://farcaster.xyz/~/conversations/${params.replyTo}`;
    }
    if (platform === '4claw') {
      return `https://4claw.com/t/${params.replyTo}`;
    }
  }
  
  return '';
}

async function main() {
  const params = parseArgs();
  const state = loadState();
  
  // Deploy with proof-of-origin URL
  const proofUrl = buildProofUrl(params);
  if (proofUrl) console.log(`[deploy] Proof URL: ${proofUrl}`);
  
  const result = await deployToken(
    { name: params.name, symbol: params.symbol, imageUrl: params.image, websiteUrl: proofUrl },
    params.creator as `0x${string}`,
  );
  
  // Mark processed & record
  if (params.replyTo) {
    state.processedHashes.push(params.replyTo);
  }
  recordDeploy(state);
  saveState(state);
  
  // Save token→request mapping for announce-new.ts quote-casting
  try {
    const { readFileSync, writeFileSync, existsSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const mapFile = join(__dirname, '../deploy-map.json');
    const map: Record<string, {castHash: string, username: string}> = existsSync(mapFile) 
      ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
    if (params.replyTo) {
      map[result.tokenAddress.toLowerCase()] = {
        castHash: params.replyTo,
        username: params.authorUsername || '',
      };
      writeFileSync(mapFile, JSON.stringify(map, null, 2));
    }
  } catch {}
  
  // Reply to the original cast
  if (params.replyTo) {
    const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
    const tokenPageUrl = `https://pumpclaw.com/#/token/${result.tokenAddress}`;
    
    const replyText =
      `Token deployed!\n\n` +
      `${result.name} ($${result.symbol})\n` +
      `${result.tokenAddress}\n\n` +
      `Creator: ${params.creator}\n` +
      `80% trading fees go to you\n` +
      `LP locked forever on Uniswap V4\n\n` +
      `Trade: ${tradeUrl}`;
    
    const embeds: Array<{url: string}> = [{ url: tokenPageUrl }];
    if (params.image) embeds.push({ url: params.image });
    
    await replyCast(params.replyTo, replyText, embeds);
  }
  
  // Broadcast announcement (quote-cast the original request if available)
  if (params.announce) {
    try {
      const announceText =
        `🦞 New token on PumpClaw!\n\n` +
        `${result.name} ($${result.symbol})\n` +
        (params.authorUsername ? `by @${params.authorUsername}\n` : '') +
        `💰 80% trading fees to creator\n` +
        `🔒 LP locked forever on Uniswap V4`;
      
      const embedsA: Array<{url: string}> = [
        { url: `https://pumpclaw.com/#/token/${result.tokenAddress}` },
      ];
      // Quote-cast the original request so people see the context
      if (params.replyTo) {
        const quoteCastUrl = params.authorUsername
          ? `https://farcaster.xyz/${params.authorUsername}/${params.replyTo}`
          : `https://farcaster.xyz/~/conversations/${params.replyTo}`;
        embedsA.push({ url: quoteCastUrl });
      }
      
      await postCast(announceText, embedsA);
    } catch {}
  }
  
  // Output result
  console.log(JSON.stringify({
    success: true,
    token: result.tokenAddress,
    name: result.name,
    symbol: result.symbol,
    tx: result.txHash,
    creator: result.creator,
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
