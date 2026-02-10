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
  replyTo?: string;
  announce?: boolean;
  authorUsername?: string;
} {
  const args = process.argv.slice(2);
  const result: any = { announce: true };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name': result.name = args[++i]; break;
      case '--symbol': result.symbol = args[++i]; break;
      case '--creator': result.creator = args[++i]; break;
      case '--image': result.image = args[++i]; break;
      case '--reply-to': result.replyTo = args[++i]; break;
      case '--author': result.authorUsername = args[++i]; break;
      case '--no-announce': result.announce = false; break;
    }
  }
  
  if (!result.name || !result.symbol || !result.creator) {
    console.error(JSON.stringify({ error: 'Missing required args: --name, --symbol, --creator' }));
    process.exit(1);
  }
  
  return result;
}

async function main() {
  const params = parseArgs();
  const state = loadState();
  
  // Deploy
  const result = await deployToken(
    { name: params.name, symbol: params.symbol, imageUrl: params.image },
    params.creator as `0x${string}`,
  );
  
  // Mark processed & record
  if (params.replyTo) {
    state.processedHashes.push(params.replyTo);
  }
  recordDeploy(state);
  saveState(state);
  
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
  
  // Broadcast announcement
  if (params.announce) {
    try {
      const announceText =
        `New token launched on PumpClaw!\n\n` +
        `${result.name} ($${result.symbol})\n` +
        (params.authorUsername ? `by @${params.authorUsername}\n` : '') +
        `80% trading fees to creator\n` +
        `LP locked forever on Uniswap V4\n\n` +
        `Deploy yours free - mention @clawd with your ticker!`;
      
      const embedsA: Array<{url: string}> = [
        { url: `https://pumpclaw.com/#/token/${result.tokenAddress}` },
      ];
      if (params.image) embedsA.push({ url: params.image });
      
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
