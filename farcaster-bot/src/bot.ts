#!/usr/bin/env tsx
/**
 * PumpClaw Farcaster Deploy Bot
 * 
 * Monitors @clawd mentions on Farcaster for deploy requests.
 * When someone casts "@clawd deploy $TOKEN TokenName", the bot:
 * 1. Parses the token name and symbol
 * 2. Deploys via PumpClaw factory (creator = user's verified ETH address)
 * 3. Replies with the token details + links
 * 
 * Safety:
 * - DRY_RUN=true mode for testing (no actual deploys)
 * - Rate limited: 3/hour, 10/day
 * - Requires user to have verified ETH address on Farcaster
 * - Tracks processed mentions to avoid duplicates
 */
import { CONFIG } from './config.js';
import { getRecentMentions, replyCast, postCast, getUserVerifiedAddress } from './farcaster.js';
import { parseDeployRequest } from './parse.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { loadState, saveState, canDeploy, recordDeploy } from './state.js';
import { formatEther } from 'viem';

async function processMentions(): Promise<void> {
  const state = loadState();
  
  console.log(`[bot] Polling mentions... (DRY_RUN=${CONFIG.DRY_RUN})`);
  console.log(`[bot] State: ${state.deploysToday} deploys today, ${state.deploysThisHour} this hour`);
  
  const { mentions } = await getRecentMentions();
  
  // Filter to new mentions only
  const newMentions = mentions.filter(m => {
    if (state.processedHashes.includes(m.hash)) return false;
    if (m.timestamp <= state.lastProcessedTimestamp) return false;
    return true;
  });
  
  if (newMentions.length === 0) {
    console.log('[bot] No new mentions');
    return;
  }
  
  console.log(`[bot] Found ${newMentions.length} new mentions`);
  
  for (const mention of newMentions.reverse()) { // Process oldest first
    console.log(`[bot] Processing: @${mention.authorUsername}: "${mention.text.slice(0, 80)}..."`);
    
    // Mark as processed regardless of outcome
    state.processedHashes.push(mention.hash);
    state.lastProcessedTimestamp = mention.timestamp;
    
    // Parse deploy request
    const request = parseDeployRequest(mention.text);
    if (!request) {
      console.log('[bot] Not a deploy request, skipping');
      continue;
    }
    
    // Attach image from cast embeds if not already set
    if (!request.imageUrl && mention.imageUrl) {
      request.imageUrl = mention.imageUrl;
      console.log(`[bot] Using cast embed image: ${mention.imageUrl}`);
    }
    
    console.log(`[bot] Deploy request: ${request.name} ($${request.symbol})${request.imageUrl ? ' (with image)' : ''}`);
    
    // Check rate limits
    const rateCheck = canDeploy(state);
    if (!rateCheck.allowed) {
      console.log(`[bot] Rate limited: ${rateCheck.reason}`);
      await replyCast(mention.hash, 
        `🦞 PumpClaw is rate-limited right now (${rateCheck.reason}). Try again in a bit!\n\nOr deploy directly at pumpclaw.com`
      );
      continue;
    }
    
    // Get user's verified ETH address
    let creatorAddress = mention.verifiedAddresses[0];
    if (!creatorAddress) {
      creatorAddress = await getUserVerifiedAddress(mention.authorFid) || '';
    }
    
    if (!creatorAddress) {
      console.log(`[bot] No verified ETH address for @${mention.authorUsername}`);
      await replyCast(mention.hash,
        `🦞 To deploy a token, you need a verified Ethereum address on Farcaster.\n\nVerify at: warpcast.com/~/settings/verified-addresses\n\nOr deploy directly at pumpclaw.com`
      );
      continue;
    }
    
    // DRY RUN mode
    if (CONFIG.DRY_RUN) {
      console.log(`[bot] 🏜️ DRY RUN - Would deploy: ${request.name} ($${request.symbol}) for ${creatorAddress}`);
      await replyCast(mention.hash,
        `🦞 [DRY RUN] Would deploy:\n\n` +
        `📛 ${request.name} ($${request.symbol})\n` +
        `👤 Creator: ${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}\n` +
        `💰 80% trading fees → you\n` +
        `🔒 LP locked forever\n\n` +
        `Bot is in test mode. Deploy now at pumpclaw.com!`
      );
      recordDeploy(state);
      continue;
    }
    
    // LIVE DEPLOY
    try {
      console.log(`[bot] 🚀 Deploying token...`);
      const result = await deployToken(request, creatorAddress as `0x${string}`);
      
      recordDeploy(state);
      
      const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
      const tokenPageUrl = `https://pumpclaw.com/#/token/${result.tokenAddress}`;
      const replyText = 
        `🦞 Token deployed!\n\n` +
        `📛 ${result.name} ($${result.symbol})\n` +
        `📍 ${result.tokenAddress}\n` +
        `👤 Creator: ${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}\n` +
        `💰 80% trading fees → you\n` +
        `🔒 LP locked forever on Uniswap V4\n\n` +
        `🔄 Trade on Matcha ↗\n` +
        `📊 Details: ${tokenPageUrl}`;
      
      // Embed trade URL for rich link preview + token image if available
      const embeds: Array<{url: string}> = [{ url: tradeUrl }];
      if (request.imageUrl) {
        embeds.push({ url: request.imageUrl });
      }
      
      await replyCast(mention.hash, replyText, embeds);
      console.log(`[bot] ✅ Deployed and replied!`);
      
      // Broadcast public announcement (separate cast, not a reply)
      try {
        const announceText = 
          `🦞 New token just launched on PumpClaw!\n\n` +
          `📛 ${result.name} ($${result.symbol})\n` +
          `👤 by @${mention.authorUsername}\n` +
          `💰 80% trading fees → creator\n` +
          `🔒 LP locked forever on Uniswap V4\n\n` +
          `Deploy your own — free, instant, on Base.\n` +
          `Just cast: @clawd deploy $TICKER TokenName`;
        
        const announceEmbeds: Array<{url: string}> = [
          { url: `https://pumpclaw.com/#/token/${result.tokenAddress}` },
        ];
        if (request.imageUrl) {
          announceEmbeds.push({ url: request.imageUrl });
        }
        
        await postCast(announceText, announceEmbeds);
        console.log(`[bot] 📢 Broadcast announcement posted!`);
      } catch (announceErr: any) {
        console.error(`[bot] ⚠️ Broadcast failed (non-critical):`, announceErr.message);
      }
      
    } catch (err: any) {
      console.error(`[bot] ❌ Deploy failed:`, err.message);
      await replyCast(mention.hash,
        `🦞 Oops, deployment hit an error. Try again or deploy directly at pumpclaw.com\n\nError: ${err.message?.slice(0, 100)}`
      );
    }
  }
  
  saveState(state);
}

async function main(): Promise<void> {
  console.log('🦞 PumpClaw Farcaster Deploy Bot starting...');
  console.log(`   DRY_RUN: ${CONFIG.DRY_RUN}`);
  console.log(`   POLL_ONCE: ${CONFIG.POLL_ONCE}`);
  console.log(`   Rate limits: ${CONFIG.MAX_DEPLOYS_PER_HOUR}/hr, ${CONFIG.MAX_DEPLOYS_PER_DAY}/day`);
  
  // Check gas balance
  try {
    const balance = await checkGasBalance();
    console.log(`   Gas balance: ${formatEther(balance)} ETH`);
  } catch (err: any) {
    console.error(`   ⚠️ Could not check gas balance: ${err.message}`);
  }
  
  if (CONFIG.POLL_ONCE) {
    await processMentions();
    return;
  }
  
  // Continuous polling loop
  while (true) {
    try {
      await processMentions();
    } catch (err: any) {
      console.error(`[bot] Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
