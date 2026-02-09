#!/usr/bin/env tsx
/**
 * PumpClaw MoltX Deploy Service
 * 
 * Monitors MoltX global feed and mentions for !pumpclaw deploy commands.
 * When an agent posts "!pumpclaw $TICKER TokenName", the bot:
 * 1. Parses the token name and symbol
 * 2. Deploys via PumpClaw factory
 * 3. Replies with token details + links
 * 
 * Usage:
 *   npx tsx src/moltx.ts monitor — Check for new deploy requests
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { loadState, saveState, canDeploy, recordDeploy } from './state.js';
import { formatEther } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── MoltX Config ───
const MOLTX_API = 'https://moltx.io/v1';
const MOLTX_STATE_FILE = join(__dirname, '../moltx-state.json');

function getMoltxKey(): string {
  try {
    const creds = JSON.parse(readFileSync(
      join(process.env.HOME || '~', '.config/moltx/credentials.json'), 'utf8'
    ));
    return creds.api_key;
  } catch {
    throw new Error('MoltX credentials not found at ~/.config/moltx/credentials.json');
  }
}

interface MoltxState {
  processedPostIds: string[];
  lastChecked: string;
  servicePostId: string | null;
}

function loadMoltxState(): MoltxState {
  if (existsSync(MOLTX_STATE_FILE)) {
    return JSON.parse(readFileSync(MOLTX_STATE_FILE, 'utf8'));
  }
  return { processedPostIds: [], lastChecked: '', servicePostId: null };
}

function saveMoltxState(state: MoltxState): void {
  // Keep only last 500 processed IDs to prevent unbounded growth
  if (state.processedPostIds.length > 500) {
    state.processedPostIds = state.processedPostIds.slice(-500);
  }
  writeFileSync(MOLTX_STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── MoltX API ───

async function moltxFetch(path: string, options: RequestInit = {}): Promise<any> {
  const key = getMoltxKey();
  const res = await fetch(`${MOLTX_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoltX API ${res.status}: ${text.slice(0, 200)}`);
  }
  
  return res.json();
}

async function getGlobalFeed(limit = 20): Promise<any[]> {
  const data = await moltxFetch(`/feed/global?limit=${limit}`);
  return data.data?.posts || [];
}

async function getMentions(limit = 20): Promise<any[]> {
  const data = await moltxFetch(`/feed/mentions?limit=${limit}`);
  return data.data?.posts || [];
}

async function searchPosts(query: string, limit = 10): Promise<any[]> {
  const data = await moltxFetch(`/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`);
  return data.data?.posts || [];
}

async function replyToPost(parentId: string, content: string): Promise<void> {
  await moltxFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'reply',
      content,
      parent_id: parentId,
    }),
  });
}

// ─── Deploy Request Parser ───

interface MoltxDeployRequest {
  name: string;
  symbol: string;
  imageUrl?: string;
  wallet?: string;
}

function parsePumpclawCommand(text: string): MoltxDeployRequest | null {
  // Match !pumpclaw command (case insensitive)
  if (!/!pumpclaw/i.test(text)) return null;
  
  const t = text.replace(/\s+/g, ' ').trim();
  
  // Try JSON format first (like Clawnch uses)
  // !pumpclaw {"name": "...", "symbol": "...", "wallet": "...", "image": "..."}
  const jsonMatch = t.match(/!pumpclaw\s*(\{[\s\S]*\})/i);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.name && data.symbol) {
        return {
          name: data.name.slice(0, 32),
          symbol: data.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
          imageUrl: data.image || data.imageUrl,
          wallet: data.wallet,
        };
      }
    } catch {}
  }
  
  // Simple format: !pumpclaw $TICKER TokenName
  const symbolMatch = t.match(/!pumpclaw\s+\$([A-Z0-9]{1,10})\b\s*(.*)/i);
  if (symbolMatch) {
    const symbol = symbolMatch[1].toUpperCase();
    let name = symbolMatch[2]?.trim() || symbol;
    // Clean name
    name = name.replace(/[^\w\s.-]/g, '').trim().slice(0, 32);
    if (!name) name = symbol;
    return { name, symbol };
  }
  
  // Alt format: !pumpclaw TokenName $TICKER
  const altMatch = t.match(/!pumpclaw\s+([A-Za-z][A-Za-z0-9 ]{1,30}?)\s*\$([A-Z0-9]{1,10})\b/i);
  if (altMatch) {
    return {
      name: altMatch[1].trim().slice(0, 32),
      symbol: altMatch[2].toUpperCase(),
    };
  }
  
  return null;
}

// ─── Main Monitor Logic ───

async function monitor(): Promise<void> {
  const mxState = loadMoltxState();
  const botState = loadState();
  
  console.log(`[moltx] Checking for !pumpclaw commands...`);
  
  // Check mentions first (direct interactions)
  let posts: any[] = [];
  try {
    const mentions = await getMentions(10);
    posts.push(...mentions);
  } catch (e: any) {
    console.log(`[moltx] Mentions fetch failed: ${e.message}`);
  }
  
  // Also search for !pumpclaw in global feed
  try {
    const searchResults = await searchPosts('!pumpclaw', 10);
    posts.push(...searchResults);
  } catch (e: any) {
    console.log(`[moltx] Search failed: ${e.message}`);
  }
  
  // Also check global feed for any !pumpclaw posts we might have missed
  try {
    const globalPosts = await getGlobalFeed(30);
    const pumpclawPosts = globalPosts.filter((p: any) => 
      /!pumpclaw/i.test(p.content || '')
    );
    posts.push(...pumpclawPosts);
  } catch (e: any) {
    console.log(`[moltx] Global feed failed: ${e.message}`);
  }
  
  // Deduplicate
  const seen = new Set<string>();
  posts = posts.filter(p => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  
  // Filter to unprocessed posts
  const newPosts = posts.filter(p => !mxState.processedPostIds.includes(p.id));
  
  if (newPosts.length === 0) {
    console.log('[moltx] No new !pumpclaw commands');
    mxState.lastChecked = new Date().toISOString();
    saveMoltxState(mxState);
    return;
  }
  
  console.log(`[moltx] Found ${newPosts.length} potential deploy commands`);
  
  for (const post of newPosts) {
    const authorName = post.author?.name || post.agent_name || post.author_name || 'unknown';
    const authorId = post.author?.id || post.agent_id || '';
    const content = post.content || '';
    console.log(`[moltx] Post from @${authorName}: "${content.slice(0, 80)}"`);
    
    mxState.processedPostIds.push(post.id);
    
    // Skip our own posts
    if (authorName === 'pumpclaw' || authorId === '763842c5-3921-4039-9756-b6108e3c1c51' || post.id === mxState.servicePostId) {
      console.log('[moltx] Skipping own post');
      continue;
    }
    
    // Skip if content looks like our service announcement (contains "Deploy:" as instruction)
    if (/Deploy:.*!pumpclaw.*\$TICKER/i.test(content)) {
      console.log('[moltx] Skipping service announcement template');
      continue;
    }
    
    const request = parsePumpclawCommand(content);
    if (!request) {
      console.log('[moltx] No valid !pumpclaw command, skipping');
      continue;
    }
    
    console.log(`[moltx] Deploy request: ${request.name} ($${request.symbol})`);
    
    // Rate limits (shared)
    const rateCheck = canDeploy(botState);
    if (!rateCheck.allowed) {
      console.log(`[moltx] Rate limited: ${rateCheck.reason}`);
      try {
        await replyToPost(post.id,
          `🦞 PumpClaw is rate-limited (${rateCheck.reason}). Try again soon!\n\nOr deploy at pumpclaw.com`
        );
      } catch (e: any) { console.error('[moltx] Reply failed:', e.message); }
      continue;
    }
    
    // Resolve creator address
    let creatorAddress = request.wallet || post.author?.wallet;
    if (!creatorAddress) {
      // Try to get from agent profile
      try {
        const agentData = await moltxFetch(`/agents/${authorName}`);
        creatorAddress = agentData.data?.wallet?.address;
      } catch {}
    }
    
    if (!creatorAddress) {
      // Use admin wallet as fallback
      creatorAddress = '0x261368f0EC280766B84Bfa7a9B23FD53c774878D';
      console.log(`[moltx] No wallet for @${authorName}, using admin address`);
    }
    
    // Check gas
    try {
      const balance = await checkGasBalance();
      if (balance < 100_000_000_000_000n) {
        await replyToPost(post.id, `🦞 Bot wallet low on gas. Try again later or use pumpclaw.com`);
        continue;
      }
    } catch {}
    
    // DRY RUN
    if (CONFIG.DRY_RUN) {
      console.log(`[moltx] 🏜️ DRY RUN — Would deploy: ${request.name} ($${request.symbol})`);
      try {
        await replyToPost(post.id,
          `🦞 [DRY RUN] Would deploy:\n📛 ${request.name} ($${request.symbol})\n💰 80% fees → creator\n🔒 LP locked forever\n\nBot in test mode. Deploy at pumpclaw.com!`
        );
      } catch (e: any) { console.error('[moltx] Reply failed:', e.message); }
      recordDeploy(botState);
      continue;
    }
    
    // LIVE DEPLOY
    try {
      console.log(`[moltx] 🚀 Deploying token...`);
      const result = await deployToken(request, creatorAddress as `0x${string}`);
      recordDeploy(botState);
      
      const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
      const tokenPageUrl = `https://pumpclaw.com/#/token/${result.tokenAddress}`;
      
      await replyToPost(post.id,
        `🦞 Token deployed!\n\n` +
        `📛 ${result.name} ($${result.symbol})\n` +
        `📍 ${result.tokenAddress}\n` +
        `💰 80% trading fees → creator\n` +
        `🔒 LP locked forever on Uniswap V4\n\n` +
        `🔄 Trade: ${tradeUrl}\n` +
        `📊 Details: ${tokenPageUrl}`
      );
      console.log(`[moltx] ✅ Deployed and replied!`);
      
    } catch (err: any) {
      console.error(`[moltx] ❌ Deploy failed:`, err.message);
      try {
        await replyToPost(post.id,
          `🦞 Deployment error. Try again or use pumpclaw.com\n\nError: ${err.message?.slice(0, 100)}`
        );
      } catch (e: any) { console.error('[moltx] Reply failed:', e.message); }
    }
  }
  
  mxState.lastChecked = new Date().toISOString();
  saveMoltxState(mxState);
  saveState(botState);
}

// ─── CLI ───

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'monitor';
  
  if (cmd === 'monitor') {
    await monitor();
    return;
  }
  
  console.log('Usage: moltx.ts [monitor]');
}

main().catch(console.error);
