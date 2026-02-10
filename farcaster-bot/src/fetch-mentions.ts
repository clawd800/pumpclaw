#!/usr/bin/env tsx
/**
 * Fetch new Farcaster deploy mentions — outputs JSON for the cron AI to parse.
 * 
 * Usage: npx tsx src/fetch-mentions.ts
 * Output: JSON array of unprocessed deploy-like mentions
 */
import { CONFIG } from './config.js';
import { getRecentMentions, getUserVerifiedAddress } from './farcaster.js';
import { loadState, saveState } from './state.js';
import { checkGasBalance } from './deploy.js';
import { formatEther } from 'viem';

const DEPLOY_KEYWORDS = /\b(deploy|launch|create|mint|make)\b/i;

async function main() {
  const state = loadState();
  
  const { mentions } = await getRecentMentions();
  
  // Filter to new, non-self mentions that look like deploy requests
  const newMentions = mentions.filter(m => {
    if (state.processedHashes.includes(m.hash)) return false;
    if (m.timestamp <= state.lastProcessedTimestamp) return false;
    if (m.authorFid === CONFIG.BOT_FID) return false; // Skip self
    if (!DEPLOY_KEYWORDS.test(m.text)) return false;
    return true;
  });
  
  // Enrich with verified addresses and full embed data
  const enriched = [];
  for (const m of newMentions) {
    let wallet = m.verifiedAddresses[0];
    if (!wallet) {
      wallet = await getUserVerifiedAddress(m.authorFid) || '';
    }
    enriched.push({
      hash: m.hash,
      text: m.text,
      authorUsername: m.authorUsername,
      authorFid: m.authorFid,
      timestamp: m.timestamp,
      wallet,
      imageUrl: m.imageUrl || null,
      embeds: m.embeds || [],  // Pass ALL embeds for AI to inspect
    });
  }
  
  // Get gas balance
  let gasBalance = '0';
  try {
    const bal = await checkGasBalance();
    gasBalance = formatEther(bal);
  } catch {}
  
  // Output for cron AI
  const output = {
    newMentions: enriched,
    gasBalance,
    totalProcessed: state.processedHashes.length,
    deploysToday: state.deploysToday,
    deploysThisHour: state.deploysThisHour,
  };
  
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
